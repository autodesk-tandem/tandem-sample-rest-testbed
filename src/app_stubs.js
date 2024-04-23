import * as utils from './utils.js';

/**
 * Dump the result of the function to the Console debug window for the browser.
 * 
 * NOTE: duplicate of what is in utils.js because in this case we are coming from AppServer, not DbServer
 * @param {any} obj 
 */
function showResultApp(obj) {
  console.log("Result from Tandem App Server -->", obj);
}

/**
 * Call the TandemAppServer and get the Classifications associated with the current group.
 * 
 * @param {string} groupId 
 * @returns {Promise<void>}
 */
export async function getClassifications(groupId) {
  console.group("STUB: getClassifications()");

  const requestPath = utils.tdApp_baseURL + `/groups/${groupId}/classifications`;
  console.log(requestPath);

  await fetch(requestPath, utils.makeReqOptsGET())
    .then(response => response.json())
    .then((obj) => {
      showResultApp(obj);
    })
    .catch(error => console.log('error', error));

  console.groupEnd();
};

/**
 * Call the TandemAppServer and get the Classification with given UUID.
 * 
 * @param {string} groupId 
 * @param {string} classifUUID 
 * @returns {Promise<void>}
 */
export async function getClassificationByUUID(groupId, classifUUID) {
  console.group("STUB: getClassificationByUUID()");

  const requestPath = utils.tdApp_baseURL + `/groups/${groupId}/classifications/${classifUUID}`;
  console.log(requestPath);

  await fetch(requestPath, utils.makeReqOptsGET())
    .then(response => response.json())
    .then((obj) => {
      showResultApp(obj);
    })
    .catch(error => console.log('error', error));

  console.groupEnd();
};

/**
 * Call the TandemAppServer and get the FacilityTemplates associated with the current group.
 * 
 * @param {string} groupId 
 * @returns {Promise<void>}
 */
export async function getFacilityTemplates(groupId) {
  console.group("STUB: getFacilityTemplates()");

  const requestPath = utils.tdApp_baseURL + `/groups/${groupId}/facility-templates`;
  console.log(requestPath);

  await fetch(requestPath, utils.makeReqOptsGET())
    .then(response => response.json())
    .then((obj) => {
      showResultApp(obj);
    })
    .catch(error => console.log('error', error));

  console.groupEnd();
};

/**
 * Call the TandemAppServer and get the FacilityTemplate with the given UUID.
 * 
 * @param {string} groupId 
 * @param {string} templateUUID 
 * @returns {Promise<void>}
 */
export async function getFacilityTemplateByUUID(groupId, templateUUID) {
  console.group("STUB: getFacilityTemplateByUUID()");

  const requestPath = utils.tdApp_baseURL + `/groups/${groupId}/facility-templates/${templateUUID}`;
  console.log(requestPath);

  await fetch(requestPath, utils.makeReqOptsGET())
    .then(response => response.json())
    .then((obj) => {
      showResultApp(obj);
    })
    .catch(error => console.log('error', error));

  console.groupEnd();
};

/**
 * Call the TandemAppServer and get the Parameters associated with the current group.
 * 
 * @param {string} groupId 
 * @returns {Promise<void>}
 */
export async function getParameters(groupId) {
  console.group("STUB: getParameters()");

  const requestPath = utils.tdApp_baseURL + `/groups/${groupId}/params`;
  console.log(requestPath);

  await fetch(requestPath, utils.makeReqOptsGET())
    .then(response => response.json())
    .then((obj) => {
      showResultApp(obj);
    })
    .catch(error => console.log('error', error));

  console.groupEnd();
};

/**
 * Call the TandemAppServer and get the ParameterSet with the given UUID.
 * 
 * @param {string} groupId 
 * @param {string} paramUUID 
 * @returns {Promise<void>}
 */
export async function getParameterByUUID(groupId, paramUUID) {
  console.group("STUB: getParameterByUUID()");

  //const paramUUID = "c42548f5-ee6f-44c2-8cf7-395512ee83e4";  // NOTE: it will look something like this

  const requestPath = utils.tdApp_baseURL + `/groups/${groupId}/params/${paramUUID}`;
  console.log(requestPath);

  await fetch(requestPath, utils.makeReqOptsGET())
    .then(response => response.json())
    .then((obj) => {
      showResultApp(obj);
    })
    .catch(error => console.log('error', error));

  console.groupEnd();
};

/**
 * Call the TandemAppServer and get the Preferences associated with the current user.
 * 
 * @returns {Promise<void>}
 */
export async function getPreferences() {
  console.group("STUB: getPreferences()");

  const requestPath = utils.tdApp_baseURL + `/preferences`;
  console.log(requestPath);

  await fetch(requestPath, utils.makeReqOptsGET())
    .then(response => response.json())
    .then((obj) => {
      showResultApp(obj);
    })
    .catch(error => console.log('error', error));

  console.groupEnd();
};
