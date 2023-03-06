import * as utils from './utils.js';

/***************************************************
** FUNC: showResult()
** DESC: dump the result of the function to the Console debug window for the browser
**    NOTE: duplicate of what is in utils.js because in this case we are coming from AppServer, not DbServer
**********************/

function showResultApp(obj) {
  console.log("Result from Tandem App Server -->", obj);
}

/***************************************************
** FUNC: getSavedViews()
** DESC: Call the TandemAppServer and get the Saved Views associated with the current facility
**********************/

export async function getSavedViews() {
  console.group("STUB: getSavedViews()");

  const requestPath = utils.tdApp_baseURL + `/views/${utils.facilityURN}`;
  console.log(requestPath);

  await fetch(requestPath, utils.makeReqOptsGET())
    .then(response => response.json())
    .then((obj) => {
      showResultApp(obj);
    })
    .catch(error => console.log('error', error));

  console.groupEnd();
};

/***************************************************
** FUNC: getSavedViewByUUID()
** DESC: Call the TandemAppServer and get the Saved View with the given ID
**********************/

export async function getSavedViewByUUID(viewUUID) {
  console.group("STUB: getSavedViews()");

  const requestPath = utils.tdApp_baseURL + `/views/${utils.facilityURN}/${viewUUID}`;
  console.log(requestPath);

  await fetch(requestPath, utils.makeReqOptsGET())
    .then(response => response.json())
    .then((obj) => {
      showResultApp(obj);
    })
    .catch(error => console.log('error', error));

  console.groupEnd();
};

/***************************************************
** FUNC: getClassifications()
** DESC: Call the TandemAppServer and get the Classifications associated with the current group
**********************/

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

/***************************************************
** FUNC: getClassificationByUUID()
** DESC: Call the TandemAppServer and get the Classification with given UUID
**********************/

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

/***************************************************
** FUNC: getFacilityTemplates()
** DESC: Call the TandemAppServer and get the FacilityTemplates associated with the current group
**********************/

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

/***************************************************
** FUNC: getFacilityTemplateByUUID()
** DESC: Call the TandemAppServer and get the FacilityTemplate with the given UUID
**********************/

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

/***************************************************
** FUNC: getParameters()
** DESC: Call the TandemAppServer and get the Parameters associated with the current group
**********************/

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

/***************************************************
** FUNC: getParameterByUUID()
** DESC: Call the TandemAppServer and get the ParameterSet with the given UUID
**********************/

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

/***************************************************
** FUNC: getPreferences()
** DESC: Call the TandemAppServer and get the Preferences associated with the current user
**********************/

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
