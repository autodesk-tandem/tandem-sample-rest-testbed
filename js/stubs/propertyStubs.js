import { tandemBaseURL, makeRequestOptionsGET, makeRequestOptionsPOST } from '../api.js';
import { ColumnFamilies, ColumnNames, MutateActions } from '../../tandem/constants.js';

/**
 * Get the schema for a specific model, then search for a qualified property by category and name
 * 
 * @param {string} facilityURN - Facility URN
 * @param {string} region - Region header
 * @param {string} categoryName - Property category name
 * @param {string} propName - Property name
 * @returns {Promise<void>}
 */
export async function getQualifiedProperty(facilityURN, region, categoryName, propName) {
  console.group("STUB: getQualifiedProperty() — GET Qualified Property Def");
  
  // Get list of models for this facility
  const facilityPath = `${tandemBaseURL}/twins/${facilityURN}`;
  console.log(facilityPath);
  
  try {
    const facilityResponse = await fetch(facilityPath, makeRequestOptionsGET(region));
    const facilityData = await facilityResponse.json();
    const models = facilityData.links || [];
    
    // Loop through each model
    for (let i = 0; i < models.length; i++) {
      const model = models[i];
      const modelLabel = model.label || `Model ${i}`;
      const modelURN = model.modelId;
      
      console.group(`Model[${i}] --> ${modelLabel}`);
      console.log(`Model URN: ${modelURN}`);
      
      // Get schema for this model
      const schemaPath = `${tandemBaseURL}/modeldata/${modelURN}/schema`;
      console.log(schemaPath);
      
      const schemaResponse = await fetch(schemaPath, makeRequestOptionsGET(region));
      const schema = await schemaResponse.json();
      
      // Search for the qualified property
      const qualProps = [];
      const attrs = schema.attributes || [];
      
      for (let j = 0; j < attrs.length; j++) {
        if (attrs[j].category === categoryName && attrs[j].name === propName) {
          qualProps.push(attrs[j]);
        }
      }
      
      if (qualProps.length > 0) {
        if (qualProps.length === 1) {
          console.log(`Qualified Property for [${categoryName} | ${propName}]:`, qualProps[0]);
        } else {
          console.warn("WARNING: Multiple qualified properties found for this name...");
          qualProps.forEach((prop, idx) => {
            console.log(`Qualified Property [${idx}] for [${categoryName} | ${propName}]:`, prop);
          });
        }
      } else {
        console.log(`Could not find [${categoryName} | ${propName}]`);
      }
      
      console.groupEnd();
    }
  } catch (error) {
    console.error('Error fetching qualified property:', error);
  }
  
  console.groupEnd();
}

/**
 * Scan for elements that have a specific qualified property.
 *
 * This stub demonstrates TWO approaches to iterating over multiple models:
 *
 *   SEQUENTIAL (runInParallel = false, the default)
 *   ────────────────────────────────────────────────
 *   Models are processed one at a time. Each model's schema fetch and scan
 *   must complete before the next model starts.
 *
 *     Total time = (schema_1 + scan_1) + (schema_2 + scan_2) + ...
 *
 *   This is the simplest approach and easy to follow in the console — you can
 *   watch each model's group appear as it finishes.
 *
 *   PARALLEL (runInParallel = true)
 *   ────────────────────────────────
 *   All model requests are fired at the same time using Promise.all().
 *   JavaScript's event loop manages multiple in-flight network requests
 *   concurrently; each model's schema fetch and scan run independently.
 *
 *     Total time ≈ max(schema_N + scan_N) across all models
 *
 *   Results are collected and then printed in model order after ALL fetches
 *   complete, so the console output looks the same as the sequential version.
 *
 *   When to prefer PARALLEL:
 *     • Multiple models with no dependencies between them (this case)
 *     • You want total time ≈ slowest single model rather than sum of all
 *
 *   Caveats to understand before using Promise.all() in production:
 *     1. FAIL-FAST: If ANY promise rejects, Promise.all() immediately rejects
 *        and the remaining results are discarded. Use Promise.allSettled()
 *        when you want to process all results even if some fail.
 *     2. RATE LIMITS: Firing dozens of requests simultaneously may hit API
 *        rate limits. Consider batching (e.g., 5 at a time) for large model sets.
 *     3. ORDER: Promise.all() guarantees result order matches input order,
 *        even if requests complete in a different order.
 *
 * Open the browser console (F12) and watch for the ⏱️ timing line at the
 * end of each run. Toggle "Run in Parallel" and run again to compare.
 *
 * @param {string}  facilityURN    - Facility URN
 * @param {string}  region         - Region header
 * @param {string}  categoryName   - Property category name (e.g., "Identity Data")
 * @param {string}  propName       - Property name (e.g., "Mark")
 * @param {boolean} includeHistory - Whether to include property history
 * @param {boolean} runInParallel  - If true, use Promise.all(); if false, use sequential loop
 * @returns {Promise<void>}
 */
