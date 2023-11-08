
import * as utils from './utils.js';
import { ColumnFamilies, ColumnNames, QC, ElementFlags } from '../sdk/dt-schema.js';

/***************************************************
** FUNC: getStreamsFromDefaultModelPOST()
** DESC: scan the DB for elements that are of type Stream
**********************/

export async function getStreamsFromDefaultModelPOST() {

  console.group("STUB: getStreamsFromDefaultModelPOST()");

  const defaultModelURN = utils.getDefaultModel();
  console.log("Default model", defaultModelURN);

  const requestPath = `${utils.td_baseURL}/modeldata/${defaultModelURN}/scan`;
  console.log(requestPath);

  var bodyPayload = JSON.stringify({
    families: [
        ColumnFamilies.Standard,
    ],
    includeHistory: false
  });
  const reqOpts = utils.makeReqOptsPOST(bodyPayload);

  await fetch(requestPath, reqOpts)
    .then((response) => response.json())
    .then((obj) => {
      utils.showResult(obj);

      console.log("filtering for type Stream...");
      let streams = obj.filter(row => row[QC.ElementFlags]?.[0] === ElementFlags.Stream);
      console.log("Streams:", streams);
    })
    .catch(error => console.log('error', error));

  console.groupEnd();
}

/***************************************************
** FUNC: getStreamSecrets()
** DESC: Get the secrets for the given streams
**********************/

export async function getStreamSecrets(streamKeys, useFullKeys) {

  console.group("STUB: getStreamSecrets()");

  const defaultModelURN = utils.getDefaultModel();
  console.log("Default model", defaultModelURN);

  const streamKeysArray = streamKeys.split(',');
  console.log("Stream keys", streamKeysArray);
  // convert to qualified keys
  const fullKeysArray = [];

  for (const streamKey of streamKeysArray) {
    if (useFullKeys) {
      fullKeysArray.push(streamKey);
    } else {
      fullKeysArray.push(utils.toQualifiedKey(streamKey, true));
    }
  }
  const bodyPayload = JSON.stringify({
    keys: fullKeysArray
  });
  const reqOpts = utils.makeReqOptsPOST(bodyPayload);

  const requestPath = `${utils.td_baseURL}/models/${defaultModelURN}/getstreamssecrets`;
  console.log(requestPath);

  await fetch(requestPath, reqOpts)
    .then((response) => response.json())
    .then((obj) => {
      utils.showResult(obj);
    })
    .catch(error => console.log('error', error));

  console.groupEnd();
}

/***************************************************
** FUNC: resetStreamSecrets()
** DESC: Reset the secrets for the given streams
**********************/

export async function resetStreamSecrets(streamKeys, useFullKeys) {

  console.group("STUB: resetStreamSecrets()");

  const defaultModelURN = utils.getDefaultModel();
  console.log("Default model", defaultModelURN);

  const streamKeysArray = streamKeys.split(',');
  console.log("Stream keys", streamKeysArray);

  const bodyPayload = {
    keys: [],
    hardReset: true
  };

  for (const streamKey of streamKeysArray) {
    if (useFullKeys) {
      bodyPayload.keys.push(streamKey);
    } else {
      bodyPayload.keys.push(util.toQualifiedKey(streamKey, true));
    }
  }
  const reqOpts = utils.makeReqOptsPOST(JSON.stringify(bodyPayload));

  const requestPath = utils.td_baseURL + `/models/${defaultModelURN}/resetstreamssecrets`;
  console.log(requestPath);

  await fetch(requestPath, reqOpts)
    //.then((response) => response.json())  // this doesn't return anything but a 204 with no response body
    .then((obj) => {
      utils.showResult(obj);
    })
    .catch(error => console.log('error', error));

  console.groupEnd();
}

/***************************************************
** FUNC: prettyPrintStreamValues()
** DESC: print out timeseries data in human readable form
**********************/

export function prettyPrintStreamValues(streamDataObj) {

    // iterate over the map structure and make a nice, readable table
  for (const [propKey, value] of Object.entries(streamDataObj)) { // one entry for each parameter used to store timeseries data
    let timeseriesData = [];
    for (const [timestampKey, value2] of Object.entries(value)) { // another map with all the timestamps and values
      const timestamp = parseInt(timestampKey); // convert timestamp to human readable date
      const date = new Date(timestamp);
      timeseriesData.push( { propId: propKey, value: value2, timestamp: timestamp, date: date.toString()} );
    }
    if (timeseriesData.length) {
      console.table(timeseriesData);
    }
  }
}

