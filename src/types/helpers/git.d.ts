
interface IIssueObject extends object{
    id?: string;
    name?: string;
    branch?: string;
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
}

interface IProjectApi {
    moveIssue: (issueNumber: string, state: string) => Promise<boolean>;
    getIssues(): Promise<IIssueObject[]>;
    getIssueObject(issueNumber: string): Promise<IIssueObject>;
    assignIssueToMe: (issueNumber: string)=> Promise<boolean>;    
    createIssue: (title, state?: string, label?: string, body?: string, milestone?: string) => Promise<number>;
    // getColumnValueMap: ()
    // getIssueState: (issueNumber: number){
    // getIssue: (issueNumber: number){

}

