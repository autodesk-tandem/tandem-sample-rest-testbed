/**
 * SDK STUB Functions
 * 
 * These are higher-level functions that combine multiple API calls
 * to perform common operations. They demonstrate how to use the
 * Tandem API for typical workflows.
 * 
 * Output goes to browser console - open DevTools to see results.
 */

import { 
  getModels, 
  getDefaultModelURN,
  scanForQualifiedProperties,
  scanAllPropsForElements,
  getElements,
  getTaggedAssets,
  extractPropertyValues,
  getModelSchema,
  getFacilityInlineTemplate,
  scanModelElements,
  matchClassification
} from '../api.js';
import { QC, ColumnFamilies } from '../../tandem/constants.js';
import { toFullKey, fromShortKeyArray, fromXrefKeyArray, toShortKey } from '../../tandem/keys.js';

/**
 * Pretty print elements with key and name
 */
function prettyPrintElementKeyAndName(elems) {
  let prettyPrint = [];
  for (let j = 0; j < elems.length; j++) {
    const name = elems[j][QC.Name]?.[0] || 'Unnamed';
    prettyPrint.push({ k: elems[j].k, name: name });
  }
  if (prettyPrint.length) {
    console.table(prettyPrint);
  }
}

/**
 * Get all Rooms and Spaces from the facility
 * 
 * Rooms (Revit Category: -2000160 → 160 in Tandem) are typically in Architectural models
 * Spaces (Revit Category: -2003600 → 3600 in Tandem) are typically in MEP models
 */
export async function getRoomsAndSpaces(facilityURN, region) {
  console.group("STUB: getRoomsAndSpaces()");
  console.log("Facility:", facilityURN);

  const models = await getModels(facilityURN, region);
  if (!models || models.length === 0) {
    console.log("No models found");
    console.groupEnd();
    return;
  }

  for (let i = 0; i < models.length; i++) {
    console.group(`Model[${i}] --> ${models[i].label || 'Default Model'}`);
    console.log(`Model URN: ${models[i].modelId}`);

    const allElements = await scanForQualifiedProperties(
      models[i].modelId, 
      [QC.CategoryId, QC.Name], 
      region, 
      false
    );

    if (!allElements) {
      console.log("Could not scan model");
      console.groupEnd();
      continue;
    }

    // Rooms: Revit category -2000160 (stored as 160 in Tandem)
    const rooms = allElements.filter(row => row[QC.CategoryId]?.[0] === 160);
    console.log("Rooms", rooms);
    prettyPrintElementKeyAndName(rooms);

    // Spaces: Revit category -2003600 (stored as 3600 in Tandem)
    const spaces = allElements.filter(row => row[QC.CategoryId]?.[0] === 3600);
    console.log("Spaces", spaces);
    prettyPrintElementKeyAndName(spaces);

    console.groupEnd();
  }

  console.groupEnd();
}

/**
 * Get all Levels from the facility
 * 
 * Levels (Revit Category: -2000240 → 240 in Tandem)
 */
export async function getLevels(facilityURN, region) {
  console.group("STUB: getLevels()");
  console.log("Facility:", facilityURN);

  const models = await getModels(facilityURN, region);
  if (!models || models.length === 0) {
    console.log("No models found");
    console.groupEnd();
    return;
  }

  for (let i = 0; i < models.length; i++) {
    console.group(`Model[${i}] --> ${models[i].label || 'Default Model'}`);
    console.log(`Model URN: ${models[i].modelId}`);

    const allElements = await scanForQualifiedProperties(
      models[i].modelId, 
      [QC.CategoryId, QC.Name], 
      region, 
      false
    );

    if (!allElements) {
      console.log("Could not scan model");
      console.groupEnd();
      continue;
    }

    // Levels: Revit category -2000240 (stored as 240 in Tandem)
    const levels = allElements.filter(row => row[QC.CategoryId]?.[0] === 240);
    console.log("Levels (raw result)", levels);
    prettyPrintElementKeyAndName(levels);

    console.groupEnd();
  }

  console.groupEnd();
}

/**
 * Get Element properties AND its Type properties
 * 
 * Demonstrates how to get both instance properties and the associated
 * Type (family type) properties for an element.
 */
export async function getElementAndTypeProperties(modelURN, region, elemKey) {
  console.group("STUB: getElementAndTypeProperties()");
  console.log("Model:", modelURN);
  console.log("Element Key:", elemKey);

  if (!elemKey) {
    console.log("No element key specified.");
    console.groupEnd();
    return;
  }

  // Get all properties for this element
  const elementProps = await scanAllPropsForElements(modelURN, [elemKey], region, false);
  
  if (!elementProps || elementProps.length < 2) {
    console.log("ERROR: Could not find properties for that element.");
    console.groupEnd();
    return;
  }

  console.log("Element Properties", elementProps);

  // Get the Type reference from the element
  // FamilyType property (l:t) contains a reference to the Type element
  const typeRefs = extractPropertyValues(elementProps, QC.FamilyType, false);
  
  if (typeRefs && typeRefs.length > 0) {
    // Convert short key to long key (Type is a logical element)
    const shortKey = typeRefs[0].value;
    const longKey = toFullKey(shortKey, true);
    console.log("Type Short Key:", shortKey);
    console.log("Type Long Key:", longKey);

    // Get Type properties
    const typeProps = await scanAllPropsForElements(modelURN, [longKey], region, false);
    console.log("Type Properties", typeProps);
  } else {
    console.log(`No Type property found (\"${QC.FamilyType}\")`);
  }

  console.groupEnd();
}

