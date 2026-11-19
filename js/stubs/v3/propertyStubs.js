/**
 * Property STUB Functions - V3 schema (read)
 *
 * How V3 differs from V2 (see js/stubs/v2/propertyStubs.js):
 *
 *   USER-DEFINED properties (`z:` family) live in the DEFAULT model, on the element that owns them:
 *   a GenericAsset (the asset created from a BIM element), a stream, a location, a ticket, ...
 *   There is no need to walk all the models to find them: one schema request and one scan of the
 *   default model are enough.
 *
 *   BUILT-IN and SOURCE properties are not of the `z` family. Source properties (the read-only values
 *   extracted from the model file, e.g. Revit parameters) stay on the BIM element in its own model.
 *   An asset points to its BIM element with the QC.BimElmOfAsset xref (`x:be`), and the BIM element
 *   points back with QC.HostOfAsset (`x:ha`).
 *   Only the non-`z` properties still need a look at the BIM models. The family is the prefix of the
 *   qualified property id: "z:4wc" is user-defined, anything else is not.
 *
 * Keys are 24 bytes in V3 (the first 4 bytes are the element flags), so keys from a scan are used as they are.
 *
 * Output goes to browser console - open DevTools to see results.
 */

import { tandemBaseURL, makeRequestOptionsGET, makeRequestOptionsPOST, getDefaultModelURN } from '../../api.js';
import { ColumnFamilies, QC } from '../../../tandem/constants.js';
import { buildValueMatcher } from '../../utils.js';
import { describeKey } from './helpers.js';

/**
 * User-defined properties are the ones of the `z` family (DtProperties), e.g. "z:4wc". In V3 they only
 * exist in the default model. Built-in properties (e.g. Tickets | Close Date) and source properties
 * belong to other families.
 */
function isUserDefined(qualProp) {
  return qualProp.id.startsWith(`${ColumnFamilies.DtProperties}:`);
}

/**
 * The BIM models only need a look when the default model does not already answer the question:
 * either it does not define the property at all, or it defines a property that is not user-defined.
 * Only when every match in the default model is a `z` property are the BIM models skipped.
 */
function needsBimSearch(defaultQualProps) {
  return defaultQualProps.length === 0 || defaultQualProps.some(qualProp => !isUserDefined(qualProp));
}

function logBimSkipped(categoryName, propName) {
  console.log(
    `[${categoryName} | ${propName}] is a user-defined property (family '${ColumnFamilies.DtProperties}'): ` +
    `it only exists in the default model, so the BIM models are not searched.`
  );
}

/**
 * The default model has the same id as the facility, only the prefix differs, so it needs no request.
 * It holds the user-defined data. Tandem creates it when needed (e.g. when a stream is created).
 */
function getDefaultModel(facilityURN) {
  return { modelId: getDefaultModelURN(facilityURN), label: 'Default Model' };
}

/**
 * Get the BIM models of the facility, which hold the read-only source data.
 * This is an extra request, so it is only made when the default model does not answer the question.
 */
async function getBimModels(facilityURN, region) {
  const facilityPath = `${tandemBaseURL}/twins/${facilityURN}`;
  console.log(facilityPath);

  const facilityResponse = await fetch(facilityPath, makeRequestOptionsGET(region));
  const facilityData = await facilityResponse.json();
  const defaultModelURN = getDefaultModelURN(facilityURN);

  return (facilityData.links || []).filter(model => model.modelId !== defaultModelURN);
}

/**
 * Fetch the schema of a model and return the attributes that match category and name.
 * There can be more than one match, e.g. when the property was defined twice.
 */
async function findQualifiedProperties(modelURN, region, categoryName, propName) {
  const schemaPath = `${tandemBaseURL}/modeldata/${modelURN}/schema`;
  console.log(schemaPath);

  const schemaResponse = await fetch(schemaPath, makeRequestOptionsGET(region));

  if (!schemaResponse.ok) {
    console.warn(`Could not read the schema of ${modelURN} (HTTP ${schemaResponse.status}). A facility has no default model until Tandem needs one.`);
    return [];
  }
  const schema = await schemaResponse.json();

  return (schema.attributes || []).filter(attr => attr.category === categoryName && attr.name === propName);
}

/**
 * Print the qualified properties found in one model.
 */
