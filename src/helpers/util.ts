import fs from "fs";
import { fileURLToPath } from 'url';
export const TEMPLATES_FOLDER = searchInFolderHierarchy('templates', fileURLToPath(import.meta.url));
export const DICTIONARY_FOLDER = TEMPLATES_FOLDER + "/diccionarios";
export const WORKING_FOLDER = process.env.INIT_CWD || ".";
export const CONFIG_FILE = process.cwd() + '/.autoforce.json';

export async function createConfigurationFile() {
    console.log('Preguntar por GitHub o GitLab');
    console.log('Chequear las variables de entorno');
    console.log('Tema proyecto guardar la referencia');
    console.log('Genera documentacion');
    console.log('Direccion de las carpetas');

    const config = { projectNumber: 1}
    
    try {
        fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2) );
    } catch {
      throw new Error(`No se pudo guardar la configuracion en ${CONFIG_FILE}`  );
    }

    return true;
  }

export function sortByName(objA: {Name: string}, objB: {Name: string}) {
  return objA.Name > objB.Name ? 1 : objA.Name < objB.Name ? -1 : 0;
}

export function sortByLabel(objA: {label?: string |null}, objB: {label?: string|null}) {
  return (objA.label && objB.label &&  objA.label > objB.label || !objB.label)? 1 : (objA.label && objB.label && objA.label < objB.label || !objA.label) ? -1 : 0;
}

export function verFecha(this: Date) {

  try {
    const fecha = new Date(this);
    return fecha.toLocaleString("es", {
      day: "numeric",
      year: "2-digit",
      month: "long"
    });
  } catch (e) {
    console.error(e);
    return this;
  }
}

// Devuelve la lista de nombres de archivos de una extension de una carpeta, sin la extension.
export function getNamesByExtension(folder: string, extension: string): string[] {

  const allFiles = fs.readdirSync(folder);
  const filterFiles = [];

  for (const fullname in allFiles) {
    if (fullname.endsWith(extension)) {
      filterFiles.push(fullname.replace("." + extension, ""));
    }
  }
  return filterFiles;
}


export function splitFilename(fullname: string, defaultFolder: string = ''): { filename: string, folder: string } {
  let filename = fullname;
  let folder = defaultFolder;
  const separatorIndex = fullname.lastIndexOf("/");
  if (separatorIndex !== -1) {
    folder = fullname.substring(0, separatorIndex);
    filename = fullname.substring(separatorIndex + 1);
  }
  return { filename, folder };
}

export const filterJson = (fullPath: string): boolean => fullPath.endsWith(".json");
export const filterDirectory = (fullPath: string): boolean => fs.lstatSync(fullPath).isDirectory();
export const filterFiles = (fullPath: string): boolean => !fs.lstatSync(fullPath).isDirectory();

/**
 * Agrega los elementos de newArray a baseArray, si no existen previamente en baseArray.
 * @param {string[]} baseArray El array donde se agregan los elementos
 * @param {string[]} newArray El array de elementos a agregar
 */
export function addNewItems(baseArray: string[], newArray: string[]) {
  for ( const item of newArray ) {
    if ( !baseArray.includes(item) ) {
      baseArray.push(item);
    }
  }
}

export function searchInFolderHierarchy( element: string, parentFolder: string ): string {
  if ( fs.existsSync( `${parentFolder}/${element}` )) {
    return `${parentFolder}/${element}`;
  } else {  
    const lastIndex = parentFolder.lastIndexOf('/');
    if ( lastIndex !== -1 ){
      const newParentFolder = parentFolder.substring(0, lastIndex); 
      if ( newParentFolder !== '' ) {
        return searchInFolderHierarchy(element, newParentFolder);
      }
    }
  }
  return '';
}

export function getFiles(source: string, filter=(file:string):boolean=>file !== undefined, recursive = false, ignoreList: string[] = []) {
  const files = [];
  for (const file of fs.readdirSync(source)) {
    const fullPath = source + "/" + file;
    const filtered = filter(fullPath);
    if (!ignoreList.includes(file)) {
      if ( filtered ) {
        files.push(file);
      }
      if (fs.lstatSync(fullPath).isDirectory() && recursive ) {
        getFiles(fullPath, filter, recursive, ignoreList).forEach((x) => files.push(file + "/" + x));
      }
    }
  }
  return files;
}

export function convertNameToKey( name: string ): string {
  return name.toLowerCase().replaceAll(/[ /]/g, '-')
}

export function convertKeyToName( key: string ): string {
  return key.replaceAll('-', ' ')
      .split(' ')
      .map( (word: string) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
}

