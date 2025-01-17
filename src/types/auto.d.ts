
type Processes = Record<string, Record<string, string[]>>;
type CommandOptions = {
    [key: string]: string | boolean;
} 

type ConfigArguments = {
    taskName: string;
    subfolder: string;
    command: string;
    arguments?: string[];
    options: CommandOptions
}

/* name: id del proceso, el resto de las propiedades del header del Markdown del proceso  */ 

interface IProcessInfo  {
    folder: string, 
    name: string
}

type IMetadataNode = IMetadataParentNode | IMetadataProcessNode;
interface IMetadataComponentNode {
    //[key?: string]: string[],
    lwc: string[],
    classes: string[],
    objects: string[],
}

interface IMetadataParentNode extends IMetadataComponentNode{
    hasChilds: true,
    folder: string, 
    path?: string, 
    childs: IMetadataNode[]
}

interface IMetadataProcessNode extends IMetadataComponentNode{
    hasChilds: false,
    path?: string, 
    name?: string,
}


interface IProcessHeader extends Record<string, string> {
    folder: string, 
    filename: string
}


export type AnyValue = number | string | boolean | object | function ;

export type AnyObject = {
    [string]: AnyValue; 
};

export type CommandFunction = (taskName: string, options: CommandOptions) => Promise<boolean>;
export type CommandTaskFunction = (task: ITask, options: CommandOptions, tabs?: string) => Promise<boolean>;
type ObjectRecord = Record<string, AnyValue>; 
interface IObjectRecord {
    [key: string]: AnyValue
}


interface DocumentationModule {
    getItems: ( files: string[] ) => string[],
    execute: (items: string[], filename: string, folder: string) => Promise<void>    
}