/***************************************************
** FUNC: prettyPrintLastSeenStreamValues()
** DESC: print out timeseries data in human readable form
**********************/

export function prettyPrintLastSeenStreamValues(streamDataObj) {

    // iterate over the map structure and make a nice, readable table
  let timeseriesData = [];
  for (const [streamKey, streamValue] of Object.entries(streamDataObj)) { // one entry for each stream requested
    for (const [propKey, propValues] of Object.entries(streamValue)) { // one entry for each parameter used to store timeseries data
      for (const [timestampKey, propVal] of Object.entries(propValues)) { // another map with all the timestamps and values
        const timestamp = parseInt(timestampKey); // convert timestamp to human readable date
        const date = new Date(timestamp);
        timeseriesData.push( { streamKey: streamKey, propId: propKey, value: propVal, timestamp: timestamp, date: date.toString()} );
      }
    }
  }
  if (timeseriesData.length) {
    console.table(timeseriesData);
  }
}

/***************************************************
** FUNC: getStreamValues30Days()
** DESC: get stream values for a given time range (hardwired here to 30 days)
**********************/

export async function getStreamValues30Days(streamKeys, useFullKeys) {

  console.group("STUB: getStreamValues30Days()");

  const defaultModelURN = utils.getDefaultModel();
  console.log("Default model", defaultModelURN);

  const streamKeysArray = streamKeys.split(',');
  console.log("Stream keys:", streamKeysArray);

  const dateNow = new Date();
  const timestampEnd = dateNow.getTime();
  console.log("Time Now:", dateNow, timestampEnd);

  const dateMinus30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const timestampStart = dateMinus30.getTime();
  console.log("30 Days Ago:", dateMinus30, timestampStart);

  console.log("NOTE: API allows any time range, plus options to limit returned values, sort, and isolate a specific substream parameter.")

  for (let streamKey of streamKeysArray) {
    // NOTE: we could also use other param args:
    //    &limit=N (limit to N number of values)
    //    &sort (asc or desc)
    //    &substream=XYZ (only return a specific parameter)
    if (!useFullKeys) {
      streamKey = utils.toQualifiedKey(streamKey, true);
    }
    const requestPath = `${utils.td_baseURL}/timeseries/models/${defaultModelURN}/streams/${streamKey}?from=${timestampStart}&to=${timestampEnd}`;

    console.log(`Stream ${streamKey}-->`)
    console.log(requestPath);

    await fetch(requestPath, utils.makeReqOptsGET())
      .then((response) => response.json())
      .then((obj) => {
        utils.showResult(obj);
        prettyPrintStreamValues(obj);
      })
      .catch(error => console.log('error', error));
  }

  console.groupEnd();
}

/***************************************************
** FUNC: getStreamValues365Days()
** DESC: get stream values for a given time range (hardwired here to 365 days)
**********************/

export async function getStreamValues365Days(streamKeys, useFullKeys) {

  console.group("STUB: getStreamValues365Days()");

  const defaultModelURN = utils.getDefaultModel();
  console.log("Default model", defaultModelURN);

  const streamKeysArray = streamKeys.split(',');
  console.log("Stream keys:", streamKeysArray);

  const dateNow = new Date();
  const timestampEnd = dateNow.getTime();
  console.log("Time Now:", dateNow, timestampEnd);

  const dateMinus365 = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
  const timestampStart = dateMinus365.getTime();
  console.log("1 Year Ago:", dateMinus365, timestampStart);

  console.log("NOTE: API allows any time range, plus options to limit returned values, sort, and isolate a specific substream parameter.")

  for (let streamKey of streamKeysArray) {
    // NOTE: we could also use other param args:
    //    &limit=N (limit to N number of values)
    //    &sort (asc or desc)
    //    &substream=XYZ (only return a specific parameter)
    if (!useFullKeys) {
      streamKey = utils.toQualifiedKey(streamKey, true);
    }
    const requestPath = `${utils.td_baseURL}/timeseries/models/${defaultModelURN}/streams/${streamKey}?from=${timestampStart}&to=${timestampEnd}`;

    console.log(`Stream ${streamKey}-->`)
    console.log(requestPath);

    await fetch(requestPath, utils.makeReqOptsGET())
      .then((response) => response.json())
      .then((obj) => {
        utils.showResult(obj);
        prettyPrintStreamValues(obj);
      })
      .catch(error => console.log('error', error));
  }

  console.groupEnd();
}