export async function scanForProperty(facilityURN, region, categoryName, propName, includeHistory, runInParallel = false) {
  console.group("STUB: scanForProperty()");
  console.log(`▶ Mode: ${runInParallel ? 'PARALLEL (Promise.all)' : 'SEQUENTIAL (for loop)'}`);
  console.log(`  Property: [${categoryName} | ${propName}]`);

  const facilityPath = `${tandemBaseURL}/twins/${facilityURN}`;
  console.log(facilityPath);

  try {
    // ── Step 1: Fetch the facility to get the list of models ─────────────
    // This step is identical in both approaches — we always need the model
    // list before we can decide how to process them.
    const facilityResponse = await fetch(facilityPath, makeRequestOptionsGET(region));
    const facilityData = await facilityResponse.json();
    const models = facilityData.links || [];

    console.log(`Found ${models.length} model(s). Starting timer...`);

    // Start timing AFTER the facility fetch so we measure only the
    // per-model work — the part that differs between the two approaches.
    const t0 = performance.now();

    // ════════════════════════════════════════════════════════════════════
    // PARALLEL APPROACH
    // ════════════════════════════════════════════════════════════════════
    if (runInParallel) {

      // Promise.all() takes an array of Promises and returns a new Promise
      // that resolves when ALL of them have resolved, or rejects as soon
      // as any one of them rejects.
      //
      // models.map(async (model, i) => { ... }) creates one async function
      // call per model. Each call runs independently — they don't wait for
      // each other. The browser can have all of them in-flight at once.
      //
      // The result is an array of the resolved values, in the SAME ORDER
      // as the input array (not the order they happened to finish).
      const allResults = await Promise.all(
        models.map(async (model, i) => {
          const modelLabel = model.label || `Model ${i}`;
          const modelURN   = model.modelId;

          // Fetch schema for this model (runs concurrently with other models)
          const schemaPath     = `${tandemBaseURL}/modeldata/${modelURN}/schema`;
          const schemaResponse = await fetch(schemaPath, makeRequestOptionsGET(region));
          const schema         = await schemaResponse.json();

          // Find the qualified property in this model's schema
          const qualProps = (schema.attributes || []).filter(
            attr => attr.category === categoryName && attr.name === propName
          );

          // If the property doesn't exist in this model, return early with
          // an empty result — other models still continue running in parallel.
          if (qualProps.length === 0) {
            return { i, modelLabel, modelURN, qualProps: [], scanData: null, propValues: [] };
          }

          // Fetch the scan for elements that have this property
          const qualifiedColumns = qualProps.map(prop => prop.id);
          const bodyPayload      = JSON.stringify({ qualifiedColumns, includeHistory });
          const scanPath         = `${tandemBaseURL}/modeldata/${modelURN}/scan`;
          const scanResponse     = await fetch(scanPath, makeRequestOptionsPOST(bodyPayload, region));
          const scanData         = await scanResponse.json();

          // Extract property values (same logic as sequential path below)
          const propValues = [];
          for (let k = 1; k < scanData.length; k++) {
            const rowObj = scanData[k];
            if (rowObj) {
              const key = rowObj.k;
              for (let m = 0; m < qualProps.length; m++) {
                const prop = rowObj[qualProps[m].id];
                if (prop) {
                  propValues.push({
                    key,
                    prop:  qualProps[m].id,
                    value: includeHistory ? prop : prop[0]
                  });
                }
              }
            }
          }

          // Return a plain result object — no console output yet.
          // All models run simultaneously, so we log AFTER all are done
          // (otherwise console groups would interleave unpredictably).
          return { i, modelLabel, modelURN, qualProps, scanData, propValues };
        })
      );

      // All fetches are complete. Now log results in model order.
      // The output format is identical to the sequential version.
      for (const { i, modelLabel, modelURN, qualProps, scanData, propValues } of allResults) {
        console.group(`Model[${i}] --> ${modelLabel}`);
        console.log(`Model URN: ${modelURN}`);

        if (qualProps.length === 0) {
          console.log(`Could not find [${categoryName} | ${propName}] in this model`);
        } else {
          console.log(`${tandemBaseURL}/modeldata/${modelURN}/scan`);
          console.log(`Include History: ${includeHistory}`);
          console.log("Result from Tandem DB Server -->", scanData);
          if (propValues.length > 0) {
            console.table(propValues);
          }
        }

        console.groupEnd();
      }

    // ════════════════════════════════════════════════════════════════════
    // SEQUENTIAL APPROACH  (original implementation — unchanged)
    // ════════════════════════════════════════════════════════════════════
    } else {

      // A standard for loop with await inside. Each iteration waits for the
      // previous one to finish before starting the next. This means:
      //   model[1] cannot start until model[0]'s schema AND scan are done.
      //   model[2] cannot start until model[1]'s schema AND scan are done.
      //   ...and so on.
      //
      // You can watch each model's console group appear one by one as it
      // completes — a useful property for debugging and learning.
      for (let i = 0; i < models.length; i++) {
        const model      = models[i];
        const modelLabel = model.label || `Model ${i}`;
        const modelURN   = model.modelId;

        console.group(`Model[${i}] --> ${modelLabel}`);
        console.log(`Model URN: ${modelURN}`);

        // Fetch schema for this model, then wait before moving on
        const schemaPath     = `${tandemBaseURL}/modeldata/${modelURN}/schema`;
        console.log(schemaPath);
        const schemaResponse = await fetch(schemaPath, makeRequestOptionsGET(region));
        const schema         = await schemaResponse.json();

        // Search for the qualified property in this model's schema
        const qualProps = [];
        const attrs     = schema.attributes || [];
        for (let j = 0; j < attrs.length; j++) {
          if (attrs[j].category === categoryName && attrs[j].name === propName) {
            qualProps.push(attrs[j]);
          }
        }

        if (qualProps.length > 0) {
          // Fetch the scan for elements that have this property
          const qualifiedColumns = qualProps.map(prop => prop.id);
          const bodyPayload      = JSON.stringify({ qualifiedColumns, includeHistory });
          const scanPath         = `${tandemBaseURL}/modeldata/${modelURN}/scan`;
          console.log(scanPath);
          console.log(`Include History: ${includeHistory}`);

          const scanResponse = await fetch(scanPath, makeRequestOptionsPOST(bodyPayload, region));
          const scanData     = await scanResponse.json();
          console.log("Result from Tandem DB Server -->", scanData);

          // Extract and display property values as a table
          const propValues = [];
          for (let k = 1; k < scanData.length; k++) {
            const rowObj = scanData[k];
            if (rowObj) {
              const key = rowObj.k;
              for (let m = 0; m < qualProps.length; m++) {
                const prop = rowObj[qualProps[m].id];
                if (prop) {
                  if (includeHistory) {
                    propValues.push({ key, prop: qualProps[m].id, value: prop });
                  } else {
                    propValues.push({ key, prop: qualProps[m].id, value: prop[0] });
                  }
                }
              }
            }
          }

          if (propValues.length > 0) {
            console.table(propValues);
          }
        } else {
          console.log(`Could not find [${categoryName} | ${propName}] in this model`);
        }

        console.groupEnd();
      } // end for loop
    }

    // ── Timing summary ────────────────────────────────────────────────────
    // Wall-clock time for all per-model work (schema fetches + scans).
    // Run both modes and compare — the speedup is most noticeable when
    // the facility has several models and each model has many elements.
    const elapsed = (performance.now() - t0).toFixed(0);
    const mode    = runInParallel ? 'PARALLEL' : 'SEQUENTIAL';
    console.log(`⏱️  Total time [${mode}]: ${elapsed}ms across ${models.length} model(s)`);
    console.log(`💡 TIP: Toggle "Run in Parallel" and run again to compare the two approaches.`);

  } catch (error) {
    console.error('Error scanning for property:', error);
  }

  console.groupEnd();
}

