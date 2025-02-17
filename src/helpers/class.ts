import { ObjectRecord, DocumentationModule } from "../types/auto.js";
import sf from "./connect.js";
import {default as templateGenerator, TemplateEngine } from "./template.js";
import {DICTIONARY_FOLDER, getModelFolders} from "./util.js"
let _templateEngine: undefined| TemplateEngine;

function getTemplateEngine(){
  if ( !_templateEngine ) {
    _templateEngine = templateGenerator( getModelFolders('dictionary'), "md");
  }
  return _templateEngine;
}

import {
  sortByName,
  getNamesByExtension,
  verFecha,
  splitFilename
} from "./util.js";



async function getMetadata(clases: string[]): Promise<IApexClass[]> {
  try {
    await sf.connect();
    const classRecords = await sf.getClasses(clases);
    return Array.isArray(classRecords) ? classRecords: [classRecords];
  } catch (e) {
    console.error(e);
  }
  return [];
}

export function getClasses(files: string[]): string[] {
  const items: Set<string> = new Set();

  for ( const file of files ) {
    if (file.indexOf("/classes/") > 0 ) {
      const {filename} = splitFilename(file);
      items.add(filename.split(".")[0]);
    }
  }
  return [...items.values()];
}

function classLink(this: ObjectRecord) {
  const name = this.Name;
  return `./diccionarios/classes/${name}`;
}

function classLinkGraph(this: ObjectRecord) {
  const name = this.Name;
  return `./diccionarios/classes/${name}`;
}

function linkToType(this: string) {
  const dictionaryClasses = getNamesByExtension(
    DICTIONARY_FOLDER + "/classes",
    "md"
  );
  
  const fullType = this.replace("<", "~").replace(">", "~");
  const types = fullType.split("~");
  for (const t in types) {
    if (dictionaryClasses.includes(t)) {
      fullType.replace(t, `[{t}](./diccionarios/classes/{t})`);
    }
  }
  return fullType;
}

function filterByPublic(this: ObjectRecord) {
  return this.modifiers.includes("public") || this.modifiers.includes("global");
}

function scopeModifiers(this: ObjectRecord) {
  const modifiers = [];

  if (this.modifiers.includes("public") || this.modifiers.includes("global")) {
    modifiers.push(`+`);
  }
  if (this.modifiers.includes("private")) {
    modifiers.push(`-`);
  }
  if (this.modifiers.includes("protected")) {
    modifiers.push(`#`);
  }
  return modifiers.join(" ");
}

function modifiers(this: ObjectRecord) {
  const modifiers = [];

  if (this.modifiers.includes("abstract")) {
    modifiers.push(`*`);
  }
  if (this.modifiers.includes("override")) {
    modifiers.push(`o`);
  }
  if (this.modifiers.includes("static") || this.modifiers.includes("final")) {
    modifiers.push(`$`);
  }
  return modifiers.join(" ");
}

function classAttributes(this: IApexClass) {
  const attributes = [];

  // if (this.isValid === "true") {
  //   attributes.push(`![Encripted](/img/password_60.png)`);
  // }
  const systemTable = this.SymbolTable as ISystemTable;
  if (systemTable.tableDeclaration.modifiers.includes("static")) {
    attributes.push(`$`);
  }
  if (
    systemTable.tableDeclaration.modifiers.includes("public") ||
    systemTable.tableDeclaration.modifiers.includes("global")
  ) {
    attributes.push(`+`);
  }
  if (systemTable.tableDeclaration.modifiers.includes("private")) {
    attributes.push(`-`);
  }
  if (systemTable.tableDeclaration.modifiers.includes("protected")) {
    attributes.push(`#`);
  }
  if (systemTable.tableDeclaration.modifiers.includes("global")) {
    attributes.push(`G`);
  }

  return attributes.join(" ");
}

function getInnerClasses(classes: IApexClass[]): IApexClass[] {
  let ret:IApexClass[] = [];

  for (const clase of classes) {
    if ( clase.SymbolTable && (clase.SymbolTable as ISystemTable).innerClasses.length > 0) {
      const innerClases: IApexClass[] = (clase.SymbolTable as ISystemTable).innerClasses.map((subclase) => {
        subclase.namespace =
          (clase.namespace ? clase.namespace + "." : "") + clase.Name;
        return {
          Name: subclase.Name,
          type: "inner",
          namespace: subclase.namespace,
          SymbolTable: [subclase]
        };
      });
      ret = ret.concat(innerClases);
      const subInner = getInnerClasses((clase.SymbolTable as ISystemTable).innerClasses);
      ret = ret.concat(subInner);
    }
  }
  return ret;
}

export async function executeClasses(items: string[], filename: string, folder: string): Promise<void> {
  const templateEngine = getTemplateEngine();

  if (items.length === 0) {
    return;
  }
  // Busca la metadata
  let contexts = await getMetadata(items );
  if (!contexts || contexts.length === 0) {
    return;
  }
  
  // Arma el diccionario de cada Clase
  templateEngine.read("class");
  for (const context of contexts) {
    templateEngine.render(context, {
      helpers: {
        verFecha,
        modifiers,
        linkToType,
        classLinkGraph,
        filterByPublic,
        classAttributes,
        scopeModifiers
      }
    });
    templateEngine.save(context.Name, DICTIONARY_FOLDER + "/classes");
  }

  // Saca las innerClass y las pone como clases con namespace
  const innerClasses = getInnerClasses(contexts);
  const namespaces: Record<string, string[]> = {};
  if (innerClasses.length > 0) {
    templateEngine.read("class-inner");
    for (const context of innerClasses) {
      templateEngine.render(context, {
        helpers: { verFecha, modifiers, linkToType }
      });
      templateEngine.save(
        context.Name,
        DICTIONARY_FOLDER + "/classes/" + context.namespace
      );
      // arma un mapa de namespace con el array de sus innerclases
      if ( context.namespace ){
        if (namespaces[context.namespace] === undefined) {
          namespaces[context.namespace] = [context.Name];
        } else {
          namespaces[context.namespace].push(context.Name);
        }
      }
    }
    contexts = contexts.concat(innerClasses);
  }

  // Arma el documento indice del grupo de clases
  contexts.sort(sortByName);
  templateEngine.read("classes");

  const classContext = { classes: contexts, namespaces };
  templateEngine.render(classContext, {
    helpers: {
      verFecha,
      modifiers,
      linkToType,
      filterByPublic,
      classLinkGraph,
      classLink
    }
  });
  templateEngine.save(filename,  + "/" + folder);
}


const classModule: DocumentationModule = {
  getItems: getClasses,
  execute: executeClasses
}

export default classModule;

/**
 * TODO
 * innerClass
 * annotations
 * locations links
 * complex types Map<Class, Class>
 * relaciones composicion, etc
 */

/* annotations
@AuraEnabled
@TestSetup
@TestVisible
@IsTest
@Future

@Deprecated
@InvocableMethod
@InvocableVariable
@JsonAccess
@NamespaceAccessible
@ReadOnly
@RemoteAction
@SuppressWarnings

@ReadOnly

REST API 
@RestResource(urlMapping='/nombremiapi')
@HttpDelete
@HttpGet
@HttpPatch
@HttpPost
@HttpPut
*/
