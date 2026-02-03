/**
 * Model STUB Functions
 * 
 * These STUB functions demonstrate how to call Tandem Model API endpoints.
 * Output goes to the browser console (F12 or Cmd+Option+I).
 */

import { tandemBaseURL, makeRequestOptionsGET, makeRequestOptionsPOST } from '../api.js';

/**
 * Get the properties of a given model.
 * 
 * @param {string} modelURN - Model URN
 * @param {string} region - Region header
 * @returns {Promise<void>}
 */
export async function getModelProperties(modelURN, region) {
  console.group("STUB: getModelProperties()");

  const requestPath = `${tandemBaseURL}/models/${modelURN}/props`;
  console.log(requestPath);

  await fetch(requestPath, makeRequestOptionsGET(region))
    .then((response) => response.json())
    .then((obj) => {
      console.log("Result from Tandem DB Server -->", obj);
    })
    .catch(error => console.log('error', error));

  console.groupEnd();
}

/**
 * Get the given model (used for the viewer).
 * 
 * @param {string} modelURN - Model URN
 * @param {string} region - Region header
 * @returns {Promise<void>}
 */
export async function getModel(modelURN, region) {
  console.group("STUB: getModel()");

  const requestPath = `${tandemBaseURL}/modeldata/${modelURN}/model`;
  console.log(requestPath);

  await fetch(requestPath, makeRequestOptionsGET(region))
    .then((response) => response.json())
    .then((obj) => {
      console.log("Result from Tandem DB Server -->", obj);
    })
    .catch(error => console.log('error', error));

  console.groupEnd();
}

/**
 * Get the AEC model data of a given model.
 * 
 * @param {string} modelURN - Model URN
 * @param {string} region - Region header
 * @returns {Promise<void>}
 */
export async function getAECModelData(modelURN, region) {
  console.group("STUB: getAECModelData()");

  const requestPath = `${tandemBaseURL}/modeldata/${modelURN}/aecmodeldata`;
  console.log(requestPath);

  await fetch(requestPath, makeRequestOptionsGET(region))
    .then((response) => response.json())
    .then((obj) => {
      console.log("Result from Tandem DB Server -->", obj);
    })
    .catch(error => console.log('error', error));

  console.groupEnd();
}

/**
 * Get the attributes of a given model.
 * 
 * @param {string} modelURN - Model URN
 * @param {string} region - Region header
 * @returns {Promise<void>}
 */
export async function getModelDataAttrs(modelURN, region) {
  console.group("STUB: getModelDataAttrs()");

  const requestPath = `${tandemBaseURL}/modeldata/${modelURN}/attrs`;
  console.log(requestPath);

  await fetch(requestPath, makeRequestOptionsGET(region))
    .then((response) => response.json())
    .then((obj) => {
      console.log("Result from Tandem DB Server -->", obj);
    })
    .catch(error => console.log('error', error));

  console.groupEnd();
}

/**
 * Get the schema of a given model.
 * 
 * @param {string} modelURN - Model URN
 * @param {string} region - Region header
 * @returns {Promise<void>}
 */
export async function getModelDataSchema(modelURN, region) {
  console.group("STUB: getModelDataSchema()");

  const requestPath = `${tandemBaseURL}/modeldata/${modelURN}/schema`;
  console.log(requestPath);

  await fetch(requestPath, makeRequestOptionsGET(region))
    .then((response) => response.json())
    .then((obj) => {
      console.log("Result from Tandem DB Server -->", obj);
      console.table(obj.attributes);
    })
    .catch(error => console.log('error', error));

  console.groupEnd();
}

/**
 * Get the fragments of a given model (used in the viewer), or for only a set
 * of elementKeys within that model.
 * 
 * @param {string} modelURN - Model URN
 * @param {string} region - Region header
 * @param {string} elemKeys - Comma-separated element keys (optional)
 * @returns {Promise<void>}
 */
export async function getModelDataFragments(modelURN, region, elemKeys) {
  console.group("STUB: getModelDataFragments()");

  let elementKeysArray = [];
  if (elemKeys == '') {
    console.log("No elementKeys specified, getting entire model...");
  } else {
    elementKeysArray = elemKeys.split(',');
    console.log("Element keys", elementKeysArray);
  }

  const requestPath = `${tandemBaseURL}/modeldata/${modelURN}/fragments`;

  //  create the payload for the call to /fragments
  const bodyPayload = JSON.stringify({
    includeDeleted: false,
    keys: elementKeysArray
  });

  console.log(requestPath);

  await fetch(requestPath, makeRequestOptionsPOST(bodyPayload, region))
    .then((response) => response.text())
    .then((text) => {
      console.log("Result from Tandem DB Server -->", text);
    })
    .catch(error => console.log('error', error));

  console.groupEnd();
}


