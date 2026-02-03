/**
 * Stream STUB Functions
 * 
 * These functions demonstrate Tandem Stream API endpoints.
 * Streams are IoT data points that can store timeseries data.
 * 
 * Output goes to browser console - open DevTools to see results.
 */

import { tandemBaseURL, makeRequestOptionsGET, makeRequestOptionsPOST, getDefaultModelURN } from '../api.js';
import { ColumnFamilies, ColumnNames, QC, ElementFlags, MutateActions } from '../../tandem/constants.js';
import { makeXrefKey } from '../../tandem/keys.js';

/**
 * Helper: Pretty print stream timeseries values
 */
function prettyPrintStreamValues(streamDataObj) {
  for (const [propKey, value] of Object.entries(streamDataObj)) {
    let timeseriesData = [];
    for (const [timestampKey, value2] of Object.entries(value)) {
      const timestamp = parseInt(timestampKey);
      const date = new Date(timestamp);
      timeseriesData.push({ propId: propKey, value: value2, timestamp: timestamp, date: date.toString() });
    }
    if (timeseriesData.length) {
      console.table(timeseriesData);
    }
  }
}

/**
 * Helper: Pretty print last seen stream values
 */
function prettyPrintLastSeenStreamValues(streamDataObj) {
  let timeseriesData = [];
  for (const [streamKey, streamValue] of Object.entries(streamDataObj)) {
    for (const [propKey, propValues] of Object.entries(streamValue)) {
      for (const [timestampKey, propVal] of Object.entries(propValues)) {
        const timestamp = parseInt(timestampKey);
        const date = new Date(timestamp);
        timeseriesData.push({ streamKey: streamKey, propId: propKey, value: propVal, timestamp: timestamp, date: date.toString() });
      }
    }
  }
  if (timeseriesData.length) {
    console.table(timeseriesData);
  }
}

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
    const streams = result.filter(row => row[QC.ElementFlags]?.[0] === ElementFlags.Stream);
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
 * Get secrets for the given streams
 */
export async function getStreamSecrets(facilityURN, region, streamKeys) {
  console.group("STUB: getStreamSecrets()");

  const defaultModelURN = getDefaultModelURN(facilityURN);
  console.log("Default model:", defaultModelURN);

  const streamKeysArray = streamKeys.split(',').map(k => k.trim()).filter(k => k);
  console.log("Stream keys:", streamKeysArray);

  const bodyPayload = JSON.stringify({ keys: streamKeysArray });
  const requestPath = `${tandemBaseURL}/models/${defaultModelURN}/getstreamssecrets`;
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
 * Reset secrets for the given streams
 */
export async function resetStreamSecrets(facilityURN, region, streamKeys) {
  console.group("STUB: resetStreamSecrets()");

  const defaultModelURN = getDefaultModelURN(facilityURN);
  console.log("Default model:", defaultModelURN);

  const streamKeysArray = streamKeys.split(',').map(k => k.trim()).filter(k => k);
  console.log("Stream keys:", streamKeysArray);

  const bodyPayload = JSON.stringify({ keys: streamKeysArray, hardReset: true });
  const requestPath = `${tandemBaseURL}/models/${defaultModelURN}/resetstreamssecrets`;
  console.log("Request:", requestPath);

  try {
    const response = await fetch(requestPath, makeRequestOptionsPOST(bodyPayload, region));
    if (response.ok) {
      console.log("✓ Stream secrets have been reset");
    } else {
      console.log("Response status:", response.status);
    }
    console.groupEnd();
    return response.ok;
  } catch (error) {
    console.error('Error:', error);
    console.groupEnd();
    return false;
  }
}

/**
 * Get stream values for a time range
 * @param {number} daysBack - Number of days back (0 = All Time)
 */
export async function getStreamValues(facilityURN, region, streamKey, daysBack) {
  const timeLabel = daysBack === 0 ? 'All Time' : `${daysBack} days`;
  console.group(`STUB: getStreamValues(${timeLabel})`);

  const defaultModelURN = getDefaultModelURN(facilityURN);
  console.log("Default model:", defaultModelURN);
  console.log("Stream key:", streamKey);

  const dateNow = new Date();
  const timestampEnd = dateNow.getTime();
  
  let requestPath;
  if (daysBack === 0) {
    // All Time - don't specify from/to parameters
    console.log("Time range: All Time (no date filter)");
    requestPath = `${tandemBaseURL}/timeseries/models/${defaultModelURN}/streams/${streamKey}`;
  } else {
    const dateStart = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000);
    const timestampStart = dateStart.getTime();
    console.log("Time range:", dateStart.toISOString(), "to", dateNow.toISOString());
    requestPath = `${tandemBaseURL}/timeseries/models/${defaultModelURN}/streams/${streamKey}?from=${timestampStart}&to=${timestampEnd}`;
  }
  
  console.log("NOTE: API allows any time range, plus options: &limit=N, &sort=asc|desc, &substream=XYZ");
  console.log("Request:", requestPath);

  try {
    const response = await fetch(requestPath, makeRequestOptionsGET(region));
    const result = await response.json();
    console.log("Result from Tandem DB Server -->", result);
    prettyPrintStreamValues(result);
    console.groupEnd();
    return result;
  } catch (error) {
    console.error('Error:', error);
    console.groupEnd();
    return null;
  }
}

