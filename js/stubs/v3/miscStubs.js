/**
 * Miscellaneous STUB Functions - V3 schema
 *
 * Looking up elements by key. In V3 there is one kind of key: the 24-byte key whose first 4 bytes are
 * the element flags (see getElementFlags). Keys are used as they are, there is no short key to convert.
 * A key still identifies the element in ONE model only, so every model of the facility is asked.
 *
 * Output goes to browser console - open DevTools to see results.
 */

import { tandemWebURL, getModels, getDefaultModelURN } from '../../api.js';
import { ColumnFamilies, ElementFlags, QC } from '../../../tandem/constants.js';
import { decodeXref, getElementFlags, makeXrefKey } from '../../../tandem/keys.js';
import { parseCommaList } from '../../utils.js';
import { getKeyFromXref as getKeyFromXrefWithLinks } from '../miscStubs.js';
import { firstValue } from './helpers.js';
import { describeKey, nameOf, scanModel } from './helpers.js';
import { isV3Key } from './writeHelpers.js';

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

/**
 * Read the link of one element to its twin: `x:ha` on a BIM element (the asset made from it) or `x:be` on an asset
 * (the BIM element it was made from). Both are xrefs.
 * @returns {Promise<{ modelURN: string, elementKey: string } | null | undefined>} undefined when the row is not in the model
 */
async function readLink(modelURN, region, key, linkColumn) {
  const [row] = await scanModel(modelURN, region, { keys: [key], families: [ColumnFamilies.Xrefs] });

  if (!row) {
    return undefined;
  }
  const xref = firstValue(row[linkColumn]);

  return xref ? decodeXref(xref) : null;
}

/**
 * For each pasted key, tell whether it is a BIM element or an asset, and find the other one of the pair.
 * One scan of the row per key: the link to the other one is a column of that row.
 */
function makeLinkFinder(facilityURN, region) {
  const defaultModelURN = getDefaultModelURN(facilityURN);

  return rows => Promise.all(rows.map(async ({ modelURN, key }) => {
    const flags = getElementFlags(key);
    const toLink = link => (link ? { modelURN: link.modelURN, key: link.elementKey } : null);

    try {
      if (flags === ElementFlags.GenericAsset) {
        const link = await readLink(modelURN, region, key, QC.BimElmOfAsset);

        return {
          kind: 'Asset',
          asset: { modelURN, key },
          bim: toLink(link),
          note: link === undefined ? 'The asset was not found in that model.' : undefined
        };
      }
      if (flags === ElementFlags.SimpleElement && modelURN !== defaultModelURN) {
        const link = await readLink(modelURN, region, key, QC.HostOfAsset);

        return {
          kind: 'BIM element',
          bim: { modelURN, key },
          asset: toLink(link),
          note: link === undefined ? 'The element was not found in that model.' : undefined
        };
      }
    } catch (error) {
      return { kind: describeKey(key), note: `Could not read the element: ${error.message}` };
    }
    return { kind: describeKey(key), note: 'Neither a BIM element nor an asset: there is no pair to look up.' };
  }));
}

/**
 * Convert an xref or a Tandem link to the element key (see the shared STUB), and in V3 also print the key of the
 * BIM element and the key of its asset, so the right one can be copied for the next test.
 */
export function getKeyFromXref(facilityURN, region, text) {
  return getKeyFromXrefWithLinks(facilityURN, region, text, makeLinkFinder(facilityURN, region));
}
