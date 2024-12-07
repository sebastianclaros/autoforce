import {execSync} from "child_process";
import context, { ListFilters } from "./context.js";
import { logError, logInfo} from "./color.js";
import metadata from './metadata.js';
import prompts, { Choice } from "prompts";
import templateGenerator from "./template.js";
import type { IStepCommand, IStepFunction, StepArguments, TaskFunction } from "../types/helpers/tasks.js";
import { AnyValue, ObjectRecord } from "../types/auto.js";
import { filterBash, getFiles, storeConfig, TEMPLATE_MODEL_FOLDER, valuesToChoices } from "./util.js";


function generateTemplate( templateFolder: string, templateExtension: string, template: string, context: ObjectRecord) {
    if (!template || !templateFolder || !templateExtension) {
        return;
    }
    const templateEngine = templateGenerator(templateFolder, templateExtension);

    const formulas = {
        today: Date.now(),
    };
    const view = { ...formulas, ...context};
    templateEngine.read(template);
    templateEngine.render(view);
    return templateEngine.rendered;
}

function createTemplate( templateFolder: string, templateExtension: string, template: string, filename: string, folder: string, context: ObjectRecord) {
    if (!template || !filename || !templateFolder || !templateExtension) {
        return;
    }
    const templateEngine = templateGenerator(templateFolder, templateExtension);

    const formulas = {
        today: Date.now(),
        filename
    };
    const view = { ...formulas, ...context};
    templateEngine.read(template);
    templateEngine.render(view);
    templateEngine.save(filename, folder );
}


function convertArgsToString(args: StepArguments) {
    let argsString = '';
    if ( Array.isArray(args) ) {
        for ( const argName of args) {
            argsString += context.merge(argName) + ' ';
        }    
    } else if ( typeof args === 'object' ) {
        for ( const argName in args) {
            if ( !args[argName]  ) {
                argsString += argName + ' ';                
            } else {
                argsString += argName + '=' + context.merge(args[argName]) + ' ';
            }
        }
    }
    return argsString;

}

export async function executeCommand(step: IStepCommand) {
    try {
        context.set('command', step.command + ' ' + convertArgsToString(step.arguments) );
        execSync(step.command + ' ' + convertArgsToString(step.arguments), {stdio: 'inherit'});   
   
        return true;
    } catch {
        return false;
    }
}

export function validateCommand(step: IStepCommand) {
    if ( step.command && typeof step.command == 'string' ) {
        return true;
    }
    return false;
}

export function validateFunction(step: IStepFunction) {
    if ( typeof taskFunctions[step.function] !== 'function' ) {       
        logError(`No se encontro la funcion ${step.function}`);
        return false;
    }
    if ( typeof step.arguments !== 'undefined' ) {        
        if ( typeof step.arguments !== 'object'  ) {
            logError(`La funcion ${step.function} recibio un argumento de tipo ${typeof step.arguments} y solo soporta object`);
            return false;    
        }
    }

    return true;
}

function getParams<T>(func: TaskFunction<T>) {
    // String representation of the function code
    let str = func.toString(); 
    str = str.replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/\/\/(.)*/g, '')
        .replace(/{[\s\S]*}/, '')
        .replace(/=>/g, '')
        .trim();
    // Start parameter names after first '('
    const start = str.indexOf("(") + 1;
    // End parameter names is just before last ')'
    const end = str.length - 1;
    const result = str.substring(start, end).split(", ");
    const params: string[] = [];
    result.forEach(element => {
        element = element.replace(/=[\s\S]*/g, '').trim();
        if (element.length > 0){
            params.push(element);
        }
    });
    return params;
}
function createArray(fields: string[], record: Record<string,string>) {
    const fieldArray =[]; 
    for ( const field of fields ) {
        const value = record[field];
        fieldArray.push( value );
    }
    return fieldArray;
} 
   
async function askForContinue(message: string) {
    const answer = await prompts([
        {
        type: "confirm",
        name: "continue",
        initial: true,
        message
        }
    ]);
    return answer.continue;
}

async function askForCommitMessage() {
    const answer = await prompts([
        {
        type: "text",
        name: "message",
        initial: "fix",
        validate: value => value.length > 0 ? true : "El mensaje es requerido",
        message: "Mensaje del commit"
        }
    ]);
 
    return answer.message;
}