function logQualifiedProperties(qualProps, categoryName, propName) {
  if (qualProps.length === 0) {
    console.log(`Could not find [${categoryName} | ${propName}]`);
  } else if (qualProps.length === 1) {
    console.log(`Qualified Property for [${categoryName} | ${propName}]:`, qualProps[0]);
  } else {
    console.warn("WARNING: Multiple qualified properties found for this name...");
    qualProps.forEach((prop, idx) => {
      console.log(`Qualified Property [${idx}] for [${categoryName} | ${propName}]:`, prop);
    });
  }
}

/**
 * Get the schema of EVERY model of the facility and search for a qualified property by category and name.
 *
 * This deliberately loops through all the models, like the V2 STUB does, so you can see where a
 * definition lives: a user-defined (`z`) property must only show up in the default model. If it
 * shows up in other models too, that is a bug. The SCAN STUBs below do not need this loop.
 *
 * @param {string} facilityURN - Facility URN
 * @param {string} region - Region header
 * @param {string} categoryName - Property category name
 * @param {string} propName - Property name
 * @returns {Promise<void>}
 */
export async function getQualifiedProperty(facilityURN, region, categoryName, propName) {
  console.group("STUB: getQualifiedProperty() — GET Qualified Property Def");

  try {
    const facilityPath = `${tandemBaseURL}/twins/${facilityURN}`;
    console.log(facilityPath);

    const facilityResponse = await fetch(facilityPath, makeRequestOptionsGET(region));
    const facilityData = await facilityResponse.json();
    const models = facilityData.links || [];
    const defaultModelURN = getDefaultModelURN(facilityURN);
    const userDefinedIn = [];

    for (let i = 0; i < models.length; i++) {
      const model = models[i];
      const isDefault = model.modelId === defaultModelURN;

      console.group(`Model[${i}] --> ${model.label || `Model ${i}`}${isDefault ? ' (default model)' : ''}`);
      console.log(`Model URN: ${model.modelId}`);

      const qualProps = await findQualifiedProperties(model.modelId, region, categoryName, propName);

      logQualifiedProperties(qualProps, categoryName, propName);
      if (qualProps.some(isUserDefined)) {
        userDefinedIn.push({ model: model.label || model.modelId, isDefault });
      }
      console.groupEnd();
    }

    // In V3 a user-defined property (`z` family) only exists in the default model
    if (userDefinedIn.length > 0) {
      const outsideDefault = userDefinedIn.filter(entry => !entry.isDefault);

      if (outsideDefault.length === 0) {
        console.log(`✔ [${categoryName} | ${propName}] is a user-defined (family '${ColumnFamilies.DtProperties}') property and only exists in the default model.`);
      } else {
        console.warn(
          `WARNING: user-defined property [${categoryName} | ${propName}] also exists in ${outsideDefault.length} BIM model(s): ` +
          outsideDefault.map(entry => entry.model).join(', ') + '. In V3 it should only exist in the default model.'
        );
      }
    }
  } catch (error) {
    console.error('Error fetching qualified property:', error);
  }

  console.groupEnd();
}

/**
 * Look for a property in one model: find its qualified column(s) in the schema, then scan for the values.
 * Used for the default model (user-defined properties) and for the BIM models (source properties).
 */
async function searchModelForProperty(model, region, categoryName, propName, includeHistory) {
  const modelURN = model.modelId;
  const qualProps = await findQualifiedProperties(modelURN, region, categoryName, propName);

  if (qualProps.length === 0) {
    return { model, qualProps, scanPath: null, scanData: null, propValues: [] };
  }

  const qualifiedColumns = qualProps.map(prop => prop.id);
  const bodyPayload = JSON.stringify({ qualifiedColumns, includeHistory });
  const scanPath = `${tandemBaseURL}/modeldata/${modelURN}/scan`;
  console.log(scanPath);

  const scanResponse = await fetch(scanPath, makeRequestOptionsPOST(bodyPayload, region));
  const scanData = await scanResponse.json();
  const propValues = [];

  if (!scanResponse.ok) {
    console.warn(`Scan of ${modelURN} failed (HTTP ${scanResponse.status})`);
    return { model, qualProps, scanPath, scanData, propValues };
  }

  // The first item of a scan result is the version string, the rest are rows
  for (const row of scanData) {
    if (typeof row !== 'object' || row === null) {
      continue;
    }
    for (const qualProp of qualProps) {
      const prop = row[qualProp.id];

      if (!prop) {
        continue;
      }
      propValues.push({
        modelURN,
        key: row[QC.Key],
        type: describeKey(row[QC.Key]),
        prop: qualProp.id,
        value: includeHistory ? prop : prop[0]
      });
    }
  }
  return { model, qualProps, scanPath, scanData, propValues };
}

