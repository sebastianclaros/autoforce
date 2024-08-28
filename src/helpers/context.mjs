import { executeShell, taskFunctions } from "./taskFunctions.mjs"
import { convertNameToKey, convertKeyToName,  getFiles, filterDirectory, addNewItems } from "./util.mjs";
import {GitHubApi} from "./github-graphql.mjs";
import {GitLabApi} from "./gitlab-graphql.mjs";
import prompts from "prompts";
import matter from 'gray-matter';
import fs from "fs";
const filterProcesses = (fullPath) =>  fullPath.endsWith(".md"); // && !fullPath.endsWith("intro.md") 

class Context {
    isGitApi = false;
    sfInstalled = true; 
    sfToken = true;

    branchName;
    issueNumber;
    issueType;

    _process;
    _processesHeader;

    _newIssueNumber;
    _newIssueType;
    newBranchName;
    
    defaultDias = 7
    permissionSet;
    issueTitle;
    isVerbose = false;
    projectPath = process.cwd();
    _scratch;
    existNewBranch = false; 

    // Repository
    repositoryUrl;
    repositoryType;
    repositoryOwner;
    repositoryRepo;
    
    loadGitApi() {
        if ( !this.repositoryOwner ||  !this.repositoryRepo) {
            throw new Error("Falta agregue repository en el package.json para obtener el Owner or Repo");
        }

        const isGithub = this.repositoryUrl.indexOf('github') > 0 ;
        const isGitlab = this.repositoryUrl.indexOf('gitlab') > 0 ;

        if ( isGithub && process.env.GITHUB_TOKEN ) {
            const token = process.env.GITHUB_TOKEN ;
            this.gitApi = new GitHubApi(token, this.repositoryOwner, this.repositoryRepo, this.projectNumber);
            this.isGitApi = true;
        }

        if ( isGitlab && process.env.GITLAB_TOKEN ) {
            const token = process.env.GITLAB_TOKEN ;
            this.gitApi = new GitLabApi(token, this.repositoryOwner, this.repositoryRepo, this.projectNumber);
            this.isGitApi = true;
        }

    }

    loadPackage() {
        try {
            const filename =  this.projectPath +  "/package.json";
            const content = fs.readFileSync(filename, "utf8");
            const packageJson = JSON.parse(content);
            
            if ( packageJson.repository ) {
                if ( packageJson.repository.url ) {
                    this.repositoryUrl = packageJson.repository.url;
                    this.repositoryType = packageJson.repository.type;
                    // Ver de sacar repo y owner
                    if ( this.repositoryUrl.includes("github.com") ) {
                        const repositoryArray =  this.repositoryUrl.split('github.com/');
                        [this.repositoryOwner, this.repositoryRepo] = repositoryArray[1].split('/');
                    }
                } else {
                    this.repositoryUrl = packageJson.repository;
                    const repositoryArray =  this.repositoryUrl.split(':');
                    this.repositoryType = repositoryArray[0];
                    [this.repositoryOwner, this.repositoryRepo] = repositoryArray[1].split('/');
                }
                if ( this.repositoryRepo.endsWith('.git') ) {
                    this.repositoryRepo = this.repositoryRepo.replace('.git', '');
                }
            } 

        } catch (error) {
            console.log(error);
            throw new Error(`Verifique que exista y sea valido el package.json`  );
        }  
    }

    loadConfig() {
        const filename =  this.projectPath +  "/.autoforce.json";
        const content = fs.readFileSync(filename, "utf8");
        try {
          const config = JSON.parse(content);
          for( const key in config ) {
            this.set( key, config[key] );
          }
        } catch (error) {
          throw new Error(`Verifique que el ${filename} sea json valido`  );
        }
      
    }


    init() {
        // Busca variables de entorno    
        this.loadConfig();
        this.loadPackage();
        this.loadGitApi();
        // 
        this.branchName = taskFunctions.getBranchName();

        if ( this.branchName ) {
            this.issueFromBranch(this.branchName);
        }
    }

    get targetOrg() {
        if ( !this._targetOrg ) {
            this._targetOrg= taskFunctions.getTargetOrg();        
        }
        return this._targetOrg;
    }

    get existBranchScratch() {  
        return typeof this._branchScratch !== 'undefined';        
    }
    get branchScratch() {    
        if ( !this._branchScratch ) {
            this._branchScratch= taskFunctions.getOrganizationObject(this.branchName);
        }
        return this._branchScratch;
    }

    getProcessHeader(fullpath) {
        const fileContents = fs.readFileSync(fullpath, 'utf8');
        const { data } = matter(fileContents);
        return data;
    }
    addProcessMetadata(component, items) {
        if ( !this.process ) {
            throw new Error(`No hay proceso configurado`  );
        }
        const filename =  this.projectPath +  "/.autoforce.json";
        const content = fs.readFileSync(filename, "utf8");
        try {
          const config = JSON.parse(content);
          const processes = config.processes;
          if ( !processes )  {
            processes = {};
          }
          if ( !processes[this.process] )  {
            processes[this.process] = {};
          }
          if ( !processes[this.process][component]  )  {
            processes[this.process][component] = [];
          }
          addNewItems(processes[this.process][component], items) ;
          config.processes = processes;

          fs.writeFileSync(filename, JSON.stringify(config, null, 2) );

        } catch (error) {
          throw new Error(`No se pudo guardar la metadata`  );
        }

    }

