/**
 * Model STUB Functions
 * 
 * These STUB functions demonstrate how to call Tandem Model API endpoints.
 * Output goes to the browser console (F12 or Cmd+Option+I).
 */

import { tandemBaseURL, makeRequestOptionsGET, makeRequestOptionsPOST } from '../api.js';

/**
 * Get the properties of a given model.
 * 
 * @param {string} modelURN - Model URN
 * @param {string} region - Region header
 * @returns {Promise<void>}
 */
export async function getModelProperties(modelURN, region) {
  console.group("STUB: getModelProperties()");

  const requestPath = `${tandemBaseURL}/models/${modelURN}/props`;
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
 * Get the given model (used for the viewer).
 * 
 * @param {string} modelURN - Model URN
 * @param {string} region - Region header
 * @returns {Promise<void>}
 */
export async function getModel(modelURN, region) {
  console.group("STUB: getModel()");

  const requestPath = `${tandemBaseURL}/modeldata/${modelURN}/model`;
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
 * Get the AEC model data of a given model.
 * 
 * @param {string} modelURN - Model URN
 * @param {string} region - Region header
 * @returns {Promise<void>}
 */
export async function getAECModelData(modelURN, region) {
  console.group("STUB: getAECModelData()");

  const requestPath = `${tandemBaseURL}/modeldata/${modelURN}/aecmodeldata`;
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
 * Get the attributes of a given model.
 * 
 * @param {string} modelURN - Model URN
 * @param {string} region - Region header
 * @returns {Promise<void>}
 */
export async function getModelDataAttrs(modelURN, region) {
  console.group("STUB: getModelDataAttrs()");

  const requestPath = `${tandemBaseURL}/modeldata/${modelURN}/attrs`;
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
 * Get the schema of a given model.
 * 
 * @param {string} modelURN - Model URN
 * @param {string} region - Region header
 * @returns {Promise<void>}
 */
export async function getModelDataSchema(modelURN, region) {
  console.group("STUB: getModelDataSchema()");

  const requestPath = `${tandemBaseURL}/modeldata/${modelURN}/schema`;
  console.log(requestPath);

  await fetch(requestPath, makeRequestOptionsGET(region))
    .then((response) => response.json())
    .then((obj) => {
      console.log("Result from Tandem DB Server -->", obj);
      console.table(obj.attributes);
    })
    .catch(error => console.log('error', error));

  console.groupEnd();
}

/**
 * Get the change history for a given model.
 *
 * The history endpoint uses POST (not GET) because the query can carry a
 * complex body — time range, type filter, limits, and a flag to include the
 * full list of changed element keys.  Despite being a POST it is a pure read
 * operation (access level: read).
 *
 * Request body shape (btstore.HistoryQuery):
 *   min           {number}  Start of time range — milliseconds since epoch (required)
 *   max           {number}  End of time range   — milliseconds since epoch (required)
 *   typeFilter    {string}  Optional — keep only entries whose change type matches exactly.
 *                           Common values: mutate, apply_pset, delete_pset,
 *                           apply_template, remove_template, update_classification,
 *                           bulk_import, bulk_update, acl_update
 *   includeChanges {boolean} Always sent as true. Without it the response only contains
 *                            timestamps, client IDs, and user names — the change type (o),
 *                            description (d), and affected keys are all omitted by the server.
 *   limit         {number}  Limits the number of rows scanned from the database, NOT
 *                            the number of results returned.  When typeFilter is also
 *                            set, the filter is applied after the DB scan, so fewer
 *                            results than `limit` may be returned (0 = no cap).
 *   useFullKeys   {boolean} When true, element keys in the response use the full
 *                           URN-style format instead of the compact short key.
 *
 * Response is an array of TandemModelHistory objects:
 *   t       Timestamp (ms since epoch)
 *   c       Client ID
 *   n       User display name
 *   o       Change type (e.g. "mutate")
 *   d       Change description
 *   k       Changed element keys  (only present when includeChanges=true)
 *   added   Added element keys    (only present when includeChanges=true)
 *   deleted Deleted element keys  (only present when includeChanges=true)
 *   details Extra metadata for the change (e.g. templateUuid, psetUuid)
 *
 * @param {string} modelURN   - Model URN
 * @param {string} region     - Region header
 * @param {number} daysBack   - How many days back to query (0 = all time)
 * @param {string} typeFilter - Optional change-type filter string
 * @param {number} limit      - Max rows to scan (0 = no limit)
 * @returns {Promise<void>}
 */
export async function getModelHistory(modelURN, region, daysBack, typeFilter, limit) {
  console.group("STUB: getModelHistory()");

  const requestPath = `${tandemBaseURL}/modeldata/${modelURN}/history`;
  console.log(requestPath);

  const now = Date.now();
  const min = daysBack > 0 ? now - (daysBack * 24 * 60 * 60 * 1000) : 1;
  const max = now;

  // includeChanges must be true to receive the change type (o) and description (d).
  // Without it the server omits those fields and the response is nearly useless.
  const bodyPayload = {
    min,
    max,
    includeChanges: true
  };

  if (typeFilter && typeFilter.trim() !== '') {
    bodyPayload.typeFilter = typeFilter.trim();
  }

  if (limit > 0) {
    bodyPayload.limit = limit;
  }

  if (limit > 0 && typeFilter) {
    console.warn(`limit=${limit} controls DB rows scanned, not results returned. With typeFilter='${typeFilter}', fewer than ${limit} results may come back because the filter is applied after the DB scan.`);
  }

  console.log("Request body -->", bodyPayload);

  await fetch(requestPath, makeRequestOptionsPOST(JSON.stringify(bodyPayload), region))
    .then((response) => response.json())
    .then((entries) => {
      console.log("Result from Tandem DB Server -->", entries);
      console.log(`Total entries returned: ${entries.length}`);
      if (entries.length > 0) {
        const changeTypes = [...new Set(entries.map(e => e.o).filter(Boolean))];
        console.log("Distinct change types in response:", changeTypes);
        console.table(entries.map(e => ({
          timestamp: new Date(e.t).toISOString(),
          user: e.n,
          type: e.o,
          description: e.d
        })));
      }
    })
    .catch(error => console.log('error', error));

  console.groupEnd();
}

/**
 * Get the fragments of a given model (used in the viewer), or for only a set
 * of elementKeys within that model.
 * 
 * @param {string} modelURN - Model URN
 * @param {string} region - Region header
 * @param {string} elemKeys - Comma-separated element keys (optional)
 * @returns {Promise<void>}
 */
export async function getModelDataFragments(modelURN, region, elemKeys) {
  console.group("STUB: getModelDataFragments()");

  let elementKeysArray = [];
  if (elemKeys == '') {
    console.log("No elementKeys specified, getting entire model...");
  } else {
    elementKeysArray = elemKeys.split(',');
    console.log("Element keys", elementKeysArray);
  }

  const requestPath = `${tandemBaseURL}/modeldata/${modelURN}/fragments`;

  //  create the payload for the call to /fragments
  const bodyPayload = JSON.stringify({
    includeDeleted: false,
    keys: elementKeysArray
  });

  console.log(requestPath);

  await fetch(requestPath, makeRequestOptionsPOST(bodyPayload, region))
    .then((response) => response.text())
    .then((text) => {
      console.log("Result from Tandem DB Server -->", text);
    })
    .catch(error => console.log('error', error));

  console.groupEnd();
}