/**
 * Search the facility for a property and print what was found in each model.
 *
 *   Step 1  Default model:  user-defined (`z`) and built-in properties. A single schema request and
 *                           a single scan.
 *   Step 2  BIM models:     built-in and source properties. Searched unless the property is a `z`
 *                           (user-defined) property of the default model. One schema request per model, and a scan
 *                           only for the models that define the property. These per-model requests
 *                           are independent, so they can run SEQUENTIALLY or in PARALLEL
 *                           (Promise.all). See js/stubs/v2/propertyStubs.js scanForProperty() for a
 *                           full explanation of the trade-offs (fail-fast, rate limits, ordering).
 *
 * @param {function} logResult - Prints the result of one model, called in model order
 */
async function searchFacilityForProperty(facilityURN, region, categoryName, propName, includeHistory, runInParallel, logResult) {
  const t0 = performance.now();

  // Step 1: the default model. Two requests: its schema, and a scan if it defines the property.
  const defaultModel = getDefaultModel(facilityURN);
  const defaultResult = await searchModelForProperty(defaultModel, region, categoryName, propName, includeHistory);

  console.group(`Default model --> ${defaultModel.label} (user-defined and built-in properties)`);
  console.log(`Model URN: ${defaultModel.modelId}`);
  logResult(defaultResult);
  console.groupEnd();

  // A `z` property is user-defined and only exists in the default model: nothing more to find
  if (!needsBimSearch(defaultResult.qualProps)) {
    logBimSkipped(categoryName, propName);
    console.log(`⏱️  Total time: ${(performance.now() - t0).toFixed(0)}ms (default model only)`);
    return;
  }

  const bimModels = await getBimModels(facilityURN, region);

  console.log(`Searching ${bimModels.length} BIM model(s)...`);

  // Step 2: built-in and source properties
  const logBimResult = (result, i) => {
    console.group(`BIM Model[${i}] --> ${result.model.label || `Model ${i}`} (built-in and source properties, read-only)`);
    console.log(`Model URN: ${result.model.modelId}`);
    logResult(result);
    console.groupEnd();
  };

  if (runInParallel) {
    // All models are in flight at the same time. Results are logged afterwards, in model order,
    // otherwise the console groups of different models would interleave.
    const results = await Promise.all(
      bimModels.map(model => searchModelForProperty(model, region, categoryName, propName, includeHistory))
    );

    results.forEach(logBimResult);
  } else {
    // One model at a time: each model's group shows up as soon as it is finished
    for (let i = 0; i < bimModels.length; i++) {
      logBimResult(await searchModelForProperty(bimModels[i], region, categoryName, propName, includeHistory), i);
    }
  }

  const elapsed = (performance.now() - t0).toFixed(0);
  const mode = runInParallel ? 'PARALLEL' : 'SEQUENTIAL';

  console.log(`⏱️  Total time [${mode} BIM models]: ${elapsed}ms (default model + ${bimModels.length} BIM model(s))`);
  console.log(`💡 TIP: Toggle "Run in Parallel" to compare how the BIM models are processed. The default model is always a single request.`);
}

/**
 * Scan for elements that have a specific qualified property.
 *
 * In V3 a user-defined property (`z` family, e.g. "z:4wc") is found in the DEFAULT model with a single
 * scan and the BIM models are skipped. Any other property (built-in, or read-only source) is searched
 * in the default model AND in the BIM models (see the header of this file).
 *
 * @param {string}  facilityURN    - Facility URN
 * @param {string}  region         - Region header
 * @param {string}  categoryName   - Property category name (e.g., "Identity Data")
 * @param {string}  propName       - Property name (e.g., "Mark")
 * @param {boolean} includeHistory - Whether to include property history
 * @param {boolean} runInParallel  - If true, the BIM models are searched with Promise.all()
 * @returns {Promise<void>}
 */