    get processesHeader() {
        if ( !this._processesHeader ) {
            this._processesHeader = {};
            const folders = getFiles(process.cwd() + "/docs", filterDirectory, true, ['diccionarios']);
            for ( const folder of folders )  {
                const fullpath = `${process.cwd()}/docs/${folder}`;
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
    getProcessMetadata() {
        const folders = getFiles(process.cwd() + "/docs", filterDirectory, true, ['diccionarios']);
        let retArray = [];
        for ( const folder of folders )  {
            const fullpath = `${process.cwd()}/docs/${folder}`;
            const processes = getFiles( fullpath, filterProcesses );
            for ( const process of processes ) {
                const header = this.getProcessHeader(fullpath + "/" + process); 
                const processKey = convertNameToKey(header.slug || header.title || process);
                if ( this.processes[processKey] ) {
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

    getModules() {
        return getFiles(process.cwd() + "/docs", filterDirectory, false, ['diccionarios']);
    }

    get modules() {
        return this.getModules().map( module => { return { value: module, title: module } } ) ;    
    }

    get existScratch() {
        return typeof this.scratch !== 'undefined';
    }
    get scratch() {
        if ( !this._scratch ) {
            this._scratch= taskFunctions.getCurrentOrganization();
        }
        return this._scratch;
    }

    async validate(guards) {
        for(const guard of guards) {
            const value = await this.get(guard);
            if ( !value ) {
                throw new Error(`No se encontro la variable ${guard} en el contexto. Ejecute yarn auto config o lea el index.md para mas informacion.`);
            }
        }
    }

    issueFromBranch(branchName) {
        const branchSplit = branchName.split("/");
        if ( branchSplit.length > 1 ) {
            this.issueType = branchSplit[0];
            if ( !isNaN(branchSplit[1]) ) {
                this.issueNumber = parseInt( branchSplit[1] );
            } else {
//                    [this.issueNumber, this.issueTitle] = branchSplit[1].split() // /^([^ -]+)[ -](.*)$/.exec( branchSplit[1]).slice(1);
            }
        }
    }
    branchNameFromIssue (issueType, issueNumber, title) {
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
        this.newBranchName =  this.branchNameFromIssue(this.newIssueType, this.newIssueNumber );
        const salida =  executeShell(`git show-ref refs/heads/${this.newBranchName}`);
        this.existNewBranch = salida && (salida.includes(this.newBranchName));        
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

    getProcessFromTitle(title) {
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
        if ( !this.issueTitle && this.issueNumber ) {
            const issue = await this.gitApi.getIssueObject(this.issueNumber);
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
              choices: [ "feature", "bug", "documentation", "automation" ]
            }
          ]);
        return answer.newIssueType;
    }

    convertToArrayOfInputs(inputs) {
        let inputsArray = [];
        if ( Array.isArray(inputs) ) {
            // Si viene los args como ['name1', 'names] lo convierte a [{name: 'name1'}, {name: 'name2'}]
            inputsArray = inputs.map( input => { return { name: input, type: 'text', message: `Por favor ingrese ${input}?` }});
        } else {
            // Si viene args como objeto { name1: {...}, name2: {...}} lo convierte a [{name: name1...}, {name: name2...}]
            for (let key in inputs) {
                const initial = inputs[key].default ? this.merge(inputs[key].default): undefined;
                inputsArray.push( {name: key, type: 'text', initial, message: `Por favor ingrese ${key}?`, ...inputs[key]} ) ;
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
    mergeArgs(args) {
        if ( Array.isArray(args) ) {
            let argsArray = [];
            for ( const argName of args) {
                argsArray.push( this.merge(argName) );
            }
            return argsArray;
        } else if ( typeof args === 'object' ) {
            let argsObject = {};    
            for ( const argName in args) {
                argsObject[argName] =  this.merge(args[argName]);
            }
            return argsObject;
        }
        return null;
    }

    async askForArguments(inputs) {
        // unifica los dos tipos de inputs (array y objeto) en un array de inputs
        const inputsArray = this.convertToArrayOfInputs(inputs);

        for(const input of inputsArray) {
            const hasValue = await this.get(input.name);
            if ( !hasValue ) {
                const answer = await prompts([this.mergeArgs(input)], {onCancel: this.askForExit});
                this[input.name] =  answer[input.name];
            }
        }
    }
    setObject( obj ) {
        for ( const field in obj ) {
            this[field] = obj[field];    
        }
    }

    set( field, value ) {
        this[field] = value;    
    }

    // Devuelve el valor o hace un askFor si esta vacio
    async get(variable) { 
        if ( !this[variable] ) {
            const askForMethod = 'askFor' + variable;
            if ( this[askForMethod] && typeof this[askForMethod] == 'function' ) {
                this[variable] = await this[askForMethod]();
            }
        }
        return this[variable];
    }

    merge(text) {
        if( typeof text != 'string' || text.indexOf('${') === -1 ) {
            return text; 
        }

        const matches = text.matchAll(/\$\{([^}]+)}/g);
        // si no tiene para merge
        if( matches === null ) {
            return text; 
        }
                
        // si es un texto con merges 
        for (const match of matches) {
            const mergedValue = this[match[1]];
            // si es una sola variable
            if (match.index == 0 && text === match[0]) {
                return mergedValue;
            }
            text = text.replace(match[0], mergedValue);

        }

        return text; 
    }
}

const context= new Context();
context.init();
export default context;