/**
 * Scan for all user-defined properties (DtProperties family = "z") across every model
 * in the facility.
 *
 * This stub demonstrates TWO approaches to iterating over multiple models:
 *
 *   SEQUENTIAL (runInParallel = false, the default)
 *   ────────────────────────────────────────────────
 *   Models are processed one at a time. Each model's scan must complete before
 *   the next model starts.
 *
 *     Total time = scan_1 + scan_2 + scan_3 + ...
 *
 *   This is the simplest approach and easy to follow in the console — you can
 *   watch each model's group appear as it finishes.
 *
 *   PARALLEL (runInParallel = true)
 *   ────────────────────────────────
 *   All model scan requests are fired at the same time using Promise.all().
 *   JavaScript's event loop manages multiple in-flight network requests
 *   concurrently; each model's scan runs independently.
 *
 *     Total time ≈ max(scan_N) across all models
 *
 *   Results are collected and then printed in model order after ALL fetches
 *   complete, so the console output looks the same as the sequential version.
 *
 *   Caveats to understand before using Promise.all() in production:
 *     1. FAIL-FAST: If ANY promise rejects, Promise.all() immediately rejects
 *        and the remaining results are discarded. Use Promise.allSettled()
 *        when you want to process all results even if some fail.
 *     2. RATE LIMITS: Firing dozens of requests simultaneously may hit API
 *        rate limits. Consider batching (e.g., 5 at a time) for large model sets.
 *     3. ORDER: Promise.all() guarantees result order matches input order,
 *        even if requests complete in a different order.
 *
 * Open the browser console (F12) and watch for the ⏱️ timing line at the
 * end of each run. Toggle "Run in Parallel" and run again to compare.
 *
 * @param {string}  facilityURN   - Facility URN
 * @param {string}  region        - Region header
 * @param {boolean} runInParallel - If true, use Promise.all(); if false, use sequential loop
 * @returns {Promise<void>}
 */
export async function scanForUserProps(facilityURN, region, runInParallel = false) {
  console.group("STUB: scanForUserProps() — SCAN for all User-defined Props");
  console.log(`▶ Mode: ${runInParallel ? 'PARALLEL (Promise.all)' : 'SEQUENTIAL (for loop)'}`);

  try {
    // ── Step 1: Fetch the facility to get the list of models ─────────────
    // This step is identical in both approaches — we always need the model
    // list before we can decide how to process them.
    const facilityPath = `${tandemBaseURL}/twins/${facilityURN}`;
    console.log(facilityPath);

    const facilityResponse = await fetch(facilityPath, makeRequestOptionsGET(region));
    const facilityData = await facilityResponse.json();
    const models = facilityData.links || [];

    console.log(`Found ${models.length} model(s). Starting timer...`);

    // Start timing AFTER the facility fetch so we measure only the
    // per-model work — the part that differs between the two approaches.
    const t0 = performance.now();

    // ════════════════════════════════════════════════════════════════════
    // PARALLEL APPROACH
    // ════════════════════════════════════════════════════════════════════
    if (runInParallel) {

      // models.map(async (model, i) => { ... }) creates one async function
      // call per model. Each call runs independently — they don't wait for
      // each other. The browser can have all of them in-flight at once.
      //
      // Promise.all() waits for every model's scan to complete, then returns
      // an array of results in the SAME ORDER as the input array.
      const allResults = await Promise.all(
        models.map(async (model, i) => {
          const modelLabel = model.label || `Model ${i}`;
          const modelURN   = model.modelId;

          // Build the scan request — requesting only the DtProperties family
          const bodyPayload = JSON.stringify({
            families: [ColumnFamilies.DtProperties],
            includeHistory: false
          });

          // Fetch this model's scan (runs concurrently with other models)
          const requestPath = `${tandemBaseURL}/modeldata/${modelURN}/scan`;
          const response    = await fetch(requestPath, makeRequestOptionsPOST(bodyPayload, region));
          const scanData    = await response.json();

          // Return a plain result object — no console output yet.
          // All models run simultaneously, so we log AFTER all are done
          // (otherwise console groups would interleave unpredictably).
          return { i, modelLabel, modelURN, requestPath, scanData };
        })
      );

      // All fetches are complete. Now log results in model order.
      // The output format is identical to the sequential version.
      for (const { i, modelLabel, modelURN, requestPath, scanData } of allResults) {
        console.group(`Model[${i}] --> ${modelLabel}`);
        console.log(`Model URN: ${modelURN}`);
        console.log(requestPath);
        console.log("Result from Tandem DB Server -->", scanData);
        console.groupEnd();
      }

    // ════════════════════════════════════════════════════════════════════
    // SEQUENTIAL APPROACH  (original implementation — unchanged)
    // ════════════════════════════════════════════════════════════════════
    } else {

      // A standard for loop with await inside. Each iteration waits for the
      // previous one to finish before starting the next. This means:
      //   model[1] cannot start until model[0]'s scan is done.
      //   model[2] cannot start until model[1]'s scan is done.
      //   ...and so on.
      //
      // You can watch each model's console group appear one by one as it
      // completes — a useful property for debugging and learning.
      for (let i = 0; i < models.length; i++) {
        const model      = models[i];
        const modelLabel = model.label || `Model ${i}`;
        const modelURN   = model.modelId;

        console.group(`Model[${i}] --> ${modelLabel}`);
        console.log(`Model URN: ${modelURN}`);

        const bodyPayload = JSON.stringify({
          families: [ColumnFamilies.DtProperties],
          includeHistory: false
        });

        const requestPath = `${tandemBaseURL}/modeldata/${modelURN}/scan`;
        console.log(requestPath);

        const response = await fetch(requestPath, makeRequestOptionsPOST(bodyPayload, region));
        const scanData = await response.json();
        console.log("Result from Tandem DB Server -->", scanData);

        console.groupEnd();
      } // end for loop
    }

    // ── Timing summary ────────────────────────────────────────────────────
    // Wall-clock time for all per-model scan work.
    // Run both modes and compare — the speedup is most noticeable when
    // the facility has several models.
    const elapsed = (performance.now() - t0).toFixed(0);
    const mode    = runInParallel ? 'PARALLEL' : 'SEQUENTIAL';
    console.log(`⏱️  Total time [${mode}]: ${elapsed}ms across ${models.length} model(s)`);
    console.log(`💡 TIP: Toggle "Run in Parallel" and run again to compare the two approaches.`);

  } catch (error) {
    console.error('Error scanning for user props:', error);
  }

  console.groupEnd();
}

