import { gql, GraphQLClient } from 'graphql-request'

const GITLAB_API = 'https://gitlab.com/api/graphql?remove_deprecated=true'

export class GitLabApi {
    repoVar;
    projectNumber; 
    graphqlAuth;
    
    constructor(token, owner, repo, projectNumber) {
        this.graphqlAuth = new GraphQLClient(GITLAB_API);
        this.repoVar = { owner, repo };
        this.projectNumber = projectNumber;
        this.graphqlAuth.setHeaders({  authorization: `Bearer ${token}` })

    }
    async  getUser() {
        const query = `{
          viewer {
            login
            id
          }
        }`;
        const {viewer } = await this.graphqlAuth.request(query);
        return viewer;
      }
    
    async graphqlQuery( query, vars) {
        let result = await this.graphqlAuth.request(query, vars);
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
}
