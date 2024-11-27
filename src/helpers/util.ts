import fs from "fs";
import { fileURLToPath } from 'url';
import prompts, { Choice } from "prompts";
import { ProjectServices, GitServices } from "./context.js";
import { logInfo, logWarning } from "./color.js";
import { AnyValue, ObjectRecord } from "../types/auto.js";
const COMMAND_FOLDER = searchInFolderHierarchy('commands', fileURLToPath(import.meta.url));
export const TEMPLATES_FOLDER = searchInFolderHierarchy('templates', fileURLToPath(import.meta.url));
export const DICTIONARY_FOLDER = TEMPLATES_FOLDER + "/diccionarios";
export const WORKING_FOLDER = process.env.INIT_CWD || ".";
export const CONFIG_FILE = process.cwd() + '/.autoforce.json';
export const filterJson = (fullPath: string): boolean => fullPath.endsWith(".json");
export const filterDirectory = (fullPath: string): boolean => fs.lstatSync(fullPath).isDirectory();
export const filterFiles = (fullPath: string): boolean => !fs.lstatSync(fullPath).isDirectory();

export const camelToText = (s: string) => s.replace(/[A-Z]/g, x => ' ' + x);
export const kebabToText = (s: string) => s.replace(/-./g, x=> ' ' + x[1].toUpperCase())
export const snakeToText = (s: string) => s.replace(/_./g, x=> ' ' + x[1].toUpperCase())

export function valuesToChoices( list: string[], valueToTitle=(value:string)=>value ) {
  return list.map( value => { return { value, title: valueToTitle(value) } } ) ;    
} 
export function titlesToChoices( list: string[], titleToValue=(title:string)=>title ) {
  return list.map( title => { return { title,  value: titleToValue(title) } } ) ;    
} 


export function getDataFromPackage() {
  const data :Record<string,string> = {};
  try {
    const filename =  process.cwd() +  "/package.json";
    const content = fs.readFileSync(filename, "utf8");
    const packageJson = JSON.parse(content);
    if ( packageJson.repository ) {
        if ( packageJson.repository.url ) {
          data.repositoryUrl = packageJson.repository.url;
          data.repositoryType = packageJson.repository.type;
            // Ver de sacar repo y owner
          if ( data.repositoryUrl  ) {
            if ( data.repositoryUrl.includes("github.com") ){
              const repositoryArray =  data.repositoryUrl.split('github.com/');
              [data.repositoryOwner, data.repositoryRepo] = repositoryArray[1].split('/');
            }
            if ( data.repositoryUrl.includes("gitlab.com") ){
              const repositoryArray =  data.repositoryUrl.split('gitlab.com/');
              [data.repositoryOwner, data.repositoryRepo] = repositoryArray[1].split('/');
            }            
          } 
        } else if ( typeof packageJson.repository === 'string' ) {
          data.repositoryUrl = packageJson.repository as string;
            const repositoryArray =  data.repositoryUrl.split(':');
            data.repositoryType = repositoryArray[0];
            [data.repositoryOwner, data.repositoryRepo] = repositoryArray[1].split('/');
        }
        if ( data.repositoryRepo && data.repositoryRepo.endsWith('.git') ) {
          data.repositoryRepo = data.repositoryRepo.replace('.git', '');
        }
    } 
  } catch (error) {
      console.log(error);
      throw new Error(`Verifique que exista y sea valido el package.json`  );
  }  


  return data;

}
export async function createConfigurationFile() {
  // Todo: Chequear el repoOwner y repo
  const data = getDataFromPackage();
  const optionals: Record<string,string> = {};
  
  if ( !data.repositoryOwner || !data.repositoryRepo ) {
    throw new Error('No se encontro repository en el package.json ! Por favor agreguelo y vuelva a intentar');  
  }
  const initialServices = data.repositoryUrl.includes("github.com") ? 0: 1;

  // Preguntar por GitHub o GitLab
  const gitServices = await prompts([{
    type: "select",
    name: "git",
    initial: initialServices,
    message: "Elija un servicio de Git",
    choices: [ { title: 'Github', value: GitServices.GitHub }, { title: 'Gitlab', value:  GitServices.GitLab}]
    }]);

    //  Chequear las variables de entorno 
    if ( gitServices.git === GitServices.GitHub && !process.env.GITHUB_TOKEN) {
      logWarning('A fin de que la herramienta funcione debe configurar una variable de entorno GITHUB_TOKEN');  
    }
    if ( gitServices.git === GitServices.GitLab && !process.env.GITLAB_TOKEN) {
      logWarning('A fin de que la herramienta funcione debe configurar una variable de entorno GITLAB_TOKEN');  
    }
    const models: Choice[] = readJsonSync(`${COMMAND_FOLDER}/models.json`);
    const automationModel = await prompts([{
      type: "select",
      name: "model",
      message: "Elija un modelo de automatizacion",
      choices: models.concat([{ title: 'Personalizado', value: 'custom', description: 'En este caso los comandos son configurados fuera de la herramienta y los lee de la carpeta commands en el root del repo' } ]) 
      }]);
    // Si es custom pregunta si quiere tomar de base alguno existente
    if ( automationModel.model === 'custom' ) {
      const baseModel = await prompts([{
        type: "select",
        name: "model",
        message: "Quiere tomar algun modelo existente de base ? Este se copiara a la carpeta ",
        choices: models.concat( [{ title: 'No quiero usar ningun modelo', value: 'none'}])
        }]);  
      if ( baseModel.model !== 'none' ) {
        console.log('copy archivos..');
      }
    }
    // Gestion del Proyecto
    const projectServices = await prompts([{
      type: "select",
      name: "project",
      initial: initialServices,
      message: "Gestion de proyecto",
      choices: [ { title: 'Github Projects', value: ProjectServices.GitHub}, { title: 'GitLab Projects', value: ProjectServices.GitLab} , { title: 'Jira', value: ProjectServices.Jira}  , { title: 'None', value: ProjectServices.None} ]
    }]);

    
    if ( projectServices.project === ProjectServices.GitHub || projectServices.project === ProjectServices.GitLab) {
      
      // Gestion del Proyecto
      const backlogColumn = await prompts([{
        type: "text",
        name: "backlogColumn",
        initial: 'Todo',
        message: "Nombre de la columna donde se crean nuevos issues"
      }]);
      optionals['backlogColumn'] = backlogColumn.backlogColumn;
      logInfo(`Por omision ser utilizan proyectos dentro de ${data.repositoryOwner} y ${data.repositoryRepo} `);  
    }
    const projectId = await prompts([{
      type: "text",
      name: "projectId",
      message: "Id del proyecto"
    }]);  

//    console.log('Genera documentacion');
  const config = { model: automationModel.model, gitServices: gitServices.git, projectServices: projectServices.project, projectId: projectId.projectId, ...optionals };
  
  try {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2) );
  } catch {
    throw new Error(`No se pudo guardar la configuracion en ${CONFIG_FILE}`  );
  }

  return true;
}

export function storeConfig(variable:string, value: AnyValue) {
  let config: ObjectRecord= {};
  if ( fs.existsSync(CONFIG_FILE) ) {
    const content = fs.readFileSync(CONFIG_FILE, "utf8");
    try {
      config = JSON.parse(content);
    } catch {
      throw new Error(`Verifique que el ${CONFIG_FILE} sea json valido`  );
    }
  }
  config[variable] = value;
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2) );

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

export function readJsonSync(filename: string): prompts.Choice[] {
  const content = fs.readFileSync(filename, "utf8");
  const data = JSON.parse(content);
  return data;
}

