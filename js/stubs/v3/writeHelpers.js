/**
 * Helpers for the V3 WRITE stubs.
 *
 * The rules, taken from the Tandem server (dt-server) and from tutorial-rest/MIGRATION.md:
 *
 * 1. Two endpoints have an explicit `v3` in the path, the rest stay on `v1`:
 *      POST /v3/modeldata/{model}/mutate        strict rules, only updates existing elements
 *      POST /v3/modeldata/{model}/makeAssets    creates assets for BIM elements
 *    The `v1` mutate also works on a V3 facility but it is a compatibility path: it silently redirects
 *    writes of a BIM element to its asset and it can insert rows. The V3 stubs never use it.
 *
 * 2. WRITES ONLY HAPPEN IN THE DEFAULT MODEL. We never mutate a BIM (source) model. User-defined properties
 *    (`z:` family) and overrides (`n:!n`, `n:!v`, ...) are written to the element in the default model. The
 *    server does not stop an override being written to a BIM element, so the guards in this file do.
 *    The write STUBs have no model to choose: element keys are keys of the default model. To write to a BIM
 *    element, give its xref (the `selection` of a Tandem URL, see "Convert Xref or URL to Key"): the xref
 *    carries the model, and the element is followed to its asset.
 *
 * 3. A BIM element gets its own asset (a GenericAsset in the default model) with `makeAssets`.
 *    The asset copies the standard properties of the element and the two point at each other
 *    (QC.BimElmOfAsset on the asset, QC.HostOfAsset on the BIM element). Writes then go to the asset.
 *    `resolveAssetTargets()` does that, and logs every conversion.
 *
 * 4. Keys are 24 bytes (flags + id) and are never converted.
 */

import { tandemV3BaseURL, makeRequestOptionsPOST, getDefaultModelURN, getFacilityInlineTemplate } from '../../api.js';
import { ColumnFamilies, ColumnNames, ElementFlags, MutateActions, QC } from '../../../tandem/constants.js';
import { decodeXref, fromXrefKeyArray, getElementFlags, isLogicalElement, isValidElementKey } from '../../../tandem/keys.js';
import { parseTandemLink } from '../../utils.js';
import { describeKey, firstValue, scanModel } from './helpers.js';

/**
 * Request options for the two endpoints with an explicit v3 in the path.
 *
 * These endpoints are not behind the APS gateway (it answers 404 for /tandem/v3), so they are called on the
 * Tandem host (`tandemV3BaseURL` in config.js, e.g. https://tandem-stg.autodesk.com/api/v3). That host accepts the same
 * Bearer token, but its CORS preflight does not allow the Region header, so none is sent. The region is
 * resolved by the host.
 */
function makeV3RequestOptions(bodyPayload) {
  return makeRequestOptionsPOST(bodyPayload);
}

/**
 * Element types that can carry user-defined (`z:`) properties in V3, same list as the server.
 */
const CanHoldDtProperties = [
  ElementFlags.Location,
  ElementFlags.Room,
  ElementFlags.GenericAsset,
  ElementFlags.Ticket,
  ElementFlags.StreamV3
];

/**
 * Columns that only mean something on a ticket. Written to another element they are stored but nothing shows
 * them: the Tandem app lists only elements with the ticket flag (use the Create Ticket STUB).
 */
const TicketOnlyColumns = [ColumnNames.Priority, ColumnNames.OpenDate, ColumnNames.CloseDate];

/**
 * A V3 key is 24 bytes, that is 32 characters of unpadded base64.
 */
export function isV3Key(key) {
  return isValidElementKey(key) && key.length === 32;
}

/**
 * Keys typed by the user: split, trimmed, unique. Throws if one is not a 24-byte key.
 */
export function parseV3Keys(text, parseCommaList) {
  const keys = [...new Set(parseCommaList(text))];

  if (keys.length === 0) {
    throw new Error('No element keys specified.');
  }
  const invalid = keys.filter(key => !isV3Key(key));

  if (invalid.length > 0) {
    throw new Error(`Not a 24-byte V3 key: ${invalid.join(', ')}. V3 keys are never converted, use them as returned by a scan.`);
  }
  return keys;
}

