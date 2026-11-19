/**
 * SDK STUB Functions - V3 schema
 *
 * These are higher-level functions that combine multiple API calls to perform common operations.
 *
 * What V3 changes compared with js/stubs/v2/sdkStubs.js:
 * - Levels and rooms are NOT in the BIM models any more. They are `Location` elements of the
 *   DEFAULT model (ElementFlags.Location), told apart by QC.TandemCategory = TC.Levels / TC.Rooms.
 *   One scan of the default model replaces the loop over all the models.
 * - A room points to its level with QC.Parent. An asset points to its room and/or level with
 *   QC.Location (an array of xrefs).
 * - Assets are GenericAsset elements of the default model. A BIM element and its asset are linked by
 *   QC.BimElmOfAsset (asset -> BIM element) and QC.HostOfAsset (BIM element -> asset).
 * - Room or Space (Revit category 160 / 3600) is a property of the BIM element the location was
 *   created from, so it is read by following QC.BimElmOfAsset.
 * - There is one kind of key, the 24-byte key. No short key / long key conversion.
 *
 * Output goes to browser console - open DevTools to see results.
 */

import {
  getFacilityInlineTemplate,
  getModelSchema,
  getDefaultModelURN,
  scanAllPropsForElements,
  matchClassification
} from '../../api.js';
import { QC, ColumnFamilies, ElementFlags, TC } from '../../../tandem/constants.js';
import { decodeXref, fromXrefKeyArray, getElementFlags } from '../../../tandem/keys.js';
import { describeKey, firstValue, isDeleted, nameOf, scanModel, tandemCategoryOf } from './helpers.js';

/**
 * Columns needed to read levels and rooms (the Location elements) in one scan.
 */
const locationColumns = [
  QC.TandemCategory,
  QC.OTandemCategory,
  QC.Name,
  QC.OName,
  QC.Elevation,
  QC.OElevation,
  QC.Parent,
  QC.BimElmOfAsset,
  QC.Deleted,
  QC.ODeleted
];

function isLocationOfCategory(row, category) {
  return getElementFlags(row[QC.Key]) === ElementFlags.Location && tandemCategoryOf(row) === category && !isDeleted(row);
}

/**
 * Get all Levels from the facility
 *
 * In V3 the levels are Location elements of the default model (TC.Levels), so a single scan of the
 * default model is enough. In V2 there is one set of levels per BIM model.
 */
export async function getLevels(facilityURN, region) {
  console.group("STUB: getLevels()");
  console.log("Facility:", facilityURN);

  try {
    const defaultModelURN = getDefaultModelURN(facilityURN);

    console.log(`Default model: ${defaultModelURN}`);
    const rows = await scanModel(defaultModelURN, region, { qualifiedColumns: locationColumns });
    const levels = rows.filter(row => isLocationOfCategory(row, TC.Levels));

    console.log(`Found ${levels.length} level(s)`);
    if (levels.length > 0) {
      console.table(levels.map(level => ({
        key: level[QC.Key],
        name: nameOf(level, 'Unnamed Level'),
        elevation: firstValue(level[QC.OElevation]) ?? firstValue(level[QC.Elevation])
      })));
    }
  } catch (error) {
    console.error('Error:', error);
  }

  console.groupEnd();
}

/**
 * Get all Rooms and Spaces from the facility
 *
 * Step 1: scan the default model for the Location elements of category TC.Rooms. Rooms and Spaces
 *         are both stored this way.
 * Step 2: follow QC.BimElmOfAsset to the BIM element each location was created from and read its
 *         Revit category: Rooms are 160 (-2000160 in Revit), Spaces are 3600 (-2003600 in Revit).
 *         The BIM source rooms were soft-deleted when they were mirrored as locations, so that scan
 *         needs includeDeleted.
 */
