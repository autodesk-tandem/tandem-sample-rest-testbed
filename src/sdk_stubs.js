
import * as utils from './utils.js';
import { ColumnFamilies, ColumnNames, QC, ElementFlags } from "../sdk/dt-schema.js";

/***************************************************
** FUNC: prettyPrintElementKeyAndName()
** DESC: iterate through the facility and get all rooms
**********************/

function prettyPrintElementKeyAndName(elems) {
    // Dig out the values for Name so we can display in an easy to read table
  let prettyPrint = [];
  for (let j=0; j<elems.length; j++) {
    prettyPrint.push({ k: elems[j].k, name: elems[j][QC.Name][0] });
  }
  if (prettyPrint.length)
    console.table(prettyPrint);
}

/***************************************************
** FUNC: getRoomsAndSpaces()
** DESC: iterate through the facility and get all rooms and spaces
**********************/

export async function getRoomsAndSpaces() {

  console.group("STUB: getRoomsAndSpaces()");

  const models = await utils.getListOfModels();

  for (let i=0; i<models.length; i++) {
    console.group(`Model[${i}]--> ${models[i].label}`);
    console.log(`Model URN: ${models[i].modelId}`);

    const allElements = await utils.scanForPropertyQPLiteral([QC.CategoryId, QC.Name], models[i].modelId, false);

      // These are Rooms, normally show up in a Architectural model
      // Filter by Revit categorys, which for rooms is -2000160 (or just 160 in Tandem)
    let rooms = allElements.filter(row => row[QC.CategoryId]?.[0] === 160);
    console.log("Rooms", rooms);
    prettyPrintElementKeyAndName(rooms);

      // These are MEP Spaces, normally show up in a Mecahnical model
      // Filter by Revit categorys, which for rooms is -2003600 (or just 3600 in Tandem)
    let spaces = allElements.filter(row => row[QC.CategoryId]?.[0] === 3600);
    console.log("Spaces", spaces);
    prettyPrintElementKeyAndName(spaces);

    console.groupEnd();
  }

  console.groupEnd();
}

/***************************************************
** FUNC: getLevels()
** DESC: iterate through the facility and get all Levels
**********************/

export async function getLevels() {

  console.group("STUB: getLevels()");

  const models = await utils.getListOfModels();

  for (let i=0; i<models.length; i++) {
    console.group(`Model[${i}]--> ${models[i].label}`);
    console.log(`Model URN: ${models[i].modelId}`);

    const allElements = await utils.scanForPropertyQPLiteral([QC.CategoryId, QC.Name], models[i].modelId, false);
      // Filter by Revit categorys, which for rooms is -2000240 (or just 240 in Tandem)
    const levels = allElements.filter(row => row[QC.CategoryId]?.[0] === 240);
    console.log("Levels (raw result)", levels);
    prettyPrintElementKeyAndName(levels);

    console.groupEnd();
  }

  console.groupEnd();
}