const BASE64_PATTERN = /^[A-Za-z0-9_\-+/]+={0,2}$/;

/**
 * Elements typed or pasted by the user: split on commas and white space, unique.
 * Each item is one of
 * - a 24-byte key: an element of the default model (or of `plainKeyModelURN` when given)
 * - an xref: model + key, so it can also be an element of a BIM model
 * - a Tandem link: its `selection` parameter is an xref (a selection of several elements has several)
 *
 * @param {string} text
 * @param {string} facilityURN
 * @param {string} [plainKeyModelURN] - model of the plain keys, the default model when omitted
 * @returns {Array<{ modelURN: string, key: string }>}
 */
export function parseElementRefs(text, facilityURN, plainKeyModelURN = getDefaultModelURN(facilityURN)) {
  const refs = new Map();

  for (const pasted of String(text ?? '').split(/[\s,]+/).filter(Boolean)) {
    let token = pasted;

    if (/^https?:\/\//i.test(pasted)) {
      const { selection } = parseTandemLink(pasted);

      if (!selection) {
        throw new Error(`No "selection" parameter in link: ${pasted}`);
      }
      token = selection;
    }
    if (isV3Key(token)) {
      refs.set(`${plainKeyModelURN}|${token}`, { modelURN: plainKeyModelURN, key: token });
      continue;
    }
    let parsed = [[], []];

    try {
      parsed = BASE64_PATTERN.test(token) ? fromXrefKeyArray(token) : parsed;
    } catch {
      // not valid base64: reported below
    }
    const [modelKeys, elementKeys] = parsed;

    if (modelKeys.length === 0) {
      throw new Error(`Not a 24-byte key or an xref: ${pasted}. V3 keys are never converted, use them as returned by a scan.`);
    }
    modelKeys.forEach((modelKey, i) => {
      const modelURN = `urn:adsk.dtm:${modelKey}`;

      refs.set(`${modelURN}|${elementKeys[i]}`, { modelURN, key: elementKeys[i] });
    });
  }
  if (refs.size === 0) {
    throw new Error('No element keys specified.');
  }
  return [...refs.values()];
}

/**
 * Refuse to write to anything but the default model.
 */
export function assertDefaultModel(facilityURN, modelURN) {
  const defaultModelURN = getDefaultModelURN(facilityURN);

  if (modelURN !== defaultModelURN) {
    throw new Error(`Refusing to mutate ${modelURN}: in V3 all writes go to the default model (${defaultModelURN}).`);
  }
}

/**
 * Throw unless every key is a stream.
 */
export function assertStreamKeys(keys) {
  const notStreams = keys.filter(key => getElementFlags(key) !== ElementFlags.StreamV3);

  if (notStreams.length > 0) {
    throw new Error(`Not a stream (ElementFlags.StreamV3): ${notStreams.map(key => `${key} is ${describeKey(key)}`).join(', ')}`);
  }
}

/**
 * Send mutations to the default model with POST /v3/modeldata/{defaultModel}/mutate.
 * `keys` and `muts` are parallel arrays: muts[i] is applied to keys[i].
 *
 * Checked before anything is sent:
 * - the model is the default model (the server does not check this for overrides)
 * - every key is a 24-byte key (the V3 mutate only updates existing elements)
 * - `z:` properties only on types that can hold them
 * - no write to the source (`r:`) family
 * - the ticket columns (Priority, Open Date, Close Date) only on tickets
 */
