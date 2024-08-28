import {execSync} from "child_process";
import context from "./context.mjs";
import { logError} from "./color.mjs";
import metadata from './metadata.mjs';
import prompts from "prompts";
import templateGenerator from "./template.mjs";
import { getColored } from "./color.mjs";

function createTemplate( templateFolder, templateExtension, template, filename, folder, context) {
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
    templateEngine.save(filename, folder, { create: true });
}


function convertArgsToString(args) {
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

export async function executeCommand(command, args) {
    try {
        context.set('command', command + ' ' + convertArgsToString(args) );
        execSync(command + ' ' + convertArgsToString(args), {stdio: 'inherit'});   
   
        return true;
    } catch (error) {
        return false;
    }
}

export function validateCommand(command, args) {
    return true;
}

export function validateFunction(functionName, args) {
    if ( typeof taskFunctions[functionName] !== 'function' ) {       
        logError(`No se encontro la funcion ${functionName}`);
        return false;
    }
    if ( typeof args !== 'undefined' ) {        
        if ( typeof args !== 'object'  ) {
            logError(`La funcion ${functionName} recibio un argumento de tipo ${typeof args} y solo soporta object`);
            return false;    
        }
    }

    return true;
}

function getParams(func) {
    // String representation of the function code
    let str = func.toString(); 
    str = str.replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/\/\/(.)*/g, '')
        .replace(/{[\s\S]*}/, '')
        .replace(/=>/g, '')
        .trim();
    // Start parameter names after first '('
    let start = str.indexOf("(") + 1;
    // End parameter names is just before last ')'
    let end = str.length - 1;
    let result = str.substring(start, end).split(", ");
    let params = [];
    result.forEach(element => {
        element = element.replace(/=[\s\S]*/g, '').trim();
        if (element.length > 0)
            params.push(element);
    });
    return params;
}
function createArray(fields, object) {
    const fieldArray =[]; 
    for ( const field of fields ) {
        const value = object[field];
        fieldArray.push( value );    
    }
    return fieldArray;
} 
   
