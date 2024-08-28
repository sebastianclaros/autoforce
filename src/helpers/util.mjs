import fs from "fs";
import context from "./context.mjs";

export const DOCS_FOLDER = process.cwd() + "/docs";
export const DICTIONARY_FOLDER = process.cwd() + "/docs/diccionarios";
export const WORKING_FOLDER = process.env.INIT_CWD || ".";
export const DEFAULT_INTRO = "intro";
const DEFAULT_METADATAFILENAME = DOCS_FOLDER + "/metadata.json";

export function sortByName(objA, objB) {
  return objA.Name > objB.Name ? 1 : objA.Name < objB.Name ? -1 : 0;
}

export function sortByLabel(objA, objB) {
  return objA.label > objB.label ? 1 : objA.label < objB.label ? -1 : 0;
}

export function verFecha() {

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
export function getNamesByExtension(folder, extension) {

  const allFiles = fs.readdirSync(folder);
  const filterFiles = [];

  for (const fullname in allFiles) {
    if (fullname.endsWith(extension)) {
      filterFiles.push(fullname.replace("." + extension, ""));
    }
  }
  return filterFiles;
}


function setContextCache(fileName, items, propName, filterFn) {
  const fullName =
    fileName.indexOf("/") != -1 ? fileName : WORKING_FOLDER + "/" + fileName;
  let allitems;
  if (fs.existsSync(fullName)) {
    const cache = getContextCache(fileName);
    const filterCache = cache[propName].filter(filterFn);
    allitems = filterCache.concat(items);
  } else {
    allitems = items;
  }
  fs.writeFileSync(
    fileName,
    JSON.stringify({ [propName]: allitems }, null, "\t")
  );
}

function setLwcCache(fileName, items) {
  const itemKeys = items.map((item) => item.Name);
  filterFn = (item) => !itemKeys.includes(item.Name);
  setContextCache(fileName, items, "lwc", filterFn);
}

function setClassesCache(fileName, items) {
  const itemKeys = items.map((item) => item.Name);
  filterFn = (item) => !itemKeys.includes(item.Name);
  setContextCache(fileName, items, "classes", filterFn);
}
function setObjectsCache(fileName, items) {
  const itemKeys = items.map((item) => item.fullName);
  const filterFn = (item) => !itemKeys.includes(item.fullName);
  setContextCache(fileName, items, "objects", filterFn);
}

function getLwcCache(fileName) {
  const cache = getContextCache(fileName, false);
  return cache ? cache.lwc: [];
}

function getClassesCache(fileName) {
  const cache = getContextCache(fileName, false);
  return cache ? cache.classes: [];
}

function getObjectsCache(fileName) {
  const cache = getContextCache(fileName, false);
  return cache ? cache.objects: [];
}

function mergeArray(baseArray, newArray) {
  if (!Array.isArray(newArray) && !Array.isArray(baseArray)) {
    return [];
  }
  // Si el new esta vacio
  if (!Array.isArray(newArray) || newArray.length == 0) {
    return baseArray;
  }
  // Si el base esta vacio
  if (!Array.isArray(baseArray) || baseArray.length == 0) {
    return newArray;
  }
  // Sino filtra y concatena
  const notIncludeInBaseArray = (a) => baseArray.indexOf(a) === -1;
  return baseArray.concat(newArray.filter(notIncludeInBaseArray));
}
export function getMetadataFromContext(props) {
  return getMetadataArray(context.getProcessMetadata(), props);
}
function getMetadataArray(metadata, props) {
  const mergeObject = (root, childs) => {
    for (const item of childs) {
      for (const key of props) {
        root[key] = mergeArray(root[key], item[key]);
      }
    }
    return root;
  };
  const getItemsFromTree = (node, parentPath) => {
    const items = [];
    if (Array.isArray(node)) {
      for (const item of node) {
        items.push(...getItemsFromTree(item, parentPath));
      }
    } else {
      const folder = node.folder || node.name;
      node.path = parentPath ? `${parentPath}/${folder}` : folder;
      if (node.childs) {
        // Borra el childs, pero le deja hasChilds en true para saber si es una hoja del arbol
        let { childs, ...itemToAdd } = node;
        itemToAdd.hasChilds = true;
        const childItems = getItemsFromTree(childs, node.path);
        items.push(mergeObject(itemToAdd, childItems));
        items.push(...childItems);
      } else {
        items.push(node);
      }
    }
    return items;
  };

  if (Array.isArray(metadata)) {
    return getItemsFromTree({ folder: DOCS_FOLDER, childs: metadata });
  } else {
    return getItemsFromTree(metadata, "");
  }
}

export function getMetadataFromFile(fileName, props) {
  const metadata = getMetadata(fileName);
  return getMetadataArray(metadata, props);

}

function getMetadata(fileName = DEFAULT_METADATAFILENAME) {
  const fullName =
    fileName.indexOf("/") != -1 ? fileName : WORKING_FOLDER + "/" + fileName;
  if (!fs.existsSync(fullName)) {
    throw new Error(
      `No existe el archivo ${fullName}. Debe ser un json con la metadata`
    );
  }
  const content = fs.readFileSync(fullName);
  try {
    return JSON.parse(content);
  } catch {
    throw new Error(`Archivo invalido: el  ${fileName} debe ser un json`);
  }
}

function getContextCache(fileName, errorIfnotExist = true) {
  const fullName =
    fileName.indexOf("/") != -1 ? fileName : WORKING_FOLDER + "/" + fileName;
  if (!fs.existsSync(fullName) ) {
    if ( errorIfnotExist ) {
      throw new Error(
        `No existe el archivo ${fullName}. Debe ser un json generado por el flag -o`
      );
    } else  {
      return ;
    }
  }
  const content = fs.readFileSync(fullName);
  try {
    return JSON.parse(content);
  } catch {
    throw new Error(
      `Archivo invalido: el  ${fileName} debe ser un json generado por el flag -o`
    );
  }
}

export function splitFilename(fullname, defaultFolder) {
  let filename = fullname;
  let folder = defaultFolder;
  const separatorIndex = fullname.lastIndexOf("/");
  if (separatorIndex !== -1) {
    folder = fullname.substring(0, separatorIndex);
    filename = fullname.substring(separatorIndex + 1);
  }
  return { filename, folder };
}

export const filterJson = (fullPath) => fullPath.endsWith(".json");
export const filterDirectory = (fullPath) => fs.lstatSync(fullPath).isDirectory();
export const filterFiles = (fullPath) => !fs.lstatSync(fullPath).isDirectory();

export function addNewItems(baseArray, newArray) {
  for ( const item of newArray ) {
    if ( !baseArray.includes(item) ) {
      baseArray.push(item);
    }
  }
}

export function getFiles(source, filter=(file)=>true, recursive = false, ignoreList = []) {
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

export function convertNameToKey( name ) {
  return name.toLowerCase().replaceAll(/[ \/]/g, '-')
}

export function convertKeyToName( key ) {
  return key.replaceAll('-', ' ')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
}

