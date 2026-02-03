/**
 * Group STUB Functions
 * 
 * These functions demonstrate Tandem Group API endpoints.
 * Groups (Teams) organize facilities and users.
 * 
 * Output goes to browser console - open DevTools to see results.
 */

import { tandemBaseURL, makeRequestOptionsGET } from '../api.js';

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

