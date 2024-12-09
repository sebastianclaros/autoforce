
interface IMilestone {
    id?: string;
    number: number;
    title: string;
    dueOn?: string;
}
interface ILabel {
    id?: string;
    name: string;
    color?: string;
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
}

interface IProjectApi {
    moveIssue: (issueNumber: string, state: string) => Promise<boolean>;
    getIssues(): Promise<IIssueObject[]>;
    getIssuesWithFilter(filter?: string): Promise<IIssueObject[]>;
    getIssue(issueNumber: string): Promise<IIssueObject>;
    assignIssueToMe: (issueNumber: string)=> Promise<boolean>;    
    createIssue: (title, state?: string, label?: string, body?: string, milestone?: string) => Promise<IIssueObject>;
    // getColumnValueMap: ()
    // getIssueState: (issueNumber: number){
    // getIssue: (issueNumber: number){

}

