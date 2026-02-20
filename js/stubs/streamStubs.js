/**
 * Stream STUB Functions
 * 
 * These functions demonstrate Tandem Stream API endpoints.
 * Streams are IoT data points that can store timeseries data.
 * 
 * Output goes to browser console - open DevTools to see results.
 */

import { tandemBaseURL, makeRequestOptionsGET, makeRequestOptionsPOST, makeRequestOptionsPUT, makeRequestOptionsPATCH, getDefaultModelURN } from '../api.js';
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
 * Get stream configurations for all streams in the default model
 *
 * A "stream configuration" is separate from the stream element itself. It lives in a
 * dedicated storage column (Settings) and controls how the server interprets incoming
 * IoT data, how long it is retained, and when alerts should fire.
 *
 * Only streams that have been configured will appear in this response. Streams that
 * have never been configured are valid streams but will be absent from the result.
 *
 * Response shape (array of StreamConfig objects):
 * [
 *   {
 *     "elementId": "<full base64 stream key>",
 *     "streamSettings": {
 *       "sourceMapping": {                       // maps parameter IDs to JSON paths in the ingest payload
 *         "<familyId:paramId>": {
 *           "path": "temperature",              // dot-notation path into the POST body (e.g. "sensors.0.temp")
 *           "ts": "timestamp"                   // optional: path to a timestamp field in the payload
 *         }
 *       },
 *       "thresholds": {                          // optional: alert thresholds per parameter
 *         "<familyId:paramId>": {
 *           "lower": { "warn": 18, "alert": 15 },
 *           "upper": { "warn": 23, "alert": 25 },
 *           "alertDefinition": { "evaluationPeriodSec": 300 }  // optional: debounce window
 *         }
 *       },
 *       "frequency": 60000,                      // optional: storage granularity in ms (default: 60000)
 *       "retentionPeriod": 365,                  // optional: data retention in days
 *       "offlineTimeout": 3600                   // optional: seconds before stream is considered offline
 *     }
 *   }
 * ]
 *
 * NOTE: "elementId" uses the full (long) base64 key encoding, not the short key used
 * elsewhere in the API. When passing a stream key to PUT /stream-configs/{elementID}
 * the server will accept either the short or long form.
 */
