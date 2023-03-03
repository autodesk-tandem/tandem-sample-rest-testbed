
import * as utils from './utils.js';
import { ColumnFamilies } from "../sdk/dt-schema.js";

/***************************************************
** FUNC: getModelProperties()
** DESC: Get the properties of a given model
**********************/

export async function getModelProperties(modelURN) {

  console.group("STUB: getModelProperties()");

  const requestPath = utils.td_baseURL + `/models/${modelURN}/props`;

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
** FUNC: getModel()
** DESC: Get the given model (used for the viewer)
**********************/

export async function getModel(modelURN) {

  console.group("STUB: getModel()");

  const requestPath = utils.td_baseURL + `/modeldata/${modelURN}/model`;

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
** FUNC: getAECModelData()
** DESC: Get the aec model data of a given model
**********************/

export async function getAECModelData(modelURN) {

  console.group("STUB: getAECModelData()");

  const requestPath = utils.td_baseURL + `/modeldata/${modelURN}/aecmodeldata`;

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
** FUNC: getModelDataAttrs()
** DESC: Get the attributes of a given model
**********************/

export async function getModelDataAttrs(modelURN) {

  console.group("STUB: getModelDataAttrs()");

  const requestPath = utils.td_baseURL + `/modeldata/${modelURN}/attrs`;

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
** FUNC: getModelDataSchema()
** DESC: Get the schema of a given model
**********************/

export async function getModelDataSchema(modelURN) {

  console.group("STUB: getModelDataSchema()");

  const requestPath = utils.td_baseURL + `/modeldata/${modelURN}/schema`;

  console.log(requestPath);

  await fetch(requestPath, utils.makeReqOptsGET())
    .then((response) => response.json())
    .then((obj) => {
      utils.showResult(obj);
      console.table(obj.attributes);
    })
    .catch(error => console.log('error', error));

  console.groupEnd();
}

/***************************************************
** FUNC: getModelDataFragments()
** DESC: Get the fragments of a given model (used in the viewer)
**********************/

export async function getModelDataFragments(modelURN) {

  console.group("STUB: getModelDataFragments()");

  const requestPath = utils.td_baseURL + `/modeldata/${modelURN}/fragments`;

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
** FUNC: getModelDataScan()
** DESC: Get all the main properties for elements in the database
**********************/

export async function getModelDataScan(modelURN) {

  console.group("STUB: getModelDataScan()");

  const requestPath = utils.td_baseURL + `/modeldata/${modelURN}/scan`;

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
** FUNC: getModelDataScanElements()
** DESC: get the properties for a specific set of Keys
**********************/

export async function getModelDataScanElements(modelURN, elemKeys) {

  console.group("STUB: getModelDataScanElements()");

  const elemKeysArray = elemKeys.split(',');
  console.log("Element keys", elemKeysArray);

  let bodyPayload = JSON.stringify({
    families: [
        ColumnFamilies.Standard,
        ColumnFamilies.Refs,
        ColumnFamilies.Xrefs,
        ColumnFamilies.Source,
        ColumnFamilies.DtProperties
    ],
    includeHistory: false,
    keys: elemKeysArray
  });
  const reqOpts = utils.makeReqOptsPOST(bodyPayload);

  const requestPath = utils.td_baseURL_v2 + `/modeldata/${modelURN}/scan`;
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
** FUNC: getModelDataScanElementsUserOnlyWithHistory()
** DESC: get only the user-defined properties for a specific set of Keys, and include history
**********************/

export async function getModelDataScanElementsUserOnlyWithHistory(modelURN, elemKeys) {

  console.group("STUB: getModelDataScanElementsUserOnlyWithHistory()");

  const elemKeysArray = elemKeys.split(',');
  console.log("Element keys", elemKeysArray);

  let bodyPayload = JSON.stringify({
    families: [
      ColumnFamilies.DtProperties
    ],
    includeHistory: true,
    keys: elemKeysArray
  });
  const reqOpts = utils.makeReqOptsPOST(bodyPayload);

  const requestPath = utils.td_baseURL_v2 + `/modeldata/${modelURN}/scan`;
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
** FUNC: getModelDataScanElementsFullChangeHistory()
** DESC: get only the user-defined properties for a specific set of Keys, and include history
**********************/

export async function getModelDataScanElementsFullChangeHistory(modelURN, elemKeys) {

  console.group("STUB: getModelDataScanElementsFullChangeHistory()");

  const elemKeysArray = elemKeys.split(',');
  console.log("Element keys", elemKeysArray);

  let bodyPayload = JSON.stringify({
    includeHistory: true,
    keys: elemKeysArray
  });
  const reqOpts = utils.makeReqOptsPOST(bodyPayload);

  const requestPath = utils.td_baseURL_v2 + `/modeldata/${modelURN}/scan`;

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
** FUNC: testScan()
** DESC: scan the DB for elements with a given property
**********************/

export async function testScan() {

  console.group("STUB: testScan()");

  const modelURN = "urn:adsk.dtm:k5ZZZkIYQ9ixvxFDVBNoTg";
  const qualProp = "z:5Ac";

  let raw = JSON.stringify({
    qualifiedColumns: [
      qualProp
    ],
    includeHistory: false
  });

  let myHeaders = new Headers();
  myHeaders.append("Authorization", "Bearer " + window.sessionStorage.token); // use our login to the app
  let requestOptions = {
    method: 'POST',
    headers: myHeaders,
    body: raw,
    redirect: 'follow'
  };

  const requestPath = utils.td_baseURL_v2 + `/modeldata/${modelURN}/scan`;
  console.log(requestPath);

  await fetch(requestPath, requestOptions)
    .then((response) => response.json())
    .then((obj) => {
      utils.showResult(obj);
    })
    .catch(error => console.log('error', error));

  console.groupEnd();
}
