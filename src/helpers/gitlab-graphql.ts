import { GraphQLClient } from 'graphql-request'
import { AnyValue } from '../types/auto.js';

const GITLAB_API = 'https://gitlab.com/api/graphql?remove_deprecated=true'

export class GitLabApi implements IGitApi, IProjectApi {
    repoVar;
    projectNumber; 
    graphqlAuth;
    
    constructor(token: string, owner: string, repo: string, projectNumber?: number) {
        this.graphqlAuth = new GraphQLClient(GITLAB_API);
        this.repoVar = { owner, repo };
        this.projectNumber = projectNumber;
        this.graphqlAuth.setHeaders({  authorization: `Bearer ${token}` })
    }

    async getLabels() {
      return [];
    }
    async getMilestones() {
      return [];
    }

    async  getIssue(issueNumber: string) {
      console.log(issueNumber);
      return {};
    }
    async  getIssues() {
      return [];
    }
    
    async  getIssuesWithFilter(filter: string) {
      console.log(filter);
      return [];
    }

    async createLabel(name: string, color: string = 'random' ) {
      console.log(name, color) ;  
      return {id: '', name, color};
    }
    async createMilestone(title: string, state = 'open', description?: string, dueOn?: string ) {
      console.log(title, state, description, dueOn) ;  
      return { id: '', title: '', state: '', url: '' };
    }
    async updateMilestone(title: string, state = 'open', description?: string, dueOn?: string ) {
      console.log(title, state, description, dueOn) ;  
      return { id: '', title: '', state: '', url: '' };
    }

    async createIssue(title: string, state?: string, label?: string, body?: string, milestone?: string ) {
      console.log(title, state, label, body, milestone);
      return { number:1} ;  
    }
  
    async  moveIssue(issueNumber: string, state: string): Promise<boolean> {
      console.log(issueNumber, state);
      return true ;  
    }
  

    async assignIssueToMe(issueNumber: string): Promise<boolean> {
      console.log(issueNumber);
      return true ;  
    }
  
    async  getUser() {
        const query = `{
          viewer {
            login
            id
          }
        }`;
        const {viewer }: {viewer: { login: string, id: number}} = await this.graphqlAuth.request(query);
        return viewer;
      }
    
    // async request ( document: string, variables: Record<string, AnyValue> ) {
    //   return await request({
    //     url: GITLAB_API,
    //     document,
    //     variables,
    //     headers: this.headers
    //   })
    // }
    
    async graphqlQuery( query: string, vars: Record<string, AnyValue> ) {
      const result = await this.graphqlAuth.request(query, vars);
      return result;
    //   let toProcess = result[endpoint]
    //   let returnVal = toProcess.nodes
    
    //   let pageInfo = toProcess.pageInfo
    //   let curPage = pageInfo.endCursor
    //   if ( pageInfo.hasNextPage ) {
    //      curPage = pageInfo.endCursor
    //     result = await this.graphql.request(query, vars)
    //     returnVal = returnVal.concat(result[endpoint].nodes)
    //     pageInfo = result[endpoint].pageInfo
    //   }    
    //  return returnVal
    }

    async  getRepository() {
    
    }

    async createPullRequest(branchName: string, title: string, body: string): Promise<boolean> {
      const query = `mutation($branchName: ID!, $title: String!, $body: String!) {

        }`;
      await this.graphqlQuery( query, {branchName, title, body});      
      return true;
    }

    async assignBranchToIssue(issueNumber: string, branchName: string, commitSha: string): Promise<boolean>  {
      const query = `mutation($branchName: ID!, $issueNumber: Int!, $commitSha: String!) {
        
      }`;
      await this.graphqlQuery( query, {branchName, issueNumber: Number.parseInt(issueNumber), commitSha});      
      return true;
    }
}
