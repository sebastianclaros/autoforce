import fs from "fs";
import { fileURLToPath } from 'url';
import prompts, { Choice } from "prompts";
import context, { ProjectServices, GitServices } from "./context.js";
import { logInfo, logWarning } from "./color.js";
import { AnyValue, ObjectRecord } from "../types/auto.js";
import { config } from "process";
const COMMAND_FOLDER = searchInFolderHierarchy('commands', fileURLToPath(import.meta.url));
export const CONFIG_FILE = process.cwd() + '/.autoforce.json';
export const TEMPLATES_FOLDER = searchInFolderHierarchy('templates', fileURLToPath(import.meta.url));
export const TEMPLATE_MODEL_FOLDER = TEMPLATES_FOLDER + '/' + getConfig('modelTemplates', 'modelA');
export const DICTIONARY_FOLDER =  TEMPLATE_MODEL_FOLDER + "/diccionarios";
export const WORKING_FOLDER = process.env.INIT_CWD || ".";
export const filterJson = (fullPath: string): boolean => fullPath.endsWith(".json");
export const filterDirectory = (fullPath: string): boolean => fs.lstatSync(fullPath).isDirectory();
export const filterFiles = (fullPath: string): boolean => !fs.lstatSync(fullPath).isDirectory();
export const filterBash = (fullPath: string): boolean => fullPath.endsWith(".bash");

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
    const filename = searchInFolderHierarchy( "package.json", process.cwd() ); 
    if ( !filename ) {
      throw new Error("No se encontro el package.json en " + process.cwd());
    }
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

export function findChoicesPosition( choices: Choice[], value: string) {
  const index =  choices.findIndex( choice => choice.value === value );
  return index === -1 ? 0: index;
}

async function getTaskConfig(config: Record<string, AnyValue>): Promise<Record<string, AnyValue>| undefined> {
    // TODO: Ver si esto se mueve a un config list
    // List Command settings
    const filters = context.listFilters();  
    const listFilter = await prompts([
      {
            message: 'Elija un filtro, o bien lo puede dejar fijo en autoforce como listFilter',
            name: 'filter', 
            type: 'select',
            initial: findChoicesPosition(filters,  config.listFilter ),
            choices: filters
        }
    ]);
    if ( listFilter.filter === undefined) return ;
    config.listFilter= listFilter.filter;
    const files = getFiles(`${TEMPLATES_FOLDER}/${config.modelTemplates}`, filterBash ).map( filename => filename.split(".")[0] );
    if ( files.length > 0 ) {
      const templates: Choice[] = valuesToChoices(files);
      const template = await prompts([
          {
              message: 'Elija un template, o bien lo puede dejar en autoforce como listTemplate',
              name: 'template', 
              type: 'select',
              initial: findChoicesPosition(templates,  config.listTemplate ),
              choices: templates
          }
      ]);
      if ( template.template === undefined) return ;      
      config.listTemplate = template.template;
    }
  return config;
}

