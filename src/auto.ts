// Comandos validos
import {createObject,  validateTask, getTasks, previewTask, helpTask, runTask, getTaskFolders} from "./helpers/tasks.js";
import { ITask } from "./types/helpers/tasks.js";
import { logError} from "./helpers/color.js";
import prompts from "prompts";
import type { CommandFunction, CommandTaskFunction,  ConfigArguments } from "./types/auto.js";
import { createConfigurationFile, getConfigFile } from "./helpers/util.js";
import context from "./helpers/context.js";
import { fileURLToPath } from "url";
import { dirname } from 'path';

const proxyCommand: Record<string, CommandFunction> = {
    'version': showVersion, 
    'config': createConfigurationFile
}
const taskCommand: Record<string, CommandTaskFunction> = {
    'help': helpTask, 
    'preview': previewTask, 
    'task': runTask,
    'new': runTask,
    'subtask': runTask
}

async function  showVersion() {
    const __dirname = dirname(fileURLToPath(import.meta.url));
    const version = getConfigFile( __dirname  + '/../.autoforce.json', 'version', '0.1.14' );
    console.log('AutoForce v' + version);
    return true;
}

export default async function main() {
        try {
        const config = getConfigFromArgs(process.argv.slice(2));
        const taskCommandKeys = Object.keys(taskCommand);
        if ( !taskCommandKeys.includes(config.command) ) {
            await proxyCommand[config.command](config.taskName, config.options);
            return true
        }

        const tasks = getTasks(config.subfolder);
        const taskName = await askForTaskName(config.taskName, tasks);
        if ( taskName ) {        
            const task = tasks[taskName];
            context.options = config.arguments && task.arguments ? {...config.options, ...createObject( task.arguments, config.arguments)} : config.options;
            // Valida los json de task y subtask
            if ( validateTask(task) ) {
                await taskCommand[config.command](task, context.options );
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
    const config: ConfigArguments = { options : {}, taskName: '', command: '', subfolder: '', arguments: []  };
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
    const comandosValidos = [...Object.keys(proxyCommand), ...Object.keys(taskCommand)]; 
    if ( currentArgument && comandosValidos.includes(currentArgument)  ) {
        config.command = currentArgument;
        currentArgument = args.shift();
    } else {
        config.command = 'task';
    }
    // Setea el taskFolder segun si es un task o subtask
    if ( (config.command == 'help' || config.command == 'preview') && ( currentArgument == 'subtask' || currentArgument == 'task') ) {
        config.subfolder =  currentArgument;
        currentArgument = args.shift();
    } else {
        config.subfolder =  config.command;
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