/**
 * Find elements where a property value matches based on type-aware criteria.
 * Supports: string (partial/exact/regex), numeric (=,!=,>,>=,<,<=), boolean
 *
 * Like scanForProperty(), this stub offers both SEQUENTIAL and PARALLEL modes
 * so you can observe the performance difference directly in the console.
 *
 * The matcher function (built from searchOptions) is the same in both modes —
 * it's pure CPU work applied after each model's scan results arrive.
 * Only the network fetches (schema + scan per model) are parallelized.
 *
 * See scanForProperty() for a full explanation of the SEQUENTIAL vs PARALLEL
 * trade-offs and Promise.all() caveats.
 *
 * @param {string}  facilityURN    - Facility URN
 * @param {string}  region         - Region header
 * @param {string}  categoryName   - Property category name
 * @param {string}  propName       - Property name
 * @param {Object}  searchOptions  - Search options object
 *   @param {string}  searchOptions.dataType        - 'string', 'numeric', or 'boolean'
 *   For string:  { matchType: 'partial'|'exact'|'regex', caseInsensitive: boolean, value: string }
 *   For numeric: { operator: '='|'!='|'>'|'>='|'<'|'<=', value: number }
 *   For boolean: { value: boolean }
 * @param {boolean} runInParallel  - If true, use Promise.all(); if false, use sequential loop
 * @returns {Promise<void>}
 */
export async function findElementsWherePropValueEquals(facilityURN, region, categoryName, propName, searchOptions, runInParallel = false) {
  console.group("STUB: findElementsWherePropValueEquals()");
  console.log(`▶ Mode: ${runInParallel ? 'PARALLEL (Promise.all)' : 'SEQUENTIAL (for loop)'}`);
  console.log("Search options:", searchOptions);
  
  const facilityPath = `${tandemBaseURL}/twins/${facilityURN}`;
  console.log(facilityPath);
  
  // Build the matcher function based on data type
  let matcher;
  const dataType = searchOptions?.dataType || 'string';
  
  if (dataType === 'boolean') {
    const targetValue = searchOptions.value;
    console.log(`Matching boolean value: ${targetValue}`);
    matcher = (val) => {
      if (typeof val === 'boolean') return val === targetValue;
      const valStr = String(val).toLowerCase();
      return valStr === (targetValue ? 'true' : 'false') || 
             valStr === (targetValue ? '1' : '0');
    };
  } else if (dataType === 'numeric') {
    const targetValue = searchOptions.value;
    const operator = searchOptions.operator || '=';
    console.log(`Matching numeric value: ${operator} ${targetValue}`);
    matcher = (val) => {
      const numVal = typeof val === 'number' ? val : parseFloat(val);
      if (isNaN(numVal)) return false;
      switch (operator) {
        case '=': return numVal === targetValue;
        case '!=': return numVal !== targetValue;
        case '>': return numVal > targetValue;
        case '>=': return numVal >= targetValue;
        case '<': return numVal < targetValue;
        case '<=': return numVal <= targetValue;
        default: return numVal === targetValue;
      }
    };
  } else {
    // String matching
    const value = searchOptions?.value || '';
    const matchType = searchOptions?.matchType || 'partial';
    const caseInsensitive = searchOptions?.caseInsensitive || false;
    
    if (matchType === 'regex') {
      try {
        const regex = new RegExp(value, caseInsensitive ? 'i' : '');
        console.log(`Matching regex: ${regex}`);
        matcher = (val) => regex.test(String(val));
      } catch (e) {
        console.error('Invalid regex:', e.message);
        console.log("TIP: Use 'Partial' or 'Exact' match type for literal string matching.");
        matcher = (val) => {
          const valStr = String(val);
          return caseInsensitive 
            ? valStr.toLowerCase().includes(value.toLowerCase())
            : valStr.includes(value);
        };
      }
    } else if (matchType === 'exact') {
      console.log(`Matching exact: "${value}" (case insensitive: ${caseInsensitive})`);
      matcher = (val) => {
        const valStr = String(val);
        return caseInsensitive 
          ? valStr.toLowerCase() === value.toLowerCase()
          : valStr === value;
      };
    } else {
      // Partial match (default)
      console.log(`Matching partial: "${value}" (case insensitive: ${caseInsensitive})`);
      matcher = (val) => {
        const valStr = String(val);
        return caseInsensitive 
          ? valStr.toLowerCase().includes(value.toLowerCase())
          : valStr.includes(value);
      };
    }
  }
  
  try {
    // ── Step 1: Fetch the facility to get the list of models ─────────────
    // Same in both approaches — we need the model list before we can proceed.
    const facilityResponse = await fetch(facilityPath, makeRequestOptionsGET(region));
    const facilityData = await facilityResponse.json();
    const models = facilityData.links || [];

    console.log(`Found ${models.length} model(s). Starting timer...`);

    // Start timing AFTER the facility fetch — we only want to measure the
    // per-model work (schema + scan) that differs between the two approaches.
    const t0 = performance.now();

    // ── Helper: extract & filter property values from a raw scan result ───
    // Extracted here so both code paths share exactly the same logic.
    function extractMatchingProps(modelURN, qualProps, rawProps) {
      const propValues = [];
      for (let k = 1; k < rawProps.length; k++) {
        const rowObj = rawProps[k];
        if (rowObj) {
          const key = rowObj.k;
          for (let m = 0; m < qualProps.length; m++) {
            const prop = rowObj[qualProps[m].id];
            if (prop) {
              propValues.push({ modelURN, key, prop: qualProps[m].id, value: prop[0] });
            }
          }
        }
      }
      return propValues;
    }

    // ════════════════════════════════════════════════════════════════════
    // PARALLEL APPROACH
    // ════════════════════════════════════════════════════════════════════
    if (runInParallel) {

      // All model schema + scan requests fire simultaneously.
      // Each async function returns a plain result object; the matcher is
      // applied after all fetches complete (pure CPU — no ordering concerns).
      const allResults = await Promise.all(
        models.map(async (model, i) => {
          const modelLabel = model.label || `Model ${i}`;
          const modelURN   = model.modelId;

          // Fetch schema
          const schemaPath     = `${tandemBaseURL}/modeldata/${modelURN}/schema`;
          const schemaResponse = await fetch(schemaPath, makeRequestOptionsGET(region));
          const schema         = await schemaResponse.json();

          // Find the qualified property
          const qualProps = (schema.attributes || []).filter(
            attr => attr.category === categoryName && attr.name === propName
          );

          if (qualProps.length === 0) {
            return { i, modelLabel, modelURN, qualProps: [], rawProps: null, propValues: [] };
          }

          // Fetch scan
          const qualifiedColumns = qualProps.map(prop => prop.id);
          const bodyPayload      = JSON.stringify({ qualifiedColumns, includeHistory: false });
          const scanPath         = `${tandemBaseURL}/modeldata/${modelURN}/scan`;
          const scanResponse     = await fetch(scanPath, makeRequestOptionsPOST(bodyPayload, region));
          const rawProps         = await scanResponse.json();

          const propValues = extractMatchingProps(modelURN, qualProps, rawProps);
          return { i, modelLabel, modelURN, qualProps, rawProps, propValues };
        })
      );

      // All fetches done — log results in model order and apply matcher
      for (const { i, modelLabel, modelURN, qualProps, rawProps, propValues } of allResults) {
        console.group(`Model[${i}] --> ${modelLabel}`);
        console.log(`Model URN: ${modelURN}`);

        if (qualProps.length === 0) {
          console.log(`Could not find [${categoryName} | ${propName}] in this model`);
        } else if (propValues.length === 0) {
          console.log("Could not find any elements with that property: ", propName);
        } else {
          console.log("Raw properties returned-->", rawProps);
          console.log("Extracted properties-->", propValues);

          const matchingProps = propValues.filter(prop => matcher(prop.value));
          if (matchingProps.length > 0) {
            console.log("Matching property values-->");
            console.table(matchingProps);
          } else {
            console.log("No elements found matching criteria");
          }
        }

        console.groupEnd();
      }

    // ════════════════════════════════════════════════════════════════════
    // SEQUENTIAL APPROACH  (original implementation — unchanged)
    // ════════════════════════════════════════════════════════════════════
    } else {

      for (let i = 0; i < models.length; i++) {
        const model      = models[i];
        const modelLabel = model.label || `Model ${i}`;
        const modelURN   = model.modelId;

        console.group(`Model[${i}] --> ${modelLabel}`);
        console.log(`Model URN: ${modelURN}`);

        // Fetch schema for this model, then wait before moving on
        const schemaPath     = `${tandemBaseURL}/modeldata/${modelURN}/schema`;
        console.log(schemaPath);
        const schemaResponse = await fetch(schemaPath, makeRequestOptionsGET(region));
        const schema         = await schemaResponse.json();

        // Search for the qualified property
        const qualProps = [];
        const attrs     = schema.attributes || [];
        for (let j = 0; j < attrs.length; j++) {
          if (attrs[j].category === categoryName && attrs[j].name === propName) {
            qualProps.push(attrs[j]);
          }
        }

        if (qualProps.length > 0) {
          // Scan for elements with this property
          const qualifiedColumns = qualProps.map(prop => prop.id);
          const bodyPayload      = JSON.stringify({ qualifiedColumns, includeHistory: false });
          const scanPath         = `${tandemBaseURL}/modeldata/${modelURN}/scan`;
          console.log(scanPath);

          const scanResponse = await fetch(scanPath, makeRequestOptionsPOST(bodyPayload, region));
          const rawProps     = await scanResponse.json();

          const propValues = extractMatchingProps(modelURN, qualProps, rawProps);

          if (propValues.length > 0) {
            console.log("Raw properties returned-->", rawProps);
            console.log("Extracted properties-->", propValues);

            // Filter using the type-aware matcher
            const matchingProps = propValues.filter(prop => matcher(prop.value));
            if (matchingProps.length > 0) {
              console.log("Matching property values-->");
              console.table(matchingProps);
            } else {
              console.log("No elements found matching criteria");
            }
          } else {
            console.log("Could not find any elements with that property: ", propName);
          }
        } else {
          console.log(`Could not find [${categoryName} | ${propName}] in this model`);
        }

        console.groupEnd();
      } // end for loop
    }

    // ── Timing summary ────────────────────────────────────────────────────
    const elapsed = (performance.now() - t0).toFixed(0);
    const mode    = runInParallel ? 'PARALLEL' : 'SEQUENTIAL';
    console.log(`⏱️  Total time [${mode}]: ${elapsed}ms across ${models.length} model(s)`);
    console.log(`💡 TIP: Toggle "Run in Parallel" and run again to compare the two approaches.`);

  } catch (error) {
    console.error('Error finding elements:', error);
  }

  console.groupEnd();
}

