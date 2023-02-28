
import * as utils from './utils.js';
import { ColumnFamilies, QC, ElementFlags } from "../sdk/dt-schema.js";

/***************************************************
** FUNC: getStreamsFromDefaultModel()
** DESC: scan the DB for elements that are of type Stream
**********************/

export async function getStreamsFromDefaultModel() {

  console.group("STUB: getStreamsFromDefaultModel()");

  const defaultModelURN = utils.facilityURN.replace("urn:adsk.dtt:", "urn:adsk.dtm:");
  console.log("Default model", defaultModelURN);

  const requestPath = utils.td_baseURL + `/modeldata/${defaultModelURN}/scan`;  // TBD: doesn't work for V2
  //const requestPath = utils.td_baseURL_v2 + `/modeldata/${defaultModelURN}/scan`;

  console.log(requestPath);

  await fetch(requestPath, utils.makeReqOptsGET())
    .then((response) => response.json())
    .then((obj) => {
      utils.showResult(obj);
    })
    .catch(error => console.log('error', error));

  console.groupEnd();
}

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
    "families": [
        ColumnFamilies.Standard,
    ],
    "includeHistory": false
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

  //const streamKeysArray = streamKeys.split(',');
  //console.log("stream keys", streamKeysArray);

  var bodyPayload = JSON.stringify({
  //  "keys": streamKeysArray
    "keys": [
       "AQAAAAVsjDQFgulHUWb4lbO9amwAAAAA"
   ]
  });
  const reqOpts = utils.makeReqOptsPOST(bodyPayload);
  //utils.requestOptionsPOST.body = bodyPayload;

  const tmpModelURN = "urn:adsk.dtm:d5eZt_XtRzqUHT93-vNZxw";
  const requestPath = utils.td_baseURL + `/models/${tmpModelURN}/getstreamssecrets`;

  console.log(requestPath);
  console.log(reqOpts);

  await fetch(requestPath, reqOpts)
    .then((response) => response.json())
    .then((obj) => {
      utils.showResult(obj);
    })
    .catch(error => console.log('error', error));

  console.groupEnd();
}
