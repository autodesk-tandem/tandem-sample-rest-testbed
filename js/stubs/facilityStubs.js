/**
 * Facility STUB Functions
 * 
 * These STUB functions demonstrate how to call Tandem REST API endpoints.
 * Output goes to the browser console (F12 or Cmd+Option+I).
 */

import { tandemBaseURL, makeRequestOptionsGET } from '../api.js';

/**
 * Get the information about a given Facility.
 * 
 * @param {string} facilityURN - Facility URN
 * @param {string} region - Region header
 * @returns {Promise<void>}
 */
export async function getFacilityInfo(facilityURN, region) {
  console.group("STUB: getFacilityInfo()");

  const requestPath = `${tandemBaseURL}/twins/${facilityURN}`;
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
 * Get the template info about this Facility.
 * 
 * @param {string} facilityURN - Facility URN
 * @param {string} region - Region header
 * @returns {Promise<void>}
 */
export async function getFacilityTemplate(facilityURN, region) {
  console.group("STUB: getFacilityTemplate()");

  const requestPath = `${tandemBaseURL}/twins/${facilityURN}/template`;
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
 * Get the user access levels for this Facility.
 * 
 * @param {string} facilityURN - Facility URN
 * @param {string} region - Region header
 * @returns {Promise<void>}
 */
export async function getFacilityUsers(facilityURN, region) {
  console.group("STUB: getFacilityUsers()");

  const requestPath = `${tandemBaseURL}/twins/${facilityURN}/users`;
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
 * Get the inline template info about this Facility.
 * 
 * @param {string} facilityURN - Facility URN
 * @param {string} region - Region header
 * @returns {Promise<void>}
 */
export async function getInlineTemplate(facilityURN, region) {
  console.group("STUB: getInlineTemplate()");

  const requestPath = `${tandemBaseURL}/twins/${facilityURN}/inlinetemplate`;
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
 * Get the user accounts for this Facility.
 * 
 * @param {string} facilityURN - Facility URN
 * @param {string} region - Region header
 * @returns {Promise<void>}
 */
export async function getSubjects(facilityURN, region) {
  console.group("STUB: getSubjects()");

  const requestPath = `${tandemBaseURL}/twins/${facilityURN}/subjects`;
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
 * Get the user access levels for this Facility (for a specific user).
 * 
 * @param {string} facilityURN - Facility URN
 * @param {string} region - Region header
 * @param {string} userID - User ID
 * @returns {Promise<void>}
 */
export async function getFacilityUserAccessLevel(facilityURN, region, userID) {
  console.group("STUB: getFacilityUserAccessLevel()");

  const requestPath = `${tandemBaseURL}/twins/${facilityURN}/users/${userID}`;
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
 * Get the thumbnail image for the given Facility and display in a new browser tab.
 * 
 * @param {string} facilityURN - Facility URN
 * @param {string} region - Region header
 * @returns {Promise<void>}
 */
export async function getThumbnail(facilityURN, region) {
  console.group("STUB: getThumbnail()");

  const requestPath = `${tandemBaseURL}/twins/${facilityURN}/thumbnail`;
  console.log(requestPath);

  try {
    const response = await fetch(requestPath, makeRequestOptionsGET(region));
    if (response.ok) {
      const blob = await response.blob();
      console.log("Thumbnail image opening in new browser tab.");
      let blobURL = URL.createObjectURL(blob, {type: blob.type});
      window.open(blobURL);
    } else {
      console.log("ERROR: Couldn't retrieve thumbnail image.");
    }
  } catch (error) {
    console.log('error', error);
  }

  console.groupEnd();
}

/**
 * Call the TandemAppServer and get the Saved Views associated with the current facility.
 * 
 * @param {string} facilityURN - Facility URN
 * @param {string} region - Region header
 * @returns {Promise<void>}
 */
export async function getSavedViews(facilityURN, region) {
  console.group("STUB: getSavedViews()");

  const requestPath = `${tandemBaseURL}/twins/${facilityURN}/views`;
  console.log(requestPath);

  await fetch(requestPath, makeRequestOptionsGET(region))
    .then(response => response.json())
    .then((obj) => {
      console.log("Result from Tandem DB Server -->", obj);
    })
    .catch(error => console.log('error', error));

  console.groupEnd();
}

/**
 * Call the TandemAppServer and get the Saved View with the given ID.
 * 
 * @param {string} facilityURN - Facility URN
 * @param {string} region - Region header
 * @param {string} viewUUID - View UUID
 * @returns {Promise<void>}
 */
export async function getSavedViewByUUID(facilityURN, region, viewUUID) {
  console.group("STUB: getSavedViewByUUID()");

  const requestPath = `${tandemBaseURL}/twins/${facilityURN}/views/${viewUUID}`;
  console.log(requestPath);

  await fetch(requestPath, makeRequestOptionsGET(region))
    .then(response => response.json())
    .then((obj) => {
      console.log("Result from Tandem DB Server -->", obj);
    })
    .catch(error => console.log('error', error));

  console.groupEnd();
}

/**
 * Get the thumbnail image for the given View and display in a new browser tab.
 * 
 * @param {string} facilityURN - Facility URN
 * @param {string} region - Region header
 * @param {string} viewUUID - View UUID
 * @returns {Promise<void>}
 */
export async function getSavedViewThumbnail(facilityURN, region, viewUUID) {
  console.group("STUB: getSavedViewThumbnail()");

  const requestPath = `${tandemBaseURL}/twins/${facilityURN}/views/${viewUUID}/thumbnail`;
  console.log(requestPath);

  try {
    const response = await fetch(requestPath, makeRequestOptionsGET(region));
    if (response.ok) {
      const blob = await response.blob();
      console.log("Thumbnail image opening in new browser tab.");
      let blobURL = URL.createObjectURL(blob, {type: blob.type});
      window.open(blobURL);
    } else {
      console.log("ERROR: Couldn't retrieve thumbnail image.");
    }
  } catch (error) {
    console.log('error', error);
  }

  console.groupEnd();
}

