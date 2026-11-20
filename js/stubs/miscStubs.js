/**
 * Miscellaneous STUB Functions
 * 
 * These functions demonstrate various Tandem API endpoints
 * that don't fit into other categories.
 * 
 * Output goes to browser console - open DevTools to see results.
 */

import { tandemBaseURL, makeRequestOptionsGET, getModels } from '../api.js';
import { fromXrefKeyArray, getElementFlags, toShortKey } from '../../tandem/keys.js';
import { parseTandemLink } from '../utils.js';

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

const BASE64_PATTERN = /^[A-Za-z0-9_\-+/]+={0,2}$/;

/**
 * Convert an xref, or a link copied from Tandem, to the element key.
 *
 * Select an element in the Tandem viewer, then copy either its xref or the browser URL: the
 * "selection" parameter of the URL is an xref. An xref is [16 bytes model id][24 bytes element key].
 * A value with several concatenated xrefs (a multi-selection, or an xref array such as x:loc) gives one
 * row per xref.
 *
 * The key is the 24-byte key (4 bytes of flags + 20 bytes of element id). V3 uses it everywhere.
 * V2 scans use the 20-byte short key, so that is printed too.
 */
export async function getKeyFromXref(facilityURN, region, text) {
  console.group("STUB: getKeyFromXref()");

  const tokens = (text || '').split(/[\s,]+/).filter(Boolean);

  if (tokens.length === 0) {
    console.log("Paste an xref or a Tandem link (with ?selection=...).");
    console.groupEnd();
    return;
  }
  const rows = [];
  const linkFacilities = new Set();

  for (const pasted of tokens) {
    let token = pasted;

    if (/^https?:\/\//i.test(pasted)) {
      const { facilityURN: linkFacility, selection } = parseTandemLink(pasted);

      if (linkFacility) {
        linkFacilities.add(linkFacility);
      }
      if (!selection) {
        console.warn(`No "selection" parameter in link (skipped): ${pasted}`);
        continue;
      }
      token = selection;
    }
    let parsed = [[], []];

    try {
      parsed = BASE64_PATTERN.test(token) ? fromXrefKeyArray(token) : parsed;
    } catch {
      // not valid base64: reported below
    }
    const [modelKeys, elementKeys] = parsed;

    if (modelKeys.length === 0) {
      console.warn(`Not a valid xref (skipped): ${pasted}`);
      continue;
    }
    modelKeys.forEach((modelKey, i) => {
      const flags = getElementFlags(elementKeys[i]);

      rows.push({
        modelURN: `urn:adsk.dtm:${modelKey}`,
        key: elementKeys[i],
        shortKey: toShortKey(elementKeys[i]),
        flags: `0x${flags.toString(16).padStart(8, '0')}`
      });
    });
  }

  for (const linkFacility of linkFacilities) {
    if (linkFacility !== facilityURN) {
      console.warn(`The link is from facility ${linkFacility}, but ${facilityURN} is selected.`);
    }
  }
  if (rows.length === 0) {
    console.groupEnd();
    return;
  }

  // Name the models, so it is clear where the element lives (the default model has no label)
  const models = await getModels(facilityURN, region);
  const modelNames = new Map((models ?? []).map(model => [model.modelId, model.label || 'Default Model']));

  console.table(rows.map(row => ({ model: modelNames.get(row.modelURN) ?? '(not in this facility)', ...row })));
  for (const row of rows) {
    console.log(`Key: ${row.key}`);
  }
  console.log("Result", rows);
  console.groupEnd();
}
