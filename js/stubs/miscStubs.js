/**
 * Miscellaneous STUB Functions
 * 
 * These functions demonstrate various Tandem API endpoints
 * that don't fit into other categories.
 * 
 * Output goes to browser console - open DevTools to see results.
 */

import { tandemBaseURL, makeRequestOptionsGET } from '../api.js';

/**
 * Get the health stats of the systems
 */
export async function getHealth() {
  console.group("STUB: getHealth()");

  const requestPath = `${tandemBaseURL}/health?verbose=true`;
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
 * Get the facilities associated with a user
 */
export async function getFacilitiesForUser(userID) {
  console.group("STUB: getFacilitiesForUser()");
  console.log("User ID:", userID);

  const requestPath = `${tandemBaseURL}/users/${userID}/twins`;
  console.log("Request:", requestPath);

  try {
    const response = await fetch(requestPath, makeRequestOptionsGET());
    const result = await response.json();
    console.log("Result from Tandem DB Server -->", result);
    
    // Log each facility
    for (const [key, value] of Object.entries(result)) {
      console.log(key, value);
    }
    
    console.groupEnd();
    return result;
  } catch (error) {
    console.error('Error:', error);
    console.groupEnd();
    return null;
  }
}


