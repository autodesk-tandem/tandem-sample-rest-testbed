/**
 * Scan STUB Functions
 *
 * These call POST /modeldata/{modelURN}/scan, the workhorse read endpoint of the Tandem REST API.
 * The same request works for V2 and V3 facilities: the server picks the data layout from the
 * facility's schema version. Only the keys in the rows differ (V2 scan rows use 20-byte short keys,
 * V3 uses 24-byte keys).
 *
 * Output goes to browser console - open DevTools to see results.
 */

import { tandemBaseURL, makeRequestOptionsGET, makeRequestOptionsPOST } from '../api.js';
import { parseCommaList } from '../utils.js';

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
  
  const elemKeysArray = parseCommaList(elemKeys);
  if (elemKeysArray.length === 0) {
    console.log("No element keys specified, scanning entire model...");
  } else {
    console.log("Scanning for specific element keys", elemKeysArray);
  }
  
  const familiesArray = parseCommaList(colFamilies);
  if (familiesArray.length === 0) {
    console.log("No column families specified, returning all...");
  } else {
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
  
  const elemKeysArray = parseCommaList(elemKeys);
  if (elemKeysArray.length === 0) {
    console.log("No element keys specified, scanning entire model...");
  } else {
    console.log("Scanning for specific element keys", elemKeysArray);
  }
  
  const qualPropsArray = parseCommaList(qualProps);
  if (qualPropsArray.length === 0) {
    console.log("No qualified properties specified, returning all...");
  } else {
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
  
  const elemKeysArray = parseCommaList(elemKeys);
  if (elemKeysArray.length === 0) {
    console.error("ERROR: Element keys are required for this operation");
    console.groupEnd();
    return;
  }
  
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