export async function getRoomsAndSpaces(facilityURN, region) {
  console.group("STUB: getRoomsAndSpaces()");
  console.log("Facility:", facilityURN);

  try {
    const defaultModelURN = getDefaultModelURN(facilityURN);

    console.group("Step 1 - Locations of the default model");
    console.log(`Default model: ${defaultModelURN}`);
    const rows = await scanModel(defaultModelURN, region, { qualifiedColumns: locationColumns });
    const levelNames = new Map(rows
      .filter(row => isLocationOfCategory(row, TC.Levels))
      .map(level => [level[QC.Key], nameOf(level, 'Unnamed Level')]));
    const locations = rows.filter(row => isLocationOfCategory(row, TC.Rooms));

    console.log(`Found ${locations.length} room(s) and space(s)`);
    console.groupEnd();

    // Group the BIM source references by model so each BIM model is read once
    console.group("Step 2 - BIM elements the locations came from (QC.BimElmOfAsset)");
    const sourceKeysByModel = new Map();

    for (const location of locations) {
      const xref = firstValue(location[QC.BimElmOfAsset]);
      const decoded = xref ? decodeXref(xref) : null;

      if (!decoded) {
        continue;
      }
      const keys = sourceKeysByModel.get(decoded.modelURN) ?? [];

      keys.push(decoded.elementKey);
      sourceKeysByModel.set(decoded.modelURN, keys);
    }
    const categoryByKey = new Map();

    await Promise.all(Array.from(sourceKeysByModel.entries()).map(async ([modelURN, keys]) => {
      const sourceRows = await scanModel(modelURN, region, {
        keys,
        qualifiedColumns: [QC.CategoryId],
        includeDeleted: true
      });

      for (const row of sourceRows) {
        categoryByKey.set(row[QC.Key], firstValue(row[QC.CategoryId]));
      }
    }));
    console.groupEnd();

    const toEntry = location => {
      const levelKey = firstValue(location[QC.Parent]);

      return {
        key: location[QC.Key],
        name: nameOf(location),
        level: levelNames.get(levelKey) ?? levelKey
      };
    };
    const sourceCategoryOf = location => {
      const decoded = decodeXref(firstValue(location[QC.BimElmOfAsset]) ?? '');

      return decoded ? categoryByKey.get(decoded.elementKey) : undefined;
    };
    const rooms = locations.filter(location => sourceCategoryOf(location) !== 3600);
    const spaces = locations.filter(location => sourceCategoryOf(location) === 3600);

    console.log("Rooms", rooms);
    if (rooms.length > 0) {
      console.table(rooms.map(toEntry));
    }
    console.log("Spaces", spaces);
    if (spaces.length > 0) {
      console.table(spaces.map(toEntry));
    }
  } catch (error) {
    console.error('Error:', error);
  }

  console.groupEnd();
}

/**
 * Read all the properties of one element and, if it has one, of its Type (family type).
 * The type is referenced by QC.FamilyType (a 24-byte key of the SAME model as the element), so the
 * key is used as it is. In V2 it was a short key that had to be converted with toFullKey().
 */
async function logElementAndType(modelURN, region, elemKey) {
  const elementProps = await scanAllPropsForElements(modelURN, [elemKey], region, false);

  if (!elementProps || elementProps.length < 2) {
    console.log("ERROR: Could not find properties for that element.");
    return null;
  }
  console.log("Element:", describeKey(elemKey));
  console.log("Element Properties", elementProps);

  const typeKey = firstValue(elementProps[1][QC.FamilyType]);

  if (!typeKey) {
    console.log(`No Type property found ("${QC.FamilyType}")`);
    return elementProps[1];
  }
  console.log("Type Key:", typeKey, describeKey(typeKey));

  const typeProps = await scanAllPropsForElements(modelURN, [typeKey], region, false);

  console.log("Type Properties", typeProps);
  return elementProps[1];
}

