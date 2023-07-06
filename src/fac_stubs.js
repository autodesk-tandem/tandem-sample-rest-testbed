
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
** DESC: get the thumbnail image for the given Facility and display in a new browser tab
**********************/

export async function getThumbnail() {

  console.group("STUB: getThumbnail()");

  const blob = await utils.getThumbnailBlob();
  if (blob) {
    console.log("Thumbnail image opening in new browser tab.");
    //console.log(blob);
    let blobURL = URL.createObjectURL(blob, {type: blob.type});
    //console.log(blobURL);
    window.open(blobURL);
  }
  else {
    console.log("ERROR: Couldn't retrieve thumbnail image.");
  }

  console.groupEnd();
}

/***************************************************
** FUNC: getSavedViews()
** DESC: Call the TandemAppServer and get the Saved Views associated with the current facility
**********************/

export async function getSavedViews() {
  console.group("STUB: getSavedViews()");

  const requestPath = utils.td_baseURL + `/twins/${utils.facilityURN}/views`;
  console.log(requestPath);

  await fetch(requestPath, utils.makeReqOptsGET())
    .then(response => response.json())
    .then((obj) => {
      utils.showResult(obj);
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

  const requestPath = utils.td_baseURL + `/twins/${utils.facilityURN}/views/${viewUUID}`;
  console.log(requestPath);

  await fetch(requestPath, utils.makeReqOptsGET())
    .then(response => response.json())
    .then((obj) => {
      utils.showResult(obj);
    })
    .catch(error => console.log('error', error));

  console.groupEnd();
};

/***************************************************
** FUNC: getSavedViewThumbnail()
** DESC: get the thumbnail image for the given View and display in a new browser tab
**********************/

export async function getSavedViewThumbnail(viewUUID) {

  console.group("STUB: getSavedViewThumbnail()");

  const blob = await utils.getViewThumbnailBlob(viewUUID);
  if (blob) {
    console.log("Thumbnail image opening in new browser tab.");
    //console.log(blob);
    let blobURL = URL.createObjectURL(blob, {type: blob.type});
    //console.log(blobURL);
    window.open(blobURL);
  }
  else {
    console.log("ERROR: Couldn't retrieve thumbnail image.");
  }

  console.groupEnd();
}
