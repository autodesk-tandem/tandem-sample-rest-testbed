/**
 * Facility STUB Functions
 * 
 * These STUB functions demonstrate how to call Tandem REST API endpoints.
 * Output goes to the browser console (F12 or Cmd+Option+I).
 */

import { tandemBaseURL, makeRequestOptionsGET, makeRequestOptionsPOST } from '../api.js';

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
 * Get the classification schema assigned to this Facility.
 *
 * A classification is a hierarchical taxonomy (e.g. Uniformat, OmniClass) that
 * organises elements into categories.  This endpoint returns the raw classification
 * object, which is different from the two template endpoints:
 *
 *   GET /twins/{id}/classification  — the classification schema itself (this call)
 *   GET /twins/{id}/template        — template skeleton (pset references, no classification rows)
 *   GET /twins/{id}/inlinetemplate  — full expanded template including psets and parameters
 *
 * Response shape:
 *   uuid  {string}  Unique identifier of the classification
 *   name  {string}  Display name (e.g. "Uniformat")
 *   rows  {Array}   Classification entries, each with code, description, and level
 *
 * Returns 200 with the classification object, or an empty body if none is assigned.
 *
 * @param {string} facilityURN - Facility URN
 * @param {string} region      - Region header
 * @returns {Promise<void>}
 */
export async function getFacilityClassification(facilityURN, region) {
  console.group("STUB: getFacilityClassification()");

  const requestPath = `${tandemBaseURL}/twins/${facilityURN}/classification`;
  console.log(requestPath);

  await fetch(requestPath, makeRequestOptionsGET(region))
    .then((response) => response.json())
    .then((obj) => {
      console.log("Result from Tandem DB Server -->", obj);
      if (obj && obj.rows) {
        console.log(`Classification: "${obj.name}" (uuid: ${obj.uuid})`);
        console.log(`Total rows: ${obj.rows.length}`);
        console.table(obj.rows.slice(0, 20)); // show first 20 rows — classifications can be large
        if (obj.rows.length > 20) {
          console.log(`... and ${obj.rows.length - 20} more rows (see full result above)`);
        }
      } else {
        console.log("No classification assigned to this facility.");
      }
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
 * Get the change history for a given Facility (twin).
 *
 * This endpoint aggregates changes across all models within the facility, so you
 * don't need to know individual model URNs.  It is the right place to look for
 * facility-level events such as template application, classification changes, and
 * user access updates.
 *
 * Uses POST (not GET) because the query carries a body.  Despite being a POST it
 * is a pure read operation (access level: read).
 *
 * Request body shape (btstore.HistoryQuery):
 *   min            {number}  Start of time range — milliseconds since epoch (required)
 *   max            {number}  End of time range   — milliseconds since epoch (required)
 *   includeChanges {boolean} Always sent as true. Without it the server omits the change
 *                            type (o) and description (d) — the response is nearly useless.
 *   typeFilter     {string}  Optional — keep only entries whose change type matches exactly.
 *                            Common values for twins: apply_template, remove_template,
 *                            update_classification, acl_update, mutate, bulk_import
 *   limit          {number}  Limits DB rows scanned, not results returned. When typeFilter
 *                            is also set, fewer results than this number may come back
 *                            because filtering happens after the DB scan (0 = no cap).
 *
 * @param {string} facilityURN - Facility URN
 * @param {string} region      - Region header
 * @param {number} daysBack    - How many days back to query (0 = all time)
 * @param {string} typeFilter  - Optional change-type filter string
 * @param {number} limit       - Max rows to scan (0 = no limit)
 * @returns {Promise<void>}
 */
export async function getFacilityHistory(facilityURN, region, daysBack, typeFilter, limit) {
  console.group("STUB: getFacilityHistory()");

  const requestPath = `${tandemBaseURL}/twins/${facilityURN}/history`;
  console.log(requestPath);

  const now = Date.now();
  const min = daysBack > 0 ? now - (daysBack * 24 * 60 * 60 * 1000) : 1;
  const max = now;

  // includeChanges must be true to receive the change type (o) and description (d).
  // Without it the server omits those fields and the response is nearly useless.
  const bodyPayload = {
    min,
    max,
    includeChanges: true
  };

  if (typeFilter && typeFilter.trim() !== '') {
    bodyPayload.typeFilter = typeFilter.trim();
  }

  if (limit > 0) {
    bodyPayload.limit = limit;
  }

  if (limit > 0 && typeFilter) {
    console.warn(`limit=${limit} controls DB rows scanned, not results returned. With typeFilter='${typeFilter}', fewer than ${limit} results may come back because the filter is applied after the DB scan.`);
  }

  console.log("Request body -->", bodyPayload);

  await fetch(requestPath, makeRequestOptionsPOST(JSON.stringify(bodyPayload), region))
    .then((response) => response.json())
    .then((entries) => {
      console.log("Result from Tandem DB Server -->", entries);
      console.log(`Total entries returned: ${entries.length}`);
      if (entries.length > 0) {
        const changeTypes = [...new Set(entries.map(e => e.o).filter(Boolean))];
        console.log("Distinct change types in response:", changeTypes);
        console.table(entries.map(e => ({
          timestamp: new Date(e.t).toISOString(),
          user: e.n,
          type: e.o,
          description: e.d
        })));
      }
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