/**
 * Scan all elements in a model with no filters (brute force)
 * 
 * @param {string} modelURN - Model URN
 * @param {string} region - Region header
 * @returns {Promise<void>}
 */
export async function getScanBruteForce(modelURN, region) {
  console.group("STUB: getScanBruteForce()");
  
  const requestPath = `${tandemBaseURL}/modeldata/${modelURN}/scan`;
  console.log(requestPath);
  
  await fetch(requestPath, makeRequestOptionsGET(region))
    .then((response) => response.json())
    .then((obj) => {
      console.log("Result from Tandem DB Server -->", obj);
    })
    .catch(error => console.log('error', error));
  
  console.groupEnd();
}

/**
 * Scan for elements with specific options (element keys, history, column families)
 * 
 * @param {string} modelURN - Model URN
 * @param {string} region - Region header
 * @param {string} elemKeys - Comma-separated element keys (optional)
 * @param {boolean} includeHistory - Whether to include history
 * @param {string} colFamilies - Comma-separated column families (e.g., "n,z,l")
 * @returns {Promise<void>}
 */
export async function getScanElementsOptions(modelURN, region, elemKeys, includeHistory, colFamilies) {
  console.group("STUB: getScanElementsOptions()");
  
  let elemKeysArray = [];
  if (elemKeys === "") {
    console.log("No element keys specified, scanning entire model...");
  } else {
    elemKeysArray = elemKeys.split(',').map(k => k.trim());
    console.log("Scanning for specific element keys", elemKeysArray);
  }
  
  let familiesArray = [];
  if (colFamilies === "") {
    console.log("No column families specified, returning all...");
  } else {
    familiesArray = colFamilies.split(',').map(f => f.trim());
    console.log("Scanning for column families", familiesArray);
  }
  
  const bodyPayload = JSON.stringify({
    families: familiesArray.length > 0 ? familiesArray : undefined,
    includeHistory: includeHistory,
    keys: elemKeysArray.length > 0 ? elemKeysArray : undefined
  });
  
  const requestPath = `${tandemBaseURL}/modeldata/${modelURN}/scan`;
  console.log(requestPath);
  console.log("Payload:", bodyPayload);
  
  await fetch(requestPath, makeRequestOptionsPOST(bodyPayload, region))
    .then((response) => response.json())
    .then((obj) => {
      console.log("Result from Tandem DB Server -->", obj);
    })
    .catch(error => console.log('error', error));
  
  console.groupEnd();
}

