import { CustomObject } from "jsforce/lib/api/metadata.js";
import context from "./context.js";
import jsforce, { Connection } from "jsforce";
const DEBUG = process.env.DEBUG || false;
const API_VERSION = "60.0";

let conn: Connection;

async function connect() {
  const orgObject = context.scratch;
  const accessToken = orgObject.accessToken;
  const instanceUrl = orgObject.instanceUrl;
  if (!(accessToken && instanceUrl)) {
    console.error(
      "Para bajar la metadata la herramienta se loguea a Salesforce con la default org. Verifique sf config get target-org"
    );
    throw new Error("Falta configurar ejecute: yarn auto config");
  }
  if (accessToken && instanceUrl) {
    try {
      conn = new jsforce.Connection({
        instanceUrl,
        accessToken,
        version: API_VERSION
      });

      //      const identity = await conn.identity();
      //    console.log(identity);

      if (DEBUG) {
        console.log(conn);
      }
    } catch (e) {
      if (DEBUG) {
        console.log(e);
      }
      throw `Por favor verifique accessToken y instanceUrl ${accessToken} ${instanceUrl}`;
    }
  }

//  if (username && password) {
//    try {
//      conn = new jsforce.Connection({
//        loginUrl: process.env.SF_LOGINURL || "https://test.salesforce.com",
//        version: API_VERSION
//      });
//      const userInfo = await conn.login(username, password);
//
//      if (DEBUG) {
//        console.log("accessToken", conn.accessToken);
//      }
//    } catch (e) {
//      if (DEBUG) {
//        console.log(e);
//      }
//      throw `Por favor verifique usuario y password ${username} ${password}`;
//    }
//  }
}

function check() {
  return conn.accessToken ? true : false;
}

// async function getOmni(fullNames: string[]) {}
// 
// async function getIP(fullNames: string[]) {}

async function getDependencies(listOfIds: string[] ): Promise<Dependencies> {
  const up: IMetadataComponentDependency[]  = await conn.tooling
    .sobject("MetadataComponentDependency")
    .find({ RefMetadataComponentId: listOfIds }, [
      "RefMetadataComponentId",
      "MetadataComponentId",
      "MetadataComponentName",
      "MetadataComponentType"
    ]);
  const down: IMetadataComponentDependency[] = await conn.tooling
    .sobject("MetadataComponentDependency")
    .find({ MetadataComponentId: listOfIds }, [
      "MetadataComponentId",
      "RefMetadataComponentId",
      "RefMetadataComponentName",
      "RefMetadataComponentType"
    ]);

  const dependencies: Dependencies = {};
  for (const record of up) {
    const entry = {
      Id: record.MetadataComponentId,
      name: record.MetadataComponentName,
      type: record.MetadataComponentType
    };
    let item = dependencies[record.RefMetadataComponentId];
    if (!item) {
      item = { parents: [], childs: [] };
    }
    item.childs.push(entry);
  }
  for (const record of down) {
    const entry = {
      Id: record.RefMetadataComponentId,
      name: record.RefMetadataComponentName,
      type: record.RefMetadataComponentType
    };
    let item = dependencies[record.MetadataComponentId];
    if (!item) {
      item = { parents: [], childs: [] };
    }
    item.parents.push(entry);
  }
//   console.log(up, down, dependencies);
  return dependencies;
}
function expiredSession() {
  console.error(
    "El token de la sesion expiro, puede actualizarlo manualmente corriendo sf org display y copiar el Access Token en el .env "
  );
  process.exit(-1);
}
async function getLwc(fullNames: string[]): Promise<ILwc[]> {
  /**
Archivos, JS => JSDoc
*/
  //console.log( JSON.stringify(conn.version) );
  try {
    const bundle:ILightningComponentBundle[] = await conn.tooling
      .sobject("LightningComponentBundle")
      .find({ MasterLabel: fullNames }, [
        "MasterLabel",
        "Language",
        "Metadata",
        "NamespacePrefix",
        "Id"
      ]);
    const listOfIds = bundle.map((item) => item.Id);
    if ( listOfIds.length > 0 ) {
      const listOfResources:ILightningComponentResource[]  = await conn.tooling
      .sobject("LightningComponentResource")
      .find({ LightningComponentBundleId: listOfIds }, [
        "LightningComponentBundleId",
        "Format",
        "FilePath",
        "Source"
      ]);

      // Convierte los resources en un mapa con clave el Id y como valor la lista de sus resources
      const resources: Record<string, ILightningComponentResource[]> = {};
      for (const resource of listOfResources) {
        const lwcId = resource.LightningComponentBundleId;
        if (!resources[lwcId]) {
          resources[lwcId] = [resource];
        } else {
          resources[lwcId].push(resource);
        }
      }
      // Saca las dependencias
      const dependencies = await getDependencies(listOfIds);
    
      const metadata: ILwc[] = bundle.map((item) => {
        return {
          Name: item.MasterLabel,
          resources: resources[item.Id],
          dependencies: dependencies[item.Id],
          ...item.Metadata
        };
      });
      return metadata;
    }
  } catch (e) {
    if (e instanceof Error) {
      if (e.name == "INVALID_SESSION_ID" || e.name == "sf:INVALID_SESSION_ID") {
        expiredSession();
      }

      if (DEBUG) {
        console.log(e);
      }
      const msg = ( e.name == 'ERROR_HTTP_420' ) ? 'El accesstoken y el instance url en el .env parece que no coinciden, verifique con sf org display' : `Error buscando metadata de los lwc ${fullNames}. ERR-NAME: ${e.name}`;
      throw msg;
    }
  }
  return [];
}

