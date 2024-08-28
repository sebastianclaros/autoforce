import fs from "fs";
import Handlebars from "handlebars";
import { merge } from "./merge.mjs";
import { getFiles } from "./util.mjs";

const TEMPLATE_ROOT_FOLDER = process.cwd() + "/templates";


function isObjectEmpty(objectName) {
  return (
    objectName &&
    Object.keys(objectName).length === 0 &&
    objectName.constructor === Object
  );
}

// Abre el archivo, y antes de devolver el contenido busca si tiene tags {{import subarchivos}} y los incorpora al mismo
function openTemplate(sourceFolder, templateName, extension) {
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

class TemplateEngine {
  _template;
  _rendered;
  _extension;
  _sourceFolder;

  constructor (source, extension) {
    this._sourceFolder = `${TEMPLATE_ROOT_FOLDER}/${source}`;
    if (!fs.existsSync(this._sourceFolder)) {
      throw new Error(`La carpeta source ${this._sourceFolder} no existe!`);
    }
    this._extension = extension;
  };
  
  getTemplates() {
    const filterThisExtension = file => file.endsWith(`.${this._extension}`);

    const templates = [];
    const files = getFiles(this._sourceFolder, filterThisExtension , true, ['dictionary']);
    for (const filename of files) {
      const [name] = filename.split(".");
      templates.push(name);

    }
    return templates;
  }
  read (templateName) {
    const rawTemplate = openTemplate(this._sourceFolder, templateName, this._extension);
    this._template = Handlebars.compile(rawTemplate);
  }

  render (context, options) {
    if (isObjectEmpty(context)) {
      return;
    }
    this._rendered = this._template(context, options);
  }

  save (filename, folder, options = {})  {
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
  
    if (fs.existsSync(destination)) {
      accion = "combino";
      const existingContent = fs.readFileSync(destination, "utf8");
      content = merge(content, existingContent, false);
    }
  
    fs.writeFileSync(destination, content);
    console.log(`Se ${accion} el archivo ${filename} con exito!`);
  }
}

export default (source, extension) => {
  return new TemplateEngine(source, extension);
}
