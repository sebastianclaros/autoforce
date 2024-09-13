import context from "./context.js";
import { logError, logStep } from "./color.js";
import fs from "fs";
import { getFiles, filterJson } from "./util.js";
import { validateCommand, validateFunction, executeFunction, executeCommand } from "./taskFunctions.js";
import prompts from "prompts";
import { ICriteria, IStep, ITask, Step } from "../types/helpers/tasks.js";
import { AnyValue, CommandOptions, ObjectRecord } from "../types/auto.js";
export const TASKS_FOLDER = process.cwd() + "/commands/tasks";
export const SUBTASKS_FOLDER = process.cwd() + "/commands/subtasks";
export const NEW_FOLDER = process.cwd() + "/commands/new";

export function getTaskFolder(command: string) {
  const folders: Record<string, string> = {
    'task':  TASKS_FOLDER,
    'subtask':  SUBTASKS_FOLDER,
    'tasks':  TASKS_FOLDER,
    'subtasks':  SUBTASKS_FOLDER,
    'new':  NEW_FOLDER
  }
  return folders[command.toLowerCase()] || folders.tasks;
}

function getTaskLists(folder: string): string[] {
    const files = getFiles(folder, filterJson);
    return files.map( filename => filename.split(".")[0] );
}

export function getTasks(folder=TASKS_FOLDER): Record<string, ITask> {
  const tasks: Record<string, ITask> = {};
  for (const taskName of getTaskLists(folder)) {
    tasks[taskName] = getTask(taskName, folder);
  }
  return tasks;
}

function getTask(taskName: string, folder: string): ITask {
    const filename =  folder + "/" + taskName + ".json";
    const content = fs.readFileSync(filename, "utf8");
    try {
      return JSON.parse(content) as ITask;
    } catch {
      throw new Error(`Verifique que el ${filename} sea json valido`  );
    }
}

function isCriteriaMet(criteria?: ICriteria) {
  if ( !criteria ) {
    return true;
  }
  const { field, value} = criteria;
  // si no viene valor solo verifica que tenga no este vacio
  if ( typeof value == 'undefined') {
    return context.get(field); ;
  }
  const result = context[field as keyof typeof context] == value;
  return result;
}

export async function helpTask(task: ITask): Promise<boolean> {
  console.log('Nombre:',  task.name);
  console.log('Descripcion:',  task.description);
  console.log('Guards:',  task.guards);
  console.log('Argumentos:',  task.arguments);
  return true;
}
export function validateTask(task: ITask) {
  if ( task.guards ) {
    // Valida que sea 
  }
  // Pide datos de entrada y los deja en context
  if ( task.arguments ) {
    // Valida que sea 
  }
  
  for ( const step of task.steps ) {
    if ( step.criteria ) {
      // Valida que sea
    }
  
    let validateStep = false;
    if ( step.type === 'command' && step.command) {
      validateStep = validateCommand( step.command, step.arguments );      
    } else if ( step.type === 'function' && step.function  ) {
      validateStep = validateFunction(step.function, step.arguments);
    } else if ( step.type === 'task' && step.subtask ) {
      const subtask = getTask(step.subtask, SUBTASKS_FOLDER);
      validateStep = validateTask(subtask);
    } else {
      console.log('Step no tiene command ni function ni subtask');
    }
    if (!validateStep) {  
      return false;        
    }
  }

  return true;
}
export async function runTask(task: ITask, taskContext: CommandOptions, tabs = ''){
  // Valida que este ya esten las variables de enotorno y  configuracion
  if ( task.guards ) {
    await context.validate(task.guards);
  }
  // Pide datos de entrada y los deja en context
  if ( task.arguments ) {
    if ( taskContext ) {
      context.setObject(taskContext);
    }
    await context.askForArguments(task.arguments);
  }
  logStep( `[INICIO] ${task.name}`, tabs );
  for ( const step of task.steps ) {
    if ( isCriteriaMet(step.criteria) ) {
      if ( ! await executeStep(step, tabs + '\t') ) {
        return false;
      }
    }
  }
  logStep(`[FIN] ${task.name}`, tabs);  
  return true;
}

export async function previewTask(task: ITask, tabs = '') {
  logStep(`${task.name}: ${task.description}`, tabs );
    
  for ( const step of task.steps ) {
    previewStep(step, tabs); 
  }
}

function previewStep(step: Step, tabs = '') {
  if ( step.criteria ) {
    logStep(`Si ${step.criteria.field} ${step.criteria.operator || '=='} ${step.criteria.value}`, tabs );
    tabs += '\t';
  }
  if ( step.type === 'task' &&  step.subtask ) {
    tabs += '\t';
    const subtask = getTask(step.subtask, SUBTASKS_FOLDER);
    previewTask(subtask, tabs);
  } else {
    logStep(`${step.name}`, tabs );
  }
}
export function createObject(fields: ObjectRecord, values: AnyValue[]) {
  const fieldArray: string[] = Array.isArray(fields) ? fields: Object.keys(fields); 
  const argsObject: ObjectRecord = {};    
  for ( const value of values ) {
      const field = fieldArray.shift();
      if ( field ) {
        argsObject[field] = value;    
      }
  }
  return argsObject;
}    

async function runStep(step: Step, tabs: string) {
  if ( step.type === 'command' && step.command) {
    return executeCommand( step.command, step.arguments );
  } else if ( step.type === 'function' && step.function  ) {
    return await executeFunction(step.function, step.arguments);
  } else if ( step.type === 'task' && step.subtask ) {
    const subtask = getTask(step.subtask, SUBTASKS_FOLDER);
    
    let stepContext = context.mergeArgs(step.arguments);
    if ( Array.isArray(stepContext) ) {
      stepContext = createObject( subtask.arguments, stepContext);    
    }     
    return await runTask(subtask, stepContext ,tabs);
  }
  throw new Error(`No se pudo ejecutar el step ${step.name} porque no tiene command, function o subtasks`);
}

async function askForContinueOrRetry() {
  if (!context.isVerbose ) {
    return 'quit'; 
  }
  const answer = await prompts([
    {
      type: "select",
      name: "continue",
      message: "No se pudo ejecutar el step, ¿que quiere hacer? ",
      choices: [ { title: 'Salir', value: 'quit' }, { title: 'Continuar', value: 'continue' }, { title: 'Reintentar', value: 'retry' } ],
    }
  ]);
  return answer.continue;
} 

function getStepError(step: IStep, stepName?: string) {
  return step.errorMessage ? context.merge(step.errorMessage): stepName ? `Fallo el step ${stepName}` : '';
}
async function executeStep(step: Step, tabs: string) {
  const stepName = step.name ? context.merge(step.name): undefined;
  if ( stepName ) {
    logStep(`[INICIO] ${stepName}`, tabs);
  }
  
  let retry = false;
  let success = false;
  do {
    try {
      success = await runStep(step, tabs);
      if ( !success ) {
        logError(getStepError(step, stepName) , tabs );
        // Si tiene un custom handler cuando hay un error
        if( step.onError ) {
          success = await executeFunction(step.onError);      
        }
      }
    } catch(error) {
      if ( error instanceof Error ) {
        logError(error.message, tabs );
      }
    }
    if ( !success) {
      const result = await askForContinueOrRetry()      
      retry = result == 'retry';
      success = result == 'continue';
    }
  } while ( !success && retry);

  if ( stepName ) {
    logStep(`[FIN] ${stepName}`, tabs );
  }
  if ( !success) {
    process.exit( !context.isVerbose ? -1 : 0 );
  }
  
  return success;
}
  