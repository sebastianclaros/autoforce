import prompts from "prompts";
import { getMetadataFromContext } from "./util.mjs";
import objectHelper from "./object.mjs";
import classHelper  from "./class.mjs";
import lwcHelper  from "./lwc.mjs";

// Logica especificas de cada componente
export const helpers = {
  objects: objectHelper,
  classes: classHelper,
  lwc: lwcHelper
};

export async function execute() {
  const components = Object.keys(helpers);
  //const nodes = getMetadataFromFile(opciones.f, components);
  const nodes = getMetadataFromContext(components);

  for (const node of nodes) {
    const filename = node.hasChilds
      ? `${node.path}/intro.md`
      : `${node.path}/${node.name}.md`;
    for (const component of components) {
      const items = node[component];
      if (items?.length > 0) {
        const helper = helpers[component];
        await helper.execute(items);
      }
    }
  }
}

export default {
  objects: objectHelper,
  classes: classHelper,
  lwc: lwcHelper
};

/**
 * example json

[
    {
    "name": "modulo",
    "description": "descripcion del modulo",
    "directory": "path", // si no viene es el name
    "components": [ 

        { 
        "name": "",
        "description": "descripcion del item",
        "folder": "folder-name-only", 
        "objects": [ "", ""], 
        "classes": [ "", ""],
        "lwc": [ "", ""]
        }
    ]
    }
]
 */