/***************************************************
** FUNC: postNewStreamValues()
** DESC: post new stream values
**********************/

export async function postNewStreamValues(streamKeys, useFullKeys) {

  console.group("STUB: postNewStreamValues()");

  const defaultModelURN = utils.getDefaultModel();
  console.log("Default model", defaultModelURN);

  const streamKeysArray = streamKeys.split(',');
  console.log("Stream keys:", streamKeysArray);

  const dateNow = new Date();
  const timestamp = dateNow.getTime();
  console.log("Timestamp:", dateNow, timestamp);

  console.log("NOTE: This endpoint will send values in, but needs to have configured parameters in Tandem in order to store long term.")

    // make up some arbitrary values here
    // NOTE: these will likely not be mapped to parameters in your facility for this particular stream.
    // See notes on how to setup the parameter mapping in Tandem so that these will flow into long-term storage
  let bodyPayload = JSON.stringify({  // NOTE: This could also be an Array of objects
    test_val1: 22.88,
    test_val2: 33.99,
    ts: timestamp
  });

  const reqOptsPOST = utils.makeReqOptsPOST(bodyPayload);

  for (let streamKey of streamKeysArray) {
    if (!useFullKeys) {
      streamKey = utils.toQualifiedKey(streamKey, true);
    }
    const requestPath = `${utils.td_baseURL}/timeseries/models/${defaultModelURN}/streams/${streamKey}`;

    console.log(`Stream ${streamKey}-->`)
    console.log(requestPath);

    await fetch(requestPath, reqOptsPOST)
      //.then((response) => response.json())  // this doesn't return anything but a 204 with no response body
      .then((obj) => {
        utils.showResult(obj);
      })
      .catch(error => console.log('error', error));
  }

  console.groupEnd();
}

/***************************************************
** FUNC: getLastSeenStreamValues()
** DESC: get the last seen values for the given streams
**********************/

export async function getLastSeenStreamValues(streamKeys, useFullKeys) {

  console.group("STUB: getLastSeenStreamValues()");

  const defaultModelURN = utils.getDefaultModel();
  console.log("Default model", defaultModelURN);

  const streamKeysArray = streamKeys.split(',');
  console.log("Stream keys:", streamKeysArray);

  const bodyPayload = {
    keys: []
  };

  for (const streamKey of streamKeysArray) {
    if (useFullKeys) {
      bodyPayload.keys.push(streamKey);  
    } else {
      bodyPayload.keys.push(utils.toQualifiedKey(streamKey, true));
    }
  }

  const reqOptsPOST = utils.makeReqOptsPOST(JSON.stringify(bodyPayload));

  const requestPath = `${utils.td_baseURL}/timeseries/models/${defaultModelURN}/streams`;
  console.log(requestPath);

  await fetch(requestPath, reqOptsPOST)
    .then((response) => response.json())
    .then((obj) => {
      utils.showResult(obj);
      prettyPrintLastSeenStreamValues(obj);
    })
    .catch(error => console.log('error', error));

  console.groupEnd();
}

/***************************************************
** FUNC: getStreamRollupsLast30Days()
** DESC: get summary statistics for the given streams
**********************/

