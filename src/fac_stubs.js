import * as utils from './utils.js';

/**
 * Get the information about a given Facility.
 * 
 * @returns {Promise<void>}
 */
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

/**
 * Get the template info about this Facility.
 * 
 * @returns {Promise<void>}
 */
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

/**
 * Get the template info about this Facility.
 * 
 * @returns {Promise<void>}
 */
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

/**
 * Get the user accounts for this Facility.
 * 
 * @returns {Promise<void>}
 */
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

/**
 * Get the user access levels for this Facility
 * 
 * @returns {Promise<void>}
 */
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

/**
 * Get the user access levels for this Facility (for a specific user).
 * 
 * @param {string} userID 
 * @returns {Promise<void>}
 */
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

/**
 * Get the thumbnail image for the given Facility and display in a new browser tab.
 * 
 * @returns {Promise<void>}
 */
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

/**
 * Call the TandemAppServer and get the Saved Views associated with the current facility.
 * 
 * @returns {Promise<void>}
 */
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

/**
 * Call the TandemAppServer and get the Saved View with the given ID.
 * 
 * @param {string} viewUUID 
 * @returns {Promise<void>}
 */
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

/**
 * Get the thumbnail image for the given View and display in a new browser tab.
 * 
 * @param {string} viewUUID 
 * @returns {Promise<void>}
 */
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
