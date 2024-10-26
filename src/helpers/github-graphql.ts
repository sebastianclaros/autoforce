import { graphql } from "@octokit/graphql";

export class GitHubApi implements IGitApi, IProjectApi {
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
 

  async getColumnValueMap(){
    const query = `
        query getFieldOptions($owner:String!, $repo: String!, $projectNumber: Int!) {
          repository(owner: $owner, name: $repo) {
            projectV2(number: $projectNumber) {
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

    const { repository }: {repository: { id: string, projectV2: { id: string, field: { id: string, name: string, options: { name: string, id: string}[] }}}} = await this.graphqlAuth(query, { projectNumber: this.projectNumber,...this.repoVar});
    const mapValues: Record<string, string> = {}
    for ( const option of repository.projectV2.field.options ) {
      mapValues[option.name] = option.id;
    }
    return mapValues;
  }


  async createIssue(title: string, state?: string, label?: string, milestone?: string, body?: string ) {
    const user = await this.getUser();
    const repository = await this.getRepository(label);
    const repositoryId = repository.id;
    const labelId = repository.label?.id;
    const projectId = repository.projectV2.id;
    const mutationIssue = `
      mutation createIssue($repositoryId: ID!, $assignId: ID!, $title: String!, $body: String, ${ labelId ? '$labelId: ID!': ''} , $milestoneId: ID ) {
        createIssue(
            input: {
              repositoryId: $repositoryId,
              assigneeIds: [$assignId],
              ${labelId ? 'labelIds: [$labelId],': ''}
              title: $title,
              milestoneId: $milestoneId,
              body: $body
            }
        ) {
          issue {
            id
            number
          }
        }
      }`;
    const { createIssue }: {createIssue: { issue: { id: string, number: number } }} = await this.graphqlAuth(mutationIssue, { labelId,  body, assignId: user.id,  projectId, repositoryId, title, label: label?  [label]: null });
    const issue = createIssue.issue;
    if ( !state || !issue.number) {
      return issue.number;
    }
    const mutationItem = `
      mutation addProjectV2ItemById($projectId: ID!, $contentId: ID! ) {
        addProjectV2ItemById(
            input: {
              projectId: $projectId
              contentId: $contentId
            }
        ) {
          clientMutationId,
          item {
            id
          }
        }
      }`;
    const { addProjectV2ItemById }: {addProjectV2ItemById: { item: { id: string } }} = await this.graphqlAuth(mutationItem, { projectId, contentId: issue.id });  
    const itemId = addProjectV2ItemById.item.id;

    const fieldId = repository.projectV2.field.id;
    const mapValues = await this.getColumnValueMap();
    const columnValue = mapValues[state]; 
    const mutationColumn = `
    mutation($projectId: ID!, $itemId: ID!, $fieldId: ID!, $columnValue: String!) {
      updateProjectV2ItemFieldValue(
        input: {
          projectId: $projectId,
          itemId: $itemId,
          fieldId: $fieldId,
          value: {singleSelectOptionId: $columnValue}
        }
      ) {
        clientMutationId
      }
    }`;
    const {updateProjectV2ItemFieldValue }: {updateProjectV2ItemFieldValue: { clientMutationId: string }} = await this.graphqlAuth(mutationColumn, { projectId, itemId, fieldId, columnValue });
    if ( !updateProjectV2ItemFieldValue.clientMutationId ) {
      return 0;
    }
    return issue.number;  
  }

  async  moveIssue(issueNumber: number, state: string): Promise<boolean> {
    const issue = await this.getIssue(issueNumber);
    const itemId = issue.projectItems.nodes[0].id;
    const projectId = issue.projectItems.nodes[0].project.id;  
    const fieldId = issue.projectItems.nodes[0].fieldValueByName.field.id;
    const mapValues = await this.getColumnValueMap();
    const columnValue = mapValues[state]; 
    const mutation = `
    mutation($projectId: ID!, $itemId: ID!, $fieldId: ID!, $columnValue: String!) {
      updateProjectV2ItemFieldValue(
        input: {
          projectId: $projectId,
          itemId: $itemId,
          fieldId: $fieldId,
          value: {singleSelectOptionId: $columnValue}
        }
      ) {
        projectV2Item {
          id
        }
      }
    }`;
    const {updateProjectV2ItemFieldValue }: {updateProjectV2ItemFieldValue: { projectV2Item: { id: string } }} = await this.graphqlAuth(mutation, { projectId, itemId, fieldId, columnValue });
    return updateProjectV2ItemFieldValue?.projectV2Item ? true: false ;  
  }

  async assignIssueToMe(issueNumber: number): Promise<boolean> {
    const user = await this.getUser();
    const issue = await this.getIssue(issueNumber);
    const mutation = `
      mutation assignUser( $issueId: ID!, $userId: ID!) { 
        addAssigneesToAssignable(input: {
          assignableId: $issueId
          assigneeIds: [ $userId ]
        }) {
          assignable {
            assignees {
              totalCount
            }
          }
        } 
      }    
    `;
    const {addAssigneesToAssignable }: {addAssigneesToAssignable: { assignable: { assignees: { totalCount: number } } }} = await this.graphqlAuth(mutation, { issueId: issue.id, userId: user.id });
    return addAssigneesToAssignable.assignable.assignees.totalCount > 0 ;  
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

  async assignBranchToIssue(issueNumber: number, branchName: string, commitSha: string) {
    const issue = await this.getIssue(issueNumber);
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
    console.log(createLinkedBranch);
    return createLinkedBranch?.issue?.id ? true: false ;  
  }

  async getIssueState(issueNumber: number){
    const issue = await this.getIssue(issueNumber);
    return issue.projectItems?.nodes[0]?.fieldValueByName?.name;
  }

  getIssueName(title: string) {
    return title.toLowerCase().replaceAll(' ', '-');
  }

  async  getIssueObject(issueNumber: number) {
    const issue = await this.getIssue(issueNumber);
    const issueObject: IIssueObject = { title: issue.title};
    issueObject.name = this.getIssueName(issue.title);
    if ( issue.linkedBranches.nodes.length > 0 ) {
      issueObject.branch = issue.linkedBranches.nodes[0].ref.name;
    }

    if ( issue.projectItems.nodes.length > 0 ) {
      issueObject.state = issue.projectItems.nodes[0].fieldValueByName.name;
    }

    if ( issue.labels.nodes.length > 0 ) {
      issueObject.labels = [];
      for ( const node of issue.labels.nodes ) {
        issueObject.labels.push(node.name);
      }
    }

    return issueObject;
  }


async getIssue(issueNumber: number){
  const query = `
      query getIssue($owner:String!, $repo: String!, $issueNumber: Int!) {
        repository(owner: $owner, name: $repo) {
          issue(number: $issueNumber) {
            title
            id
            labels(first:3, orderBy:  { field: CREATED_AT, direction: DESC}) {
              nodes {
                color
                name
              }
            }
            projectItems(last: 1) {
              nodes{
                id, 
                project {
                  id
                }
                fieldValueByName(name: "Status"){
      						... on ProjectV2ItemFieldSingleSelectValue {
                    name
                    id
                    field {
                      ... on ProjectV2SingleSelectField {
                        id
                      }
                    }
                  }
                }
              }
            }             
            linkedBranches(last:1){
                nodes {
                    ref {
                      id
                      name
                    }
                }
            }
          }
        }
      }
  `; 

  const { repository }: { repository: { issue: { id: string, title: string, labels: { nodes: { name: string, color: string}[] }, projectItems: { nodes: { id: string, project: { id: string },  fieldValueByName: { name: string, id: string, field: { id: string }} }[] }, linkedBranches: { nodes: { ref: { id: string, name: string } } [] } } } } = await this.graphqlAuth(query, { issueNumber,...this.repoVar});

  return repository.issue;
}

}