export async function getStreamRollupsLast30Days(streamKeys, useFullKeys) {

  console.group("STUB: getStreamRollupsLast30Days()");

  const defaultModelURN = utils.getDefaultModel();
  console.log("Default model", defaultModelURN);

  const streamKeysArray = streamKeys.split(',');
  console.log("Stream keys:", streamKeysArray);

  const dateNow = new Date();
  const timestampEnd = dateNow.getTime();
  console.log("Time Now:", dateNow, timestampEnd);

  const dateMinus30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const timestampStart = dateMinus30.getTime();
  console.log("30 Days Ago:", dateMinus30, timestampStart);

  console.info("NOTE: API allows any time range.")

  for (let streamKey of streamKeysArray) {
    if (!useFullKeys) {
      streamKey = utils.toQualifiedKey(streamKey, true);
    }
    const requestPath = `${utils.td_baseURL}/timeseries/models/${defaultModelURN}/streams/${streamKey}/rollups?from=${timestampStart}&to=${timestampEnd}`;

    console.log(`Stream ${streamKey}-->`)
    console.log(requestPath);

    await fetch(requestPath, utils.makeReqOptsGET())
      .then((response) => response.json())
      .then((obj) => {
        utils.showResult(obj);
      })
      .catch(error => console.log('error', error));
  }

  console.groupEnd();
}

/***************************************************
** FUNC: createStream()
** DESC: create a new stream with or without a host, classification, room, and floor
**********************/

export async function createStream(streamName, hostModelURN, hostKey, classifStr) {

    // first do a little error checking to make sure the user isn't asking us to do something silly
  if (streamName == "") {
    alert("ERROR: no stream name specified.");
    return;
  }

  console.group("STUB: createStream()");

    // see of they gave us enough info to assign a host
  let useHost = true;
  if ((hostModelURN == "") || (hostKey == "")) {
    console.log("HostModel or HostElem was not specified, will create a Stream with no host...");
    useHost = false;
  }
    // see if they gave us enough info to assign a classification
  let useClassif = false;
  if (classifStr == "") {
    console.log("No Classification specified. Will create a Stream with no classification...");
  }
  else {
    const classificationNode = await utils.findClassificationNode(classifStr);
    if (classificationNode == null) {
      console.log("Could not find that classification in the current Facility Template...");
      console.log("Will create a Stream with no classificaiton...");
    }
    else {
      useClassif = true;  // they specified it and we found it in the template
    }
  }

    // streams need to be created in the "default" model
  const defaultModelURN = utils.getDefaultModel();
  console.log("Default model", defaultModelURN);

    // assign the non-option mutations
  let mutsArray = [
    ["i", ColumnFamilies.Standard, ColumnNames.Name, streamName],
    ["i", ColumnFamilies.Standard, ColumnNames.ElementFlags, ElementFlags.Stream],
    ["i", ColumnFamilies.Standard, ColumnNames.UniformatClass, "D7070"],
    ["i", ColumnFamilies.Standard, ColumnNames.CategoryId, 5031],     // Category for Streams
  ];
    // now do the optional ones
  if (useClassif)
    mutsArray.push(["i", ColumnFamilies.Standard, ColumnNames.Classification, classifStr]);
  if (useHost) {
      // we need to generate an xrefKey which is the modelURN and elementKey smashed together
    const hostXref = utils.makeXrefKey(hostModelURN, hostKey);
    mutsArray.push(["i", ColumnFamilies.Xrefs, ColumnNames.Parent, hostXref])
  }

  const bodyPayload = JSON.stringify({
    muts: mutsArray,
    desc: "REST TestBedApp: created stream"
  });

  console.log(bodyPayload);

    // now use the /create endpoint to make the new stream
  const reqOpts = utils.makeReqOptsPOST(bodyPayload);
  const requestPath = utils.td_baseURL + `/modeldata/${defaultModelURN}/create`;
  console.log(requestPath);

  let newStreamKey = null;
  await fetch(requestPath, reqOpts)
    .then((response) => response.json())
    .then((obj) => {
      utils.showResult(obj);
      newStreamKey = obj.key;
    })
    .catch(error => console.log('error', error));

    // now we have to call resetStreamSecrets to make it fully functional
  if (newStreamKey) {
    const bodyPayload2 = JSON.stringify({
      keys: [newStreamKey],
      hardReset: true
    });
    const reqOpts2 = utils.makeReqOptsPOST(bodyPayload2);

    const requestPath2 = utils.td_baseURL + `/models/${defaultModelURN}/resetstreamssecrets`;
    console.log(requestPath2);

    await fetch(requestPath2, reqOpts2)
      //.then((response) => response.json())  // this doesn't return anything but a 204 with no response body
      .then((obj) => {
        if (obj.ok)
          console.log(`Stream secret for ${newStreamKey} has been generated.`);
      })
      .catch(error => console.log('error', error));
  }

  console.groupEnd();
}

