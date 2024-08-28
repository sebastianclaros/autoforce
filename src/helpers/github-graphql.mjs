import { graphql } from "@octokit/graphql";

export class GitHubApi {
  repoVar;
  projectNumber; 
  graphqlAuth;
  
  constructor(token, owner, repo, projectNumber) {
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
    const {viewer } = await this.graphqlAuth(query);
    return viewer;
  }

  async getColumnValueMap() {
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

    const { repository } = await this.graphqlAuth(query, { projectNumber: this.projectNumber,...this.repoVar});
    let mapValues = {}
    for ( const option of repository.projectV2.field.options ) {
      mapValues[option.name] = option.id;
    }
    return mapValues;
  }

  async createPullRequest(branchName, title, body) {
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
            number
          }
        }
      }`;
    try {
      const {createPullRequest} = await this.graphqlAuth(mutationPullRequest, { baseRefName, headRefName, headRepositoryId: repositoryId, repositoryId, title, body });
      return createPullRequest.pullRequest;
    } catch (error) {
      console.log(error);
      return false;
    }
  }

  async createIssue(title, columnName, label, milestone, body ) {
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
    const { createIssue } = await this.graphqlAuth(mutationIssue, { labelId,  body, assignId: user.id,  projectId, repositoryId, title, label: label?  [label]: null });
    const issue = createIssue.issue;
    if ( !columnName || !issue.number) {
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
    const { addProjectV2ItemById } = await this.graphqlAuth(mutationItem, { projectId, contentId: issue.id });  
    const itemId = addProjectV2ItemById.item.id;

    const fieldId = repository.projectV2.field.id;
    const mapValues = await this.getColumnValueMap();
    const columnValue = mapValues[columnName]; 
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
    const {updateProjectV2ItemFieldValue } = await this.graphqlAuth(mutationColumn, { projectId, itemId, fieldId, columnValue });

    return issue.number;  
  }

  async  moveIssue(issueNumber, columnName) {
    const issue = await this.getIssue(issueNumber);
    const itemId = issue.projectItems.nodes[0].id;
    const projectId = issue.projectItems.nodes[0].project.id;  
    const fieldId = issue.projectItems.nodes[0].fieldValueByName.field.id;
    const mapValues = await this.getColumnValueMap();
    const columnValue = mapValues[columnName]; 
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
    const {updateProjectV2ItemFieldValue } = await this.graphqlAuth(mutation, { projectId, itemId, fieldId, columnValue });
    return updateProjectV2ItemFieldValue?.projectV2Item ? true: false ;  
  }

  async assignIssueToMe(issueNumber) {
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
    const {addAssigneesToAssignable } = await this.graphqlAuth(mutation, { issueId: issue.id, userId: user.id });
    return addAssigneesToAssignable.assignable.assignees.totalCount > 0 ;  
  }

  async getCommit(commitSha) {
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
    const { repository } = await this.graphqlAuth(query, { commitSha,...this.repoVar});
    return repository.object; 
  }

  async assignBranchToIssue(issueNumber, branchName, commitSha) {
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
    const {createLinkedBranch } = await this.graphqlAuth(mutation, { issueId: issue.id, oid: commit.oid, branchName });
    console.log(createLinkedBranch);
    return createLinkedBranch?.issue?.id ? true: false ;  
  }

  async getValidateIssueColumn(issueNumber, columnName) {
      const issue = await this.getIssue(issueNumber);
  }


  async getIssueState(issueNumber){
    const issue = await this.getIssue(issueNumber);
    return issue.projectItems?.nodes[0]?.fieldValueByName?.name;
  }

  async getMyIssues(issueNumber){

  }

  getIssueName(title) {
    return title.toLowerCase().replaceAll(' ', '-');
  }

  async  getIssueObject(issueNumber){
    const result = await this.getIssue(issueNumber);
    const addFields = {};
    addFields.name = this.getIssueName(result.title);
    if ( result.linkedBranches.nodes.length > 0 ) {
      addFields.branch = result.linkedBranches.nodes[0].ref.name;
    }
    delete result.linkedBranches;

    if ( result.projectItems.nodes.length > 0 ) {
      addFields.state = result.projectItems.nodes[0].fieldValueByName.name;
    }
    delete result.projectItems;

    if ( result.labels.nodes.length > 0 ) {
      addFields.labels = [];
      for ( const node of result.labels.nodes ) {
        addFields.labels.push(node.name);
      }
    }
    delete result.labels;

    return { ...addFields,  ...result};
  }

 async  getRepository(label){
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
  const { repository } = await this.graphqlAuth(query, { label, projectNumber: this.projectNumber,...this.repoVar});
  return repository;
}

async getIssue(issueNumber){
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

  const { repository } = await this.graphqlAuth(query, { issueNumber: parseInt(issueNumber),...this.repoVar});

  return repository.issue;
}

async  getIssuesByState(state){
    // let issues = [];
    // const result = await octokit.request(`GET /repos/${owner}/${repo}/issues`, {
    //     headers: {
    //     'X-GitHub-Api-Version': '2022-11-28'
    // }
    // });
    // if ( result.status === 200 ) {
    //     for ( const issue of result.data) {
    //         const labels = issue.labels.map( label=> label.name );
    //         const assignees = issue.assignees.map( assignee => assignee.login );
    //         issues.push( { body: issue.body, labels, assignees, state: issue.state, number: issue.number, title: issue.title } );
    //     }
    // }
    // return issues;
  }
}