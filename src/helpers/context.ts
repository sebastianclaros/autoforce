import { executeShell, getOrganizationObject, getCurrentOrganization, getBranchName, getTargetOrg } from "./taskFunctions.js"
import { convertNameToKey, convertKeyToName,  getFiles, filterDirectory, addNewItems, CONFIG_FILE, createConfigurationFile} from "./util.js";
import {GitHubApi} from "./github-graphql.js";
import {GitHubProjectApi} from "./github-project-graphql.js";
import {GitLabApi} from "./gitlab-graphql.js";
import prompts, { Choice } from "prompts";
import matter from 'gray-matter';
import fs from "fs";
import type { PromptChoices } from "../types/helpers/context.js";
import type { IProcessHeader, Processes, AnyValue, IProcessInfo, ObjectRecord, IObjectRecord } from "../types/auto.js";
import type { TaskArguments, TaskArgument, StepArguments } from "../types/helpers/tasks.js";
import { logError, logWarning } from "./color.js";

export enum GitServices {
    GitHub = 'github',
    GitLab = 'gitlab',
    None = 'none'
}

export enum ListFilters {
    Mios = 'mios',
    PorMilestone = 'milestone',
    PorLabel = 'label'
}

export enum ProjectServices {
    GitHub = 'github',
    GitLab = 'gitlab',
    Jira = 'Jira',
    None = 'none'
}

const filterProcesses: (fullPath: string) => boolean = (fullPath) =>  fullPath.endsWith(".md"); // && !fullPath.endsWith("intro.md") 
const ISSUES_TYPES = [ { value: 'feature', title: 'feature' }, { value: 'bug', title: 'bug' }, { value: 'documentation', title: 'documentation' }, { value: 'automation', title: 'automation' }];

