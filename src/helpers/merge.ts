/*
 * busca los tags que empiezan <!-- START UNIQUE_KEY --> <!-- END UNIQUE_KEY -->
 * @return matchObject {} Mapa de String a  {start, end, text}. Donde la key es UNIQUE_KEY, start es donde empieza el primer <!-- y end donde termina el segundo -->
 */


interface MatchRecord {
  start?: number;
  end?: number;
  text?: string;
}

type MatchObject = Record<string, MatchRecord >;

function createMatchObject(matches: IterableIterator<RegExpExecArray|RegExpMatchArray>): MatchObject {
  const matchObject: MatchObject  = {}; // mapa de key => { start: indice donde empieza, end: indice donde termina, text: texto entre ambos indices }
  const indices: number[] = [];
  for (const match of matches) {
    //const tag = match[0];
    const key = match[2].trim();
    const startOrEnd: string = match[1].toLowerCase().trim(); // guarda si el match es start o end
    if ( startOrEnd !== 'start' && startOrEnd !== 'end' ) {
      throw new Error(
        `No se puede hacer un merge porque se esperea un 'start' or'end' en vez de ${startOrEnd} `
      );      
    }
    if (matchObject[key] && matchObject[key][startOrEnd] !== undefined) {
      throw new Error(
        `No se puede hacer un merge porque hay mas de un ${startOrEnd} de ${key}. Debe haber uno solo por archivo `
      );
    }
    if (matchObject[key] === undefined) {
      matchObject[key] = {};
    }
    if ( typeof match.index !== 'undefined' ) {
      matchObject[key][startOrEnd] =
        startOrEnd === 'start' ? match.index : match.index + match[0].length;
    }

    const startIndex = matchObject[key].start;
    const endIndex = matchObject[key].end;
    if (startIndex !== undefined && endIndex !== undefined) {
      if (endIndex < startIndex) {
        throw new Error(
          `No se puede hacer un merge porque el start de ${key} esta despues del end`
        );
      }
      if ( typeof match.input !== 'undefined') {        
        indices[startIndex] = endIndex;
        matchObject[key].text = match.input.substring(startIndex, endIndex);
      }
    }
  }
  // Valida entradas incompletas
  for (const key of Object.keys(matchObject)) {
    if (
      matchObject[key].start === undefined ||
      matchObject[key].end === undefined
    ) {
      throw new Error(
        `No se puede hacer un merge porque ${key} no tiene una apertura y cierre`
      );
    }
  }
  // Valida que no haya anidamientos
  let lastEndIndex = 0;
  for (const start of Object.keys(indices).sort((a, b) => parseInt(a) - parseInt(b)) ) {
    const startAsNumber = parseInt(start);
    if (startAsNumber < lastEndIndex) {
      throw new Error(
        `No se puede hacer un merge porque estan anidados los start y end tags`
      );
    }
    lastEndIndex = indices[startAsNumber];
  }

  return matchObject;
}

export function merge(
  newContent: string,
  existingContent: string,
  cleanNotExistingTags: boolean = true
) {
  let mergeContent = existingContent;
  const regexp = /<!--[ ]*(start|end)[ ]*([^>]*)-->/gi;
  const newMatches = createMatchObject(newContent.matchAll(regexp));
  const existingMatches = createMatchObject(existingContent.matchAll(regexp));
  const newKeys = Object.keys(newMatches);
  const existingKeys = Object.keys(existingMatches);
  for (const key of newKeys) {
    // Por cada coincidencia reemplaza el texto existente por el texto nuevo
    if (existingKeys.includes(key)) {
      mergeContent = mergeContent.replace(
        existingMatches[key].text as string,
        newMatches[key].text as string
      );
    } else {
      // Si no esta lo appendea (ideal seria que quede en el lugar)
      mergeContent += newMatches[key].text;
    }
  }

  // Borra los viejos
  if (cleanNotExistingTags) {
    for (const key of existingKeys) {
      if (!newKeys.includes(key)) {
        mergeContent = mergeContent.replace(existingMatches[key].text as string, "");
      }
    }
  }

  return mergeContent;
}
