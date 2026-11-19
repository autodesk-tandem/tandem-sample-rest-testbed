/**
 * Stream STUB Functions - V3 schema
 *
 * The stream functions whose request shape depends on the schema version. Compared to V2:
 * - Streams are identified by ElementFlags.StreamV3 (0x01000000). In V2 the same flag value
 *   means a family type, and streams use 0x01000003.
 * - The flags are the first 4 bytes of the one and only 24-byte element key, so we read them
 *   with getElementFlags(key) instead of looking at a column.
 * - Everything the user defines lives in the default model, so there is only one model to scan.
 *
 * Output goes to browser console - open DevTools to see results.
 */

import { tandemBaseURL, makeRequestOptionsPOST, getDefaultModelURN } from '../../api.js';
import { ColumnFamilies, QC, ElementFlags } from '../../../tandem/constants.js';
import { getElementFlags } from '../../../tandem/keys.js';

/**
 * Scan for streams in the default model
 * NOTE: In V3 everything the user defines, including streams, lives in the default model
 */
export async function getStreamsFromDefaultModel(facilityURN, region) {
  console.group("STUB: getStreamsFromDefaultModel()");

  const defaultModelURN = getDefaultModelURN(facilityURN);
  console.log("Default model:", defaultModelURN);

  const requestPath = `${tandemBaseURL}/modeldata/${defaultModelURN}/scan`;
  console.log("Request:", requestPath);

  const bodyPayload = JSON.stringify({
    families: [ColumnFamilies.Standard],
    includeHistory: false
  });

  try {
    console.log("Body payload:", bodyPayload);
    const response = await fetch(requestPath, makeRequestOptionsPOST(bodyPayload, region));
    const result = await response.json();
    console.log("Result from Tandem DB Server -->", result);

    // The first item of the result is the version string, the rest are rows
    console.log("Filtering for type Stream (ElementFlags.StreamV3)...");
    const streams = result.filter(row =>
      typeof row === 'object' && row !== null && getElementFlags(row[QC.Key]) === ElementFlags.StreamV3
    );
    console.log(`Found ${streams.length} streams:`, streams);

    if (streams.length > 0) {
      console.table(streams.map(row => ({
        key: row[QC.Key],
        name: row[QC.OName]?.[0] ?? row[QC.Name]?.[0] ?? '',
        flags: '0x' + getElementFlags(row[QC.Key]).toString(16).padStart(8, '0')
      })));
    }

    console.groupEnd();
    return streams;
  } catch (error) {
    console.error('Error:', error);
    console.groupEnd();
    return [];
  }
}
