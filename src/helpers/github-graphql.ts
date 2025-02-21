import { graphql } from "@octokit/graphql";
import { Octokit } from "octokit";


export class GitHubApi implements IGitApi {
  repoVar;
  projectNumber; 
  graphqlAuth;
  octokit;
  _repository: IRepository | undefined;
  _labels: ILabel[] | undefined;
  _milestones: IMilestone[] | undefined;
  _defaultColors: Record<string, string> = { 'red': 'b60205','orange': 'd93f0b','yellow': 'fbca04','green': '0e8a16','dupont': '006b75','light-blue': '1d76db','blue': '0052cc','purple': '5319e7','pastel-red': 'e99695','pastel-orange': 'f9d0c4','pastel-yellow': 'fef2c0','pastel-green': 'c2e0c6','pastel-dupont': 'bfdadc','pastel-light': 'c5def5','pastel-blue': 'bfd4f2','pastel-purple': 'd4c5f9' };
 
  async getRepository() { 
    if ( this._repository === undefined) {
      const repository = await this.getRepositoryObject();
      this._repository = repository;
    }
    return this._repository; 
  }

  

  constructor(token: string, owner: string, repo: string, projectNumber?: number) {
    this.repoVar = { owner, repo };
    this.projectNumber = projectNumber;
    this.graphqlAuth = graphql.defaults({
      headers: {
        authorization: `Bearer ${token}`,
        "X-Github-Next-Global-ID": 1
      },
    })
    this.octokit = new Octokit({
      auth: token
    })
  }
  async createLabel(name: string, color: string = 'random') : Promise<ILabel|undefined>{
    const repositoryId = (await this.getRepository()).id;
    if ( color === 'random') {
      color = this.getRandomColor();
    } else if ( this._defaultColors[color] !== undefined) {
      color = this._defaultColors[color];
    }
    const variables: Record<string,string> = { name, repositoryId , color };
    const mutationCreateLabel = `
      mutation createLabel( $name: String!, $repositoryId: ID!, $color: String! ) {
        createLabel(
            input: {
              repositoryId: $repositoryId,
              name: $name
              color: $color
            }
        ) {
          label {
            id
            name
            color
          }
        }
      }`;
    try {
      const {createLabel}: { createLabel: { label: ILabel } } = await this.graphqlAuth(mutationCreateLabel, variables);
      return createLabel.label;
    } catch (error) {
      console.log(error);
    }
    return ;
    
  }

  getRandomColor(): string {
    const colors = Object.values(this._defaultColors);
    const number = Math.floor(Math.random() * colors.length);
    return colors[number];
  }

  async updateMilestone(title: string, state = 'open', description?: string, dueOn?: string) {
    const allMilestones = await this.getMilestones();
    const toUpdate = allMilestones.filter( milestone => milestone.title === title)[0];
    if ( !toUpdate ) {
      throw new Error(`No se encontro el milestone ${title}`);
    }
    const milestone: IMilestone = {
      title,
      state,
      description,
    };
    
    if ( dueOn ) {
      milestone.due_on= dueOn;
    }

    const result = await this.octokit.request(`PATCH /repos/${this.repoVar.owner}/${this.repoVar.repo}/milestones/${toUpdate.number}`, {...milestone, ...{headers: {'X-GitHub-Api-Version': '2022-11-28'}}});
    return  { id: result.data.node_id, title: result.data.title, description: result.data.description, dueOn: result.data.due_on , url: result.data.url };
  }

  async createMilestone(title: string, state = 'open', description?: string, dueOn?: string) {
    const milestone: IMilestone = {
      title,
      state,
      description,
    };
    
    if ( dueOn ) {
      milestone.due_on= dueOn;
    }
    const result = await this.octokit.request(`POST /repos/${this.repoVar.owner}/${this.repoVar.repo}/milestones`, {...milestone, ...{headers: {'X-GitHub-Api-Version': '2022-11-28'}}});
    console.log( result.data.url);
    return  { id: result.data.node_id, title: result.data.title, description: result.data.description, dueOn: result.data.due_on , url: result.data.url };
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

  async getLabels() : Promise<ILabel[]>{
    if ( this._labels === undefined ) {
      const query = `
          query getRepo($owner:String!, $repo: String! ) {
            repository(owner: $owner, name: $repo) {
              labels(last: 10, orderBy:  { field: CREATED_AT, direction: DESC}) {
                nodes{
                  id
                  name
                  color
                }
              }
            }
          }
      `; 
      const { repository }: {repository: { labels: { nodes: { id: string, name: string , color: string }[] } } } = await this.graphqlAuth(query, this.repoVar );
      this._labels = repository.labels.nodes;
    }

    return this._labels;    
  }

  async  getMilestones(): Promise<IMilestone[]>{
    if ( this._milestones === undefined ) {
      const query = `
        query getRepo($owner:String!, $repo: String! ) {
          repository(owner: $owner, name: $repo) {
            milestones(last: 10, states: OPEN, orderBy: { field: CREATED_AT, direction: DESC} ) {
              nodes{
                id
                number
                title
                dueOn
              }
            }
          }
        }
    `; 
      const { repository }: {repository: { milestones: { nodes: { id: string, number: number,  title: string , color: string }[] } } } = await this.graphqlAuth(query, this.repoVar );
      this._milestones = repository.milestones.nodes;
    }
    return this._milestones;
  }


  async  getRepositoryObject() {
    const query = `
        query getRepo($owner:String!, $repo: String!, $projectNumber: Int! ) {
          repository(owner: $owner, name: $repo) {
            id
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
    const { repository }: {repository: IRepository} = await this.graphqlAuth(query, { projectNumber: this.projectNumber,...this.repoVar});
    return repository;
  }

  async createPullRequest(branchName: string, title: string, body: string): Promise<boolean> {
    const repositoryId = (await this.getRepository()).id;
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