export async function scanForProperty(facilityURN, region, categoryName, propName, includeHistory, runInParallel = false) {
  console.group("STUB: scanForProperty()");
  console.log(`▶ BIM models: ${runInParallel ? 'PARALLEL (Promise.all)' : 'SEQUENTIAL (for loop)'}`);
  console.log(`  Property: [${categoryName} | ${propName}]`);

  try {
    await searchFacilityForProperty(facilityURN, region, categoryName, propName, includeHistory, runInParallel, result => {
      if (result.qualProps.length === 0) {
        console.log(`Could not find [${categoryName} | ${propName}] in this model`);
        return;
      }
      console.log(`Include History: ${includeHistory}`);
      console.log("Result from Tandem DB Server -->", result.scanData);
      if (result.propValues.length > 0) {
        console.table(result.propValues);
      }
    });
  } catch (error) {
    console.error('Error scanning for property:', error);
  }

  console.groupEnd();
}

/**
 * Scan for all user-defined properties (DtProperties family = "z").
 *
 * In V2 this had to scan every model. In V3 all user-defined properties are in the default model,
 * so ONE scan of the default model is enough and there is nothing to run in parallel.
 *
 * @param {string}  facilityURN   - Facility URN
 * @param {string}  region        - Region header
 * @returns {Promise<void>}
 */
export async function scanForUserProps(facilityURN, region) {
  console.group("STUB: scanForUserProps() — SCAN for all User-defined Props");

  try {
    const defaultModelURN = getDefaultModelURN(facilityURN);
    console.log(`Default model: ${defaultModelURN}`);

    const bodyPayload = JSON.stringify({
      families: [ColumnFamilies.DtProperties],
      includeHistory: false
    });
    const requestPath = `${tandemBaseURL}/modeldata/${defaultModelURN}/scan`;
    console.log(requestPath);

    const response = await fetch(requestPath, makeRequestOptionsPOST(bodyPayload, region));
    const scanData = await response.json();
    console.log("Result from Tandem DB Server -->", scanData);

    if (!response.ok) {
      console.groupEnd();
      return;
    }

    // Summary: which kinds of elements carry user-defined properties
    const rows = scanData.filter(row => typeof row === 'object' && row !== null);
    const summary = rows.map(row => {
      const propIds = Object.keys(row).filter(column => column.startsWith(`${ColumnFamilies.DtProperties}:`));

      return {
        key: row[QC.Key],
        type: describeKey(row[QC.Key]),
        propertyCount: propIds.length,
        properties: propIds.join(', ')
      };
    });

    console.log(`${rows.length} element(s) have user-defined properties`);
    if (summary.length > 0) {
      console.table(summary);
    }
  } catch (error) {
    console.error('Error scanning for user props:', error);
  }

  console.groupEnd();
}

/**
 * Find elements where a property value matches based on type-aware criteria.
 * Supports: string (partial/exact/regex), numeric (=,!=,>,>=,<,<=), boolean
 *
 * Same search as scanForProperty(): the default model first, and the BIM models too unless the
 * property is a user-defined (`z`) property. The matcher is built by buildValueMatcher() in utils.js.
 *
 * @param {string}  facilityURN    - Facility URN
 * @param {string}  region         - Region header
 * @param {string}  categoryName   - Property category name
 * @param {string}  propName       - Property name
 * @param {Object}  searchOptions  - Search options object (see buildValueMatcher)
 * @param {boolean} runInParallel  - If true, the BIM models are searched with Promise.all()
 * @returns {Promise<void>}
 */
export async function findElementsWherePropValueEquals(facilityURN, region, categoryName, propName, searchOptions, runInParallel = false) {
  console.group("STUB: findElementsWherePropValueEquals()");
  console.log(`▶ BIM models: ${runInParallel ? 'PARALLEL (Promise.all)' : 'SEQUENTIAL (for loop)'}`);
  console.log("Search options:", searchOptions);

  const matcher = buildValueMatcher(searchOptions);

  try {
    await searchFacilityForProperty(facilityURN, region, categoryName, propName, false, runInParallel, result => {
      if (result.qualProps.length === 0) {
        console.log(`Could not find [${categoryName} | ${propName}] in this model`);
      } else if (result.propValues.length === 0) {
        console.log("Could not find any elements with that property: ", propName);
      } else {
        console.log("Raw properties returned-->", result.scanData);
        console.log("Extracted properties-->", result.propValues);

        const matchingProps = result.propValues.filter(prop => matcher(prop.value));

        if (matchingProps.length > 0) {
          console.log("Matching property values-->");
          console.table(matchingProps);
        } else {
          console.log("No elements found matching criteria");
        }
      }
    });
  } catch (error) {
    console.error('Error finding elements by property value:', error);
  }

  console.groupEnd();
}
