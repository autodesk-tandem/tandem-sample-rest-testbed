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
 * The write stubs (create, host, delete) follow the rules of js/stubs/v3/writeHelpers.js: the changes of existing
 * streams use the explicit POST /v3/.../mutate, and a host from a BIM model is followed to its asset first.
 *
 * Output goes to browser console - open DevTools to see results.
 */

import { tandemBaseURL, makeRequestOptionsPOST, getDefaultModelURN } from '../../api.js';
import { ColumnFamilies, ColumnNames, QC, ElementFlags, MutateActions, TC } from '../../../tandem/constants.js';
import { getElementFlags, makeXrefKey } from '../../../tandem/keys.js';
import { parseCommaList } from '../../utils.js';
import { firstValue, scanModel } from './helpers.js';
import {
  assertStreamKeys,
  findClassificationId,
  isV3Key,
  mutateV3,
  parseElementRefs,
  parseV3Keys,
  resolveAssetTargets
} from './writeHelpers.js';

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

/**
 * Find the element of the default model a stream is hosted by.
 * The host is a 24-byte key of the default model, or an xref / Tandem URL of a BIM element. A BIM element is
 * followed to its asset (created when it does not have one yet), because streams can only link to elements
 * of the default model.
 * @param {string} hostModelURN - model of a plain key, the default model when empty
 * @returns {Promise<string>} Key of the host in the default model
 */
export async function resolveHostKey(facilityURN, region, hostModelURN, hostKey) {
  const refs = parseElementRefs(hostKey, facilityURN, hostModelURN || undefined);

  if (refs.length !== 1) {
    throw new Error('A stream has one host: give one element.');
  }
  const [target] = await resolveAssetTargets(facilityURN, region, refs, {
    createMissing: true,
    description: 'REST TestBed: create asset to host a stream'
  });

  return target.targetKey;
}

/**
 * Create a new stream
 *
 * V3: the stream flag is ElementFlags.StreamV3. The host is linked with the Parent xref (QC.XParent) and
 * has to be an element of the default model (a BIM host is given by its xref and followed to its asset): an asset, or a room or level (Location). When the host is a room,
 * the room xref and the level of the room are set as well, like tutorial-rest/streams/create-stream.js does.
 * The classification is the classification id of the facility template (a name is looked up).
 */
export async function createStream(facilityURN, region, streamName, hostModelURN, hostKey, classification) {
  console.group("STUB: createStream()");

  try {
    const defaultModelURN = getDefaultModelURN(facilityURN);

    console.log("Default model:", defaultModelURN);
    console.log("Stream name:", streamName);

    if (!streamName) {
      throw new Error("Stream name is required");
    }
    const muts = [
      [MutateActions.Insert, ColumnFamilies.Standard, ColumnNames.Name, streamName],
      [MutateActions.Insert, ColumnFamilies.Standard, ColumnNames.ElementFlags, ElementFlags.StreamV3],
      [MutateActions.Insert, ColumnFamilies.Standard, ColumnNames.UniformatClass, "D7070"],
      [MutateActions.Insert, ColumnFamilies.Standard, ColumnNames.CategoryId, 5031], // Category for Streams
      [MutateActions.Insert, ColumnFamilies.Standard, ColumnNames.TandemCategory, TC.Sensors]
    ];

    if (classification) {
      const classId = await findClassificationId(facilityURN, region, classification);

      if (!classId) {
        throw new Error(`Could not find classification "${classification}" in the facility template.`);
      }
      muts.push([MutateActions.Insert, ColumnFamilies.Standard, ColumnNames.Classification, classId]);
    }

    if (hostKey) {
      console.log("Host model:", hostModelURN || "(default model)");
      console.log("Host key:", hostKey);
      const hostInDefaultModel = await resolveHostKey(facilityURN, region, hostModelURN, hostKey);
      const hostXref = makeXrefKey(defaultModelURN, hostInDefaultModel);

      muts.push([MutateActions.Insert, ColumnFamilies.Xrefs, ColumnNames.Parent, hostXref]);

      if (getElementFlags(hostInDefaultModel) === ElementFlags.Location) {
        const [host] = await scanModel(defaultModelURN, region, {
          keys: [hostInDefaultModel],
          qualifiedColumns: [QC.TandemCategory, QC.OTandemCategory, QC.Parent]
        });
        const category = firstValue(host?.[QC.OTandemCategory]) ?? firstValue(host?.[QC.TandemCategory]);
        const levelKey = firstValue(host?.[QC.Parent]);

        if (category === TC.Rooms) {
          muts.push([MutateActions.Insert, ColumnFamilies.Xrefs, ColumnNames.Rooms, hostXref]);
          if (levelKey) {
            muts.push([MutateActions.Insert, ColumnFamilies.Refs, ColumnNames.Level, levelKey]);
          }
        }
      }
    } else if (hostModelURN) {
      console.warn("A host model without a host element key - creating the stream without a host.");
    }

    console.log("Mutations:", muts);

    // Creating an element is the one write that is not a mutate: POST /create, default model only
    const requestPath = `${tandemBaseURL}/modeldata/${defaultModelURN}/create`;
    const bodyPayload = JSON.stringify({ muts, desc: "REST TestBed: created stream" });

    console.log("Request:", requestPath);
    const response = await fetch(requestPath, makeRequestOptionsPOST(bodyPayload, region));
    const text = await response.text();

    if (!response.ok) {
      throw new Error(`Create failed - HTTP ${response.status}: ${text || response.statusText}`);
    }
    const result = JSON.parse(text);

    console.log("Result from Tandem DB Server -->", result);

    // Reset stream secrets to make it functional
    if (result.key) {
      console.log("Resetting stream secret for new stream...");
      const resetPayload = JSON.stringify({ keys: [result.key], hardReset: true });
      const resetPath = `${tandemBaseURL}/models/${defaultModelURN}/resetstreamssecrets`;
      const resetResponse = await fetch(resetPath, makeRequestOptionsPOST(resetPayload, region));

      if (resetResponse.ok) {
        console.log(`✓ Stream secret generated for ${result.key}`);
      }
    }
    console.groupEnd();
    return result;
  } catch (error) {
    console.error('Error:', error.message);
    console.groupEnd();
    return null;
  }
}

