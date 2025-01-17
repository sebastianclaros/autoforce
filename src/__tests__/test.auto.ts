import { getConfigFromArgs } from "../auto";

describe("ConfigFromArgs", () =>  {

    test("TaskConOptions", () =>  {
        const processArgs = [ 'taskName', '--issueNumber=1'] ;
        const config = getConfigFromArgs(processArgs);

        expect( config.command).toBe('task' );
        expect( config.taskName).toBe('taskName' ); 
        expect( config.options.issueNumber).toBe('1' ); 
    });

    test("TaskConIssue", () =>  {
        const processArgs = [ 'taskName', '1'] ;
        const config = getConfigFromArgs(processArgs);

        expect( config.command).toBe('task' );
        expect( config.taskName).toBe('taskName' ); 
        expect( config.arguments).toBe( [ '1' ] ); 
    });
    
    
    // yarn auto taskName
    test("Task", () =>  {
        const processArgs = [ 'taskName'] ;
        const config = getConfigFromArgs(processArgs);
    
        expect( config.command).toBe('task' );
        expect( config.taskName).toBe('taskName' ); 
    });
    
    // yarn auto task taskName
    test("TaskConTask", () =>  {
        const processArgs = [ 'task', 'taskName'] ;
        const config = getConfigFromArgs(processArgs);
    
        expect( config.command).toBe('task' );
        expect( config.taskName).toBe('taskName' ); 
    });
    
    // yarn auto subtask taskName
    test("Subtask", () =>  {
        const processArgs = [ 'subtask', 'taskName'] ;
        const config = getConfigFromArgs(processArgs);    
        expect( config.command).toBe('subtask' );
        expect( config.taskName).toBe('taskName' ); 
    });
    
    // yarn auto preview subtask taskName
    test("PreviewSubTask", () =>  {
        const processArgs = [ 'preview', 'subtask', 'taskName'] ;
        const config = getConfigFromArgs(processArgs);
    
        expect( config.command).toBe('preview' );
        expect( config.taskName).toBe('taskName' ); 
    });
    
    // yarn auto preview task taskName
    test("PreviewTask", () =>  {
        const processArgs = [ 'preview', 'taskName'] ;
        const config = getConfigFromArgs(processArgs);
    
        expect( config.command).toBe('preview' );
        expect( config.taskName).toBe('taskName' );
    });
    
    // yarn auto help subtask taskName
    test("HelpSubtask", () =>  {
        const processArgs = [ 'help', 'subtask', 'taskName'] ;
        const config = getConfigFromArgs(processArgs);
    
        expect( config.command).toBe('help' );
        expect( config.taskName).toBe('taskName' );
    });
    
    
    // yarn auto help task taskName
    test("HelpTask", () =>  {
        const processArgs = [ 'help', 'taskName'] ;
        const config = getConfigFromArgs(processArgs);
    
        expect( config.command).toBe('help' );
        expect( config.taskName).toBe('taskName' );
    });
})