export async function getStreamConfigs(facilityURN, region) {
  console.group("STUB: getStreamConfigs()");

  const defaultModelURN = getDefaultModelURN(facilityURN);
  console.log("Default model:", defaultModelURN);

  const requestPath = `${tandemBaseURL}/models/${defaultModelURN}/stream-configs`;
  console.log("Request:", requestPath);

  try {
    const response = await fetch(requestPath, makeRequestOptionsGET(region));
    const result = await response.json();
    console.log("Result from Tandem DB Server -->", result);
    if (Array.isArray(result)) {
      console.log(`Found ${result.length} stream config(s)`);
      console.table(result.map(c => ({ elementId: c.elementId, hasSettings: !!c.streamSettings })));
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
 * Get stream configuration for a single stream
 *
 * Returns the same StreamConfig shape as getStreamConfigs() but for one stream only.
 * The stream key can be either the short key (as returned by getStreamsFromDefaultModel)
 * or the full base64 key — the server normalizes it.
 *
 * Returns HTTP 404 if the stream exists but has never been configured.
 */
export async function getStreamConfig(facilityURN, region, streamKey) {
  console.group("STUB: getStreamConfig()");

  const defaultModelURN = getDefaultModelURN(facilityURN);
  console.log("Default model:", defaultModelURN);
  console.log("Stream key:", streamKey);

  const requestPath = `${tandemBaseURL}/models/${defaultModelURN}/stream-configs/${streamKey}`;
  console.log("Request:", requestPath);

  try {
    const response = await fetch(requestPath, makeRequestOptionsGET(region));
    const result = await response.json();
    console.log("Result from Tandem DB Server -->", result);
    if (result?.streamSettings) {
      console.log("Stream settings:", result.streamSettings);
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
 * Save (replace) the stream configuration for a single stream
 * [PUT /models/{modelURN}/stream-configs/{streamKey}]
 *
 * IMPORTANT — FULL REPLACE, NOT PARTIAL UPDATE:
 * Despite using PUT semantics, the server writes the entire streamSettings object as
 * one atomic upsert. Any field you omit from the payload will be erased. Always read
 * the current config first (getStreamConfig), merge your changes, then PUT the result.
 *
 * PUT vs. PATCH — what is the actual difference?
 *   PUT  → targets ONE stream (key in the URL); body wraps a single "streamConfig" object.
 *   PATCH → targets MULTIPLE streams in one call; body wraps a "streamConfigs" array.
 *   Internally the server routes both to the same UpdateStreamConfigs function, so the
 *   capability (which fields you can set) is identical. Choose PUT for single-stream
 *   updates and PATCH when you need to update several streams atomically.
 *
 * Full streamSettings schema:
 * {
 *   "sourceMapping": {                       // maps ingest payload fields → Tandem parameters
 *     "<familyId:paramId>": {
 *       "path": "temperature",              // JSON path into the POST /streams/{key} body
 *       "ts": "timestamp"                   // optional: path to a timestamp field
 *     }
 *   },
 *   "thresholds": {                          // optional: alert thresholds per parameter
 *     "<familyId:paramId>": {
 *       "lower": { "warn": 18, "alert": 15 },
 *       "upper": { "warn": 23, "alert": 25 },
 *       "alertDefinition": { "evaluationPeriodSec": 300 }
 *     }
 *   },
 *   "frequency": 60000,                      // optional: storage granularity in ms
 *                                            //   allowed values: 60000, 300000, 900000,
 *                                            //   1800000, 3600000, 7200000, 21600000,
 *                                            //   43200000, 86400000
 *                                            //   NOTE: frequency can only be decreased, never increased
 *   "retentionPeriod": 365,                  // optional: data retention in days; must be >= frequency
 *   "offlineTimeout": 3600                   // optional: seconds before stream is marked offline
 * }
 *
 * Full request body shape:
 * {
 *   "description": "human-readable change description",  // optional, defaults to "stream-config-update"
 *   "streamConfig": {
 *     "streamSettings": { ... }             // see schema above
 *   }
 * }
 *
 * @param {string} streamKey    - Short or full base64 key of the stream to configure
 * @param {string} settingsJson - Accepts two shapes:
 *   (a) Just the streamSettings object (sourceMapping, thresholds, etc. at the top level)
 *   (b) The full StreamConfig response from GET /stream-configs/{key}
 *       (has "elementId" + "streamSettings" at the top level)
 *   Shape (b) lets you copy the GET response directly into this field, edit it, and PUT
 *   it back without having to manually unwrap the nesting.
 */
export async function saveStreamConfig(facilityURN, region, streamKey, settingsJson) {
  console.group("STUB: saveStreamConfig()");

  const defaultModelURN = getDefaultModelURN(facilityURN);
  console.log("Default model:", defaultModelURN);
  console.log("Stream key:", streamKey);

  let parsed;
  try {
    parsed = JSON.parse(settingsJson);
  } catch {
    console.error("ERROR: settingsJson is not valid JSON");
    console.groupEnd();
    return null;
  }

  // Accept two input shapes:
  //   1. The raw streamSettings object (sourceMapping, thresholds, etc. at the top level)
  //   2. The full StreamConfig object returned by GET /stream-configs/{key}
  //      (has "elementId" + "streamSettings" at the top level)
  // This lets you copy the GET response directly into this field, edit it, and PUT it back.
  let streamSettings;
  if (parsed.streamSettings !== undefined) {
    console.log("Detected full StreamConfig shape — extracting streamSettings");
    streamSettings = parsed.streamSettings;
  } else {
    streamSettings = parsed;
  }

  const bodyPayload = JSON.stringify({
    description: "REST TestBed: save stream config",
    streamConfig: { streamSettings }
  });

  console.log("Body payload:", bodyPayload);

  const requestPath = `${tandemBaseURL}/models/${defaultModelURN}/stream-configs/${streamKey}`;
  console.log("Request:", requestPath);

  try {
    const response = await fetch(requestPath, makeRequestOptionsPUT(bodyPayload, region));
    if (response.ok) {
      console.log("✓ Stream config saved successfully");
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
 * Batch-update stream configurations for multiple streams in one call
 * [PATCH /models/{modelURN}/stream-configs]
 *
 * IMPORTANT — FULL REPLACE PER STREAM, NOT PARTIAL UPDATE:
 * Each streamSettings object in the array completely replaces the existing config for
 * that stream. The HTTP verb "PATCH" here means "batch operation", not "partial update".
 * Always read current configs first (getStreamConfigs), apply your changes, then PATCH.
 *
 * PUT vs. PATCH — what is the actual difference?
 *   PUT  → targets ONE stream (key in the URL); body wraps a single "streamConfig" object.
 *   PATCH → targets MULTIPLE streams in one call; body wraps a "streamConfigs" array.
 *   Internally the server routes both to the same UpdateStreamConfigs function, so the
 *   capability (which fields you can set) is identical. Choose PATCH when you need to
 *   update several streams atomically (e.g. bulk-apply thresholds from a template).
 *
 * If any stream in the batch fails validation the server may return HTTP 207 Multi-Status
 * (partial update error) — check the response body for per-stream error details.
 *
 * Full request body shape:
 * {
 *   "description": "human-readable change description",  // optional, defaults to "stream-config-update"
 *   "streamConfigs": [
 *     {
 *       "elementId": "<full base64 stream key>",         // required; identifies which stream to update
 *       "streamSettings": {
 *         "sourceMapping": {
 *           "<familyId:paramId>": { "path": "temperature", "ts": "timestamp" }
 *         },
 *         "thresholds": {
 *           "<familyId:paramId>": {
 *             "lower": { "warn": 18, "alert": 15 },
 *             "upper": { "warn": 23, "alert": 25 },
 *             "alertDefinition": { "evaluationPeriodSec": 300 }
 *           }
 *         },
 *         "frequency": 60000,       // ms; see PUT stub for allowed values
 *         "retentionPeriod": 365,   // days
 *         "offlineTimeout": 3600    // seconds
 *       }
 *     }
 *   ]
 * }
 *
 * @param {string} configsJson - Accepts two shapes:
 *   (a) A JSON array of StreamConfig objects — the direct response from GET /stream-configs:
 *       [ { "elementId": "...", "streamSettings": { ... } }, ... ]
 *   (b) The full request body object (in case you constructed it manually):
 *       { "streamConfigs": [ ... ], "description": "..." }
 *   Shape (a) lets you copy the GET Stream Configs response directly, edit the entries
 *   you want to change, and PATCH them back without any restructuring.
 */
export async function updateStreamConfigs(facilityURN, region, configsJson) {
  console.group("STUB: updateStreamConfigs()");

  const defaultModelURN = getDefaultModelURN(facilityURN);
  console.log("Default model:", defaultModelURN);

  let parsed;
  try {
    parsed = JSON.parse(configsJson);
  } catch {
    console.error("ERROR: configsJson is not valid JSON");
    console.groupEnd();
    return null;
  }

  // Accept two input shapes:
  //   1. A plain array [ { elementId, streamSettings }, ... ]  — the GET /stream-configs response
  //   2. The full request body { streamConfigs: [...], description: "..." }
  // Shape 1 is the most natural: copy the GET response, edit entries, paste and PATCH.
  let streamConfigs;
  if (Array.isArray(parsed)) {
    streamConfigs = parsed;
  } else if (Array.isArray(parsed.streamConfigs)) {
    console.log("Detected full request body shape — extracting streamConfigs array");
    streamConfigs = parsed.streamConfigs;
  } else {
    console.error("ERROR: expected a JSON array or an object with a 'streamConfigs' array");
    console.groupEnd();
    return null;
  }

  const bodyPayload = JSON.stringify({
    description: "REST TestBed: batch update stream configs",
    streamConfigs
  });

  console.log(`Updating ${streamConfigs.length} stream config(s)`);
  console.log("Body payload:", bodyPayload);

  const requestPath = `${tandemBaseURL}/models/${defaultModelURN}/stream-configs`;
  console.log("Request:", requestPath);

  try {
    const response = await fetch(requestPath, makeRequestOptionsPATCH(bodyPayload, region));
    if (response.ok) {
      console.log("✓ Stream configs updated successfully");
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

