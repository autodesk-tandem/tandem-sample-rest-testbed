
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

/***************************************************
** FUNC: getElementAndTypeProperties()
** DESC: get the properties for a specific elementKey, and also get their Type properties
**********************/

export async function getElementAndTypeProperties(modelURN, elemKeys) {

  console.group("STUB: getElementAndTypeProperties()");

    // most of the stubs allow multiple keys, but it will complicate the logic for this one, so restrict to a single key
  let elemKeysArray = [];
  if (elemKeys == "") {
    console.log("No element key specified.");
    console.groupEnd();
    return;
  }
  else {
    elemKeysArray = elemKeys.split(',');
    if (elemKeysArray.length > 1) {
      console.log("Only using the first element key for this stub...");
      elemKeysArray.splice(1);
    }
    console.log("Scanning for specific element key", elemKeysArray);
  }

    // call /scan for this element and get all the properties available
  const elementProps = await utils.scanAllPropsForElements(modelURN, elemKeysArray, false);
  if (elementProps == null) {
    console.log("ERROR: Could not find properties for that element.");
    console.groupEnd();
    return;
  }

  console.log("Element Properties", elementProps);  // these are the Element (or instance) properties

    // we now have the main Element properties.  We need to dig out the Type elementKey and then call /scan on that.
    // However, currently the /scan API returns "short keys" for this, so we will have to convert to a long key.
  const typeRef = await utils.digOutPropertyValuesQPLiteral(modelURN, "l:t", elementProps, false);
  if (typeRef) {
    console.assert(typeRef.length == 1);  // we are only demonstrating this for a single element to keep logic understandable
    const longKey = utils.toQualifiedKey(typeRef[0].value, true);
    console.log("Long key for Type:", longKey);

    const typeProps = await utils.scanAllPropsForElements(modelURN, [longKey], false);
    console.log("Type Properties", typeProps);
  }
  else {
    console.log("ERROR: Could not find Type property (\"l:t\")");
  }

  console.groupEnd();
}