export function getCurrentOrganization(): OrganizationInfo {
    const salidaConfig = executeShell( 'sf config get target-org --json' );
    const salidaConfigJson: SFConfigGetValue = JSON.parse(salidaConfig);
    const targetOrg =  salidaConfigJson.result[0];

    const salidaOrgList = executeShell( 'sf org list --json' );
    const salidaOrgListJson:OrganizationResults = JSON.parse(salidaOrgList);
    
    for ( const orgType in salidaOrgListJson.result ) {
        for ( const orgObject of salidaOrgListJson.result[orgType] ) {
            if ( orgObject.alias === targetOrg.value ) {
                if ( orgObject?.isExpired === true ) {
                    throw new Error(`La scratch ${orgObject.alias} ha expirado!`);
                }  
                return orgObject;
            }
        }
    }
    throw new Error(`No se encontro la organizacion ${targetOrg.value} verifique que este activa con: sf org list. `);
}

// type: 'scratchOrgs', 'sandboxes', others
export function getOrganizationObject(alias: string, type = 'scratchOrgs'):OrganizationInfo {
    const salida = executeShell( 'sf org list --json' );
    const salidaJson:OrganizationResults = JSON.parse(salida);
    const orgObject =  salidaJson.result[type].filter( scratch => scratch.alias === alias )[0];
    if ( orgObject?.isExpired === true ) {
        throw new Error(`La scratch ${orgObject.alias} ha expirado!`);
    }  
    return orgObject;
}

export function getTargetOrg() {
    const salida = executeShell( 'sf force config get target-org --json' );
    const salidaJson:SFConfigGetValue = JSON.parse(salida);
    return salidaJson.result[0].value;
}

export function getBranchName(): string {
    try {
        return  executeShell( "git branch --show-current" );
    } catch (error) {
        console.log(error);
    }
    return '';
}
export async function executeFunction(step: IStepFunction) {
    let returnValue = false;
    const functionName = step.function;
    if ( typeof taskFunctions[functionName] === 'function' ) {       
        
        
        if ( step.arguments && typeof step.arguments === 'object' ) {
            let mergedArgs: StepArguments = context.mergeArgs(step.arguments);
            if ( !Array.isArray(mergedArgs) ) {
                const paramNames = getParams(taskFunctions[functionName]);
                mergedArgs = createArray(paramNames, mergedArgs );
            }
            returnValue = await taskFunctions[functionName](...mergedArgs);            
        } else {
            returnValue = await taskFunctions[functionName]();            
        }
    } else {
        throw new Error(`No se encontro la funcion ${functionName}`);
    }
    return returnValue;  
}

export function executeShell(command: string ) {
    try {
        const buffer = execSync( command ) ;
        const salida = buffer.toString().trim();
        return ( salida.endsWith("\n") ? salida.slice(0, -1) : salida );
     } catch  {
        return '';
     }     
}

function getFilesChanged() {
    const files = [];
    const salida = executeShell( 'git diff origin/main --raw' ); 
    for ( const line of salida.split('\n') ) {
        files.push(line.split(/[ |\t]/)[5]);
    }
    return files;
}

