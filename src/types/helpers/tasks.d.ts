// types.d.ts
  import { PromptObject } from "prompts";
  
  interface TaskArgument extends PromptObject {
    default?: string;
  }


  type TaskFunction<T> =  (arg: T) => Promise<boolean>;

  type TaskArguments = Record<string, TaskArgument> | string[] ;
  type StepArguments = Record<string, string> | string[] ;
  export interface ITask {
    name: string;
    verbose: boolean;
    guards: string[];
    arguments: TaskArguments;
    description: string;
    steps: Step[];
  }
  interface IStep {
    name?: string;
    arguments: StepArguments;
    description?: string;    
    errorMessage?: string;
    onError: string;
    skipOnError?: boolean;
    criteria?: ICriteria;
    type: string;
  }
type Step = IStepTask | IStepFunction | IStepCommand;

interface IStepTask extends IStep {
  subtask: string;  
}
interface IStepFunction extends IStep {
  function: string;
}
interface IStepCommand extends IStep {
  command: string;
}

interface ICriteria {
  field: string;
  value: boolean;
  operator?: string;
}