/**
 * Get Facility Structure (Levels → Rooms → Assets)
 * 
 * This is a complex example that builds a hierarchical view of:
 * - Levels in the facility
 * - Rooms on each level
 * - Assets in each room
 */
export async function getFacilityStructure(facilityURN, region) {
  console.group("STUB: getFacilityStructure()");
  console.log("Facility:", facilityURN);

  const data = {
    levels: {},       // levelKey → level object
    rooms: {},        // roomKey → room object
    assets: {},       // assetKey → asset object
    roomAssetsMap: {}, // roomKey → [assetKeys]
    roomLevelMap: {}  // roomKey → levelKey
  };

  const modelRooms = [];
  const models = await getModels(facilityURN, region);
  const defaultModelId = getDefaultModelURN(facilityURN);

  if (!models || models.length === 0) {
    console.log("No models found");
    console.groupEnd();
    return;
  }

  console.info("Reading facility assets...");
  
  for (const model of models) {
    console.info(`Processing model ${model.label || 'Default Model'} (${model.modelId})`);
    const modelId = model.modelId;

    // Skip default model (it contains streams, not physical elements)
    if (modelId === defaultModelId) {
      continue;
    }

    // Get tagged assets from this model
    const assets = await getTaggedAssets(
      modelId, 
      region, 
      [ColumnFamilies.Standard, ColumnFamilies.DtProperties, ColumnFamilies.Refs, ColumnFamilies.Xrefs]
    );

    for (const asset of assets) {
      const assetKey = asset[QC.RowKey];
      data.assets[assetKey] = asset;
      
      const assetRooms = [];
      
      // Check for room reference (same model)
      let roomRef = asset[QC.Rooms];
      if (roomRef) {
        const roomKeys = fromShortKeyArray(roomRef);
        for (const roomKey of roomKeys) {
          assetRooms.push({ modelId: modelId, roomId: roomKey });
        }
      } else {
        // Check for cross-model room reference
        roomRef = asset[QC.XRooms];
        if (roomRef) {
          const [modelIds, elementKeys] = fromXrefKeyArray(roomRef);
          for (let i = 0; i < modelIds.length; i++) {
            assetRooms.push({
              modelId: `urn:adsk.dtm:${modelIds[i]}`,
              roomId: toShortKey(elementKeys[i])
            });
          }
        }
      }
      
      // Build room-asset mapping
      for (const { roomId } of assetRooms) {
        if (!data.roomAssetsMap[roomId]) {
          data.roomAssetsMap[roomId] = [];
        }
        data.roomAssetsMap[roomId].push(assetKey);
      }
      
      modelRooms.push(...assetRooms);
    }
  }

  // Get unique model IDs from rooms
  const modelIds = new Set(modelRooms.map(i => i.modelId));

  console.info("Mapping rooms & levels...");
  
  for (const modelId of modelIds) {
    const roomIds = [...new Set(modelRooms.filter(i => i.modelId === modelId).map(i => i.roomId))];
    
    if (roomIds.length === 0) continue;
    
    const rooms = await getElements(
      modelId, 
      roomIds, 
      region,
      [ColumnFamilies.Standard, ColumnFamilies.Refs]
    );
    
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
    
    // Get levels
    if (levelIds.size > 0) {
      const levels = await getElements(modelId, [...levelIds], region);
      for (const level of levels) {
        const levelKey = level[QC.RowKey];
        data.levels[levelKey] = level;
      }
    }
  }

  // Print warnings if empty
  if (Object.keys(data.levels).length === 0) {
    console.warn('No levels found in the facility');
  }
  if (Object.keys(data.rooms).length === 0) {
    console.warn('No rooms found in the facility');
  }

  // Print hierarchical structure
  console.log("\n=== Facility Structure ===\n");
  
  for (const levelKey in data.levels) {
    const level = data.levels[levelKey];
    const levelName = level[QC.Name]?.[0] || 'Unnamed Level';
    
    console.group(`📐 ${levelName} (${levelKey})`);
    
    // Find rooms on this level
    for (const roomKey in data.rooms) {
      if (data.roomLevelMap[roomKey] !== levelKey) continue;
      
      const room = data.rooms[roomKey];
      const roomName = room[QC.Name]?.[0] || 'Unnamed Room';
      
      console.group(`🚪 ${roomName} (${roomKey})`);
      
      // Find assets in this room
      const assetKeys = data.roomAssetsMap[roomKey] || [];
      const items = assetKeys.map(assetKey => {
        const asset = data.assets[assetKey];
        return {
          key: assetKey,
          name: asset[QC.Name]?.[0] || 'Unnamed Asset'
        };
      });
      
      if (items.length > 0) {
        console.table(items);
      } else {
        console.log('(no assets)');
      }
      
      console.groupEnd();
    }
    
    console.groupEnd();
  }

  console.log("\nRaw data:", data);
  console.groupEnd();
}

