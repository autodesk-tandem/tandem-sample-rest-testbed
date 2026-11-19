/**
 * Helpers shared by the V3 STUB functions.
 *
 * What V3 changes compared with V2:
 * - All logical elements (assets, levels, rooms, streams, tickets, systems) live in the default model.
 *   BIM models only hold the BIM elements.
 * - Levels and rooms are `Location` elements, told apart by their Tandem category (TC.Levels / TC.Rooms).
 *   A room points to its level through QC.Parent.
 * - Assets are `GenericAsset` elements with their own element id. They point to the BIM element they
 *   came from with QC.BimElmOfAsset and to their level or room with QC.Location.
 * - There is one kind of key: the 24-byte key whose first 4 bytes are the element flags.
 *   Keys are used exactly as they come back from the server.
 */

import { tandemBaseURL, makeRequestOptionsPOST } from '../../api.js';
import { ElementFlags, QC } from '../../../tandem/constants.js';
import { getElementFlags } from '../../../tandem/keys.js';

const FlagNames = {
  [ElementFlags.SimpleElement]: 'SimpleElement',
  [ElementFlags.Room]: 'Room',
  [ElementFlags.Location]: 'Location',
  [ElementFlags.FamilyTypeV3]: 'FamilyType',
  [ElementFlags.Level]: 'Level',
  [ElementFlags.DocumentRoot]: 'DocumentRoot',
  [ElementFlags.StreamV3]: 'Stream',
  [ElementFlags.System]: 'System',
  [ElementFlags.GenericAsset]: 'GenericAsset',
  [ElementFlags.Collection]: 'Collection',
  [ElementFlags.Ticket]: 'Ticket'
};

/**
 * Describe the type of an element by the flags in the first 4 bytes of its key.
 * @param {string} key - 24-byte element key
 * @returns {string} e.g. "GenericAsset (0x01000005)"
 */
export function describeKey(key) {
  const flags = getElementFlags(key);
  const name = FlagNames[flags] ?? 'Unknown';

  return `${name} (0x${flags.toString(16).padStart(8, '0')})`;
}

/**
 * Value of a column that may or may not come wrapped in an array.
 */
export function firstValue(value) {
  return Array.isArray(value) ? value[0] : value;
}

/**
 * Name of an element: the override column wins over the standard one.
 */
export function nameOf(row, fallback = 'Unnamed') {
  return firstValue(row[QC.OName]) ?? firstValue(row[QC.Name]) ?? fallback;
}

/**
 * Tandem category of a Location element (TC.Levels / TC.Rooms), override first.
 */
export function tandemCategoryOf(row) {
  return firstValue(row[QC.OTandemCategory]) ?? firstValue(row[QC.TandemCategory]);
}

/**
 * A row is deleted when its Status/Deleted timestamp is set. The override column wins,
 * regardless of its value, so an element can be un-deleted by clearing the override.
 * Ask the scan for QC.Deleted and QC.ODeleted (or the Status family) to use this.
 */
export function isDeleted(row) {
  const override = firstValue(row[QC.ODeleted]);

  if (override !== undefined && override !== null) {
    return Number(override) > 0;
  }
  const value = firstValue(row[QC.Deleted]);

  return value !== undefined && value !== null && Number(value) !== 0;
}

/**
 * Scan a model and return its rows (the leading version string is dropped).
 * The request and the raw result are logged, like in every STUB.
 *
 * @param {string} modelURN
 * @param {string} region
 * @param {object} scanOptions - families / qualifiedColumns / keys / includeDeleted
 * @returns {Promise<Array<object>>}
 */
export async function scanModel(modelURN, region, scanOptions) {
  const requestPath = `${tandemBaseURL}/modeldata/${modelURN}/scan`;
  const bodyPayload = JSON.stringify({ includeHistory: false, ...scanOptions });

  console.log(requestPath);
  console.log("Body payload:", bodyPayload);

  const response = await fetch(requestPath, makeRequestOptionsPOST(bodyPayload, region));

  if (!response.ok) {
    throw new Error(`Scan of ${modelURN} failed - HTTP ${response.status}: ${response.statusText}`);
  }
  const data = await response.json();

  console.log("Result from Tandem DB Server -->", data);
  return data.filter(item => typeof item === 'object' && item !== null && item[QC.Key]);
}