/**
 * Get Element properties AND its Type properties
 *
 * In V3 a GenericAsset (default model) has its own properties and its own Type. The read-only source
 * properties stay on the BIM element, so when the element is an asset this STUB follows
 * QC.BimElmOfAsset to the BIM element and reads its properties and Type as well.
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

  try {
    const element = await logElementAndType(modelURN, region, elemKey.trim());
    const bimXref = firstValue(element?.[QC.BimElmOfAsset]);
    const bim = bimXref ? decodeXref(bimXref) : null;

    if (bim) {
      console.group("BIM element of this asset (QC.BimElmOfAsset)");
      console.log("Model:", bim.modelURN);
      console.log("Element Key:", bim.elementKey);
      await logElementAndType(bim.modelURN, region, bim.elementKey);
      console.groupEnd();
    }
  } catch (error) {
    console.error('Error:', error);
  }

  console.groupEnd();
}

/**
 * Get Facility Structure (Levels → Rooms → Assets)
 *
 * Same navigation as tutorial-rest facility/list-facility-structure.js, everything is in the default model:
 * 1. Read the assets (GenericAsset elements) and the locations they are placed in (QC.OLocation ?? QC.Location)
 * 2. Read those locations. A Location is a level or a room (TC.Levels / TC.Rooms)
 * 3. A room belongs to the level in its QC.Parent
 */
export async function getFacilityStructure(facilityURN, region) {
  console.group("STUB: getFacilityStructure()");
  console.log("Facility:", facilityURN);

  const data = {
    levels: {},        // levelKey → level object
    rooms: {},         // roomKey → room object
    assets: {},        // assetKey → asset object
    locationAssetsMap: {}, // locationKey (room or level) → [assetKeys]
    roomLevelMap: {}   // roomKey → levelKey
  };

  try {
    const defaultModelURN = getDefaultModelURN(facilityURN);

    console.info("Reading facility assets...");
    const rows = await scanModel(defaultModelURN, region, {
      families: [
        ColumnFamilies.Standard,
        ColumnFamilies.DtProperties,
        ColumnFamilies.Refs,
        ColumnFamilies.Xrefs,
        ColumnFamilies.Status
      ]
    });
    const assets = rows.filter(row => getElementFlags(row[QC.Key]) === ElementFlags.GenericAsset && !isDeleted(row));
    const locationKeys = new Set();

    for (const asset of assets) {
      const assetKey = asset[QC.Key];

      data.assets[assetKey] = asset;

      // QC.Location holds one string with any number of xrefs (for example a room and its level)
      const value = asset[QC.OLocation] ?? asset[QC.Location];
      const blobs = Array.isArray(value) ? value : (value ? [value] : []);

      for (const blob of blobs) {
        for (const locationKey of fromXrefKeyArray(blob)[1]) {
          locationKeys.add(locationKey);
          data.locationAssetsMap[locationKey] = data.locationAssetsMap[locationKey] ?? [];
          data.locationAssetsMap[locationKey].push(assetKey);
        }
      }
    }
    console.log(`Found ${assets.length} asset(s) in ${locationKeys.size} location(s)`);

    console.info("Mapping rooms & levels...");
    const levelKeys = new Set();

    if (locationKeys.size > 0) {
      const locations = await scanModel(defaultModelURN, region, {
        keys: Array.from(locationKeys),
        families: [ColumnFamilies.Standard, ColumnFamilies.Refs, ColumnFamilies.Status]
      });

      for (const location of locations) {
        const locationKey = location[QC.Key];

        if (isLocationOfCategory(location, TC.Levels)) {
          data.levels[locationKey] = location;
        } else if (isLocationOfCategory(location, TC.Rooms)) {
          data.rooms[locationKey] = location;

          const levelKey = firstValue(location[QC.Parent]);

          if (levelKey) {
            levelKeys.add(levelKey);
            data.roomLevelMap[locationKey] = levelKey;
          }
        }
      }
    }
    // Levels that are only known as the parent of a room
    const missingLevelKeys = Array.from(levelKeys).filter(levelKey => !data.levels[levelKey]);

    if (missingLevelKeys.length > 0) {
      const levels = await scanModel(defaultModelURN, region, {
        keys: missingLevelKeys,
        families: [ColumnFamilies.Standard, ColumnFamilies.Refs, ColumnFamilies.Status]
      });

      for (const level of levels) {
        data.levels[level[QC.Key]] = level;
      }
    }

    if (Object.keys(data.levels).length === 0) {
      console.warn('No levels found in the facility');
    }
    if (Object.keys(data.rooms).length === 0) {
      console.warn('No rooms found in the facility');
    }

    const printAssets = (locationKey) => {
      const items = (data.locationAssetsMap[locationKey] ?? []).map(assetKey => ({
        key: assetKey,
        name: nameOf(data.assets[assetKey], 'Unnamed Asset')
      }));

      if (items.length > 0) {
        console.table(items);
      } else {
        console.log('(no assets)');
      }
    };

    // Print hierarchical structure
    console.log("\n=== Facility Structure ===\n");

    for (const levelKey in data.levels) {
      console.group(`📐 ${nameOf(data.levels[levelKey], 'Unnamed Level')} (${levelKey})`);

      for (const roomKey in data.rooms) {
        if (data.roomLevelMap[roomKey] !== levelKey) {
          continue;
        }
        console.group(`🚪 ${nameOf(data.rooms[roomKey], 'Unnamed Room')} (${roomKey})`);
        printAssets(roomKey);
        console.groupEnd();
      }
      // Assets placed directly on the level, not in one of its rooms
      if (data.locationAssetsMap[levelKey]) {
        console.log('Assets on the level:');
        printAssets(levelKey);
      }
      console.groupEnd();
    }

    console.log("\nRaw data:", data);
  } catch (error) {
    console.error('Error:', error);
  }

  console.groupEnd();
}