/**
 * Scan for elements with specific qualified property columns
 * 
 * @param {string} modelURN - Model URN
 * @param {string} region - Region header
 * @param {string} elemKeys - Comma-separated element keys (optional)
 * @param {boolean} includeHistory - Whether to include history
 * @param {string} qualProps - Comma-separated qualified properties (e.g., "z:5mQ,n:n")
 * @returns {Promise<void>}
 */
export async function getScanElementsQualProps(modelURN, region, elemKeys, includeHistory, qualProps) {
  console.group("STUB: getScanElementsQualProps()");
  
  let elemKeysArray = [];
  if (elemKeys === "") {
    console.log("No element keys specified, scanning entire model...");
  } else {
    elemKeysArray = elemKeys.split(',').map(k => k.trim());
    console.log("Scanning for specific element keys", elemKeysArray);
  }
  
  let qualPropsArray = [];
  if (qualProps === "") {
    console.log("No qualified properties specified, returning all...");
  } else {
    qualPropsArray = qualProps.split(',').map(p => p.trim());
    console.log("Scanning for specific qualified properties", qualPropsArray);
  }
  
  const bodyPayload = JSON.stringify({
    qualifiedColumns: qualPropsArray.length > 0 ? qualPropsArray : undefined,
    includeHistory: includeHistory,
    keys: elemKeysArray.length > 0 ? elemKeysArray : undefined
  });
  
  const requestPath = `${tandemBaseURL}/modeldata/${modelURN}/scan`;
  console.log(requestPath);
  console.log("Payload:", bodyPayload);
  
  await fetch(requestPath, makeRequestOptionsPOST(bodyPayload, region))
    .then((response) => response.json())
    .then((obj) => {
      console.log("Result from Tandem DB Server -->", obj);
    })
    .catch(error => console.log('error', error));
  
  console.groupEnd();
}

/**
 * Get the full change history of all properties for the given elements
 * 
 * @param {string} modelURN - Model URN
 * @param {string} region - Region header
 * @param {string} elemKeys - Comma-separated element keys
 * @returns {Promise<void>}
 */
export async function getScanElementsFullChangeHistory(modelURN, region, elemKeys) {
  console.group("STUB: getScanElementsFullChangeHistory()");
  
  if (elemKeys === "") {
    console.error("ERROR: Element keys are required for this operation");
    console.groupEnd();
    return;
  }
  
  const elemKeysArray = elemKeys.split(',').map(k => k.trim());
  console.log("Element keys", elemKeysArray);
  
  const bodyPayload = JSON.stringify({
    includeHistory: true,
    keys: elemKeysArray
  });
  
  const requestPath = `${tandemBaseURL}/modeldata/${modelURN}/scan`;
  console.log(requestPath);
  console.log("Payload:", bodyPayload);
  
  await fetch(requestPath, makeRequestOptionsPOST(bodyPayload, region))
    .then((response) => response.json())
    .then((obj) => {
      console.log("Result from Tandem DB Server -->", obj);
    })
    .catch(error => console.log('error', error));
  
  console.groupEnd();
}

/**
 * Assign a classification to elements
 * 
 * @param {string} facilityURN - Facility URN
 * @param {string} region - Region header
 * @param {string} classificationStr - Classification string (e.g., "Walls > Curtain Wall")
 * @param {string} modelURN - Model URN
 * @param {string} elementKeys - Comma-separated element keys
 * @returns {Promise<void>}
 */
export async function assignClassification(facilityURN, region, classificationStr, modelURN, elementKeys) {
  console.group("STUB: assignClassification()");
  
  // First, validate the classification exists in the facility template
  const templatePath = `${tandemBaseURL}/twins/${facilityURN}/inlinetemplate`;
  console.log(templatePath);
  
  try {
    const templateResponse = await fetch(templatePath, makeRequestOptionsGET(region));
    const template = await templateResponse.json();
    
    // Search for the classification node
    let classificationNode = null;
    
    function findClassification(nodes, searchStr) {
      if (!nodes) return null;
      for (const node of nodes) {
        if (node.name === searchStr || node.fullName === searchStr) {
          return node;
        }
        if (node.children) {
          const found = findClassification(node.children, searchStr);
          if (found) return found;
        }
      }
      return null;
    }
    
    if (template.classification) {
      classificationNode = findClassification(template.classification, classificationStr);
    }
    
    if (!classificationNode) {
      console.error(`Could not find classification "${classificationStr}" in the facility template.`);
      console.log("TIP: Use GET Facility Inline Template to see available classifications.");
      console.groupEnd();
      return;
    }
    
    console.log("Classification node found:", classificationNode);
    
    // Parse element keys
    const elementKeysArray = elementKeys.split(',').map(k => k.trim());
    if (elementKeysArray.length === 0 || elementKeysArray[0] === "") {
      console.error("ERROR: No element keys specified.");
      console.groupEnd();
      return;
    }
    
    console.log("Element keys:", elementKeysArray);
    console.log(`Setting classification to "${classificationStr}"`);
    
    // Create the mutations array
    const mutsArray = [];
    for (let i = 0; i < elementKeysArray.length; i++) {
      // MutateActions.Insert, ColumnFamilies.Standard:ColumnNames.OClassification to override classification
      const mutObj = [MutateActions.Insert, ColumnFamilies.Standard, ColumnNames.OClassification, classificationStr];
      mutsArray.push(mutObj);
    }
    
    // Create the payload for the call to /mutate
    const bodyPayload = JSON.stringify({
      keys: elementKeysArray,
      muts: mutsArray,
      desc: "REST TestBedApp: updated classification"
    });
    
    const requestPath = `${tandemBaseURL}/modeldata/${modelURN}/mutate`;
    console.log(requestPath);
    console.log("Payload:", bodyPayload);
    
    await fetch(requestPath, makeRequestOptionsPOST(bodyPayload, region))
      .then((response) => response.json())
      .then((obj) => {
        console.log("Result from Tandem DB Server -->", obj);
      })
      .catch(error => console.log('error', error));
      
  } catch (error) {
    console.error('Error assigning classification:', error);
  }
  
  console.groupEnd();
}

