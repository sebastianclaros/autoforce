import fs from "fs";
import Handlebars from "handlebars";
import { merge } from "./merge.js";
import { fileURLToPath } from 'url';
import { getFiles, searchInFolderHierarchy } from "./util.js";

const TEMPLATE_ROOT_FOLDER = searchInFolderHierarchy('templates', fileURLToPath(import.meta.url));

function isObjectEmpty(objectName: object) {
  return (
    objectName &&
    Object.keys(objectName).length === 0 &&
    objectName.constructor === Object
  );
}

// Abre el archivo, y antes de devolver el contenido busca si tiene tags {{import subarchivos}} y los incorpora al mismo
function openTemplate(sourceFolder: string, templateName: string, extension: string) {
  const source = `${sourceFolder}/${templateName}.${extension}`;
  let content = fs.readFileSync(source, "utf8");
  const regexp = /{{[ ]*(import)[ ]*([^}]+)}}/gi;
  const matches = content.matchAll(regexp);
  if (matches !== null) {
    for (const match of matches) {
      const [subfile, subextension] = match[2].trim().split(".");
      const subcontent = openTemplate(
        sourceFolder,
        subfile,
        subextension || extension
      );
      content = content.replace(match[0], subcontent);
    }
  }

  return content;
}

class TemplateEngine<T> {
  _template: HandlebarsTemplateDelegate | undefined;
  _rendered: string | undefined;
  _extension: string;
  _sourceFolder: string;

  constructor (source: string, extension: string) {
    this._sourceFolder = `${TEMPLATE_ROOT_FOLDER}/${source}`;
    if (!fs.existsSync(this._sourceFolder)) {
      throw new Error(`La carpeta source ${this._sourceFolder} no existe!`);
    }
    this._extension = extension;
  };
  
  getTemplates() {
    const filterThisExtension = (file: string): boolean => file.endsWith(`.${this._extension}`);

    const templates = [];
    const files = getFiles(this._sourceFolder, filterThisExtension , true, ['dictionary']);
    for (const filename of files) {
      const [name] = filename.split(".");
      templates.push(name);

    }
    return templates;
  }
  read (templateName: string) {
    const rawTemplate = openTemplate(this._sourceFolder, templateName, this._extension);
    this._template = Handlebars.compile(rawTemplate);
  }

  render (context: object, options: RuntimeOptions = {}) {
    if (isObjectEmpty(context) || this._template === undefined) {
      return;
    }
    this._rendered = this._template(context, options);
  }

  save (filename: string, folder: string, options: SaveTemplateOptions = { create: true, overwrite: true})  {
    let accion = "creo";
    if (folder && !fs.existsSync(folder)) {
      if (options.create) {
        fs.mkdirSync(folder);
      } else {
        throw new Error(`La carpeta ${folder} no existe!`);
      }
    }
    if (!filename.endsWith("." + this._extension)) {
      filename += "." + this._extension;
    }
    const destination = folder ? `${folder}/${filename}` : `${filename}`;  
    let content = this._rendered;
  
    if ( content ){
      if (fs.existsSync(destination) ) {
        if (!options.overwrite) {
          throw new Error(`El archivo ${folder} ya existe!`);
        }
        accion = "combino";
        const existingContent = fs.readFileSync(destination, "utf8");
        content = merge(content, existingContent, false);
      }

      fs.writeFileSync(destination, content);
      console.log(`Se ${accion} el archivo ${filename} con exito!`);
    }
  
  }
}

export default (source: string, extension: string) => {
  return new TemplateEngine(source, extension);
}