/***************************************************
** FUNC: assignHostToStream()
** DESC: assign a new Host to the stream
**********************/

export async function assignHostToStream(streamKey, hostModelURN, hostKey) {

  console.group("STUB: assignHostToStream()");

    // streams are always in the default model
  const defaultModelURN = utils.getDefaultModel();
  console.log("Default model", defaultModelURN);

    // need to make an xrefKey by combining the hostModelURN and the hostElementKey
  const hostXref = utils.makeXrefKey(hostModelURN, hostKey);
  let mutsArray = [
    ["i", ColumnFamilies.Xrefs, ColumnNames.Parent, hostXref]
  ];

    // do a mutaiton on the Stream element to set the "parent" to the new Host
  const bodyPayload = JSON.stringify({
    keys: [streamKey],
    muts: mutsArray,
    desc: "REST TestBedApp: modified stream host"
  });

  console.log(bodyPayload);

    // now use the /mutate endpoint to modify the stream
  const reqOpts = utils.makeReqOptsPOST(bodyPayload);
  const requestPath = utils.td_baseURL + `/modeldata/${defaultModelURN}/mutate`;
  console.log(requestPath);

  await fetch(requestPath, reqOpts)
    .then((response) => response.json())
    .then((obj) => {
      utils.showResult(obj);
    })
    .catch(error => console.log('error', error));

  console.groupEnd();
}

/***************************************************
** FUNC: removeHostFromStream()
** DESC: remove any host reference from the given stream
**********************/

export async function removeHostFromStream(streamKeys) {

  console.group("STUB: removeHostFromStream()");

  const defaultModelURN = utils.getDefaultModel();
  console.log("Default model", defaultModelURN);

  const streamKeysArray = streamKeys.split(',');
  console.log("Stream keys", streamKeysArray);

    // create the mutations array. Number if mutations must match number of elements, even if they all
    // the same mutation.
  const mutsArray = [];
  for (let i=0; i<streamKeysArray.length; i++) {
    const mutObj = ["i", ColumnFamilies.Xrefs, ColumnNames.Parent, ""]; // setting the host association to NULL
    mutsArray.push(mutObj);
  }
    //  create the payload for the call to /mutate
  const bodyPayload = JSON.stringify({
    keys: streamKeysArray,
    muts: mutsArray,
    desc: "REST TestBedApp: removed stream host"
  });

  const reqOpts = utils.makeReqOptsPOST(bodyPayload);
  const requestPath = utils.td_baseURL + `/modeldata/${defaultModelURN}/mutate`;
  console.log(requestPath);

  await fetch(requestPath, reqOpts)
    .then((response) => response.json())
    .then((obj) => {
      utils.showResult(obj);
    })
    .catch(error => console.log('error', error));

  console.groupEnd();
}

/***************************************************
** FUNC: deleteStreams()
** DESC: completely delete the stream.
**  There is also a way to just delete the timeseries data from the Stream, but not the Stream itself.
**  See Postman collection for /timeseries/models/:modelID/deletestreamsdata
**********************/

export async function deleteStreams(streamKeys) {

  console.group("STUB: deleteStreams()");

  const defaultModelURN = utils.getDefaultModel();
  console.log("Default model", defaultModelURN);

  const streamKeysArray = streamKeys.split(',');
  console.log("Stream keys:", streamKeysArray);

    // create the mutations array. Number of mutations must match number of elements, even if they all
    // the same mutation.
  const mutsArray = [];
  for (let i=0; i<streamKeysArray.length; i++) {
    const mutObj = ["a", "", "", ""];  // "a"=soft delete
    mutsArray.push(mutObj);
  }
    //  create the payload for the call to /mutate
  const bodyPayload = JSON.stringify({
    keys: streamKeysArray,
    muts: mutsArray,
    desc: "REST TestBedApp: deleted Stream(s)"
  });

  const reqOpts = utils.makeReqOptsPOST(bodyPayload);
  const requestPath = utils.td_baseURL + `/modeldata/${defaultModelURN}/mutate`;
  console.log(requestPath);

  await fetch(requestPath, reqOpts)
    .then((response) => response.json())
    .then((obj) => {
      utils.showResult(obj);
    })
    .catch(error => console.log('error', error));

  console.groupEnd();
}