/**
 * Set property values on elements using category and property name
 * 
 * @param {string} modelURN - Model URN
 * @param {string} region - Region header
 * @param {string} propCategory - Property category name
 * @param {string} propName - Property name
 * @param {string} propVal - Property value to set
 * @param {string} elementKeys - Comma-separated element keys
 * @returns {Promise<void>}
 */
export async function setPropertySelSet(modelURN, region, propCategory, propName, propVal, elementKeys) {
  console.group("STUB: setPropertySelSet()");
  
  // First, find the qualified property from the schema
  const schemaPath = `${tandemBaseURL}/modeldata/${modelURN}/schema`;
  console.log(schemaPath);
  
  try {
    const schemaResponse = await fetch(schemaPath, makeRequestOptionsGET(region));
    const schema = await schemaResponse.json();
    
    // Search for the qualified property
    let qualProp = null;
    const attrs = schema.attributes || [];
    
    for (let j = 0; j < attrs.length; j++) {
      if (attrs[j].category === propCategory && attrs[j].name === propName) {
        qualProp = attrs[j];
        break;
      }
    }
    
    if (!qualProp) {
      console.error(`Could not find property "${propCategory} | ${propName}" in model schema.`);
      console.log("TIP: Use GET Model Data Schema to see available properties.");
      console.groupEnd();
      return;
    }
    
    console.log("Qualified property found:", qualProp);
    
    // Parse element keys
    const elementKeysArray = elementKeys.split(',').map(k => k.trim());
    if (elementKeysArray.length === 0 || elementKeysArray[0] === "") {
      console.error("ERROR: No element keys specified.");
      console.groupEnd();
      return;
    }
    
    // Parse the value based on data type
    let typedValue = propVal;
    if (qualProp.dataType === 1 || qualProp.dataType === 2) {
      // Integer or Float
      typedValue = parseFloat(propVal);
    } else if (qualProp.dataType === 3) {
      // Boolean
      typedValue = propVal.toLowerCase() === 'true';
    }
    
    console.log("Element keys:", elementKeysArray);
    console.log(`Setting value for "${propCategory} | ${propName}" =`, typedValue);
    
    // Extract family and column from qualified property ID
    const [fam, col] = qualProp.id.split(':');
    
    // Create the mutations array
    const mutsArray = [];
    for (let i = 0; i < elementKeysArray.length; i++) {
      const mutObj = [MutateActions.Insert, fam, col, typedValue];
      mutsArray.push(mutObj);
    }
    
    // Create the payload for the call to /mutate
    const bodyPayload = JSON.stringify({
      keys: elementKeysArray,
      muts: mutsArray,
      desc: "REST TestBedApp: updated property"
    });
    
    const requestPath = `${tandemBaseURL}/modeldata/${modelURN}/mutate`;
    console.log(requestPath);
    console.log("Payload:", bodyPayload);
    
    await fetch(requestPath, makeRequestOptionsPOST(bodyPayload, region))
      .then((response) => response.json())
      .then((obj) => {
        console.log("Result from Tandem DB Server -->", obj);
      })
      .catch(error => console.log('error', error));
      
  } catch (error) {
    console.error('Error setting property:', error);
  }
  
  console.groupEnd();
}

/**
 * Set property values on elements using qualified property ID directly
 * 
 * @param {string} modelURN - Model URN
 * @param {string} region - Region header
 * @param {string} qualPropStr - Qualified property string (e.g., "z:5mQ")
 * @param {string} propVal - Property value to set
 * @param {string} elementKeys - Comma-separated element keys
 * @returns {Promise<void>}
 */
export async function setPropertySelSetQP(modelURN, region, qualPropStr, propVal, elementKeys) {
  console.group("STUB: setPropertySelSetQP()");
  
  // First, find the qualified property from the schema to get the data type
  const schemaPath = `${tandemBaseURL}/modeldata/${modelURN}/schema`;
  console.log(schemaPath);
  
  try {
    const schemaResponse = await fetch(schemaPath, makeRequestOptionsGET(region));
    const schema = await schemaResponse.json();
    
    // Search for the qualified property by ID
    let qualProp = null;
    const attrs = schema.attributes || [];
    
    for (let j = 0; j < attrs.length; j++) {
      if (attrs[j].id === qualPropStr) {
        qualProp = attrs[j];
        break;
      }
    }
    
    if (!qualProp) {
      console.warn(`Property "${qualPropStr}" not found in schema. Proceeding with string value.`);
    } else {
      console.log("Qualified property found:", qualProp);
    }
    
    // Parse element keys
    const elementKeysArray = elementKeys.split(',').map(k => k.trim());
    if (elementKeysArray.length === 0 || elementKeysArray[0] === "") {
      console.error("ERROR: No element keys specified.");
      console.groupEnd();
      return;
    }
    
    // Parse the value based on data type if we found the property
    let typedValue = propVal;
    if (qualProp) {
      if (qualProp.dataType === 1 || qualProp.dataType === 2) {
        // Integer or Float
        typedValue = parseFloat(propVal);
      } else if (qualProp.dataType === 3) {
        // Boolean
        typedValue = propVal.toLowerCase() === 'true';
      }
    }
    
    // Parse family and column from qualified property string
    const parts = qualPropStr.split(':');
    if (parts.length !== 2) {
      console.error(`Invalid qualified property format: "${qualPropStr}". Expected format: "family:column" (e.g., "z:5mQ")`);
      console.groupEnd();
      return;
    }
    const [fam, col] = parts;
    
    console.log("Element keys:", elementKeysArray);
    console.log(`Setting value for "${qualPropStr}" =`, typedValue);
    
    // Create the mutations array
    const mutsArray = [];
    for (let i = 0; i < elementKeysArray.length; i++) {
      const mutObj = [MutateActions.Insert, fam, col, typedValue];
      mutsArray.push(mutObj);
    }
    
    // Create the payload for the call to /mutate
    const bodyPayload = JSON.stringify({
      keys: elementKeysArray,
      muts: mutsArray,
      desc: "REST TestBedApp: updated property"
    });
    
    const requestPath = `${tandemBaseURL}/modeldata/${modelURN}/mutate`;
    console.log(requestPath);
    console.log("Payload:", bodyPayload);
    
    await fetch(requestPath, makeRequestOptionsPOST(bodyPayload, region))
      .then((response) => response.json())
      .then((obj) => {
        console.log("Result from Tandem DB Server -->", obj);
      })
      .catch(error => console.log('error', error));
      
  } catch (error) {
    console.error('Error setting property:', error);
  }
  
  console.groupEnd();
}