/**
 * Assign a host to a stream
 */
export async function assignHostToStream(facilityURN, region, streamKey, hostModelURN, hostKey) {
  console.group("STUB: assignHostToStream()");

  try {
    const defaultModelURN = getDefaultModelURN(facilityURN);

    console.log("Default model:", defaultModelURN);
    console.log("Stream key:", streamKey);
    console.log("Host model:", hostModelURN || "(default model)");
    console.log("Host key:", hostKey);

    const [key] = parseV3Keys(streamKey, parseCommaList);

    assertStreamKeys([key]);
    const hostInDefaultModel = await resolveHostKey(facilityURN, region, hostModelURN, hostKey);
    const hostXref = makeXrefKey(defaultModelURN, hostInDefaultModel);
    const result = await mutateV3(facilityURN, region, [key],
      [[MutateActions.Insert, ColumnFamilies.Xrefs, ColumnNames.Parent, hostXref]],
      "REST TestBed: modified stream host");

    console.groupEnd();
    return result;
  } catch (error) {
    console.error('Error:', error.message);
    console.groupEnd();
    return null;
  }
}

/**
 * Remove host from streams
 */
export async function removeHostFromStream(facilityURN, region, streamKeys) {
  console.group("STUB: removeHostFromStream()");

  try {
    console.log("Default model:", getDefaultModelURN(facilityURN));
    const keys = parseV3Keys(streamKeys, parseCommaList);

    console.log("Stream keys:", keys);
    assertStreamKeys(keys);
    const result = await mutateV3(facilityURN, region, keys,
      keys.map(() => [MutateActions.Insert, ColumnFamilies.Xrefs, ColumnNames.Parent, ""]),
      "REST TestBed: removed stream host");

    console.groupEnd();
    return result;
  } catch (error) {
    console.error('Error:', error.message);
    console.groupEnd();
    return null;
  }
}

/**
 * Delete streams (soft delete)
 *
 * Every key is checked to be a stream first: MutateActions.DeleteRow works on any element, so a wrong
 * key would delete an asset.
 */
export async function deleteStreams(facilityURN, region, streamKeys) {
  console.group("STUB: deleteStreams()");

  try {
    console.log("Default model:", getDefaultModelURN(facilityURN));
    const keys = parseV3Keys(streamKeys, parseCommaList);

    console.log("Stream keys:", keys);
    assertStreamKeys(keys);
    // MutateActions.DeleteRow = soft delete
    const result = await mutateV3(facilityURN, region, keys,
      keys.map(() => [MutateActions.DeleteRow, "", "", ""]),
      "REST TestBed: deleted stream(s)");

    console.groupEnd();
    return result;
  } catch (error) {
    console.error('Error:', error.message);
    console.groupEnd();
    return null;
  }
}
