import sf from "./connect.mjs";
import templateGenerator from "./template.mjs";
const templateEngine = templateGenerator("dictionary", "md");

import {
  sortByName,
  splitFilename,
  DICTIONARY_FOLDER,
  DOCS_FOLDER
} from "./util.mjs";

async function getContext(lwc) {
  try {
    await sf.connect();
    const lwcRecords = await sf.getLwc(lwc);
    return Array.isArray(lwcRecords) ? lwcRecords: [lwcRecords];
  } catch (e) {
    splitFilename;
    console.error(e);
  }
}

export function getLwc(files) {
  const items = new Set();

  for ( const file of files ) {
    if (file.indexOf("/lwc/") > 0 ) {
      const {filename} = splitFilename(file);
      items.add(filename.split(".")[0]);
    }
  }
  return [...items.values()];
}

export async function executeLwc( items, filename, folder) {
  if (items.length === 0) {
    return;
  }
  // Busca la metadata
  let contexts = await getContext(items );


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


  const lwcContext = { lwc: contexts, namespaces };
  templateEngine.render(lwcContext, {
    helpers: {}
  });
  
  templateEngine.save(filename, DOCS_FOLDER + "/" + folder);
}


export default {
  getItems: getLwc,
  execute: executeLwc
}
