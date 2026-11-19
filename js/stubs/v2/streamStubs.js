/**
 * Stream STUB Functions - V2 schema
 *
 * The stream functions whose request shape depends on the schema version:
 * - Streams are found by their element flag, ElementFlags.StreamV2 (0x01000003)
 * - A host is linked with the Parent xref (QC.XParent), the element key of a stream is 24 bytes
 *   long while scan rows return 20-byte short keys
 *
 * Output goes to browser console - open DevTools to see results.
 */

import { tandemBaseURL, makeRequestOptionsPOST, getDefaultModelURN } from '../../api.js';
import { ColumnFamilies, ColumnNames, QC, ElementFlags, MutateActions } from '../../../tandem/constants.js';
import { makeXrefKey } from '../../../tandem/keys.js';
import { parseCommaList } from '../../utils.js';

/**
 * Scan for streams in the default model
 * NOTE: Streams can only exist in the default model
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

    // Filter for Stream type
    console.log("Filtering for type Stream...");
    const streams = result.filter(row => row[QC.ElementFlags]?.[0] === ElementFlags.StreamV2);
    console.log(`Found ${streams.length} streams:`, streams);
    
    console.groupEnd();
    return streams;
  } catch (error) {
    console.error('Error:', error);
    console.groupEnd();
    return [];
  }
}

/**
 * Create a new stream
 */
export async function createStream(facilityURN, region, streamName, hostModelURN, hostKey, classification) {
  console.group("STUB: createStream()");

  const defaultModelURN = getDefaultModelURN(facilityURN);
  console.log("Default model:", defaultModelURN);
  console.log("Stream name:", streamName);

  if (!streamName) {
    console.error("ERROR: Stream name is required");
    console.groupEnd();
    return null;
  }

  // Build mutations array
  const mutsArray = [
    [MutateActions.Insert, ColumnFamilies.Standard, ColumnNames.Name, streamName],
    [MutateActions.Insert, ColumnFamilies.Standard, ColumnNames.ElementFlags, ElementFlags.StreamV2],
    [MutateActions.Insert, ColumnFamilies.Standard, ColumnNames.UniformatClass, "D7070"],
    [MutateActions.Insert, ColumnFamilies.Standard, ColumnNames.CategoryId, 5031], // Category for Streams
  ];

  // Add classification if provided
  if (classification) {
    console.log("Classification:", classification);
    mutsArray.push([MutateActions.Insert, ColumnFamilies.Standard, ColumnNames.Classification, classification]);
  }

  // Add host if provided
  if (hostModelURN && hostKey) {
    console.log("Host model:", hostModelURN);
    console.log("Host key:", hostKey);
    const hostXref = makeXrefKey(hostModelURN, hostKey);
    mutsArray.push([MutateActions.Insert, ColumnFamilies.Xrefs, ColumnNames.Parent, hostXref]);
  }

  const bodyPayload = JSON.stringify({
    muts: mutsArray,
    desc: "REST TestBed: created stream"
  });

  console.log("Mutations:", mutsArray);

  const requestPath = `${tandemBaseURL}/modeldata/${defaultModelURN}/create`;
  console.log("Request:", requestPath);

  try {
    const response = await fetch(requestPath, makeRequestOptionsPOST(bodyPayload, region));
    const result = await response.json();
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
    console.error('Error:', error);
    console.groupEnd();
    return null;
  }
}

/**
 * Assign a host to a stream
 */
export async function assignHostToStream(facilityURN, region, streamKey, hostModelURN, hostKey) {
  console.group("STUB: assignHostToStream()");

  const defaultModelURN = getDefaultModelURN(facilityURN);
  console.log("Default model:", defaultModelURN);
  console.log("Stream key:", streamKey);
  console.log("Host model:", hostModelURN);
  console.log("Host key:", hostKey);

  const hostXref = makeXrefKey(hostModelURN, hostKey);
  const mutsArray = [
    [MutateActions.Insert, ColumnFamilies.Xrefs, ColumnNames.Parent, hostXref]
  ];

  const bodyPayload = JSON.stringify({
    keys: [streamKey],
    muts: mutsArray,
    desc: "REST TestBed: modified stream host"
  });

  console.log("Payload:", bodyPayload);

  const requestPath = `${tandemBaseURL}/modeldata/${defaultModelURN}/mutate`;
  console.log("Request:", requestPath);

  try {
    const response = await fetch(requestPath, makeRequestOptionsPOST(bodyPayload, region));
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
 * Remove host from streams
 */
export async function removeHostFromStream(facilityURN, region, streamKeys) {
  console.group("STUB: removeHostFromStream()");

  const defaultModelURN = getDefaultModelURN(facilityURN);
  console.log("Default model:", defaultModelURN);

  const streamKeysArray = parseCommaList(streamKeys);
  console.log("Stream keys:", streamKeysArray);

  if (streamKeysArray.length === 0) {
    console.warn("Please enter at least one stream key (comma-separated).");
    console.groupEnd();
    return null;
  }

  // Create mutations - one per stream
  const mutsArray = streamKeysArray.map(() => 
    [MutateActions.Insert, ColumnFamilies.Xrefs, ColumnNames.Parent, ""]
  );

  const bodyPayload = JSON.stringify({
    keys: streamKeysArray,
    muts: mutsArray,
    desc: "REST TestBed: removed stream host"
  });

  const requestPath = `${tandemBaseURL}/modeldata/${defaultModelURN}/mutate`;
  console.log("Request:", requestPath);

  try {
    const response = await fetch(requestPath, makeRequestOptionsPOST(bodyPayload, region));
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
 * Delete streams (soft delete)
 */
export async function deleteStreams(facilityURN, region, streamKeys) {
  console.group("STUB: deleteStreams()");

  const defaultModelURN = getDefaultModelURN(facilityURN);
  console.log("Default model:", defaultModelURN);

  const streamKeysArray = parseCommaList(streamKeys);
  console.log("Stream keys:", streamKeysArray);

  if (streamKeysArray.length === 0) {
    console.warn("Please enter at least one stream key (comma-separated).");
    console.groupEnd();
    return null;
  }

  // Create mutations - MutateActions.DeleteRow = soft delete
  const mutsArray = streamKeysArray.map(() => [MutateActions.DeleteRow, "", "", ""]);

  const bodyPayload = JSON.stringify({
    keys: streamKeysArray,
    muts: mutsArray,
    desc: "REST TestBed: deleted stream(s)"
  });

  const requestPath = `${tandemBaseURL}/modeldata/${defaultModelURN}/mutate`;
  console.log("Request:", requestPath);

  try {
    const response = await fetch(requestPath, makeRequestOptionsPOST(bodyPayload, region));
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
