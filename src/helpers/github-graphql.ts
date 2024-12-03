import { graphql } from "@octokit/graphql";

export class GitHubApi implements IGitApi {
  repoVar;
  projectNumber; 
  graphqlAuth;
  
  constructor(token: string, owner: string, repo: string, projectNumber?: number) {
    this.repoVar = { owner, repo };
    this.projectNumber = projectNumber;
    this.graphqlAuth = graphql.defaults({
      headers: {
        authorization: `Bearer ${token}`,
        "X-Github-Next-Global-ID": 1
      },
    })
  }

  async  getUser() {    
    const query = `{
      viewer {
        login
        id
      }
    }`;
    const {viewer }: {viewer: { login: string, id: number}} = await this.graphqlAuth(query);
    return viewer;
  }
  async  getRepository(label?: string) {
    const query = `
        query getRepo($owner:String!, $repo: String!, $projectNumber: Int!, ${label ?  '$label: String!': ''} ) {
          repository(owner: $owner, name: $repo) {
            id
            ${ label ? 
              `label(name: $label) {
                id
              }` :''
            }
            projectV2( number: $projectNumber ) {
              id
              field(name: "Status") {
                ... on ProjectV2SingleSelectField {
                  id
                  name
                  options {
                    name
                    id
                  }
                }                
              }
            }
          }
        }
    `; 
    const { repository }: {repository: { id: string, label?: { id: string}, projectV2: { id: string, field: { id: string, name: string, options: { name: string, id: string}[] }}}} = await this.graphqlAuth(query, { label, projectNumber: this.projectNumber,...this.repoVar});
    return repository;
  }

  async createPullRequest(branchName: string, title: string, body: string): Promise<boolean> {
    const repository = await this.getRepository();
    const repositoryId = repository.id;
    const headRefName = 'main';
    const baseRefName = branchName;

    const mutationPullRequest = `
      mutation createPullRequest( $baseRefName: String!, $headRefName: String!, $headRepositoryId: ID, $repositoryId: ID!, $title: String!, $body: String ) {
        createPullRequest(
            input: {
              repositoryId: $repositoryId,
              headRefName: $headRefName,
              headRepositoryId: $headRepositoryId,
              baseRefName: $baseRefName,
              title: $title,
              body: $body
            }
        ) {
          pullRequest {
            id
          }
        }
      }`;
    try {
      const {createPullRequest}: { createPullRequest: { pullRequest: { id: string} }} = await this.graphqlAuth(mutationPullRequest, { baseRefName, headRefName, headRepositoryId: repositoryId, repositoryId, title, body });
      return createPullRequest.pullRequest ? true : false;
    } catch (error) {
      console.log(error);
    }
    return false;
  }

  async assignBranchToIssue(issueNumber: string, branchName: string, commitSha: string) {
    const query = `
        query getIssue($owner:String!, $repo: String!, $issueNumber: Int!) {
          repository(owner: $owner, name: $repo) {
            issue(number: $issueNumber) {
              id
            }
          }
        }
    `;
    const { repository }: { repository: { issue: { id: string } } } = await this.graphqlAuth(query, { issueNumber:Number.parseInt(issueNumber),...this.repoVar});
    const issue = repository.issue;
    const commit = await this.getCommit(commitSha);
    const mutation = `
      mutation createLinkedBranch( $issueId: ID!, $oid: GitObjectID!, $branchName: String!) { 
        createLinkedBranch(input: {
          issueId: $issueId
          oid: $oid
          name: $branchName
        })
        {
          issue {
            id
          }
        }
      }`;
    const {createLinkedBranch }: {createLinkedBranch: { issue: { id: string } }} = await this.graphqlAuth(mutation, { issueId: issue.id, oid: commit.oid, branchName });
    return createLinkedBranch?.issue?.id ? true: false ;  
  }


  async getCommit(commitSha: string) {
    const query = `
      query getCommit($owner:String!, $repo: String!, $commitSha: String!) {
        repository(owner: $owner, name: $repo) {
          object(expression: $commitSha) {
                ... on Commit {
                  id
                  oid
                }
              }
        }
      } `; 
    const { repository }: {repository:{ object: { id: string; oid: string}}} = await this.graphqlAuth(query, { commitSha,...this.repoVar});
    return repository.object; 
  }


}