export async function mutateV3(facilityURN, region, keys, muts, description) {
  const defaultModelURN = getDefaultModelURN(facilityURN);

  assertDefaultModel(facilityURN, defaultModelURN);
  if (keys.length !== muts.length) {
    throw new Error('keys and muts must have the same length');
  }
  keys.forEach((key, i) => {
    if (!isV3Key(key)) {
      throw new Error(`Not a 24-byte V3 key: ${key}`);
    }
    const [action, family, column] = muts[i];

    if (family === ColumnFamilies.Source) {
      throw new Error('The source family (r:) is read-only.');
    }
    if (family === ColumnFamilies.DtProperties && !CanHoldDtProperties.includes(getElementFlags(key))) {
      throw new Error(`${describeKey(key)} cannot hold user-defined properties (${key}).`);
    }
    if (family === ColumnFamilies.Standard && TicketOnlyColumns.includes(column)
      && getElementFlags(key) !== ElementFlags.Ticket) {
      throw new Error(`${family}:${column} (Priority, Open Date, Close Date) only applies to tickets, but ${key} is ${describeKey(key)}. `
        + 'Setting it does not make an element a ticket: use Create Ticket.');
    }
    if (!Object.values(MutateActions).includes(action)) {
      throw new Error(`Unknown mutate action: ${action}`);
    }
  });

  const requestPath = `${tandemV3BaseURL}/modeldata/${defaultModelURN}/mutate`;
  const bodyPayload = JSON.stringify({ keys, muts, desc: description });

  console.log("Request (explicit v3 in the path):", requestPath);
  console.log("Payload:", bodyPayload);

  const response = await fetch(requestPath, makeV3RequestOptions(bodyPayload));
  const text = await response.text();

  if (!response.ok) {
    throw new Error(`Mutate failed - HTTP ${response.status}: ${text || response.statusText}`);
  }
  const result = text ? JSON.parse(text) : null;

  console.log("Result from Tandem DB Server -->", result);
  return result;
}

/**
 * Create assets for BIM elements with POST /v3/modeldata/{bimModel}/makeAssets.
 * @returns {Promise<Array<string>>} Keys of the new assets (default model), in the order of `keys`
 */
async function makeAssetsV3(bimModelURN, region, keys, description) {
  const requestPath = `${tandemV3BaseURL}/modeldata/${bimModelURN}/makeAssets`;
  const bodyPayload = JSON.stringify({ keys, description });

  console.log("Request (explicit v3 in the path):", requestPath);
  console.log("Payload:", bodyPayload);

  const response = await fetch(requestPath, makeV3RequestOptions(bodyPayload));

  if (response.status === 204) {
    throw new Error('makeAssets created no assets (HTTP 204).');
  }
  const text = await response.text();

  if (!response.ok) {
    throw new Error(`makeAssets failed - HTTP ${response.status}: ${text || response.statusText}`);
  }
  const result = JSON.parse(text);

  console.log("Result from Tandem DB Server -->", result);
  if (!Array.isArray(result.keys) || result.keys.length !== keys.length) {
    throw new Error('makeAssets returned an unexpected number of keys.');
  }
  return result.keys;
}

/**
 * Find the elements to write to for the given elements. The result is in the order of `refs`.
 *
 * - Elements of the default model are used as they are (they must exist: the V3 mutate only updates).
 * - Elements of a BIM model are never written to. Each one is followed to its asset in the default model
 *   (QC.HostOfAsset). With `createMissing` an element without asset is first converted to an asset
 *   (makeAssets). The conversion is logged, because it is a change of the facility.
 *
 * @param {string} facilityURN
 * @param {string} region
 * @param {Array<{ modelURN: string, key: string }>} refs - see parseElementRefs()
 * @param {{ createMissing: boolean, description?: string }} options
 * @returns {Promise<Array<{ sourceModelURN: string, sourceKey: string, targetKey: string|null, status: string }>>}
 */
export async function resolveAssetTargets(facilityURN, region, refs, { createMissing, description }) {
  const defaultModelURN = getDefaultModelURN(facilityURN);
  const refsByModel = new Map();

  for (const ref of refs) {
    refsByModel.set(ref.modelURN, [...(refsByModel.get(ref.modelURN) ?? []), ref.key]);
  }
  const resolved = new Map(); // `${modelURN}|${key}` -> target

  for (const [modelURN, keys] of refsByModel) {
    const targets = modelURN === defaultModelURN
      ? await checkDefaultModelElements(region, modelURN, keys)
      : await followToAssets(facilityURN, region, modelURN, keys, createMissing, description);

    targets.forEach(target => resolved.set(`${modelURN}|${target.sourceKey}`, target));
  }
  const targets = refs.map(ref => resolved.get(`${ref.modelURN}|${ref.key}`));

  if (refsByModel.size > 1 || !refsByModel.has(defaultModelURN)) {
    console.table(targets.map(target => ({
      element: target.sourceKey,
      model: target.sourceModelURN === defaultModelURN ? 'Default Model' : target.sourceModelURN,
      assetInDefaultModel: target.targetKey,
      status: target.status
    })));
  }
  return targets;
}

