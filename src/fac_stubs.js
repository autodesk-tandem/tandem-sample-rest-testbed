
import * as utils from './utils.js';

/***************************************************
** FUNC: getFacilityInfo()
** DESC: get the information about a given Facility
**********************/

export async function getFacilityInfo() {

  console.group("STUB: getFacilityInfo()");

  const requestPath = utils.td_baseURL + `/twins/${utils.facilityURN}`;
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
** FUNC: getTemplate()
** DESC: get the template info about this Facility
**********************/

export async function getTemplate() {

  console.group("STUB: getTemplate()");

  const requestPath = utils.td_baseURL + `/twins/${utils.facilityURN}/template`;
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
** FUNC: getInlineTemplate()
** DESC: get the template info about this Facility
**********************/

export async function getInlineTemplate() {

  console.group("STUB: getInlineTemplate()");

  const requestPath = utils.td_baseURL + `/twins/${utils.facilityURN}/inlinetemplate`;
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
** FUNC: getSubjects()
** DESC: get the user accounts for this Facility
**********************/

export async function getSubjects() {

  console.group("STUB: getSubjects()");

  const requestPath = utils.td_baseURL + `/twins/${utils.facilityURN}/subjects`;
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
** FUNC: getFacilityUserAccessLevels()
** DESC: get the user access levels for this Facility
**********************/

export async function getFacilityUserAccessLevels() {

  console.group("STUB: getFacilityUserAccessLevels()");

  const requestPath = utils.td_baseURL + `/twins/${utils.facilityURN}/users`;
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
** FUNC: getFacilityUserAccessLevel()
** DESC: get the user access levels for this Facility (for a specific user)
**********************/

export async function getFacilityUserAccessLevel(userID) {

  console.group("STUB: getFacilityUserAccessLevel()");

  const requestPath = utils.td_baseURL + `/twins/${utils.facilityURN}/users/${userID}`;
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
** FUNC: getThumbnail()
** DESC: get the thumbnail image for the given Facility
**********************/

export async function getThumbnail() {

  console.group("STUB: getThumbnail()");

    // in this case, we won't actually call for the resource.  Clicking on the endpoint in the browser
    // debugger console will fetch it and display it.

  const requestPath = utils.td_baseURL + `/twins/${utils.facilityURN}/thumbnail`;
  console.log(requestPath);

  console.log("Click in the link above ^^^ to fetch and display thumbnail image.");

  await fetch(requestPath, utils.makeReqOptsGET())
    .then((obj) => {
      utils.showResult(obj);
    })
    .catch(error => console.log('error', error));

  console.groupEnd();
}