export const taskFunctions: { [s: string]: AnyValue } = {   
    skip() { 
        logInfo('Error omitido por configuracion del step');
        return true; 
    },

    storeConfig(variable:string, value:AnyValue) {
        storeConfig(variable,value);
        return true;
    },

    async docProcess() { 
        if ( !context.process ) {
            return false;
        }
        const files = getFilesChanged();
        if ( files.length > 0 ) {
            for( const component in metadata ) {
                const helper = metadata[component];
                const items = helper.getItems(files);
                if ( items.length > 0 ) {
                    context.addProcessMetadata( component,  items);
                    helper.execute(items, context.process, context.module);
                }
            }
        }
        
        return true;
    },
    async retrieveCode() {
        const tryToRetrieve = await askForContinue("Desea bajar los cambios?");
        if ( !tryToRetrieve ) {
            return false;
        }
        executeShell( `sf project retrieve start` );
        return await this.validateScratch();
    },

    async validateScratch() {
        const salida = executeShell( "sf project retrieve preview" );
        context.salida = salida;
        const noHayCambios = salida.indexOf('No files will be deleted') !== -1 && salida.indexOf('No files will be retrieved') !== -1 && salida.indexOf('No conflicts found') !== -1;
        // Probar de bajarlos // sf project retrieve start
        return noHayCambios;
    },

    async commitChanges() {
        const tryToCommit = await askForContinue("Desea commitear los cambios?");
        if ( !tryToCommit ) {
            return false;
        }
        const message = await askForCommitMessage();
        executeShell( `git add --all` );
        executeShell( `git commit -m ${message}` );
        return await this.checkCommitPending();
    },
    async publishBranch() {
        try {
            const branchName = context.branchName;
            const salida = executeShell( `git push origin ${branchName}` );
            return salida ? false : true;
        } catch (error) {
            console.log(error);
        }
        // mergeBranch
        return false;

    },
    async createPullRequest() {
        if ( context.gitApi === undefined || context.branchName === undefined || context.issueNumber === undefined ) {
            return false;
        }
        try {
            context.issueFromBranch(context.branchName);
            const result = await context.gitApi.createPullRequest( context.branchName, `resolves #${context.issueNumber} `, 'AI not implemented yet' );             
            return result;
        } catch (error) {
            console.log(error);
        }
        // mergeBranch
        return false;

    },
     
    cancelIssue() {
        console.log('Not implemented');
        return false;
    },
    deployIssue() {
        console.log('Not implemented');
        return false;
    },
    rollbackIssue() {
        console.log('Not implemented');
        return false;
    },
    async createIssue(title: string, label: string, body?: string,  milestone?: string): Promise<boolean> {
        if ( context.projectApi === undefined ) {
            return false;
        }
        const issueNumber = await context.projectApi.createIssue(title, context.backlogColumn, label, body, milestone );
        if ( issueNumber) {
            console.log(`Se creo el issue ${issueNumber}`);
            return true;
        }
        return false;
    },
    async createTemplate(template: string, folder: string, name: string, identifier: string) {
        const filename = name.toLocaleLowerCase().replaceAll(' ', '-') +  '.md';
        createTemplate( '.', 'md', template, filename, folder, { name, identifier });
        return true;
    },
    
    async validateIssue(issueNumber: string, states: string) {        
        if ( context.projectApi === undefined ) {
            return false;
        }
        const issue = await context.projectApi.getIssue(issueNumber);        
        if ( !issue.state ) {
            return false;
        }
        const arrayStates = states.toLocaleLowerCase().replace(' ', '').split(',');
        return arrayStates.includes(issue.state.toLocaleLowerCase().replace(' ', ''));
    },
    
    async validaNoseaBranchActual(newBranchName: string): Promise<boolean> {
        return this.getBranchName() !== newBranchName;
    },

    
    async checkCommitPending(): Promise<boolean> {
        try {
            const cambios = executeShell( "git status --porcelain=v1" ) ;
            context.salida = cambios;
            return cambios == '' ;
        } catch (error) {
            console.log(error);
        }
        return false;
    },
    async createBranch(): Promise<boolean> {
        try {
            const newBranchName = context.newBranchName;
            executeShell( `git checkout -b ${newBranchName} origin/main` ) ;
            context.set('branchName', this.getBranchName() );
            return true ;
        } catch (error) {
            console.log(error);
        }
        // mergeBranch
        return false;
    },    
    async mergeBranch() {
        try {
            executeShell( `git fetch` ) ;

            executeShell( `git merge origin/main` ) ;
            
            return true ;
        } catch (error) {
            console.log(error);
        }
        return false;
    },
    
    async moveIssue(issueNumber: string, state: string): Promise<boolean> {
        if ( context.projectApi === undefined ) {
            return false;
        }
        const result = await context.projectApi.moveIssue(issueNumber, state);    
        return result;
    },
    
    async assignBranchToIssue(issueNumber: string, newBranchName: string): Promise<boolean>  {
        if ( context.gitApi === undefined ) {
            return false;
        }
        const commitSha = executeShell( `git rev-parse --verify main` ); 
        const result = await context.gitApi.assignBranchToIssue(issueNumber,newBranchName, commitSha);
        return result;
    },    

    
    async assignIssueToMe(issueNumber: string): Promise<boolean>  {
        if ( !context.projectApi ){
            return false;
        }
        const result = await context.projectApi.assignIssueToMe(issueNumber);    
        return result;
        
    },    

    async viewIssue(issueNumber: string, template: string = 'viewIssue'): Promise<boolean>  {
        if ( !context.projectApi ){
            return false;
        }
                
        const result = await context.projectApi.getIssue(issueNumber);
        const rendered = generateTemplate( TEMPLATE_MODEL_FOLDER , 'bash', template, { issue: result, ...context});
        
        console.log( rendered);        
        return true;
    },
  
    async listIssues(listFilter?:string, listTemplate?:string): Promise<boolean>  {
        let filter: string = '{states: OPEN}';
        if (!listFilter) {
            listFilter = listFilter || context.options.filter || context.listFilter; 
        }
        if (!listTemplate) {
            listTemplate = context.options.template || context.listTemplate ;
        }

        if ( !context.projectApi || !context.gitApi){
            return false;
        }
        if ( !listFilter ) {
            const answer = await prompts([
                {
                    message: 'Elija un filtro, o bien lo puede dejar fijo en autoforce como listFilter',
                    name: 'filter', 
                    type: 'select',
                    initial: 0,
                    choices: context.listFilters
                }
            ]);
            listFilter = answer.filter; 
        }
        if ( listFilter === ListFilters.PorMilestone ) {    
            if ( context.options.milestone ) {
                filter = `{ milestone: "${context.options.milestone}"}`;
            } else {
                const choices: {value:number|string, title:string}[] = (await context.gitApi.getMilestones()).map( milestone => {  return {value: milestone.number, title: milestone.title }; } );
                choices.push( { value: '', title: 'Issues sin Milestone'} );
                choices.push( { value: '*', title: 'Issues con Milestone'} );
                const answer = await prompts([
                    {
                        message: 'Elija un milestone',
                        name: 'filterValue', 
                        type: 'select',
                        initial: 0,
                        choices 
                    }
                ]);
                filter = `{ milestone: "${answer.filterValue}"}`;
                if ( answer.filterValue === undefined ) return false;
            }
        }
        if ( listFilter === ListFilters.PorLabel ) {   
            if ( context.options.label ) {
                filter = `{labels: "${context.options.label}"}`;
            } else {
                const labels = (await context.gitApi.getLabels()).map( label => label.name );
                const choices = valuesToChoices(labels);
    
                const answer = await prompts([
                    {
                        message: 'Elija un label',
                        name: 'filterValue', 
                        type: 'select',
                        initial: 0,
                        choices
                    }
                ]);
                if ( answer.filterValue === undefined ) return false;
                filter = `{labels: "${answer.filterValue}"}`;
            }
        }

        if ( !listTemplate ) {
            const files = getFiles(TEMPLATE_MODEL_FOLDER, filterBash ).map( filename => filename.split(".")[0] );
            const templates: Choice[] = valuesToChoices(files);
            const answer = await prompts([
                {
                    message: 'Elija un template, o bien lo puede dejar en autoforce como listTemplate',
                    name: 'template', 
                    type: 'select',
                    initial: 0,
                    choices: templates
                }
            ]);
            listTemplate =  answer.template;
            if ( listTemplate === undefined ) return false;
        }
        const result = await context.projectApi.getIssuesWithFilter(filter);
        const rendered = generateTemplate( TEMPLATE_MODEL_FOLDER , 'bash', listTemplate, { issues: result, ...context});
        
        console.log( rendered);
        return true;
    },    

    async checkIssueType(issueNumber: string): Promise<boolean>  {
        if ( !context.projectApi ){
            return false;
        }
        const issue = await context.projectApi.getIssue(issueNumber);
        // Setea el issueType segun el issue
        try {
            let newIssueType = 'feature';
            if ( issue.labels && issue.labels?.length > 0 ) {
                if ( issue.labels.includes('documentation') ) {
                    newIssueType = 'doc';
                } else if ( issue.labels.includes('automation') ) {
                    newIssueType = 'automation';
                } else if ( issue.labels.includes('bug') ) {
                    newIssueType = 'fix';
                }
            }
            context.newIssueType =  newIssueType;
        } catch (error) {
            console.log(error);
        }

        return true;
    }
}