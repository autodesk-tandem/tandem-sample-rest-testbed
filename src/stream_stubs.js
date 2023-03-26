
import * as utils from './utils.js';
import { ColumnFamilies, QC, ElementFlags } from "../sdk/dt-schema.js";


/***************************************************
** FUNC: getStreamsFromDefaultModelPOST()
** DESC: scan the DB for elements that are of type Stream
**********************/

export async function getStreamsFromDefaultModelPOST() {

  console.group("STUB: getStreamsFromDefaultModelPOST()");

  const defaultModelURN = utils.facilityURN.replace("urn:adsk.dtt:", "urn:adsk.dtm:");
  console.log("Default model", defaultModelURN);

  const requestPath = utils.td_baseURL_v2 + `/modeldata/${defaultModelURN}/scan`;
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

export async function getStreamSecrets(modelURN, streamKeys) {

  console.group("STUB: getStreamSecrets()");

  const streamKeysArray = streamKeys.split(',');
  console.log("Stream keys", streamKeysArray);

  var bodyPayload = JSON.stringify({
    keys: streamKeysArray
  });
  const reqOpts = utils.makeReqOptsPOST(bodyPayload);

  const requestPath = utils.td_baseURL + `/models/${modelURN}/getstreamssecrets`;
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

export async function resetStreamSecrets(modelURN, streamKeys) {

  console.group("STUB: resetStreamSecrets()");

  const streamKeysArray = streamKeys.split(',');
  console.log("Stream keys", streamKeysArray);

  let bodyPayload = JSON.stringify({
    keys: streamKeysArray,
    hardReset: true
  });
  const reqOpts = utils.makeReqOptsPOST(bodyPayload);

  const requestPath = utils.td_baseURL + `/models/${modelURN}/resetstreamssecrets`;
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
** FUNC: getStreamValues30Days()
** DESC: get stream values for a given time range (hardwired here to 30 days)
**********************/

export async function getStreamValues30Days(defaultModelURN, streamKeys) {

  console.group("STUB: getStreamValues30Days()");

  const streamKeysArray = streamKeys.split(',');
  console.log("Stream keys:", streamKeysArray);

  const dateNow = new Date();
  const timestampEnd = dateNow.getTime();
  console.log("Time Now:", dateNow, timestampEnd);

  const dateMinus30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const timestampStart = dateMinus30.getTime();
  console.log("30 Days Ago:", dateMinus30, timestampStart);

  console.log("NOTE: API allows any time range, plus options to limit returned values, sort, and isolate a specific substream parameter.")

  for (let i=0; i<streamKeysArray.length; i++) {
    // NOTE: we could also use other param args:
    //    &limit=N (limit to N number of values)
    //    &sort (asc or desc)
    //    &substream=XYZ (only return a specific parameter)
    const requestPath = utils.td_baseURL + `/timeseries/models/${defaultModelURN}/streams/${streamKeysArray[i]}?from=${timestampStart}&to=${timestampEnd}`;

    console.log(`Stream ${streamKeysArray[i]}-->`)
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

export async function getStreamValues365Days(defaultModelURN, streamKeys) {

  console.group("STUB: getStreamValues365Days()");

  const streamKeysArray = streamKeys.split(',');
  console.log("Stream keys:", streamKeysArray);

  const dateNow = new Date();
  const timestampEnd = dateNow.getTime();
  console.log("Time Now:", dateNow, timestampEnd);

  const dateMinus365 = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
  const timestampStart = dateMinus365.getTime();
  console.log("1 Year Ago:", dateMinus365, timestampStart);

  console.log("NOTE: API allows any time range, plus options to limit returned values, sort, and isolate a specific substream parameter.")

  for (let i=0; i<streamKeysArray.length; i++) {
    // NOTE: we could also use other param args:
    //    &limit=N (limit to N number of values)
    //    &sort (asc or desc)
    //    &substream=XYZ (only return a specific parameter)
    const requestPath = utils.td_baseURL + `/timeseries/models/${defaultModelURN}/streams/${streamKeysArray[i]}?from=${timestampStart}&to=${timestampEnd}`;

    console.log(`Stream ${streamKeysArray[i]}-->`)
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

export async function postNewStreamValues(defaultModelURN, streamKeys) {

  console.group("STUB: postNewStreamValues()");

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

  for (let i=0; i<streamKeysArray.length; i++) {
    const requestPath = utils.td_baseURL + `/timeseries/models/${defaultModelURN}/streams/${streamKeysArray[i]}`;

    console.log(`Stream ${streamKeysArray[i]}-->`)
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

export async function getLastSeenStreamValues(defaultModelURN, streamKeys) {

  console.group("STUB: getLastSeenStreamValues()");

  const streamKeysArray = streamKeys.split(',');
  console.log("Stream keys:", streamKeysArray);

  let bodyPayload = JSON.stringify({
    keys: streamKeysArray
  });

  const reqOptsPOST = utils.makeReqOptsPOST(bodyPayload);

  const requestPath = utils.td_baseURL + `/timeseries/models/${defaultModelURN}/streams`;
  console.log(requestPath);

  await fetch(requestPath, reqOptsPOST)
    .then((response) => response.json())
    .then((obj) => {
      utils.showResult(obj);
    })
    .catch(error => console.log('error', error));

  console.groupEnd();
}

/***************************************************
** FUNC: getStreamRollupsLast30Days()
** DESC: get summary statistics for the given streams
**********************/

export async function getStreamRollupsLast30Days(defaultModelURN, streamKeys) {

  console.group("STUB: getStreamRollupsLast30Days()");

  const streamKeysArray = streamKeys.split(',');
  console.log("Stream keys:", streamKeysArray);

  const dateNow = new Date();
  const timestampEnd = dateNow.getTime();
  console.log("Time Now:", dateNow, timestampEnd);

  const dateMinus30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const timestampStart = dateMinus30.getTime();
  console.log("30 Days Ago:", dateMinus30, timestampStart);

  console.info("NOTE: API allows any time range.")

  for (let i=0; i<streamKeysArray.length; i++) {

    const requestPath = utils.td_baseURL + `/timeseries/models/${defaultModelURN}/streams/${streamKeysArray[i]}/rollups?from=${timestampStart}&to=${timestampEnd}`;

    console.log(`Stream ${streamKeysArray[i]}-->`)
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
** FUNC: postGetStreamRollupsLast30Days()
** DESC: get the rollups for the given streams
**********************/

export async function postGetStreamRollupsLast30Days(modelURN, streamKeys) {

  console.group("STUB: postGetStreamRollupsLast30Days()");

  const streamKeysArray = streamKeys.split(',');
  console.log("Stream keys", streamKeysArray);

  const dateNow = new Date();
  const timestampEnd = dateNow.getTime();
  console.log("Time Now:", dateNow, timestampEnd);

  const dateMinus30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const timestampStart = dateMinus30.getTime();
  console.log("30 Days Ago:", dateMinus30, timestampStart);

  console.info("NOTE: API allows any time range.")

  let bodyPayload = JSON.stringify({
    keys: streamKeysArray
  });
  const reqOpts = utils.makeReqOptsPOST(bodyPayload);

  const requestPath = utils.td_baseURL + `/timeseries/models/${modelURN}/rollups?from=${timestampStart}&to=${timestampEnd}`;
  console.log(requestPath);

  await fetch(requestPath, reqOpts)
    .then((response) => response.json())
    .then((obj) => {
      utils.showResult(obj);
    })
    .catch(error => console.log('error', error));

  console.groupEnd();
}
