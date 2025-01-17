import context, { initializeContext } from "./context.js";
import { logError, logStep } from "./color.js";
import fs from "fs";
import { getModelFolders, getFiles, filterJson, searchInFolderHierarchy, readJsonSync } from "./util.js";
import { validateCommand, validateFunction, executeFunction, executeCommand, taskFunctions } from "./taskFunctions.js";
import prompts from "prompts";
import { ICriteria, IStep, IStepCommand, IStepFunction, IStepSubTask, IStepTask, ITask, Step } from "../types/helpers/tasks.js";
import { AnyValue, CommandOptions, ObjectRecord } from "../types/auto.js";

export function getTaskFolders(command: string = 'task') {  
  const folders: Record<string, string[]> = {
    'task':  getModelFolders('tasks'),
    'subtask':  getModelFolders('subtasks'),
    'tasks':  getModelFolders('tasks'),
    'subtasks':  getModelFolders('subtasks'),
    'new':  getModelFolders('new')
  }
  return folders[command.toLowerCase()] || folders.tasks;
}

function getTaskLists(folder: string): string[] {
    const files = getFiles(folder, filterJson);
    return files.map( filename => filename.split(".")[0] );
}

export function getTasks(command='tasks'): Record<string, ITask> {
  const folders= getTaskFolders(command);
  const tasks: Record<string, ITask> = {};
  for ( const folder of folders) {    
    for (const taskName of getTaskLists(folder)) {
      const filename =  folder + "/" + taskName + ".json";
      const task = readJsonSync<ITask>(filename);      
      tasks[taskName] = tasks[taskName] ? mergeTask(tasks[taskName], task) : task;
    }
  }
  return tasks;
}

function mergeTask( newTask: ITask, oldTask: ITask): ITask {
  const newSteps = newTask.steps ? [...newTask.steps, ...oldTask.steps] : oldTask.steps;
  const newArguments = newTask.arguments ? {...newTask.arguments, ...oldTask.arguments} : oldTask.arguments;
  const newGuards = newTask.guards ? [...newTask.guards, ...oldTask.guards] : oldTask.guards;
  const newVerbose = newTask.verbose || oldTask.verbose;
  const newDescription = newTask.description ? newTask.description + ' ' + oldTask.description : oldTask.description;
  const mergedTask: ITask = { name: newTask.name, verbose: newVerbose, description: newDescription, arguments: newArguments, guards: newGuards, steps: newSteps }
  return mergedTask;
}


function getTask(taskName: string, subfolder: string ): ITask {
  const tasks = getTasks(subfolder);
  if ( !tasks[taskName]) {
    throw new Error(`Verifique que el ${taskName} exista en alguno las subcarpetas de ${subfolder}`); 
  }
  return tasks[taskName];
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
  initializeContext();
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
    if ( typeof (step as IStepCommand).command === 'string' ) {
      validateStep = validateCommand( step as IStepCommand);      
    } else if ( typeof (step as IStepFunction).function === 'string' ) {
      validateStep = validateFunction(step as IStepFunction);
    } else if ( typeof (step as IStepSubTask).subtask === 'string' ) {
      const subtask = getTask( (step as IStepSubTask).subtask, 'subtasks');
      validateStep = validateTask(subtask);
    } else if ( typeof (step as IStepTask).task === 'string' ) {
      const subtask = getTask( (step as IStepTask).task, 'tasks');
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
  initializeContext();
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
  if ( task.verbose ) {
    logStep( `[INICIO] ${task.name}`, tabs );
  }
  for ( const step of task.steps ) {
    if ( isCriteriaMet(step.criteria) ) {
      if ( ! await executeStep(step, tabs + '\t', task.verbose) ) {
        return false;
      }
    }
  }
  if ( task.verbose ) {
    logStep(`[FIN] ${task.name}`, tabs);  
  }
  return true;
}

export async function previewTask(task: ITask, tabs = '') {
  initializeContext();
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
  if ( (step as IStepSubTask).subtask ) {
    tabs += '\t';
    const subtask = getTask( (step as IStepSubTask).subtask, 'subtasks');
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
  if ( typeof (step as IStepCommand).command === 'string' ) {
    return executeCommand(step as IStepCommand);
  } else if ( typeof (step as IStepFunction).function === 'string' ) {
    return await executeFunction(step as IStepFunction);
  } else if ( typeof (step as IStepSubTask).subtask === 'string' || typeof (step as IStepTask).task === 'string') {    
    const subtask =  typeof (step as IStepSubTask).subtask === 'string' ? getTask((step as IStepSubTask).subtask, 'subtask') : getTask((step as IStepTask).task, 'tasks');    
    let stepContext = step.arguments ? context.mergeArgs(step.arguments): {};
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
async function executeStep(step: Step, tabs: string, verbose = false) {
  const stepName = step.name ? context.merge(step.name): undefined;
  if ( verbose && stepName ) {
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
          const errorHandler = taskFunctions[step.onError];
          if ( typeof errorHandler === 'function' ) {
            success = await errorHandler();
          }
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

  if ( verbose &&  stepName ) {
    logStep(`[FIN] ${stepName}`, tabs );
  }
  if ( !success) {
    process.exit( !context.isVerbose ? -1 : 0 );
  }
  
  return success;
}
  