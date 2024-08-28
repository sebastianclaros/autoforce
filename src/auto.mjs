// Comandos validos
import {createObject, createConfigurationFile,  validateTask, getTasks, previewTask, helpTask, runTask, getTaskFolder} from "./helpers/tasks.mjs";
import { logError} from "./helpers/color.mjs";
import prompts from "prompts";
const proxyCommnad = {
    'preview': previewTask , 
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
        console.error(error.message);
    }
}

export function getConfigFromArgs(processArgs) {
    const config = { options : {}  };
    const args = [];
    // Divide --xxx como options el resto como args
    for ( const argName of processArgs ) {
        if ( argName.startsWith('--') ) {
            let [optionName, optionValue] = argName.substring(2).split('='); 
            if ( !optionValue) { // Si no viene option value con opciones booleanas tipo --setDefault
                optionValue = true;
            }
            config.options[optionName] = optionValue;
        } else {
            args.push(argName);
        }
    }
    // De acuerdo a args separa comando[help, preview, task o subtask]  de taskName 
    let currentArgument = args.shift(1);
    const comandosValidos = Object.keys(proxyCommnad); 
    if ( comandosValidos.includes(currentArgument)  ) {
        config.command = currentArgument;
        currentArgument = args.shift(1);
    } else {
        config.command = 'task';
    }
    // Setea el taskFolder segun si es un task o subtask
    if ( (config.command == 'help' || config.command == 'preview') && ( currentArgument == 'subtask' || currentArgument == 'task') ) {
        config.taskFolder =  getTaskFolder(currentArgument);
        currentArgument = args.shift(1);
    } else {
        config.taskFolder =  getTaskFolder(config.command);
    }

    config.taskName = currentArgument;
    config.arguments = args; 
    return config;
}

async function askForTaskName(taskName, tasks) {
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