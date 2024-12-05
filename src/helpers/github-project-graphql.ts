import { logWarning } from "./color.js";
import { GitHubApi } from "./github-graphql.js";

export class GitHubProjectApi extends GitHubApi implements  IProjectApi{
  projectNumber; 
  
  constructor(token: string, owner: string, repo: string, projectNumber: number) {
    super(token, owner, repo);
    this.projectNumber = projectNumber;
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

  async createIssue(title: string, state?: string, label?: string, body?: string, milestoneId?: string ) {
    const user = await this.getUser();
    const repository = await this.getRepository(label);
    const repositoryId = repository.id;
    const labelId = repository.label?.id;
    const projectId = repository.projectV2.id;
    const mutationIssue = `
      mutation createIssue($repositoryId: ID!, $assignId: ID!, $title: String!, $body: String, $milestoneId: ID ${ labelId ? ', $labelId: ID!': ''}  ) {
        createIssue(
            input: {
              repositoryId: $repositoryId,
              assigneeIds: [$assignId],
              title: $title,
              milestoneId: $milestoneId,
              body: $body
              ${labelId ? ',labelIds: [$labelId]': ''}
            }
        ) {
          issue {
            id
            number
          }
        }
      }`;
    const { createIssue }: {createIssue: { issue: { id: string, number: number } }} = await this.graphqlAuth(mutationIssue, { labelId,  body, assignId: user.id,  projectId, repositoryId, title, milestoneId, label: label?  [label]: null });
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
    if ( !columnValue ){
      logWarning(`No se encontro la columna ${state} en las lista de columnas del proyecto ${Object.keys(mapValues).join(",")}`)
    } else {
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
      await this.graphqlAuth(mutationColumn, { projectId, itemId, fieldId, columnValue });
    }
    return issue.number;  
  }
  async getIssueState(issueNumber: string){
    const issue = await this._getIssue(issueNumber);
    return issue.projectItems?.nodes[0]?.fieldValueByName?.name;
  }

  getIssueName(title: string) {
    return title.toLowerCase().replaceAll(' ', '-');
  }

  async _getIssue(issueNumber: string){
    const query = `
        query getIssue($owner:String!, $repo: String!, $issueNumber: Int!) {
          repository(owner: $owner, name: $repo) {
            issue(number: $issueNumber) {
              title
              number,
              id
              url
              body
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
  
    const { repository }: { repository: { issue: { number: number, id: string, body: string, url: string, title: string, labels: { nodes: { name: string, color: string}[] }, projectItems: { nodes: { id: string, project: { id: string },  fieldValueByName: { name: string, id: string, field: { id: string }} }[] }, linkedBranches: { nodes: { ref: { id: string, name: string } } [] } } } } = await this.graphqlAuth(query, { issueNumber:Number.parseInt(issueNumber),...this.repoVar});
  
    return repository.issue;
  }
  
  async getIssue(issueNumber: string) {
    const issue = await this._getIssue(issueNumber);
    const issueObject: IIssueObject = { number: issue.number, title: issue.title, id: issue.id, url: issue.url, body: issue.body };
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
  async getIssues() {
    return await this.getIssuesWithFilter( `{ states: OPEN }` );
  }
  
  async getIssuesWithFilter( filterBy: string) {
    const query = `
        query getIssues($owner:String!, $repo: String!) {
          repository(owner: $owner, name: $repo) {
            issues(last: 10, filterBy: ${filterBy} ) {
              nodes {
                number
                title
                body
                state
                url
                milestone {
                  dueOn
                  title
                }
                labels ( last: 3, orderBy:  { field: CREATED_AT, direction: DESC} ) {
                  nodes {
                    color
                    name
                  }
                }
                assignees ( last: 3 ) {
                  nodes {
                    login
                  }
                }
                id          
              }
            }
          }
        }
    `; 
    const { repository }: { repository: { issues: { nodes: { id: string, title: string } [] }} } = await this.graphqlAuth(query, this.repoVar);
    return repository.issues.nodes;
  }


  async  moveIssue(issueNumber: string, state: string): Promise<boolean> {
    const issue = await this._getIssue(issueNumber);
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

  async assignIssueToMe(issueNumber: string): Promise<boolean> {
    const user = await this.getUser();
    const issue = await this._getIssue(issueNumber);
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

}