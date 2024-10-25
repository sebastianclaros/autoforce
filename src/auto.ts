// Comandos validos
import {createObject,  validateTask, getTasks, helpTask, runTask, getTaskFolder} from "./helpers/tasks.js";
import { logError} from "./helpers/color.js";
import {createConfigurationFile} from "./helpers/context.js";
import prompts from "prompts";
import type { CommandFunction, ConfigArguments } from "./types/auto.js";
import { ITask } from "./types/helpers/tasks.js";
const proxyCommnad: Record<string, CommandFunction> = {
    'help': helpTask, 
    'task': runTask,
    'new': runTask,
    'config': createConfigurationFile,
    'subtask': runTask
}
export default async function main() {
    try {
        const config = getConfigFromArgs(process.argv.slice(2));
        const tasks = getTasks(config.taskFolder);
        const taskName = await askForTaskName(config.taskName, tasks);
        if ( taskName ) {        
            const task = tasks[taskName];
            const options = config.arguments && task.arguments ? {...config.options, ...createObject( task.arguments, config.arguments)} : config.options;
            // Valida los json de task y subtask
            if ( validateTask(task) ) {
                await proxyCommnad[config.command](task, options );
            } else {
                logError('Verifique que los json de task y subtask esten validos');
            }
        }
    } catch(error) {
        if ( error instanceof Error ) {
            console.error(error.message);
        }
    }
}

export function getConfigFromArgs(processArgs: string[]): ConfigArguments {
    const config: ConfigArguments = { options : {}, taskName: '', command: '', taskFolder: ''  };
    const args = [];
    // Divide --xxx como options el resto como args
    for ( const argName of processArgs ) {
        if ( argName.startsWith('--') ) {
            const [optionName, optionValue] = argName.substring(2).split('='); 
            config.options[optionName] = optionValue || true;
        } else {
            args.push(argName);
        }
    }
    // De acuerdo a args separa comando[help, preview, task o subtask]  de taskName 
    let currentArgument = args.shift();
    const comandosValidos = Object.keys(proxyCommnad); 
    if ( currentArgument && comandosValidos.includes(currentArgument)  ) {
        config.command = currentArgument;
        currentArgument = args.shift();
    } else {
        config.command = 'task';
    }
    // Setea el taskFolder segun si es un task o subtask
    if ( (config.command == 'help' || config.command == 'preview') && ( currentArgument == 'subtask' || currentArgument == 'task') ) {
        config.taskFolder =  getTaskFolder(currentArgument);
        currentArgument = args.shift();
    } else {
        config.taskFolder =  getTaskFolder(config.command);
    }

    if ( typeof currentArgument == 'string') {
        config.taskName = currentArgument;
    }
    config.arguments = args; 
    return config;
}

async function askForTaskName(taskName: string, tasks: Record<string,ITask>) {
    // Si exite lo devuelve
    if ( tasks[taskName] ) {
        return taskName;
    }
    // Sino pregunta
    const response = await prompts({
        type: "select",
        name: "taskName",
        message: taskName
        ? `${taskName} no es un comando valido`
        : "Seleccione un comando",
        choices: Object.values(tasks).map((task) => {
            return { title: task.name, value: task.name, description: task.description };
        })
    });

    return response.taskName;
}