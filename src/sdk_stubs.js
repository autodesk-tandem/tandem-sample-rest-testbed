import * as utils from './utils.js';
import { ColumnFamilies, QC } from "../sdk/dt-schema.js";

/**
 * Iterate through the facility and get all rooms
 * 
 * @param {Array.<object>} elems 
 */
function prettyPrintElementKeyAndName(elems) {
    // Dig out the values for Name so we can display in an easy to read table
  let prettyPrint = [];
  for (let j=0; j<elems.length; j++) {
    prettyPrint.push({ k: elems[j].k, name: elems[j][QC.Name][0] });
  }
  if (prettyPrint.length)
    console.table(prettyPrint);
}

/**
 * iterate through the facility and get all rooms and spaces
 * 
 * @returns {Promise<void>}
 */
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

/**
 * Iterate through the facility and get all Levels.
 * 
 * @returns {Promise<void>}
 */
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

/**
 * Get the properties for a specific elementKey, and also get their Type properties.
 * 
 * @param {string} modelURN 
 * @param {Array.<string>} elemKeys 
 * @returns 
 */
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

/**
 * The function interates through the facility and prints out levels, rooms and assets.
 * 
 * @returns {Promise<void>}
 */
export async function getFacilityStructure() {
  console.log("getFacilityStructure()");
  const data = {
    levels: {}, // map between level key and level
    rooms: {}, // map between room key and room
    assets: {}, // map between asset key and asset
    roomAssetsMap: {}, // map between room and assets (asset key - room key)
    roomLevelMap: {} // map between room and level (room key - level key)
  };
  const modelRooms = [];
  const models = await utils.getListOfModels(utils.facilityURN);
  const defaultModelId = utils.getDefaultModel();

  console.info(`Reading facility assets`);
  for (const model of models) {
    console.info(`Processing model ${model.label} (${model.modelId})`);
    const modelId = model.modelId;

    // skip default model
    if (modelId === defaultModelId) {
      continue;
    }
    const assets = await utils.getTaggedAssets(model.modelId, [ ColumnFamilies.Standard, ColumnFamilies.DtProperties, ColumnFamilies.Refs, ColumnFamilies.Xrefs ]);

    for (const asset of assets) {
      const assetKey = asset[QC.RowKey];
      
      data.assets[assetKey] = asset;
      let roomRef = asset[QC.Rooms];
      const assetRooms = [];
      
      if (roomRef) {
        const roomKeys = utils.fromShortKeyArray(roomRef);

        for (const roomKey of roomKeys) {
          assetRooms.push({
            modelId: modelId,
            roomId: roomKey
          });
        }
      } else {
        roomRef = asset[QC.XRooms];
        const roomKeys = utils.fromXrefKeyArray(roomRef);
        const modelIds = roomKeys[0];
        const elementKeys = roomKeys[1];

        for (let i = 0; i < modelIds.length; i++) {
          assetRooms.push({
            modelId: `urn:adsk.dtm:${modelIds[i]}`,
            // in case of xref key we need to decode from long key to short key
            roomId: utils.toShortKey(elementKeys[i])
          });
        }
      }
      // build map between asset and rooms - note that asset can be linked to more than one room
      for (const { roomId } of assetRooms) {
        const roomKey = roomId;
        let assetIds = data.roomAssetsMap[roomKey];

        if (!assetIds) {
          assetIds = [];
        }
        assetIds.push(assetKey);
        data.roomAssetsMap[roomKey] = assetIds;
      }
      modelRooms.push(... assetRooms);
    }
  }
  // process rooms and create map between room and level
  const modelIds = new Set(modelRooms.map(i => i.modelId));

  console.info(`Mapping rooms & levels`);
  for (const modelId of modelIds) {
    const roomIds = new Set(modelRooms.filter(i => i.modelId === modelId).map(i => i.roomId));
    const rooms = await utils.getElements(modelId, [... roomIds ],
      [ ColumnFamilies.Standard, ColumnFamilies.Refs ]);
    const levelIds = new Set();

    for (const room of rooms) {
      const roomKey = room[QC.RowKey];

      data.rooms[roomKey] = room;
      const levelRef = room[QC.Level];

      if (levelRef) {
        levelIds.add(levelRef);
        data.roomLevelMap[roomKey] = levelRef;
      }
    }
    // process levels
    if (levelIds.size > 0) {
      const levels = await utils.getElements(modelId, [... levelIds ]);

      for (const level of levels) {
        const levelKey = level[QC.RowKey];

        data.levels[levelKey] = level;
      }
    }
  }
  if (Object.keys(data.levels) === 0) {
    console.warn('No levels found in the facility');
  }
  if (Object.keys(data.rooms) === 0) {
    console.warn('No rooms found in the facility');
  }
  // print out structure
  for (const { levelKey, level } of getLevelsFromStructure(data)) {
    console.group(`${level[QC.Name]} (${level[QC.RowKey]})`);
    for (const { roomKey, room } of getRoomsByLevel(data, levelKey)) {
      console.group(`${room[QC.Name]} (${room[QC.RowKey]})`);
      const items = getAssetsByRoom(data, roomKey).map(( { asset } ) => {
        return {
          key: asset[QC.RowKey],
          name: asset[QC.Name]
        };
      });

      console.table(items);
      console.groupEnd();
    }
    console.groupEnd();
  }
}

/**
 * Gets the levels from the structure data.
 * 
 * @param {any} data 
 * @returns {Array<{ levelKey: string, level: any }>}
 */
function getLevelsFromStructure(data) {
  const result = [];

  for (const levelKey in data.levels) {
    const level = data.levels[levelKey];

    result.push({ levelKey, level });
  }
  return result;
}

/**
 * Gets the rooms by level from the structure.
 * 
 * @param {any} data 
 * @param {string} levelKey 
 * @returns {Array<{ roomKey: string, room: any}>}
 */
function getRoomsByLevel(data, levelKey) {
  const result = [];

  for (const roomKey in data.rooms) {
    if (data.roomLevelMap[roomKey] !== levelKey) {
      continue;
    }
    const room = data.rooms[roomKey];

    result.push({ roomKey, room });
  }
  return result;
}

/**
 * Gets te assets by room from the structure.
 * 
 * @param {any} data 
 * @param {string} roomKey 
 * @returns {Array<{ assetKey: string, asset: any }>}
 */
function getAssetsByRoom(data, roomKey) {
  const assetKeys = data.roomAssetsMap[roomKey];
  const result = [];

  for (const assetKey of assetKeys) {
    const asset = data.assets[assetKey];

    result.push({ assetKey, asset });
  }
  return result;
}