/**
 * Elements of the default model are written to as they are, once we know they exist.
 */
async function checkDefaultModelElements(region, defaultModelURN, keys) {
  const rows = await scanModel(defaultModelURN, region, { keys, families: [ColumnFamilies.Standard] });
  const found = new Set(rows.map(row => row[QC.Key]));
  const missing = keys.filter(key => !found.has(key));

  if (missing.length > 0) {
    throw new Error(`Not found in the default model: ${missing.join(', ')}. Writes only happen in the default model. `
      + `For a BIM element give its xref (the selection of a Tandem URL), it is followed to its asset.`);
  }
  return keys.map(key => ({ sourceModelURN: defaultModelURN, sourceKey: key, targetKey: key, status: 'default model element' }));
}

/**
 * BIM elements: follow each one to its asset, converting it to an asset when needed.
 */
async function followToAssets(facilityURN, region, modelURN, keys, createMissing, description) {
  const defaultModelURN = getDefaultModelURN(facilityURN);

  console.group(`Elements of a BIM model (${modelURN}): follow them to their assets`);
  console.log("BIM elements are never mutated in V3. User-defined properties and overrides live on the asset in the default model.");

  const rows = await scanModel(modelURN, region, {
    keys,
    families: [ColumnFamilies.Standard, ColumnFamilies.Xrefs]
  });
  const rowByKey = new Map(rows.map(row => [row[QC.Key], row]));
  const targets = [];
  const toConvert = [];

  for (const key of keys) {
    const row = rowByKey.get(key);

    if (!row) {
      throw new Error(`Element ${key} was not found in ${modelURN}.`);
    }
    if (isLogicalElement(getElementFlags(key))) {
      throw new Error(`${describeKey(key)} cannot have an asset (${key}).`);
    }
    const hostOfAsset = firstValue(row[QC.HostOfAsset]);
    const decoded = hostOfAsset ? decodeXref(hostOfAsset) : null;

    if (decoded) {
      if (decoded.modelURN !== defaultModelURN) {
        throw new Error(`The asset of ${key} is not in the default model (${decoded.modelURN}).`);
      }
      targets.push({ sourceModelURN: modelURN, sourceKey: key, targetKey: decoded.elementKey, status: 'existing asset' });
    } else {
      const target = { sourceModelURN: modelURN, sourceKey: key, targetKey: null, status: 'no asset' };

      targets.push(target);
      toConvert.push(target);
    }
  }

  if (toConvert.length > 0 && createMissing) {
    console.warn(`⚙ ${toConvert.length} BIM element(s) have no asset yet (QC.HostOfAsset is empty). Converting them to assets with makeAssets...`);
    const assetKeys = await makeAssetsV3(modelURN, region, toConvert.map(t => t.sourceKey), description);

    toConvert.forEach((target, i) => {
      target.targetKey = assetKeys[i];
      target.status = 'ASSET CREATED';
      console.log(`🔁 BIM element ${target.sourceKey} was turned into asset ${target.targetKey} (new GenericAsset in the default model)`);
    });
  }
  console.groupEnd();
  return targets;
}

/**
 * Classification id (the first column of the template's classification rows) of a classification
 * given by its name or by its id. The classification override (n:!v) stores the id.
 * @returns {Promise<string|null>}
 */
export async function findClassificationId(facilityURN, region, nameOrId) {
  const template = await getFacilityInlineTemplate(facilityURN, region);
  const rows = template?.classification?.rows ?? [];
  const row = rows.find(r => r[0] === nameOrId) ?? rows.find(r => r[1] === nameOrId);

  if (!row) {
    return null;
  }
  console.log(`Classification "${row[1]}" has id "${row[0]}"`);
  return row[0];
}