async function askForContinue(message) {
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

export async function executeFunction(functionName, args) {
    let returnValue = false;
    if ( typeof taskFunctions[functionName] === 'function' ) {       
        if ( args && typeof args === 'object' ) {
            let mergedArgs = context.mergeArgs(args);
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

export function executeShell(command ) {
    try {
        const buffer = execSync( command ) ;
        const salida = buffer.toString().trim();
        return ( salida.endsWith("\n") ? salida.slice(0, -1) : salida );
     } catch (error) {
        return false;
     }     
}

function getFilesChanged() {
    let files = [];
    const salida = executeShell( 'git diff origin/main --raw' ) ; 
    for ( const line of salida.split('\n') ) {
        files.push(line.split(/[ |\t]/)[5]);
    }
    return files;
}

export const taskFunctions = {   

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

    validateScratch() {
        const salida = executeShell( "sf project retrieve preview" ) ;
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
        const salidaCommit = executeShell( `git commit -m ${message}` );
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
        try {
            context.issueFromBranch(branchName);
            const pullRequest = await context.gitApi.createPullRequest( branchName, `resolves #${context.issueNumber} `, 'AI not implemented yet' );             
            return pullRequest.number ? true : false;
        } catch (error) {
            console.log(error);
        }
        // mergeBranch
        return false;

    },
 
    getCurrentOrganization() {
        const salidaConfig = executeShell( 'sf config get target-org --json' ) ;
        const salidaConfigJson = JSON.parse(salidaConfig);
        const targetOrg =  salidaConfigJson.result[0];

        const salidaOrgList = executeShell( 'sf org list --json' ) ;
        const salidaOrgListJson = JSON.parse(salidaOrgList);
        
        for ( const orgType in salidaOrgListJson.result ) {
            for ( const orgObject of salidaOrgListJson.result[orgType] ) {
                if ( orgObject.alias === targetOrg.value ) {
                    if ( orgObject?.isExpired === true ) {
                        throw new Error(`La scratch ${scratch.alias} ha expirado!`);
                    }  
                    return orgObject;
                }
            }
        }
        throw new Error(`No se encontro la organizacion ${targetOrg.value} verifique que este activa con: sf org list. `);
    },

    // type: 'scratchOrgs', 'sandboxes', others
    getOrganizationObject(alias, type = 'scratchOrgs') {
        const salida = executeShell( 'sf org list --json' ) ;
        const salidaJson = JSON.parse(salida);
        const orgObject =  salidaJson.result[type].filter( scratch => scratch.alias === alias )[0];
        if ( orgObject?.isExpired === true ) {
            throw new Error(`La scratch ${scratch.alias} ha expirado!`);
        }  
        return orgObject;
    },

    getTargetOrg() {
        const salida = executeShell( 'sf force config get target-org --json' ) ;
        const salidaJson = JSON.parse(salida);
        return salidaJson.result[0].value;
    },
    
    cancelIssue() {
        console.log('Not implemented');
    },
    deployIssue() {
        console.log('Not implemented');
    },
    rollbackIssue() {
        console.log('Not implemented');
    },
    async createIssue(title, label) {
        const issueNumber = await context.gitApi.createIssue(title, 'Backlog', label );
        if ( issueNumber) {
            console.log(`Se creao el issue ${issueNumber}`);
            return true;
        }
        return false;
    },
    async createTemplate(template, folder, name, identifier) {
        const filename = name.toLocaleLowerCase().replaceAll(' ', '-') +  '.md';
        createTemplate( '.', 'md', template, filename, folder, { name, identifier });
        return true;
    },
    
    async validateIssue(issueNumber, states) {        
        const currentState = await context.gitApi.getIssueState(issueNumber);        
        const arrayStates = states.toLocaleLowerCase().replace(' ', '').split(',');
        return arrayStates.includes(currentState.toLocaleLowerCase().replace(' ', ''));
    },
    
    getBranchName() {
        try {
            return  executeShell( "git branch --show-current" ) ;
        } catch (error) {
        }
    },

    async validaNoseaBranchActual(newBranchName) {
        return this.getBranchName() !== newBranchName;
    },

    
    async checkCommitPending() {
        try {
            const cambios = executeShell( "git status --porcelain=v1" ) ;
            context.salida = cambios;
            return cambios == '' ;
        } catch (error) {
        }
        return false;
    },
    async createBranch() {
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
    
    async moveIssue(issueNumber, state) {
        const result = await context.gitApi.moveIssue(issueNumber, state);    
        return result;
    },
    
    async assignBranchToIssue(issueNumber, newBranchName) {
        const commitSha = executeShell( `git rev-parse --verify main` ) ; 
        const result = await context.gitApi.assignBranchToIssue(issueNumber,newBranchName, commitSha);
        return result;
    },    

    
    async assignIssueToMe(issueNumber) {
        const result = await context.gitApi.assignIssueToMe(issueNumber);    
        return result;
        
    },    

    async viewIssue(issueNumber) {
        const result = await context.gitApi.getIssue(issueNumber);
        // Branch    
        if ( result.linkedBranches.nodes.lenght > 0  ) {
            console.log( result.linkedBranches.nodes[0].ref.name );
        } else {
            console.log( 'sin branch' );
        }
    
        // Labels
        if ( result.labels ) {
            const labels = [];
            for ( const label of result.labels.nodes){
                labels.push ( getColored(label.name, label.color) );
            }    
        
            console.log( labels.join( ' ' ) );
        }
    
        // Body
        if ( result.body ) {
            console.log( result.body);
        }
    
        // Comments
        if ( result.comments ) {
            console.log( result.comments);
        }
    
        return true;
    },

    async checkIssueType(issueNumber) {
        const issue = await context.gitApi.getIssueObject(issueNumber);
        // Setea el issueType segun el issue
        try {
            let newIssueType = 'feature';
            if ( issue.labels?.length > 0 ) {
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