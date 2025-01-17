import objectHelper from "./object.js";
import classHelper  from "./class.js";
import lwcHelper  from "./lwc.js";
import type { DocumentationModule } from "../types/auto.js";

// Logica especificas de cada componente
const helpers: Record<string, DocumentationModule> = {
  objects: objectHelper,
  classes: classHelper,
  lwc: lwcHelper
};

export default helpers;

/*
import context from "./context.js";
import type { DocumentationModule, IProcessInfo, IMetadataNode, IMetadataComponentNode } from "../types/auto.js";
function getMetadataFromContext(components: string[]) {
    return getMetadataArray(context.getProcessMetadata(), components);
}

function mergeArray(baseArray: string[], newArray: string[]) {
    if (!Array.isArray(newArray) && !Array.isArray(baseArray)) {
      return [];
    }
    // Si el new esta vacio
    if (!Array.isArray(newArray) || newArray.length == 0) {
      return baseArray;
    }
    // Si el base esta vacio
    if (!Array.isArray(baseArray) || baseArray.length == 0) {
      return newArray;
    }
    // Sino filtra y concatena
    const notIncludeInBaseArray = (a:string) => baseArray.indexOf(a) === -1;
    return baseArray.concat(newArray.filter(notIncludeInBaseArray));
}
  
  
function getMetadataArray(metadata: IProcessInfo[], props: string[]) {
    const mergeObject = (root: IMetadataNode, childs: IMetadataNode[]) => {
      for (const item of childs) {
        for (const key of props as (keyof IMetadataComponentNode)[]) {
          root[key] = mergeArray(root[key], item[key]);
        }
      }
      return root;
    };
    const getItemsFromTree = (node: IMetadataNode, parentPath = '') => {
      const items: IMetadataNode[] = [];
      if (Array.isArray(node)) {
        for (const item of node) {
          items.push(...getItemsFromTree(item, parentPath));
        }
      } else {
        const folder = node.hasChilds ? node.folder : node.name;
        node.path = parentPath ? `${parentPath}/${folder}` : folder;
        if (node.hasChilds) {
          // Borra el childs, pero le deja hasChilds en true para saber si es una hoja del arbol
          const { childs, ...itemToAdd } = node;
          itemToAdd.hasChilds = true;
          const childItems = getItemsFromTree(childs, node.path);
          items.push(mergeObject(itemToAdd, childItems));
          items.push(...childItems);
        } else {
          items.push(node);
        } 
      }
      return items;
    };
  
    return getItemsFromTree({ folder: TEMPLATE_FOLDER, childs: metadata });
  }
  
export async function execute() {
  const components = Object.keys(helpers);
  const nodes = getMetadataFromContext(components);

  for (const node of nodes) {
    for (const component of components) {
        const filename = node.hasChilds
        ? `${node.path}/intro.md`
        : `${node.path}/${node.name}.md`;  
        const items = node[component];
        if (items?.length > 0) {
            const helper = helpers[component];
            await helper.execute(items, filename, node.path);
        }
    }
  }
}



*/

/**
 * example json
 * 
    "process-name": {
      "classes": string:[],
      "objects": string:[]
    },



[
    {
        "name": "modulo",
        "description": "descripcion del modulo",
        "components": [ 
            { 
                "name": "",
                "description": "descripcion del item",
                "path": "folder-name-only", 
                "objects": [ "", ""], 
                "classes": [ "", ""],
                "lwc": [ "", ""]
            }
        ]
    }
]
 */