import { DocumentationModule } from "../types/auto.js";
import sf from "./connect.js";
import templateGenerator from "./template.js";
const templateEngine = templateGenerator("dictionary", "md");

import {
  sortByName,
  splitFilename,
  DICTIONARY_FOLDER,
  TEMPLATES_FOLDER
} from "./util.js";

async function getMetadata(lwc: string[]): Promise<ILwc[]> {
  try {
    await sf.connect();
    const lwcRecords = await sf.getLwc(lwc);
    return Array.isArray(lwcRecords) ? lwcRecords: [lwcRecords];
  } catch (e) {
    console.error(e);
  }
  return [];
}

function getLwc(files: string[]) {
  const items: Set<string> = new Set();

  for ( const file of files ) {
    if (file.indexOf("/lwc/") > 0 ) {
      const {filename} = splitFilename(file);
      items.add(filename.split(".")[0]);
    }
  }
  return [...items.values()];
}

async function executeLwc( items: string[], filename: string, folder: string): Promise<void> {
    if (items.length === 0) {
    return;
  }
  // Busca la metadata
  const contexts = await getMetadata(items );

  if (!contexts || contexts.length === 0) {
    return;
  }

  // Arma el diccionario de cada LWC
  templateEngine.read("lwc");
  for (const context of contexts) {
    templateEngine.render(context, {
      helpers: {}
    });
    templateEngine.save(context.Name, DICTIONARY_FOLDER + "/lwc");
  }

  // Arma el documento indice del grupo de lwc
  contexts.sort(sortByName);
  templateEngine.read("lwcs");


  const lwcContext = { lwc: contexts };
  templateEngine.render(lwcContext, {
    helpers: {}
  });
  
  templateEngine.save(filename, TEMPLATES_FOLDER + "/" + folder);
}



const lwcModule: DocumentationModule = {
  getItems: getLwc,
  execute: executeLwc
}

export default lwcModule;
