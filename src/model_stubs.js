import * as utils from './utils.js';

/**
 * Get the properties of a given model
 * 
 * @param {string} modelURN 
 * @returns {Promise<void>}
 */
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

/**
 * Get the given model (used for the viewer).
 * 
 * @param {string} modelURN 
 * @returns {Promise<void>}
 */
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

/**
 * Get the AEC model data of a given model.
 * 
 * @param {string} modelURN 
 * @returns {Promise<void>}
 */
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

/**
 * Get the attributes of a given model.
 * 
 * @param {string} modelURN 
 * @returns {Promise<void>}
 */
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

/**
 * Get the schema of a given model
 * 
 * @param {string} modelURN 
 * @returns {Promise<void>}
 */
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

/**
 * Get the fragments of a given model (used in the viewer), or for only a set
 * of elementKeys within that  model
 * 
 * @param {string} modelURN 
 * @param {Array<string>} elemKeys 
 * @returns {Promise<void>}
 */
export async function getModelDataFragments(modelURN, elemKeys) {

  console.group("STUB: getModelDataFragments()");

  let elementKeysArray = [];
  if (elemKeys == '') {
    console.log("No elementKeys specified, getting entire model...");
  }
  else {
    elementKeysArray = elemKeys.split(',');
    console.log("Element keys", elementKeysArray);
  }

  const requestPath = utils.td_baseURL + `/modeldata/${modelURN}/fragments`;

    //  create the payload for the call to /fragments
  const bodyPayload = JSON.stringify({
    includeDeleted: false,
    keys: elementKeysArray
  });

  console.log(requestPath);

  await fetch(requestPath, utils.makeReqOptsPOST(bodyPayload))
    .then((response) => response.text())
    .then((text) => {
      utils.showResult(text);

      
    })
    .catch(error => console.log('error', error));

  console.groupEnd();
}