/**
 * Find classified elements with empty parameters
 * 
 * This function:
 * 1. Gets the facility template to find property sets
 * 2. Iterates through all models
 * 3. For each element, finds parameters related to its classification
 * 4. Reports elements that have empty values for required parameters
 * 
 * @param {string} facilityURN - Facility URN
 * @param {string} region - Region identifier
 */
export async function findElementsWithEmptyParameters(facilityURN, region) {
  console.group("STUB: findElementsWithEmptyParameters()");
  console.log("Facility:", facilityURN);
  console.log("This may take a moment for large facilities...");

  try {
    // Get facility template to find property sets
    const template = await getFacilityInlineTemplate(facilityURN, region);
    if (!template) {
      console.error("Could not fetch facility template");
      console.groupEnd();
      return;
    }

    // Find the primary property set (matches template name)
    const pset = template.psets?.find(p => p.name === template.name);
    if (!pset) {
      console.log("No property set found matching template name");
      console.groupEnd();
      return;
    }
    console.log(`Property set: ${pset.name} (${pset.parameters?.length || 0} parameters)`);

    // Get models
    const models = await getModels(facilityURN, region);
    if (!models || models.length === 0) {
      console.error("No models found in facility");
      console.groupEnd();
      return;
    }

    let totalElementsWithEmptyParams = 0;
    const resultsTable = [];

    for (const model of models) {
      const modelId = model.modelId;
      const modelName = model.label || 'Untitled Model';
      console.log(`\nProcessing model: ${modelName}`);

      // Get model schema
      const schema = await getModelSchema(modelId, region);
      if (!schema || !schema.attributes) {
        console.log("  Could not fetch schema, skipping...");
        continue;
      }

      // Scan elements with Standard and DtProperties families
      const elements = await scanModelElements(
        modelId, 
        [ColumnFamilies.Standard, ColumnFamilies.DtProperties], 
        region
      );
      console.log(`  Found ${elements.length} elements`);

      for (const element of elements) {
        const name = element[QC.OName]?.[0] ?? element[QC.Name]?.[0] ?? 'Unnamed';
        const key = element.k;
        
        // Get classification or Tandem category
        const classification = element[QC.OClassification]?.[0] ?? element[QC.Classification]?.[0];
        const category = element[QC.OTandemCategory]?.[0] ?? element[QC.TandemCategory]?.[0];
        
        if (!classification && !category) continue;

        // Find parameters that apply to this classification
        let classParameters = [];
        
        if (classification && pset.parameters) {
          classParameters = pset.parameters.filter(p => 
            p.applicationFilters?.userClass?.some(c => matchClassification(classification, c))
          );
        } else if (category && pset.parameters) {
          classParameters = pset.parameters.filter(p => 
            p.applicationFilters?.tandemCategory?.some(c => matchClassification(category, c))
          );
        }

        if (classParameters.length === 0) continue;

        // Check for empty parameter values
        const emptyParams = [];
        
        for (const classParam of classParameters) {
          // Find parameter definition in schema
          const paramDef = schema.attributes.find(a => 
            a.category === classParam.category && a.name === classParam.name
          );

          if (!paramDef) continue;

          // Check if parameter is empty or missing
          const paramValue = element[paramDef.id];
          if (paramValue === undefined || paramValue === '' || 
              (Array.isArray(paramValue) && (paramValue.length === 0 || paramValue[0] === ''))) {
            emptyParams.push(`${paramDef.category}.${paramDef.name}`);
          }
        }

        if (emptyParams.length > 0) {
          totalElementsWithEmptyParams++;
          resultsTable.push({
            model: modelName,
            key: key,
            name: name,
            classification: classification || category,
            emptyParameters: emptyParams.join(', ')
          });
          
          // Only show first 100 in detailed log to avoid overwhelming output
          if (totalElementsWithEmptyParams <= 100) {
            console.log(`  ⚠ ${name}: ${emptyParams.length} empty param(s)`);
          }
        }
      }
    }

    // Summary
    console.log("\n" + "=".repeat(60));
    console.log(`📊 SUMMARY: ${totalElementsWithEmptyParams} element(s) with empty parameters`);
    
    if (resultsTable.length > 0) {
      console.log("\nElements with empty parameters:");
      console.table(resultsTable.slice(0, 100)); // Show first 100
      
      if (resultsTable.length > 100) {
        console.log(`... and ${resultsTable.length - 100} more (see raw data below)`);
      }
    }
    
    console.log("\nFull results:", resultsTable);
    console.groupEnd();
    return resultsTable;

  } catch (error) {
    console.error("Error:", error);
    console.groupEnd();
    return [];
  }
}


