import { getConfigFromArgs } from "../auto.mjs";
import { SUBTASKS_FOLDER, TASKS_FOLDER } from "../helpers/tasks.mjs";
import assert from "node:assert";

const testConfigFromArgs = {

    testTaskConOptions() {
        const processArgs = [ 'taskName', '--issueNumber=1'] ;
        const config = getConfigFromArgs(processArgs);
        assert.strictEqual( config.command, 'task' );
        assert.strictEqual( config.taskFolder, TASKS_FOLDER );
        assert.strictEqual( config.taskName, 'taskName' ); 
        assert.strictEqual( config.options.issueNumber, '1' ); 
    },

    testTaskConIssue() {
        const processArgs = [ 'taskName', '1'] ;
        const config = getConfigFromArgs(processArgs);

        assert.strictEqual( config.command, 'task' );
        assert.strictEqual( config.taskFolder, TASKS_FOLDER );
        assert.strictEqual( config.taskName, 'taskName' ); 
        assert.deepEqual( config.arguments, [ '1' ] ); 
    },
    
    
    // yarn auto taskName
    testTask() {
        const processArgs = [ 'taskName'] ;
        const config = getConfigFromArgs(processArgs);
    
        assert.strictEqual( config.command, 'task' );
        assert.strictEqual( config.taskFolder, TASKS_FOLDER );
        assert.strictEqual( config.taskName, 'taskName' ); 
    },
    
    // yarn auto task taskName
    testTaskConTask() {
        const processArgs = [ 'task', 'taskName'] ;
        const config = getConfigFromArgs(processArgs);
    
        assert.strictEqual( config.command, 'task' );
        assert.strictEqual( config.taskFolder, TASKS_FOLDER );
        assert.strictEqual( config.taskName, 'taskName' ); 
    },
    
    // yarn auto subtask taskName
    testSubtask() {
        const processArgs = [ 'subtask', 'taskName'] ;
        const config = getConfigFromArgs(processArgs);    
        assert.strictEqual( config.command, 'subtask' );
        assert.strictEqual( config.taskFolder, SUBTASKS_FOLDER );
        assert.strictEqual( config.taskName, 'taskName' ); 
    },
    
    // yarn auto preview subtask taskName
    testPreviewSubTask() {
        const processArgs = [ 'preview', 'subtask', 'taskName'] ;
        const config = getConfigFromArgs(processArgs);
    
        assert.strictEqual( config.command, 'preview' );
        assert.strictEqual( config.taskFolder, SUBTASKS_FOLDER );
        assert.strictEqual( config.taskName, 'taskName' ); 
    },
    
    // yarn auto preview task taskName
    testPreviewTask() {
        const processArgs = [ 'preview', 'taskName'] ;
        const config = getConfigFromArgs(processArgs);
    
        assert.strictEqual( config.command, 'preview' );
        assert.strictEqual( config.taskFolder, TASKS_FOLDER );
        assert.strictEqual( config.taskName, 'taskName' );
    
    },
    
    // yarn auto help subtask taskName
    testHelpSubtask() {
        const processArgs = [ 'help', 'subtask', 'taskName'] ;
        const config = getConfigFromArgs(processArgs);
    
        assert.strictEqual( config.command, 'help' );
        assert.strictEqual( config.taskFolder, SUBTASKS_FOLDER );
        assert.strictEqual( config.taskName, 'taskName' );
    },
    
    
    // yarn auto help task taskName
    testHelpTask() {
        const processArgs = [ 'help', 'taskName'] ;
        const config = getConfigFromArgs(processArgs);
    
        assert.strictEqual( config.command, 'help' );
        assert.strictEqual( config.taskFolder, TASKS_FOLDER );
        assert.strictEqual( config.taskName, 'taskName' );
    }

}




// Test All case testConfigFromArgs
for ( const testCase in testConfigFromArgs ) {
    console.log( testCase);
    testConfigFromArgs[testCase]();
}