function searchInFolderHierarchy( element: string, parentFolder: string ): string {
    if ( fs.existsSync( `${parentFolder}/${element}` )) {
      return parentFolder;
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
  
function getDataFromPackage() {
    const data :Record<string,string> = {};
    try {
      const PROJECT_FOLDER = searchInFolderHierarchy('package.json', process.cwd() || '.');  
      const filename = `${PROJECT_FOLDER}/package.json`; 
      if ( !fs.existsSync( filename )) {
        throw new Error("No se encontro el package.json en " + PROJECT_FOLDER);
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
  
class Context implements IObjectRecord {
    [s: string]: AnyValue | undefined;
    devModel: string|undefined; // Default Model de commands
    gitModel: string|undefined;
    docModel: string|undefined;
    projectModel: string|undefined;
    gitServices: GitServices = GitServices.None; 
    isGitApi = false;
    gitApi: IGitApi | undefined;
    version :string | undefined;    
    dictionaryFolder:string = process.cwd() + "/docs";

    options: Record<string,AnyValue> = {};

    projectServices: ProjectServices = ProjectServices.None; 
    isProjectApi = false;
    projectApi: IProjectApi | undefined;

    sfInstalled = true; 
    sfToken = true;

    branchName: string | undefined;
    issueNumber: string | undefined;
    issueType: string | undefined;

    _process: string | undefined;
    _processesHeader: Record<string, IProcessHeader> | undefined;

    _newIssueNumber: string | undefined;
    _newIssueType: string | undefined;
    newBranchName: string | undefined;
    
    defaultDias = 7
    permissionSet: string | undefined;
    issueTitle: string | undefined;
    isVerbose = false;
    _scratch: OrganizationInfo | undefined;
    _branchScratch: OrganizationInfo | undefined;
    existNewBranch = false; 
    _targetOrg: string | undefined;

    // Documentacion
    processes: Processes | undefined;   
    // Ultima salida del shell
    salida = '';

    // Git Repository
    repositoryUrl: string | undefined;
    repositoryType: string | undefined;
    repositoryOwner: string | undefined;
    repositoryRepo: string | undefined;
    // Project Reference    
    projectId: string | undefined;
    backlogColumn = 'Todo';

    //Templates especiales
    listFilter = ListFilters.Mios;
    listTemplate = 'openIssues';

    constructor() {
        this.loadConfig();
        this.loadPackage();
        
    }
    async labels() {
        const choices: Choice[]= [{value: '', title: 'Ninguno' }, {value: 'new', title: 'Nuevo' }];
        const labels = await this.gitApi?.getLabels();
        if (labels) {
            labels.forEach( label => choices.push( {value: label.name, title: label.name }) );
        }
        return choices;
    } 

    listFilters(){
        const filters: Choice[] = [{  title: 'Solo mios abiertos',  value: ListFilters.Mios,  description: 'Busca los issues donde este asignado y esten en state Open'},{  title: 'Por Milestone',  value: ListFilters.PorMilestone,  description: 'Busca los issues de un deterinado milestone'},{  title: 'Por Label',  value: ListFilters.PorLabel, description: 'Busca los issues de un deterinado label'}];
        return filters;
    }
    async milestoneNumbers() {
        const choices: Choice[] = [{value: '', title: 'Ninguno' }];
        const milestones = await this.gitApi?.getMilestones();
        if (milestones) {
            milestones.forEach( milestone => choices.push( {value: milestone.number, title: milestone.title }) );
        }
        return choices;
    }
    async milestones() {
        const choices: Choice[] = [{value: '', title: 'Ninguno' }, {value: 'new', title: 'Nuevo' }];
        const milestones = await this.gitApi?.getMilestones();
        if (milestones) {
            milestones.forEach( milestone => choices.push( {value: milestone.id, title: milestone.title }) );
        }
        return choices;
    }
    loadProjectApi() {
        if ( !this.isProjectApi ) {
            if ( this.projectServices == ProjectServices.GitHub && process.env.GITHUB_TOKEN ) {
                if ( this.repositoryOwner &&  this.repositoryRepo ) {
                    const token = process.env.GITHUB_TOKEN ;
                    const projectId = this.projectId && !Number.isNaN(this.projectId) ? Number.parseInt(this.projectId): undefined;
                    if (!projectId) {
                        throw Error('Para gestionar proyectos en Github se necesita el projectId. npx autoforce config');
                    }
                    this.gitApi = this.projectApi = new GitHubProjectApi(token, this.repositoryOwner, this.repositoryRepo, projectId);
                    this.isProjectApi = true;

                    if ( this,this.gitServices == GitServices.GitHub ) {
                        this.isGitApi = true;                        
                    }
                } else {
                    logWarning(`No se pudo inicializar el conector a GitHub, Verifique repositoryOwner: ${this.repositoryOwner} o  repositoryRepo: ${this.repositoryRepo} o projectId: ${this.projectId}`);
                }
            }
    
            if ( this.projectServices == ProjectServices.GitLab && process.env.GITLAB_TOKEN ) {
                if ( this.repositoryOwner &&  this.repositoryRepo ) {
                    const token = process.env.GITLAB_TOKEN ;
                    const projectId = this.projectId && Number.isInteger(this.projectId) ? Number.parseInt(this.projectId): undefined;
                    this.gitApi = this.projectApi = new GitLabApi(token, this.repositoryOwner, this.repositoryRepo, projectId);
                    this.isProjectApi = true;
                } else {
                    logWarning(`No se pudo inicializar el conector a GitLab, Verifique repositoryOwner: ${this.repositoryOwner} o  repositoryRepo: ${this.repositoryRepo} o projectId: ${this.projectId}`);
                }
            }
        }

    }

    loadGitApi() {
        if ( !this.isGitApi ) {
            if ( !this.gitServices && this.repositoryUrl) {
                if ( this.repositoryUrl.indexOf('github') > 0 ) {
                    this.gitServices = GitServices.GitHub;            
                } else if ( this.repositoryUrl.indexOf('gitlab') > 0  ) {
                    this.gitServices = GitServices.GitLab;
                }
            }
    
            if ( this.gitServices == GitServices.GitHub && process.env.GITHUB_TOKEN ) {
                if ( this.repositoryOwner &&  this.repositoryRepo ) {
                    const token = process.env.GITHUB_TOKEN ;
                    this.gitApi = new GitHubApi(token, this.repositoryOwner, this.repositoryRepo);
                    this.isGitApi = true;
                } else {
                    logWarning(`No se pudo inicializar el conector a GitHub, Verifique repositoryOwner: ${this.repositoryOwner} o  repositoryRepo: ${this.repositoryRepo} o projectId: ${this.projectId}`);
                }
            }
    
            if ( this.gitServices == GitServices.GitLab && process.env.GITLAB_TOKEN ) {
                if ( this.repositoryOwner &&  this.repositoryRepo ) {
                    const token = process.env.GITLAB_TOKEN ;
                    this.gitApi = new GitLabApi(token, this.repositoryOwner, this.repositoryRepo);
                    this.isGitApi = true;
                } else {
                    logWarning(`No se pudo inicializar el conector a GitLab, Verifique repositoryOwner: ${this.repositoryOwner} o  repositoryRepo: ${this.repositoryRepo} o projectId: ${this.projectId}`);
                }
            }
        }
    }

    loadPackage() {
        const data = getDataFromPackage();
        this.repositoryUrl = data.repositoryUrl;
        this.repositoryOwner = data.repositoryOwner;
        this.repositoryRepo = data.repositoryRepo;        
    }

    async loadConfig() {
        if ( !fs.existsSync(CONFIG_FILE) ) {
            logWarning('Bienvenido! La herramienta Autoforce necesita un primer paso de configuracion antes de usarla.');
            logWarning('- Podes usar el asistente ejecutando npx autoforce config' );
            logWarning('- Podes hacerlo manualmente leyendo la documentacion y creando .autoforce.json manualmente en el root del proyecto (https://sebastianclaros.github.io/autoforce/docs/configuracion)'); 

            const answer = await prompts([
                {
                  type: "confirm",
                  name: "asistente",
                  message: "Queres ejecutar el asistente ahora?"
                }
              ]);  
            if ( answer.asistente ) {
                await createConfigurationFile();
                return true; 
            } 
            return false;  
        }
        const content = fs.readFileSync(CONFIG_FILE, "utf8");
        try {
          const config: ObjectRecord = JSON.parse(content);
          for( const key in config ) {
            this.set(key, config[key] );
        }
        } catch {
          throw new Error(`Verifique que el ${CONFIG_FILE} sea json valido`  );
        }
        return true
    }

    init() {
        this.loadProjectApi();
        this.loadGitApi();

        // 
        this.branchName = getBranchName();

        if ( typeof this.branchName === 'string') {
            this.issueFromBranch(this.branchName);
        }
    }

    get targetOrg() {
        if ( !this._targetOrg ) {
            this._targetOrg= getTargetOrg();        
        }
        return this._targetOrg;
    }

    get existBranchScratch() {  
        return typeof this._branchScratch !== 'undefined';        
    }
    get branchScratch() {    
        if ( !this._branchScratch && this.branchName ) {
            this._branchScratch= getOrganizationObject(this.branchName);
        }
        return this._branchScratch;
    }

    getProcessHeader(fullpath: string) {
        const fileContents = fs.readFileSync(fullpath, 'utf8');
        const { data } = matter(fileContents);
        return data;
    }
    addProcessMetadata(component: string, items: string[]) {
        if ( !this.process ) {
            throw new Error(`No hay proceso configurado`  );
        }
        const content = fs.readFileSync(CONFIG_FILE, "utf8");
        try {
          const config = JSON.parse(content);
          const processes: Processes = config.processes || {};
          if ( !processes[this.process] )  {
            processes[this.process] = {};
          }
          if ( !processes[this.process][component]  )  {
            processes[this.process][component] = [];
          }
          addNewItems(processes[this.process][component], items) ;
          config.processes = processes;

          fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2) );

        } catch {
          throw new Error(`No se pudo guardar la metadata`  );
        }
    }

    get processesHeader(): Record<string,IProcessHeader> {
        if ( !this._processesHeader ) {
            this._processesHeader = {};
            const folders = getFiles(this.dictionaryFolder, filterDirectory, true, ['diccionarios']);
            for ( const folder of folders )  {
                const fullpath = `${this.dictionaryFolder}/${folder}`;
                const filenames = getFiles( fullpath, filterProcesses );
                for ( const filename of filenames ) {
                    const header = this.getProcessHeader(fullpath + "/" + filename); 
                    if ( header.process ) {
                        this._processesHeader[header.process] = { ...header, folder: fullpath, filename };
                    }
                }
            }
        }
        return this._processesHeader;
    }

    // TODO: merge con getProcessFromDocs
    getProcessMetadata(): IProcessInfo[] {
        const folders = getFiles(this.dictionaryFolder, filterDirectory, true, ['diccionarios']);
        const retArray = [];
        for ( const folder of folders )  {
            const fullpath = `${process.cwd()}/docs/${folder}`;
            const processes = getFiles( fullpath, filterProcesses );
            for ( const process of processes ) {
                const header = this.getProcessHeader(fullpath + "/" + process); 
                const processKey = convertNameToKey(header.slug || header.title || process);
                if ( this.processes && this.processes[processKey] ) {
                    retArray.push( 
                        {
                            folder,
                            name: convertKeyToName(processKey),
                            ...this.processes[processKey]
                        }
                    ) 
                } 
            }
        }
        return retArray;
    }

    getModules(): string[] {
        return getFiles(this.dictionaryFolder, filterDirectory, false, ['diccionarios']);
    }

    get modules(): PromptChoices {
        return this.getModules().map( module => { return { value: module, title: module } } ) ;    
    }

    get existScratch(): boolean {
        return typeof this.scratch !== 'undefined';
    }
    get scratch(): OrganizationInfo {
        if ( !this._scratch ) {
            this._scratch= getCurrentOrganization();
        }
        return this._scratch;
    }

    async validate(guards: string[] ) {
        for(const guard of guards) {
            // Chequeo de variables de entorno
            if ( guard[0] === '$' ){
                if ( !process.env[guard.substring(1)] ) {
                    throw new Error(`La variable de entorno ${guard} no esta configurada.`);
                }
            } else {                
                const value = await this.get(guard);
                if ( !value ) {
                    throw new Error(`No se encontro la variable ${guard} en el contexto. Ejecute yarn auto config o lea el index.md para mas informacion.`);
                }
            }
            
        }
    }

    issueFromBranch(branchName: string) {
        const branchSplit = branchName.split("/");
        if ( branchSplit.length > 1 ) {
            this.issueType = branchSplit[0];
            if ( !Number.isNaN(Number(branchSplit[1])) ) {
                this.issueNumber =  branchSplit[1] ;
            } else {
//                    [this.issueNumber, this.issueTitle] = branchSplit[1].split() // /^([^ -]+)[ -](.*)$/.exec( branchSplit[1]).slice(1);
            }
        }
    }
    branchNameFromIssue (issueType: string, issueNumber: string, title?: string ) {
        let baseName =  issueType + '/' + issueNumber;
        if ( title ) {
            baseName += ' - ' + title.replaceAll(' ', '-');
        }
        return baseName;
    } 
    get isDevelopment() {
        return this.issueType === 'feature' || this.issueType === 'fix';
    }
    get isNewDevelopment() {
        return this.newIssueType === 'feature' || this.newIssueType === 'fix';
    }

    get newIssueNumber() {
        return this._newIssueNumber;
    }
    set newIssueNumber(value) {
        this._newIssueNumber = value;        
        if ( this.newIssueType )  {
            this.setNewBranchName();
        }
    }
    get newIssueType() {
        return this._newIssueType;
    }
    set newIssueType(value) {
        this._newIssueType = value;
        if ( this.newIssueNumber )  {
            this.setNewBranchName();
        }
    }
    setNewBranchName() {
        if ( this.newIssueType && this.newIssueNumber ) {
            this.newBranchName =  this.branchNameFromIssue(this.newIssueType, this.newIssueNumber );
            const salida =  executeShell(`git show-ref refs/heads/${this.newBranchName}`);
            this.existNewBranch = typeof salida === 'string'  && (salida.includes(this.newBranchName));                    
        }
    }
    async askFornewBranchName() { 
        if ( !this.newBranchName ) {
            if ( !this.newIssueType  ) {
                this.newIssueType = await this.askFornewIssueType();
            }

            if ( !this.newIssueNumber  ) {
                this.newIssueNumber = await this.askFornewIssueNumber();
            }
            this.setNewBranchName();
        }
        return this.newBranchName;
    }    

    async askFornewIssueNumber() {
        const answer = await prompts([
            {
              type: "text",
              name: "newIssueNumber",
              message: "Por favor ingrese el nuevo issueNumber?"
            }
          ]);  
                        
        return answer.newIssueNumber;
    }

    set process( value ) {
        this._process = value;
    }

    getProcessFromTitle(title: string) {
        const desde = title.indexOf('[');
        const hasta = title.indexOf(']', desde);
        if ( desde !== -1 && hasta !== -1 ) {
            return title.substring( desde + 1, hasta );
        }
        return ; 
    }

    get process() {
        if ( !this._process && this.issueTitle) {
            const process = this.getProcessFromTitle(this.issueTitle);
            if ( process ){
                this._process = process;
            }
        }
        
        return this._process;
    }

    async askForprocess() {
        if ( this.projectApi && !this.issueTitle && this.issueNumber ) {
            const issue = await this.projectApi.getIssue(this.issueNumber);
            this.issueTitle =  issue.title;
        }
        if ( this.issueTitle ) {
            const process =   this.getProcessFromTitle(this.issueTitle);
            if ( process && this.processesHeader[process]){
                return process;
            }
        }
        const choices = Object.values(this.processesHeader).map( header => {
            return { value: header.process, title: header.title }; 
        });
        const answer = await prompts([{
            type: "select",
             name: "process",
             message: "Por favor seleccione el proceso",
             choices
            }]);  
                        
        return answer.process;
    }

    async askFornewIssueType() {
        const answer = await prompts([
            {
              type: "list",
              name: "newIssueType",
              initial: "feature",
              message: "Por favor ingrese el type del issue?",
              choices: ISSUES_TYPES 
            }
          ]);
        return answer.newIssueType;
    }

    async convertToArrayOfInputs(inputs: TaskArguments): Promise<TaskArgument[]> {
        let inputsArray: TaskArgument[] = [];
        if ( Array.isArray(inputs) ) {
            // Si viene los args como ['name1', 'names] lo convierte a [{name: 'name1'}, {name: 'name2'}]
            inputsArray = inputs.map( input => { return { name: input, type: 'text', message: `Por favor ingrese ${input}?` }});
        } else {
            // Si viene args como objeto { name1: {...}, name2: {...}} lo convierte a [{name: name1...}, {name: name2...}]
            for (const key in inputs) {
                if (typeof inputs[key].default === 'string') {
                    inputs[key].initial = this.merge(inputs[key].default) ;
                }

                if (typeof inputs[key].values === 'string') {
                    const methodName = inputs[key].values as keyof typeof this;
                    if (typeof this[methodName] === 'function') {                     
                        const choices = await (this[methodName] as () => Promise<any>)();
                        if (Array.isArray(choices)) {
                            inputs[key].choices = choices;
                        }                            
                    }
                }

                inputsArray.push( {...{name: key, type: 'text', message: `Por favor ingrese ${key}?`}, ...inputs[key]} ) ;
            }
        }
        return inputsArray;
    }

    async askForExit() {
        const answer = await prompts([
            {
              type: "confirm",
              name: "exit",
              initial: true,
              message: "Desea salir?"
            }
          ]);
        if ( answer.exit ) {
            process.exit(-1);
        }
    }
    mergeArgs(args: StepArguments): StepArguments {
        if ( Array.isArray(args) ) {
            const argsArray = [];
            for ( const argName of args) {
                if ( typeof argName === 'string' ) {
                    argsArray.push( this.merge(argName) );
                }
            }
            return argsArray;
        } else if ( typeof args === 'object' ) {
            const argsObject: Record<string, string> = {};    
            for ( const argName in args) {
                argsObject[argName] =  this.merge(args[argName]);
            }
            return argsObject;
        }
        throw new Error(`Los argumentos ${args} son incompatibles para el merge`);
    }

    async askForArguments(inputs: TaskArguments) {
        // unifica los dos tipos de inputs (array y objeto) en un array de inputs
        const inputsArray =  await this.convertToArrayOfInputs(inputs);

        for(const input of inputsArray) {
            const hasValue = await this.get(input.name as string);
            if ( !hasValue ) {
                const answer = await prompts([input], {onCancel: this.askForExit});
                this[input.name as keyof IObjectRecord] =  answer[input.name as string];
            }
        }
    }
    setObject( obj: ObjectRecord ) {
        for ( const field in obj ) {
            Object.defineProperty(this, field, { value: obj[field], writable: true});
        }
    }

    set(key: keyof IObjectRecord, value: AnyValue): void {
        try {
            this[key] = value;
        } catch {
            throw new Error(`No se puede setear el ${key} con el valor ${value} en context`);
        }
    }
    
    // Devuelve el valor o hace un askFor si esta vacio
    async get(key: string): Promise<AnyValue> {
        try {
            const value = this[key as keyof IObjectRecord];
            if ( !value ) {
                const askForMethod = 'askFor' + key as keyof IObjectRecord;
                if ( this[askForMethod] && typeof this[askForMethod] == 'function' ) {
                    this[key as keyof IObjectRecord] = await this[askForMethod]();
                }
            }
            return this[key as keyof IObjectRecord];
        } catch {
            throw new Error(`No se puedo obtener la propiedad ${key} en context`);
        }
    }
    
    merge(text?: string): string {
        if( typeof text != 'string' || text.indexOf('${') === -1 ) {
            return text || ''; 
        }

        const matches = text.matchAll(/\$\{([^}]+)}/g);
        // si no tiene para merge
        if( matches === null ) {
            return text; 
        }
                
        // si es un texto con merges 
        for (const match of matches) {
            const mergedValue = this[match[1] as keyof IObjectRecord];
            // si es una sola variable
            if (match.index == 0 && text === match[0]) {
                return mergedValue as string;
            }
            if ( typeof mergedValue === 'string') {
                text = text.replace(match[0], mergedValue);
            } else if ( typeof mergedValue === 'number' || typeof mergedValue === 'boolean') {
                text = text.replace(match[0], mergedValue.toString());
            } else {
                throw new Error(`La propiedad '${match[1]}' del objeto context no es mergeable`);
            }
        }

        return text; 
    }
}

const context = new Context();
let initialized = false;

export function initializeContext() {
    try {
        if ( initialized === false) {
            context.init();
            initialized = true;
        }
    } catch (error) {
        if ( error instanceof Error ) {
            logError(error.message);
        }
        process.exit(1);
    }
}
export default context;