/**
 * Delete (clear) a property value from selected elements using MutateActions.Delete ('d').
 *
 * IMPORTANT — what "delete" means in Tandem:
 *   The server NEVER physically removes a cell. MutateActions.Delete ('d') sets the cell
 *   value to empty and records the deletion in history. After a successful delete, the
 *   column will still appear in scan results but with an empty value ['']. This is correct
 *   and expected — the value has been cleared even though the column entry remains.
 *
 * IMPORTANT — do NOT delete columns that don't exist:
 *   If you run a delete mutation against a column that has never been written, the server
 *   creates a new empty cell for it (to start its history). This is the opposite of what
 *   you want. This stub guards against that by scanning the elements first and only
 *   issuing delete mutations for columns that actually contain a non-empty value.
 *
 * USE CASE — cleaning up corrupted data (e.g. the "z:z" double-prefix bug):
 *   The bug stored values in family=z, column=z (displayed as "z:z" in scan output).
 *   Enter "z:z" as the qualified property name to clear it.
 *   After the delete, the scan will show z:z: [''] — that is success.
 *
 * FULL CLEANUP SEQUENCE for corrupted/orphaned property columns:
 *   Step 1 — Run this stub to clear the bad values (sets them to empty via MutateActions.Delete).
 *   Step 2 — In the Tandem UI, run "Cleanup Facility" (Manage > Cleanup Facility or similar).
 *            This physically purges all empty/null cells via a server-side DeleteCellsInColumn
 *            operation that is not available through the public REST API.
 *   After both steps, re-run "Scan for User Props" — the orphaned columns will be gone entirely.
 *
 * @param {string} facilityURN   - Facility URN
 * @param {string} region        - Region header
 * @param {string} modelURN      - Model URN containing the elements
 * @param {string} elementKeys   - Comma-separated element keys
 * @param {string} qualPropNames - Comma-separated qualified property names to delete.
 *                                 Use exactly the key as it appears in the scan output.
 *                                 Format: "family:column"  e.g. "z:z" or "z:4wc"
 *                                 Split always occurs on the FIRST colon, so "z:z:4wc"
 *                                 → family="z", column="z:4wc" (matching the scan key).
 */
export async function deletePropertyValue(facilityURN, region, modelURN, elementKeys, qualPropNames) {
  console.group("STUB: deletePropertyValue()");

  const elementKeysArray = elementKeys.split(',').map(k => k.trim()).filter(k => k);
  const qualPropArray = qualPropNames.split(',').map(p => p.trim()).filter(p => p);

  if (!elementKeysArray.length) {
    console.error("ERROR: at least one element key is required");
    console.groupEnd();
    return;
  }

  if (!qualPropArray.length) {
    console.error("ERROR: at least one qualified property name is required");
    console.groupEnd();
    return;
  }

  // Parse each qualified property name, splitting on the FIRST colon only.
  const parsedProps = [];
  for (const qp of qualPropArray) {
    const firstColon = qp.indexOf(':');
    if (firstColon === -1) {
      console.error(`Invalid qualified property: "${qp}". Expected "family:column" e.g. "z:z" or "z:4wc"`);
      console.groupEnd();
      return;
    }
    parsedProps.push({ qualName: qp, fam: qp.slice(0, firstColon), col: qp.slice(firstColon + 1) });
  }

  console.log("Element keys:", elementKeysArray);
  console.log("Requested columns to delete:", parsedProps.map(p => p.qualName).join(', '));

  // --- SCAN FIRST ---
  // Only delete columns that actually have a non-empty value on each element.
  // Deleting a column that doesn't exist would CREATE it as an empty cell (the opposite
  // of what we want). The scan tells us exactly what to delete.
  console.log("Scanning elements first to confirm which columns have data...");
  const scanPath = `${tandemBaseURL}/modeldata/${modelURN}/scan`;
  const scanPayload = JSON.stringify({
    keys: elementKeysArray,
    families: parsedProps.map(p => p.fam).filter((f, i, a) => a.indexOf(f) === i), // unique families
    includeHistory: false
  });

  let scanResult;
  try {
    const scanResponse = await fetch(scanPath, makeRequestOptionsPOST(scanPayload, region));
    scanResult = await scanResponse.json();
    console.log("Scan result:", scanResult);
  } catch (error) {
    console.error('Scan failed — aborting to avoid creating unwanted columns:', error);
    console.groupEnd();
    return;
  }

  // Build a set of { elementKey, qualName } pairs that actually have data.
  const keys = [];
  const muts = [];

  for (const row of scanResult) {
    const elementKey = row['k'];
    if (!elementKey || !elementKeysArray.includes(elementKey)) continue;

    for (const { qualName, fam, col } of parsedProps) {
      const cellValue = row[qualName];
      const hasValue = cellValue !== undefined && cellValue !== null &&
                       !(Array.isArray(cellValue) && (cellValue.length === 0 || cellValue[0] === ''));

      if (hasValue) {
        console.log(`  ✓ Found "${qualName}" = ${JSON.stringify(cellValue)} on element ${elementKey} — will delete`);
        keys.push(elementKey);
        muts.push([MutateActions.Delete, fam, col, '']);
      } else {
        console.log(`  — Skipping "${qualName}" on element ${elementKey} — already empty or absent (no mutation needed)`);
      }
    }
  }

  if (!keys.length) {
    console.log("Nothing to delete — all specified columns are already empty or absent.");
    console.groupEnd();
    return;
  }

  const bodyPayload = JSON.stringify({ keys, muts, desc: "REST TestBed: delete property value(s)" });
  const requestPath = `${tandemBaseURL}/modeldata/${modelURN}/mutate`;
  console.log(`Sending ${keys.length} delete mutation(s)...`);
  console.log("Request:", requestPath);
  console.log("Payload:", bodyPayload);

  try {
    const response = await fetch(requestPath, makeRequestOptionsPOST(bodyPayload, region));
    const result = await response.json();
    console.log("Result from Tandem DB Server -->", result);
    console.log("Done. Re-run 'Scan for User Props' to confirm — deleted columns will now show [''] (empty), which is the correct deleted state.");
  } catch (error) {
    console.error('Error deleting property:', error);
  }

  console.groupEnd();
}
