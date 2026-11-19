/**
 * Miscellaneous STUB Functions - V2 schema
 *
 * Looking up elements by key. In V2 a key identifies the element in ONE model only and
 * the flags in the key tell us whether it is a logical element (stream, level, room, ...).
 *
 * Output goes to browser console - open DevTools to see results.
 */

import { tandemBaseURL, tandemWebURL, makeRequestOptionsGET, makeRequestOptionsPOST } from '../../api.js';
import { QC } from '../../../tandem/constants.js';
import { toFullKey, isLogicalElement, isValidElementKey, makeXrefKey } from '../../../tandem/keys.js';
import { parseCommaList } from '../../utils.js';

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

  if (!response.ok) {
    console.error(`Scan of model ${modelId} failed - HTTP ${response.status}: ${response.statusText}`);
    return null;
  }
  const obj = await response.json();

  if (!Array.isArray(obj)) {
    console.error("Unexpected response format:", obj);
    return null;
  }
  const results = [];

  for (const item of obj) {
    const key = item?.[QC.Key];
    
    if (!key) {
      continue;
    }
    const name = item[QC.OName] ?? item[QC.Name];
    const flags = item[QC.ElementFlags]?.[0];
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
  const allIds = parseCommaList(keys);

  if (!allIds.length) {
    console.log("No Element IDs provided.");
    return;
  }
  console.group("STUB: lookupElements()");

  const ids = allIds.filter(isValidElementKey);
  for (const id of allIds.filter(id => !isValidElementKey(id))) {
    console.warn(`Invalid key format (skipped): ${id}`);
  }
  if (!ids.length) {
    console.groupEnd();
    return;
  }
  const knownIds = new Set();

  try {
    const requestPath = `${tandemBaseURL}/twins/${facilityURN}`;
    const response = await fetch(requestPath, makeRequestOptionsGET(region));

    if (!response.ok) {
      console.error(`HTTP ${response.status}: ${response.statusText}`);
      console.groupEnd();
      return;
    }
    const facility = await response.json();
    const links = facility.links ?? [];

    // Scan all models in parallel, then print in the facility's model order
    const modelResults = await Promise.all(
      links.map(link => lookupModelElements(link.modelId, region, ids))
    );

    links.forEach((link, i) => {
      const items = modelResults[i];

      if (!items?.length) {
        return;
      }
      console.group(`Model: ${link.label || 'Default'}`);
      console.table(items.map(item => ({
        key: item.key,
        name: item.name,
        fullKey: item.fullKey
      })));
      for (const item of items) {
        console.log(`${item.name}: ${tandemWebURL}/pages/facilities/${facilityURN}?selection=${item.xrefKey}`);
        knownIds.add(item.key);
        knownIds.add(item.fullKey);
      }
      console.groupEnd();
    });

    for (const id of ids) {
      if (!knownIds.has(id)) {
        console.log(`Unknown ID: ${id}`);
      }
    }
  } catch (error) {
    console.error('Error:', error);
  }
  console.groupEnd();
}
