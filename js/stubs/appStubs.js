/**
 * Tandem App STUB Functions
 * 
 * These functions call the Tandem App Server (different from DB Server).
 * Used for classifications, facility templates, parameters, and preferences.
 * 
 * Output goes to browser console - open DevTools to see results.
 */

import { tandemAppBaseURL, makeRequestOptionsGET } from '../api.js';

/**
 * Get classifications for a group
 */
export async function getClassifications(groupURN) {
  console.group("STUB: getClassifications()");
  console.log("Group:", groupURN);

  const requestPath = `${tandemAppBaseURL}/groups/${groupURN}/classifications`;
  console.log("Request:", requestPath);

  try {
    const response = await fetch(requestPath, makeRequestOptionsGET());
    if (!response.ok) {
      console.error(`HTTP ${response.status}: ${response.statusText}`);
      console.groupEnd();
      return null;
    }
    const result = await response.json();
    console.log("Result from Tandem App Server -->", result);
    console.groupEnd();
    return result;
  } catch (error) {
    console.error('Error:', error);
    console.groupEnd();
    return null;
  }
}

/**
 * Get a specific classification by UUID
 */
export async function getClassificationByUUID(groupURN, classifUUID) {
  console.group("STUB: getClassificationByUUID()");
  console.log("Group:", groupURN);
  console.log("Classification UUID:", classifUUID);

  const requestPath = `${tandemAppBaseURL}/groups/${groupURN}/classifications/${classifUUID}`;
  console.log("Request:", requestPath);

  try {
    const response = await fetch(requestPath, makeRequestOptionsGET());
    if (!response.ok) {
      console.error(`HTTP ${response.status}: ${response.statusText}`);
      console.groupEnd();
      return null;
    }
    const result = await response.json();
    console.log("Result from Tandem App Server -->", result);
    console.groupEnd();
    return result;
  } catch (error) {
    console.error('Error:', error);
    console.groupEnd();
    return null;
  }
}

/**
 * Get facility templates for a group
 */
export async function getFacilityTemplates(groupURN) {
  console.group("STUB: getFacilityTemplates()");
  console.log("Group:", groupURN);

  const requestPath = `${tandemAppBaseURL}/groups/${groupURN}/facility-templates`;
  console.log("Request:", requestPath);

  try {
    const response = await fetch(requestPath, makeRequestOptionsGET());
    if (!response.ok) {
      console.error(`HTTP ${response.status}: ${response.statusText}`);
      console.groupEnd();
      return null;
    }
    const result = await response.json();
    console.log("Result from Tandem App Server -->", result);
    console.groupEnd();
    return result;
  } catch (error) {
    console.error('Error:', error);
    console.groupEnd();
    return null;
  }
}

/**
 * Get a specific facility template by UUID
 */
export async function getFacilityTemplateByUUID(groupURN, templateUUID) {
  console.group("STUB: getFacilityTemplateByUUID()");
  console.log("Group:", groupURN);
  console.log("Template UUID:", templateUUID);

  const requestPath = `${tandemAppBaseURL}/groups/${groupURN}/facility-templates/${templateUUID}`;
  console.log("Request:", requestPath);

  try {
    const response = await fetch(requestPath, makeRequestOptionsGET());
    if (!response.ok) {
      console.error(`HTTP ${response.status}: ${response.statusText}`);
      console.groupEnd();
      return null;
    }
    const result = await response.json();
    console.log("Result from Tandem App Server -->", result);
    console.groupEnd();
    return result;
  } catch (error) {
    console.error('Error:', error);
    console.groupEnd();
    return null;
  }
}

/**
 * Get parameters for a group
 */
export async function getParameters(groupURN) {
  console.group("STUB: getParameters()");
  console.log("Group:", groupURN);

  const requestPath = `${tandemAppBaseURL}/groups/${groupURN}/params`;
  console.log("Request:", requestPath);

  try {
    const response = await fetch(requestPath, makeRequestOptionsGET());
    if (!response.ok) {
      console.error(`HTTP ${response.status}: ${response.statusText}`);
      console.groupEnd();
      return null;
    }
    const result = await response.json();
    console.log("Result from Tandem App Server -->", result);
    console.groupEnd();
    return result;
  } catch (error) {
    console.error('Error:', error);
    console.groupEnd();
    return null;
  }
}

/**
 * Get a specific parameter by UUID
 */
export async function getParameterByUUID(groupURN, paramUUID) {
  console.group("STUB: getParameterByUUID()");
  console.log("Group:", groupURN);
  console.log("Parameter UUID:", paramUUID);

  const requestPath = `${tandemAppBaseURL}/groups/${groupURN}/params/${paramUUID}`;
  console.log("Request:", requestPath);

  try {
    const response = await fetch(requestPath, makeRequestOptionsGET());
    if (!response.ok) {
      console.error(`HTTP ${response.status}: ${response.statusText}`);
      console.groupEnd();
      return null;
    }
    const result = await response.json();
    console.log("Result from Tandem App Server -->", result);
    console.groupEnd();
    return result;
  } catch (error) {
    console.error('Error:', error);
    console.groupEnd();
    return null;
  }
}

/**
 * Get user preferences
 */
export async function getPreferences() {
  console.group("STUB: getPreferences()");

  const requestPath = `${tandemAppBaseURL}/preferences`;
  console.log("Request:", requestPath);

  try {
    const response = await fetch(requestPath, makeRequestOptionsGET());
    if (!response.ok) {
      console.error(`HTTP ${response.status}: ${response.statusText}`);
      console.groupEnd();
      return null;
    }
    const result = await response.json();
    console.log("Result from Tandem App Server -->", result);
    console.groupEnd();
    return result;
  } catch (error) {
    console.error('Error:', error);
    console.groupEnd();
    return null;
  }
}

