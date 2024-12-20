import fs from "fs";
import Handlebars from "handlebars";
import { merge } from "./merge.js";
import { getFiles } from "./util.js";

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

class TemplateEngine{
  _template: HandlebarsTemplateDelegate | undefined;
  _rendered: string | undefined;
  _extension: string;
  _sourceFolder: string;

  constructor (source: string, extension: string = '*') {
    this._sourceFolder = source;
    if (!fs.existsSync(this._sourceFolder)) {
      throw new Error(`La carpeta source ${this._sourceFolder} no existe!`);
    }
    this._extension = extension;
  };
  
  getTemplates() {
    const filterThisExtension = (file: string): boolean => file.endsWith(`.${this._extension}`) || this._extension === '*';

    const templates = [];
    const files = getFiles(this._sourceFolder, filterThisExtension , true, ['dictionary']);
    for (const filename of files) {
      const [name] = filename.split(".");
      templates.push(name);

    }
    return templates;
  }

  getNameAndExtension(templateName:string) {
    // Si viene la extension en el nombre la extrae
    if ( templateName.split(".").length > 1 ) {
      return templateName.split(".");    
    }
    // Si viene la extension * busca cual puede ser en el directorio
    if ( this._extension === '*' || this._extension === '' ) {
      const fileNames = getFiles(this._sourceFolder, fileName=> fileName.split(".")[0].endsWith(templateName)); 
      if ( fileNames.length > 0 ) {
        return fileNames[0].split(".");          
      }
    }
    // Por defecto usa el templateName como nombre y la extension
    return [templateName, this._extension];
  }
  read (templateName: string) {
    // Por defecto usa el templateName como nombre y la extension
    const [name, extension]  = this.getNameAndExtension(templateName);
    const rawTemplate = openTemplate(this._sourceFolder, name, extension);
    this._template = Handlebars.compile(rawTemplate);
  }

  render (context: object, options: RuntimeOptions = {}) {
    if (isObjectEmpty(context) || this._template === undefined) {
      return;
    }
    this._rendered = this._template(context, options);
  }

  get rendered()  {
    return this._rendered;
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
