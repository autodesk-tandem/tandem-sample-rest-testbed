/**
 * Group STUB Functions
 * 
 * These functions demonstrate Tandem Group API endpoints.
 * Groups (Teams) organize facilities and users.
 * 
 * Output goes to browser console - open DevTools to see results.
 */

import { tandemBaseURL, makeRequestOptionsGET, makeRequestOptionsPOST } from '../api.js';

/**
 * Get all user groups (teams)
 * 
 * @returns {Promise<Array>} Array of group objects
 */
export async function getGroups() {
  console.group("STUB: getGroups()");

  const requestPath = `${tandemBaseURL}/groups`;
  console.log("Request:", requestPath);

  try {
    const response = await fetch(requestPath, makeRequestOptionsGET());
    const result = await response.json();
    console.log("Result from Tandem DB Server -->", result);
    console.groupEnd();
    return result;
  } catch (error) {
    console.error('Error:', error);
    console.groupEnd();
    return [];
  }
}

/**
 * Get a specific group by URN
 * 
 * @param {string} groupURN - Group URN
 * @returns {Promise<Object>}
 */
export async function getGroup(groupURN) {
  console.group("STUB: getGroup()");

  const requestPath = `${tandemBaseURL}/groups/${groupURN}`;
  console.log("Request:", requestPath);

  try {
    const response = await fetch(requestPath, makeRequestOptionsGET());
    const result = await response.json();
    console.log("Result from Tandem DB Server -->", result);
    console.groupEnd();
    return result;
  } catch (error) {
    console.error('Error:', error);
    console.groupEnd();
    return null;
  }
}

/**
 * Get metrics for a specific group
 * 
 * @param {string} groupURN - Group URN
 * @returns {Promise<Object>}
 */
export async function getGroupMetrics(groupURN) {
  console.group("STUB: getGroupMetrics()");

  const requestPath = `${tandemBaseURL}/groups/${groupURN}/metrics`;
  console.log("Request:", requestPath);

  try {
    const response = await fetch(requestPath, makeRequestOptionsGET());
    const result = await response.json();
    console.log("Result from Tandem DB Server -->", result);
    console.groupEnd();
    return result;
  } catch (error) {
    console.error('Error:', error);
    console.groupEnd();
    return null;
  }
}

/**
 * Get the change history for a given Group (account/team).
 *
 * Group-level history captures events that affect the group as a whole, such as
 * facilities being added or removed from the group.  For changes to a specific
 * facility use getFacilityHistory(), and for changes to a specific model use
 * getModelHistory().
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
 *                            Common value for groups: update_group_twins
 *   limit          {number}  Limits DB rows scanned, not results returned. When typeFilter
 *                            is also set, fewer results than this number may come back
 *                            because filtering happens after the DB scan (0 = no cap).
 *
 * @param {string} groupURN  - Group URN
 * @param {number} daysBack  - How many days back to query (0 = all time)
 * @param {string} typeFilter - Optional change-type filter string
 * @param {number} limit     - Max rows to scan (0 = no limit)
 * @returns {Promise<void>}
 */
export async function getGroupHistory(groupURN, daysBack, typeFilter, limit) {
  console.group("STUB: getGroupHistory()");

  const requestPath = `${tandemBaseURL}/groups/${groupURN}/history`;
  console.log("Request:", requestPath);

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

  try {
    const response = await fetch(requestPath, makeRequestOptionsPOST(JSON.stringify(bodyPayload)));
    const entries = await response.json();
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
  } catch (error) {
    console.error('Error:', error);
  }

  console.groupEnd();
}

/**
 * Get facilities for a specific group
 * 
 * @param {string} groupURN - Group URN
 * @returns {Promise<Array>}
 */
export async function getFacilitiesForGroup(groupURN) {
  console.group("STUB: getFacilitiesForGroup()");

  const requestPath = `${tandemBaseURL}/groups/${groupURN}/twins`;
  console.log("Request:", requestPath);

  try {
    const response = await fetch(requestPath, makeRequestOptionsGET());
    const result = await response.json();
    console.log("Result from Tandem DB Server -->", result);
    console.groupEnd();
    return result;
  } catch (error) {
    console.error('Error:', error);
    console.groupEnd();
    return [];
  }
}