/**
 * Get last seen values for streams
 */
export async function getLastSeenStreamValues(facilityURN, region, streamKeys) {
  console.group("STUB: getLastSeenStreamValues()");

  const defaultModelURN = getDefaultModelURN(facilityURN);
  console.log("Default model:", defaultModelURN);

  const streamKeysArray = streamKeys.split(',').map(k => k.trim()).filter(k => k);
  console.log("Stream keys:", streamKeysArray);

  const bodyPayload = JSON.stringify({ keys: streamKeysArray });
  const requestPath = `${tandemBaseURL}/timeseries/models/${defaultModelURN}/streams`;
  console.log("Request:", requestPath);

  try {
    const response = await fetch(requestPath, makeRequestOptionsPOST(bodyPayload, region));
    const result = await response.json();
    console.log("Result from Tandem DB Server -->", result);
    prettyPrintLastSeenStreamValues(result);
    console.groupEnd();
    return result;
  } catch (error) {
    console.error('Error:', error);
    console.groupEnd();
    return null;
  }
}

/**
 * Post new values to a stream
 */
export async function postStreamValues(facilityURN, region, streamKey, valuesJson) {
  console.group("STUB: postStreamValues()");

  const defaultModelURN = getDefaultModelURN(facilityURN);
  console.log("Default model:", defaultModelURN);
  console.log("Stream key:", streamKey);
  console.log("NOTE: Values need configured parameters in Tandem to be stored long-term");

  let bodyPayload;
  try {
    // If it's valid JSON, use it directly
    bodyPayload = JSON.parse(valuesJson);
  } catch {
    // Otherwise, treat as simple key=value pairs
    console.log("Using provided values as-is");
    bodyPayload = valuesJson;
  }
  
  // Add timestamp if not provided
  if (!bodyPayload.ts) {
    bodyPayload.ts = Date.now();
  }
  
  console.log("Payload:", bodyPayload);

  const requestPath = `${tandemBaseURL}/timeseries/models/${defaultModelURN}/streams/${streamKey}`;
  console.log("Request:", requestPath);

  try {
    const response = await fetch(requestPath, makeRequestOptionsPOST(JSON.stringify(bodyPayload), region));
    if (response.ok) {
      console.log("✓ Values posted successfully");
    } else {
      console.log("Response status:", response.status);
    }
    console.groupEnd();
    return response.ok;
  } catch (error) {
    console.error('Error:', error);
    console.groupEnd();
    return false;
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
    [MutateActions.Insert, ColumnFamilies.Standard, ColumnNames.ElementFlags, ElementFlags.Stream],
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

  const streamKeysArray = streamKeys.split(',').map(k => k.trim()).filter(k => k);
  console.log("Stream keys:", streamKeysArray);

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

  const streamKeysArray = streamKeys.split(',').map(k => k.trim()).filter(k => k);
  console.log("Stream keys:", streamKeysArray);

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

