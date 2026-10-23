/**
 * Miscellaneous STUB Functions
 * 
 * These functions demonstrate various Tandem API endpoints
 * that don't fit into other categories.
 * 
 * Output goes to browser console - open DevTools to see results.
 */

import { tandemBaseURL, makeRequestOptionsGET, makeRequestOptionsPOST } from '../api.js';
import { QC } from '../../tandem/constants.js';
import { toFullKey, isLogicalElement, makeXrefKey } from '../../tandem/keys.js';

/**
 * Get the health stats of the systems
 */
export async function getHealth() {
  console.group("STUB: getHealth()");

  const requestPath = `${tandemBaseURL}/health?verbose=true`;
  console.log("Request:", requestPath);

  try {
    const response = await fetch(requestPath, makeRequestOptionsGET());
    const result = await response.json();
    console.log("Result from Tandem DB Server -->", result);
    console.groupEnd();
    return result;
  } catch (error) {
    console.error('Error:', error);
    console.groupEnd();
    return null;
  }
}

/**
 * Get the facilities associated with a user
 */
export async function getFacilitiesForUser(userID) {
  console.group("STUB: getFacilitiesForUser()");
  console.log("User ID:", userID);

  const requestPath = `${tandemBaseURL}/users/${userID}/twins`;
  console.log("Request:", requestPath);

  try {
    const response = await fetch(requestPath, makeRequestOptionsGET());
    const result = await response.json();
    console.log("Result from Tandem DB Server -->", result);
    
    // Log each facility
    for (const [key, value] of Object.entries(result)) {
      console.log(key, value);
    }
    
    console.groupEnd();
    return result;
  } catch (error) {
    console.error('Error:', error);
    console.groupEnd();
    return null;
  }
}

async function lookupModelElements(modelId, region, keys) {
  const payload = JSON.stringify({
    includeHistory: false,
    keys: keys,
    families: ["n"],
    skipArrays: true,
  });
  const reqOpts = makeRequestOptionsPOST(payload, region);
  const requestPath = `${tandemBaseURL}/modeldata/${modelId}/scan`;
  
  const response = await fetch(requestPath, reqOpts);
  const obj = await response.json();

  if (!Array.isArray(obj)) {
    console.error("Unexpected response format:", obj);
    return;
  }
  const results = [];

  for (const item of obj) {
    const key = item?.[QC.Key];
    
    if (!key) {
      continue;
    }
    const name = item[QC.OName] ?? item[QC.Name];
    const flags = item[QC.Flags];
    const fullKey = toFullKey(key, isLogicalElement(flags));
    const xrefKey = makeXrefKey(modelId, fullKey);
    
    results.push({ key, name, fullKey, xrefKey });
  }
  return results;
}

/**
 * Lookup elements by their keys
 */
export async function lookupElements(facilityURN, region, keys) {
  const ids = keys?.split(',');

  if (!ids?.length) {
    console.log("No Element IDs provided.");
    return;
  }
  console.group("STUB: lookupElements()");
  const requestPath = `${tandemBaseURL}/twins/${facilityURN}`;
  
  try {
    const response = await fetch(requestPath, makeRequestOptionsGET(region));
    const facility = await response.json();
    
    for (const link of facility.links) {
      console.group(`Model: ${link.label.length > 0 ? link.label : 'Default'}`);
      const items = await lookupModelElements(link.modelId, region, ids);

      for (const item of items) {
        console.table({
          key: item.key,
          name: item.name,
          fullKey: item.fullKey
        });
        const link = `https://tandem.autodesk.com/pages/facilities/${facilityURN}?selection=${item.xrefKey}`;
        
        console.log(link);
      }
      console.groupEnd();
    }
  } catch (error) {
    console.error('Error:', error);
  }
  console.groupEnd();
}
