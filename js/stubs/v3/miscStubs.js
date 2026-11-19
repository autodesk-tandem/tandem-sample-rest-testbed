/**
 * Miscellaneous STUB Functions - V3 schema
 *
 * Looking up elements by key. In V3 there is one kind of key: the 24-byte key whose first 4 bytes are
 * the element flags (see getElementFlags). Keys are used as they are, there is no short key to convert.
 * A key still identifies the element in ONE model only, so every model of the facility is asked.
 *
 * Output goes to browser console - open DevTools to see results.
 */

import { tandemWebURL, getModels } from '../../api.js';
import { ColumnFamilies, QC } from '../../../tandem/constants.js';
import { isValidElementKey, makeXrefKey } from '../../../tandem/keys.js';
import { parseCommaList } from '../../utils.js';
import { describeKey, nameOf, scanModel } from './helpers.js';

/**
 * Ask one model for the given keys. Returns the elements the model knows, or null on error.
 */
async function lookupModelElements(modelId, region, keys) {
  try {
    const rows = await scanModel(modelId, region, {
      keys,
      families: [ColumnFamilies.Standard]
    });

    return rows.map(row => {
      const key = row[QC.Key];

      return {
        key,
        name: nameOf(row),
        type: describeKey(key),
        xrefKey: makeXrefKey(modelId, key)
      };
    });
  } catch (error) {
    console.error(error.message);
    return null;
  }
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

  // A V3 key is 24 bytes (32 characters of unpadded base64): the first 4 bytes are the flags
  const isV3Key = id => isValidElementKey(id) && id.length === 32;
  const ids = allIds.filter(isV3Key);

  for (const id of allIds.filter(id => !isV3Key(id))) {
    console.warn(`Not a 24-byte key (skipped): ${id}`);
  }
  if (!ids.length) {
    console.groupEnd();
    return;
  }
  const knownIds = new Set();

  try {
    const links = await getModels(facilityURN, region);

    if (!links) {
      console.error("Could not read the models of the facility");
      console.groupEnd();
      return;
    }

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
        type: item.type
      })));
      for (const item of items) {
        console.log(`${item.name}: ${tandemWebURL}/pages/facilities/${facilityURN}?selection=${item.xrefKey}`);
        knownIds.add(item.key);
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
