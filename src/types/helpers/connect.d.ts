interface ILightningComponentBundle {
    MasterLabel:string,
    Language:string,
    Metadata:object,
    NamespacePrefix:string,
    Id:string
}

interface ILightningComponentResource {
    LightningComponentBundleId:string,
    Format?:string,
    FilePath?:string,
    Source?:string
}


interface ISystemTable {
    tableDeclaration: {
        modifiers: string[]
    }
    innerClasses: IApexClass[]
}
   
interface IApexClass {
    Name:string,
    type?: string,
    namespace?: string,
    Status?:string,
    IsValid?:boolean,
    ApiVersion?:string,
    CreatedDate?:string,
    LastModifiedDate?:string,
    SymbolTable: ISystemTable | IApexClass[]
}

interface IDependency {
    Id: string,
    name: string,
    type: string
}    
type Dependencies = Record<string,{parents: IDependency[], childs: IDependency[] }>;

interface IMetadataComponentDependency {
    RefMetadataComponentId:string,
    MetadataComponentId:string,
    MetadataComponentName:string,
    MetadataComponentType:string,
    MetadataComponentId:string,
    RefMetadataComponentId:string,
    RefMetadataComponentName:string,
    RefMetadataComponentType:string
}

interface ILwc {
    Name: string;
    resources: ILightningComponentResource[];
    dependencies: {
        parents: IDependency[];
        childs: IDependency[];
    };
}

type OrganizationInfo = {
    alias: string,
    isExpired: boolean,
    accessToken: string,
    instanceUrl: string
}
type OrganizationResults = {
    status: number,
    result: Record<string, OrganizationInfo[] >
  }

interface ISFConfigValue {
    name: string,
    key: string,
    value: string,
    path: string,
    success: boolean,
    location: string
  }

type SFConfigGetValue = {
    status: number,
    result: [ISFConfigValue]
  }