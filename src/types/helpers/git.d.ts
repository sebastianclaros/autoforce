
interface IMilestone {
    id?: string;
    number?: number;
    title: string;
    description?: string;
    state?: string;
    due_on?: string;
    url?: string;
}
interface ILabel {
    id?: string;
    name: string;
    color?: string;
}
interface IRepository {
    id: string;
    label?: ILabel, 
    projectV2: { 
        id: string, 
        field: { 
            id: string, 
            name: string, 
            options: { name: string, id: string}[] 
        }
    }
}


interface IIssueObject {
    id?: string;
    number?: number;
    name?: string;
    branch?: string;
    url?: string;
    title?: string;
    state?: string;
    labels?: string[];
    body?: string;
}
interface IGitApi {
    //    getUser: () => Promise<IGitUser>;
    //    getRepository: () => Promise<IGitRepository>;
    createPullRequest: (branchName: string, title: string, body: string) => Promise<boolean>;
    //    getCommit: (commitSha: string) => Promise<ICommit>;
    assignBranchToIssue: (issueNumber: string, branchName: string, commitSha: string) => Promise<boolean>;
    getLabels(): Promise<ILabel[]>;
    getMilestones(): Promise<IMilestone[]>;
    createLabel: (name: string, color: string = 'random') => Promise<ILabel|undefined>;
    createMilestone: (title: string, state:string = 'open', description?: string, dueOn?: string) => Promise<IMilestone>;
    updateMilestone: (title: string, state:string = 'open', description?: string, dueOn?: string) => Promise<IMilestone>;
}

interface IProjectApi {
    moveIssue: (issueNumber: string, state: string) => Promise<boolean>;
    searchIssues(title?: string): Promise<IIssueObject[]>;
    getIssues(): Promise<IIssueObject[]>;
    getIssuesWithFilter(filter?: string): Promise<IIssueObject[]>;
    getIssue(issueNumber: string): Promise<IIssueObject>;
    assignIssueToMe: (issueNumber: string)=> Promise<boolean>;    
    createIssue: (title, state?: string, label?: string, body?: string, milestone?: string) => Promise<IIssueObject>;
    // getColumnValueMap: ()
    // getIssueState: (issueNumber: number){
    // getIssue: (issueNumber: number){

}