/**
 * Find classified elements with empty parameters
 *
 * Same idea as the V2 STUB. The difference is where the values are: user-defined parameters live on the
 * elements of the DEFAULT model (assets, locations, ...), so the default model is the only model
 * to scan. In V2 every model had to be scanned.
 *
 * This function:
 * 1. Gets the facility template to find property sets
 * 2. Scans the default model
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

    // User-defined parameters only exist in the default model
    const defaultModelURN = getDefaultModelURN(facilityURN);
    const schema = await getModelSchema(defaultModelURN, region);
    if (!schema || !schema.attributes) {
      console.log("Could not fetch the schema of the default model (does the facility have one?)");
      console.groupEnd();
      return;
    }

    // Scan elements with Standard, DtProperties and Status (to skip deleted elements) families
    const elements = (await scanModel(defaultModelURN, region, {
      families: [ColumnFamilies.Standard, ColumnFamilies.DtProperties, ColumnFamilies.Status]
    })).filter(element => !isDeleted(element));

    console.log(`Found ${elements.length} elements`);

    const resultsTable = [];

    for (const element of elements) {
      const classification = firstValue(element[QC.OClassification]) ?? firstValue(element[QC.Classification]);
      const category = tandemCategoryOf(element);

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

        const paramValue = element[paramDef.id];
        if (paramValue === undefined || paramValue === '' ||
            (Array.isArray(paramValue) && (paramValue.length === 0 || paramValue[0] === ''))) {
          emptyParams.push(`${paramDef.category}.${paramDef.name}`);
        }
      }

      if (emptyParams.length > 0) {
        resultsTable.push({
          key: element[QC.Key],
          type: describeKey(element[QC.Key]),
          name: nameOf(element),
          classification: classification || category,
          emptyParameters: emptyParams.join(', ')
        });

        // Only show first 100 in detailed log to avoid overwhelming output
        if (resultsTable.length <= 100) {
          console.log(`  ⚠ ${nameOf(element)}: ${emptyParams.length} empty param(s)`);
        }
      }
    }

    // Summary
    console.log("\n" + "=".repeat(60));
    console.log(`📊 SUMMARY: ${resultsTable.length} element(s) with empty parameters`);

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