async function getClasses(fullNames: string[]): Promise<IApexClass[]> {
  try {
    // > tooling.sobject('ApexClass').find({ Name: "AsistenciasController" })
    const classNames = fullNames.map((clase) => clase.replace(".cls", ""));
    const metadata: IApexClass[] = await conn.tooling
      .sobject("ApexClass")
      .find({ Name: classNames }, [
        "Name",
        "Status",
        "IsValid",
        "ApiVersion",
        "CreatedDate",
        "LastModifiedDate",
        "SymbolTable"
      ]);

    if (DEBUG) {
      console.log(JSON.stringify(metadata));
    }
    return metadata;
  } catch (e) {
    if (e instanceof Error) {
        if (e.name == "INVALID_SESSION_ID" || e.name == "sf:INVALID_SESSION_ID") {
        expiredSession();
      }
      if (DEBUG) {
        console.log(e);
      }
      const msg = ( e.name == 'ERROR_HTTP_420' ) ? 'El accesstoken y el instance url en el .env parece que no coinciden, verifique con sf org display' : `Error buscando metadata de las clases ${fullNames}. ERR-NAME: ${e.name}`;
      throw msg;
    }
  }
  return [];
}

async function customObjects(fullNames: string[]): Promise<CustomObject[]> {
  try {
    let metadata: CustomObject[];
    if (fullNames.length <= 10) {
      metadata = await conn.metadata.read("CustomObject", fullNames) as CustomObject[];
    } else {
      metadata = [];
      do {
        const items = fullNames.splice(0, 10);
        const result = await conn.metadata.read("CustomObject", items);
        metadata = metadata.concat(result);
      } while (fullNames.length > 0);
    }

    if (DEBUG) {
      console.log(JSON.stringify(metadata));
    }
    return metadata;
  } catch (e) {
    if (e instanceof Error) {
      if (e.name == "INVALID_SESSION_ID" || e.name == "sf:INVALID_SESSION_ID") {
        expiredSession();
      }
      if (DEBUG) {
        console.log(e);
      }
      const msg = ( e.name == 'ERROR_HTTP_420' ) ? 'El accesstoken y el instance url en el .env parece que no coinciden, verifique con sf org display' : `Error buscando metadata de los objetos ${fullNames}. ERR-NAME: ${e.name}`;
      throw msg;
    }
  }
  return [];
}

export default {
  connect,
  check,
  customObjects,
  getDependencies,
  getClasses,
  getLwc
};

// getIP
// getOmni