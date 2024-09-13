
interface IIssueObject extends object{
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
    assignBranchToIssue: (issueNumber: number, branchName: string, commitSha: string) => Promise<boolean>;
}

interface IProjectApi {
    moveIssue: (issueNumber: number, state: string) => Promise<boolean>;
    getIssueObject(issueNumber: number): Promise<IIssueObject>;
    assignIssueToMe: (issueNumber: number)=> Promise<boolean>;
    createIssue: (title, state?, label?, milestone?, body?) => Promise<number>;
    // getColumnValueMap: ()
    // getIssueState: (issueNumber: number){
    // getIssue: (issueNumber: number){

}

