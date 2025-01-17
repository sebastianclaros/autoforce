import fs from "fs";
import Handlebars from "handlebars";
import { merge } from "./merge.js";
import { getFiles, getFilesInFolders } from "./util.js";

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

export class TemplateEngine{
  _template: HandlebarsTemplateDelegate | undefined;
  _rendered: string | undefined;
  _extension: string;
  _sourceFolders: string[];

  constructor (sources: string[], extension: string = '*') {
    this._sourceFolders = sources;
    this._extension = extension;
    for ( const sourceFolder of this._sourceFolders) {
      if (!fs.existsSync(sourceFolder)) {
        throw new Error(`La carpeta source ${sourceFolder} no existe!`);
      }
    }
  };
  
  getTemplates() {
    const filterThisExtension = (file: string): boolean => file.endsWith(`.${this._extension}`) || this._extension === '*';

    const templates = [];
    const files = getFilesInFolders(this._sourceFolders, filterThisExtension , true, ['dictionary']);
    for (const filename of files) {
      const [name] = filename.split(".");
      templates.push(name);

    }
    return templates;
  }

  findTemplateByName(templateName:string) {
    let folder;
    let name = templateName;
    let extension = this._extension;
    // Si viene la extension en el nombre la extrae
    if ( templateName.split(".").length > 1 ) {
      [name, extension] = templateName.split(".");    
    }
    // Busca en las carpetas el archivo
    for ( const currentFolder of this._sourceFolders ) {
      folder = currentFolder;
      const filterWithExtension = (fileName:string) => fileName === `${name}.${extension}`;
      const filterWithoutExtension = (fileName:string)=> fileName.split(".")[0].endsWith(name);
      const filter = ( extension === '*' || extension === '' ) ?  filterWithoutExtension: filterWithExtension; 
      const fileNames = getFiles(folder, filter ); 
      if ( fileNames.length > 0 ) {
        [name, extension] = fileNames[0].split(".");
        return  {folder, name, extension};
      }
    }
    throw new Error(`No se encontro el template ${templateName} en ninguna de las carpetas ${this._sourceFolders}` );
  }
  read (templateName: string) {
    // Por defecto usa el templateName como nombre y la extension
    const {folder, name, extension }  = this.findTemplateByName(templateName);
    const rawTemplate = openTemplate(folder, name, extension);
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

export default (source: string[], extension: string) => {
  return new TemplateEngine(source, extension);
}