async function getBaseConfig(config: Record<string, AnyValue>): Promise<Record<string, AnyValue> | undefined> {
   // Todo: Chequear el repoOwner y repo
   const gitChoices = [ { title: 'Github', value: GitServices.GitHub }, { title: 'Gitlab', value:  GitServices.GitLab}];
 
   // Preguntar por GitHub o GitLab
   const gitServices = await prompts([{
       type: "select",
       name: "git",
       message: "Elija un servicio de Git",
       initial: findChoicesPosition( gitChoices,  config.gitServices),
       choices: gitChoices
     }]);
     if ( gitServices.git === undefined) process.exit(0);
     config.gitServices = gitServices.git;
 
     //  Chequear las variables de entorno 
     if ( gitServices.git === GitServices.GitHub && !process.env.GITHUB_TOKEN) {
       logWarning('A fin de que la herramienta funcione debe configurar una variable de entorno GITHUB_TOKEN');  
     }
     if ( gitServices.git === GitServices.GitLab && !process.env.GITLAB_TOKEN) {
       logWarning('A fin de que la herramienta funcione debe configurar una variable de entorno GITLAB_TOKEN');  
     }
 
     // Selecciona el modelo de automatizacion
     const models: Choice[] = readJsonSync(`${COMMAND_FOLDER}/models.json`);
     models.push( { title: 'Personalizado', value: 'custom', description: 'En este caso los comandos son configurados fuera de la herramienta y los lee de la carpeta commands en el root del repo' });     
     const automationModel = await prompts([{
       type: "select",
       name: "model",
       message: "Elija un modelo de automatizacion",
       initial: findChoicesPosition( models,  config.model ),
       choices: models 
       }]);
     if ( automationModel.model === undefined) return;
     config.model = automationModel.model;
 
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
     const projectChoices = [ { title: 'Github Projects', value: ProjectServices.GitHub}, { title: 'GitLab Projects', value: ProjectServices.GitLab} , { title: 'Jira', value: ProjectServices.Jira}  , { title: 'None', value: ProjectServices.None} ]
     const projectServices = await prompts([{
       type: "select",
       name: "project",
       message: "Gestion de proyecto",
       initial: findChoicesPosition( projectChoices,  config.projectServices),
       choices: projectChoices
     }]);
     if ( projectServices.project === undefined) return;
     config.projectServices = projectServices.project;;     
 
     if ( projectServices.project === ProjectServices.GitHub || projectServices.project === ProjectServices.GitLab) {      
       // Gestion del Proyecto
       const backlogColumn = await prompts([{
         type: "text",
         name: "backlogColumn",
         initial: config.backlogColumn,
         message: "Nombre de la columna donde se crean nuevos issues"
       }]);
       if ( backlogColumn.backlogColumn === undefined) return ;      
       config.backlogColumn = backlogColumn.backlogColumn;
       logInfo(`Por omision ser utilizan proyectos dentro de ${context.repositoryOwner} y ${context.repositoryRepo} `);  
     }
 
   // Id de Projecto
   const projectId = await prompts([{
     type: "text",
     name: "projectId",
     initial: config.projectId,
     message: "Id del proyecto"
   }]);  
   if ( projectId.projectId === undefined) return ;      
   config.projectId = projectId.projectId;
 
   // Modelo de Dcumentacion
   const modelsTemplates: Choice[] = readJsonSync(`${TEMPLATES_FOLDER}/models.json`);
   const modelTemplates = await prompts([{
     type: "select",
     name: "model",
     message: "Elija un modelo de documentacion",
     initial: findChoicesPosition( modelsTemplates,  config.modelTemplates ),
     choices: modelsTemplates 
   }]);
   if ( modelTemplates.model === undefined) return ;      
   config.modelTemplates = modelTemplates.model;
  return config;
}

export async function createConfigurationFile(taskName?: string) {
  const baseConfig = { backlogColumn: context.backlogColumn, model: context.model, modelTemplates: context.modelTemplates ,gitServices: context.gitServices, projectServices: context.projectServices, projectId: context.projectId, listFilter: context.listFilter, listTemplate: context.listTemplate  };
  let config = taskName ? await getTaskConfig(baseConfig): await getBaseConfig(baseConfig);
  if ( !config ) return false;
  storeConfig(config);

  return true;
}

export function getConfigFile( file: string, variable:string, defaultValue: AnyValue) {
  if ( fs.existsSync(file) ) {
    const content = fs.readFileSync(file, "utf8");
    try {
      const config = JSON.parse(content);
      if ( config[variable] ) {
        return config[variable];
      } 
    } catch { 
      return defaultValue;
    }
  }
  return defaultValue;
}

export function getConfig(variable:string, defaultValue: AnyValue) {
  return getConfigFile(CONFIG_FILE, variable, defaultValue);
}
export function storeConfig(record:Record<string, AnyValue>) {
  let config: ObjectRecord= {};
  if ( fs.existsSync(CONFIG_FILE) ) {
    const content = fs.readFileSync(CONFIG_FILE, "utf8");
    try {
      config = JSON.parse(content);
    } catch {
      throw new Error(`Verifique que el ${CONFIG_FILE} sea json valido`  );
    }
  }
  for(const [variable, value] of Object.entries(record)) {
    config[variable] = value;
  } 
  try {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2) );
  } catch {
    throw new Error(`No se pudo guardar la configuracion en ${CONFIG_FILE}`  );
  }
  
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

