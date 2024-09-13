import { CustomObject } from "jsforce/lib/api/metadata.js";
import { ObjectRecord, DocumentationModule } from "../types/auto.js";
import sf from "./connect.js";
import templateGenerator from "./template.js";
const templateEngine = templateGenerator("dictionary", "md");

import {
  sortByLabel,
  DICTIONARY_FOLDER,
  DOCS_FOLDER,
} from "./util.js";

async function getMetadata(objetos: string[]): Promise<CustomObject[]> {
  try {
    await sf.connect();
    const objects = await sf.customObjects(objetos);

    return Array.isArray(objects) ? objects: [objects];
  } catch (e) {
    console.error(e);
  }
  return [];
}

function descriptionFormula(this: ObjectRecord) {
  return this.description?.replaceAll(/[\n\r]/g, "<br/>");
}

function isManaged(this: ObjectRecord) {
  return this.fullName.split("__").length == 3;
}

function isMetadataFormula(this: ObjectRecord) {
  return this.fullName?.endsWith("__mdt") || this.customSettingsType;
}

function attributesFormula(this: ObjectRecord) {
  const attributes = [];
  // Object Attributes
  if (this.enableHistory === "true") {
    attributes.push(`![Track History](/img/tracker_60.png)`);
  }

  // "enableActivities": "true",
  // "enableBulkApi": "true",
  // "enableChangeDataCapture": "false",
  // "enableFeeds": "false",
  // "enableHistory": "true",
  // "enableReports": "true",
  // "enableSearch": "false",
  // "enableSharing": "true",
  // "enableStreamingApi": "true",
  // "externalSharingModel": "Private",

  // Field Attributes
  if (this.required === "true") {
    attributes.push(`![Required](/img/lock_60.png)`);
  }

  if (this.trackHistory === "true") {
    attributes.push(`![Track History](/img/tracker_60.png)`);
  }
  // if ( this.inlineHelpText ) {
  //     attributes.push( `![${this.inlineHelpText}](/img/help_60.png)` );
  // }
  if (this.externalId === "true") {
    attributes.push(`![External Id](/img/database_60.png)`);
  }
  if (this.encrypted === "true") {
    attributes.push(`![Encripted](/img/password_60.png)`);
  }
  return attributes.join(" ");
}
function typeFormula(this: ObjectRecord) {
  if (this.formula) {
    return `Formula(${this.type})`;
  }
  if (this.type === "Lookup" || this.type === "MasterDetail") {
    return `[Lookup a ${this.referenceTo}](/diccionarios/objects/${this.referenceTo})`;
  }

  if (this.length || this.precision) {
    const longitud =
      (this.length || this.precision) +
      (this.scale && this.scale > 0 ? "." + this.scale : "");
    return `${this.type}(${longitud})`;
  }
  return this.type;
}

function getObjects(files: string[]): string[] {
  const items: Set<string> = new Set();

  for ( const file of files ) {
    let desde = file.indexOf("/objects/");
    if ( desde !== -1 ) {
      desde += 9; // se desplaza hasta el proximo slash
      const hasta = file.indexOf("/", desde + 1);
      const objectName = file.substring(desde, hasta);
      items.add(objectName);
    }
  }
  return [...items.values()];
}


async function executeObjects(items: string[], filename: string, folder: string): Promise<void> {
  if (items.length === 0) {
    return;
  }
  // Busca la metadata
  const contexts = await getMetadata(items);
  if (!contexts || contexts.length === 0) {
    return;
  }

  // Arma el diccionario de cada Objeto
  templateEngine.read("object");
  for (const context of contexts) {
    if ( context.fullName ) {
      templateEngine.render(context, {
        helpers: { isManaged, descriptionFormula, typeFormula, attributesFormula }
      });
      templateEngine.save(context.fullName, DICTIONARY_FOLDER + "/objects");
    }
  }
  // Arma el documento indice del grupo de objetos
  contexts.sort(sortByLabel);
  templateEngine.read("objects");

  const objectContext = { objects: contexts };
  templateEngine.render(objectContext, {
    helpers: { isManaged, isMetadataFormula, attributesFormula }
  });
  templateEngine.save(filename, DOCS_FOLDER + "/" + folder);
}


const objectModule: DocumentationModule = {
  getItems: getObjects,
  execute: executeObjects
}

export default objectModule;
