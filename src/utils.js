import { getEnv } from '../env.js';
import { AttributeType, ColumnFamilies, Region } from "../tandem/constants.js";


export let facilityURN = null;  // our global var (set by the popup menu at the top of the app)
export let facilityRegion = 'US';  // our global var (set according to seelcted facility)

export const td_baseURL = getEnv().tandemDbBaseURL;        // get PROD/STG from config file

export const tdApp_baseURL = getEnv().tandemAppBaseURL;  // get PROD/STG from config file


/**
 * Generates the request options for GET requests.
 * 
 * @returns {object}
 */
export function makeReqOptsGET(region) {
  const myHeadersGET = new Headers();

  myHeadersGET.append('Authorization', `Bearer ${window.sessionStorage.token}`); // use our login to the app
  if (region) {
    myHeadersGET.append('Region', region); // specify region header if provided
  }
  const requestOptionsGET = {
    method: 'GET',
    headers: myHeadersGET,
    redirect: 'follow'
  };

  return requestOptionsGET;
}

/**
 * Generates the request options for GET requests (without Authorization).
 * 
 * @returns {object}
 */
export function makeReqOptsGET_noAuth() {
  const myHeadersGET = new Headers();
  const requestOptionsGET = {
    method: 'GET',
    headers: myHeadersGET,
    redirect: 'follow'
  };

  return requestOptionsGET;
}

/**
 * Generates the request options for POST requests.
 * 
 * @param {string} bodyPayload 
 * @returns 
 */
export function makeReqOptsPOST(bodyPayload, region) {
  let myHeadersPOST = new Headers();
  myHeadersPOST.append('Authorization', `Bearer ${window.sessionStorage.token}`); // use our login to the app
  myHeadersPOST.append('Content-Type', 'application/json');
  if (region) {
    myHeadersPOST.append('Region', region); // specify region header if provided
  }

  let requestOptionsPOST = {
    method: 'POST',
    headers: myHeadersPOST,
    body: bodyPayload,
    redirect: 'follow'
  };

  return requestOptionsPOST;
}

/**
 * Dumps the result of the function to the Console debug window for the browser.
 * 
 * @param {object} obj 
 */
export function showResult(obj) {
  console.log("Result from Tandem DB Server -->", obj);
}

/**
 * Getter function for our global variable keeping track of the current facility.
 * 
 * @returns {string}
 */
export function getCurrentFacility()
{
  return facilityURN; // return our global var
}

/**
 * Setter function for our global variable keeping track of the current facility.
 * 
 * @param {string} urn 
 */
export function setCurrentFacility(urn, region)
{
  facilityURN = urn; // set our global var
  facilityRegion = region; // set our global var
}

/**
 * Get list of groups (teams)
 * 
 * @returns {Promise<Array<object>>}
*/
export async function getListOfGroups() {

  let teams = null;

  const requestPath = td_baseURL + `/groups`;

  await fetch(requestPath, makeReqOptsGET())
    .then((response) => response.json())
    .then((obj) => {
      teams = obj;
    })
    .catch(error => console.log('error', error));

  return teams;
}

/**
 * Get list of facilities for a specific group
 * 
 * @param {string} groupURN 
 * @returns {Promise<Array<object>>}
 */
export async function getListOfFacilitiesForGroup(groupURN) {
  let results = {};

  for (const region of Object.keys(Region)) {
    console.log(`Fetching facilities for Group: ${groupURN} in Region: ${region}`);
    // @me is a special identifier which refers to the facilities shared directly with the current user
    const requestPath = groupURN === '@me' ? `${td_baseURL}/users/@me/twins` : `${td_baseURL}/groups/${groupURN}/twins`;
    let twins = null;

    await fetch(requestPath, makeReqOptsGET(region))
      .then((response) => response.json())
      .then((obj) => {
        twins = obj;
      })
      .catch(error => console.log('error', error));
    if (twins) {
      results = {...results, ...twins};
    }
  }
  return results;
}

/**
 * Get the information about a given Facility.
 * 
 * @returns {Promise<object>}
 */
export async function getFacilityInfo(facilityURN, region) {

  let twinInfo = null;

  const requestPath = td_baseURL + `/twins/${facilityURN}`;

  await fetch(requestPath, makeReqOptsGET(region))
    .then((response) => response.json())
    .then((obj) => {
      twinInfo = obj;
    })
    .catch(error => console.log('error', error));

  return twinInfo;
}

/**
 * Get the facilities associated with this user.
 * 
 * @param {string} userID 
 * @returns {Promise<Array<object>>}
 */
export async function getListOfFacilities(userID) {

  const facilities = [];

  const requestOpts = makeReqOptsGET();
  const requestPath = td_baseURL + `/users/${userID}/twins`;

  await fetch(requestPath, requestOpts)
    .then((response) => response.json())
    .then((obj) => {
      for (const [key, value] of Object.entries(obj)) {
        //console.log(key, value);
        facilities.push( { urn: key, settings: value} );
      }
    })
    .catch(error => console.log('error', error));

    return facilities;
}

/**
 * Get the the list of Facilities owned by the current team that is active.
 * 
 * @returns {Promise<Array<object>>}
 */
export async function getListOfFacilitiesActiveTeam() {

  const facilities = [];
  let activeTeam = null;

  const requestOpts = makeReqOptsGET();
  const requestPath = tdApp_baseURL + `/preferences`;   // first get the active team from the App.Preferences

  await fetch(requestPath, requestOpts)
    .then((response) => response.json())
    .then((obj) => {
      activeTeam = obj.activeTeam;
    })
    .catch(error => console.log('error', error));

  if (activeTeam == null) {
    console.error("Couldn't get activeTeam!");
    return facilities;  // return our null list
  }

  const requestPath2 = td_baseURL + `/groups/${activeTeam}/twins`;    // now get the list of Facilities for this Group/Team
  await fetch(requestPath2, requestOpts)
    .then((response) => response.json())
    .then((obj) => {
      for (const [key, value] of Object.entries(obj)) {
        //console.log(key, value);
        facilities.push( { urn: key, settings: value} );
      }
    })
    .catch(error => console.log('error', error));

    return facilities;
}

/**
 * Get the facilities associated with this user.
 * 
 * @param {string} userID 
 * @returns {Promise<void>}
 */
export async function getFacilitiesForUser(userID) {

  let facilities = null;
  const requestPath = td_baseURL + `/users/${userID}/twins`;

  await fetch(requestPath, makeReqOptsGET())
    .then((response) => response.json())
    .then((obj) => {
      facilities = obj;
    })
    .catch(error => console.log('error', error));

  return facilities;
}

/**
 * The "default" model is the one where stream exist.  We could get all the models
 * and iterate through them looking for the one marked as default, but there is also a shortcut
 * to just swap the "dtt" to "dtm" in the Facility URN.
 * 
 * @returns {string}
 */
export function getDefaultModel() {
  const defaultModelURN = getCurrentFacility().replace("urn:adsk.dtt:", "urn:adsk.dtm:");
  return defaultModelURN;
}

/**
 * Given a modelURN, find the schema for this particular model.  This is a utilty function to retrieve it since
 * we need it in multiple other functions.
 * 
 * @param {string} modelURN 
 * @returns {Promise<object>}
 */
export async function getSchema(modelURN) {

  const requestOpts = makeReqOptsGET(facilityRegion);

  const requestPath = td_baseURL + `/modeldata/${modelURN}/schema`;
  console.log(requestPath);

  let response = await fetch(requestPath, requestOpts);
  return response;
}

/**
 * Get the the list of models for the given facility.
 * 
 * @param {string} facURN 
 * @returns {Promise<Array<object>>}
 */
export async function getListOfModels(facURN) {

  if (facURN == null)
    facURN = facilityURN; // default to the globally set one (current in app)

  let models = null;

  const requestOpts = makeReqOptsGET(facilityRegion);
  const requestPath = td_baseURL + `/twins/${facURN}`;

  await fetch(requestPath, requestOpts)
    .then((response) => response.json())
    .then((obj) => {
      models = obj.links; // this is the array of model info
    })
    .catch(error => console.log('error', error));

  return models;
}

/**
 * Lookup the qualified property info for a given [Category, Name] in a given model
 * NOTE: this returns an array of property objects because there could be duplicates for a
 * given displayName
 * 
 * @param {string} modelURN 
 * @param {string} categoryName 
 * @param {string} propName 
 * @returns {Promise<object>}
 */
export async function getQualifiedProperty(modelURN, categoryName, propName) {

  let qualProp = [];    // there can be multiple!

  await getSchema(modelURN)
    .then((response) => response.json())
    .then((obj) => {
      //showResult(obj);  // dump intermediate result...
      const attrs = obj.attributes;
      for (let i=0; i<attrs.length; i++) {
        if ((attrs[i].category === categoryName) && (attrs[i].name === propName)) {
          qualProp.push(attrs[i]);
        }
      }
      if (qualProp.length) {
        if (qualProp.length == 1) {   // this is the expected case
          console.log(`Qualified Propname for [${categoryName} | ${propName}]:`, qualProp[0]);
        }
        else {    // built-ins can have overrides and it seems user props can have duplicates
          console.warn("WARNING: There are multiple qualified properties for this name...");
          for (let j=0; j<qualProp.length; j++) {
            console.log(`Qualified Propname for [${categoryName} | ${propName}]:`, qualProp[j]);
          }
        }
      }
      else
        console.log(`Could not find [${categoryName} | ${propName}]`);
    })
    .catch(error => console.log('error', error));

  return qualProp;
}

/**
 * Lookup the qualified property info for a fully qualified Name.  This is
 * to ensure it exists and to return the full information about that paroperty (dataType, etc).
 * 
 * @param {string} modelURN 
 * @param {string} qualPropStr 
 * @returns {Promise<object>}
 */
export async function lookupQualifiedProperty(modelURN, qualPropStr) {

  let qualProp = null;    // should only be One!

  await getSchema(modelURN)
    .then((response) => response.json())
    .then((obj) => {
      //showResult(obj);  // dump intermediate result...
      const attrs = obj.attributes;
      for (let i=0; i<attrs.length; i++) {
        if (attrs[i].id === qualPropStr) {
          qualProp = attrs[i];
          break;
        }
      }
    })
    .catch(error => console.log('error', error));

  return qualProp;
}

/**
 * build a simple to deal with table of propValues for easy processing later.  We include enough info,
 * so that some processing function later can do whatever is necessary (use the Key, the Model ID, ... whatever)
 * If returnHistory=true, then it will return arrays for the property value, otherwise it will just return a single "last value".
 * 
 * @param {string} modelURN 
 * @param {Array.<object>} qualProps 
 * @param {Array.<object>} rawProps 
 * @param {boolean} returnHistory 
 * @returns {Promise<Array<object>>}
 */
export async function digOutPropertyValues(modelURN, qualProps, rawProps, returnHistory) {

  const propValues = [];

  for (let i=1; i<rawProps.length; i++) {   // NOTE: we start at index 1 because "version" is the first element in the array
    const rowObj = rawProps[i];
    if (rowObj) {
      const key = rowObj.k;   // the "key" is consistently returned

        // the rest is a map of qualProp.id and then the values in an array (in case there is history)
      for (let j=0; j<qualProps.length; j++) {
        const prop = rowObj[qualProps[j].id];
        if (prop) {
          if (returnHistory) {
              // return an array of values for the property
            propValues.push({ modelURN: modelURN, key: key, prop: qualProps[j].id, value: prop });  // push a new object that keeps track of the triple
          }
          else {
            propValues.push({ modelURN: modelURN, key: key, prop: qualProps[j].id, value: prop[0] });  // push a new object that keeps track of the triple
          }
        }
      }
    }
  }

  return propValues;
}

/**
 * Same as above, but we know the hardcoded literal for the Qualified Property (e.g. a built-in like "l:t" for the type).
 * 
 * @param {string} modelURN 
 * @param {string} qpLiteral 
 * @param {Array.<object>} rawProps 
 * @param {boolean} returnHistory 
 * @returns {Promise<Array<object>>}
 */
export async function digOutPropertyValuesQPLiteral(modelURN, qpLiteral, rawProps, returnHistory) {

  const propValues = [];

  for (let i=1; i<rawProps.length; i++) {   // NOTE: we start at index 1 because "version" is the first element in the array
    const rowObj = rawProps[i];
    if (rowObj) {
      const key = rowObj.k;   // the "key" is consistently returned


      const prop = rowObj[qpLiteral];
      if (prop) {
        if (returnHistory) {
            // return an array of values for the property
          propValues.push({ modelURN: modelURN, key: key, prop: qpLiteral, value: prop });  // push a new object that keeps track of the triple
        }
        else {
          propValues.push({ modelURN: modelURN, key: key, prop: qpLiteral, value: prop[0] });  // push a new object that keeps track of the triple
        }
      }
    }
  }

  return propValues;
}

/**
 * Scan for all props for the given elementKeys.
 * 
 * @param {string} modelURN 
 * @param {Array.<string>} elementKeys 
 * @param {boolean} showHistory 
 * @returns {Promise<Array<object>>}
 */
export async function scanAllPropsForElements(modelURN, elementKeys, showHistory) {

  let foundProps = null;

    // look for all Column Familes
  const colFamilies = [ColumnFamilies.Standard, ColumnFamilies.Refs, ColumnFamilies.Xrefs, ColumnFamilies.Source, ColumnFamilies.DtProperties];

  const bodyPayload = JSON.stringify({
    families: colFamilies,
    includeHistory: showHistory,
    keys: elementKeys
  });
  const reqOpts = makeReqOptsPOST(bodyPayload, facilityRegion);
  const requestPath = td_baseURL + `/modeldata/${modelURN}/scan`;
  console.log(requestPath);

  await fetch(requestPath, reqOpts)
    .then((response) => response.json())
    .then((obj) => {
      foundProps = obj;
    })
    .catch(error => console.log('error', error));

  return foundProps;
}

/**
 * Scan for all elements with this property
 * 
 * @param {Array.<object>} qualProps 
 * @param {string} modelURN 
 * @param {boolean} showHistory 
 * @returns {Promise<Array<object>>}
 */
export async function scanForProperty(qualProps, modelURN, showHistory) {

  let foundProps = null;

    // add the qualified ColumnFamily and if it is an override, add the original one too
  const qualColumns = [];
  for (let i=0; i<qualProps.length; i++) {
    qualColumns.push(qualProps[i].id);
  }

  const bodyPayload = JSON.stringify({
    qualifiedColumns: qualColumns,
    includeHistory: showHistory
  });
  const reqOpts = makeReqOptsPOST(bodyPayload, facilityRegion);
  const requestPath = td_baseURL + `/modeldata/${modelURN}/scan`;
  console.log(requestPath);

  await fetch(requestPath, reqOpts)
    .then((response) => response.json())
    .then((obj) => {
      foundProps = obj;
    })
    .catch(error => console.log('error', error));

  return foundProps;
}

/**
 * Scan for all elements with this property (specified by a known hardwired string in the form ["n:c", "n:v". ...])
 * 
 * @param {Array.<string>} qualProps 
 * @param {string} modelURN 
 * @param {boolean} showHistory 
 * @returns {Promise<Array<object>>}
 */
export async function scanForPropertyQPLiteral(qualProps, modelURN, showHistory) {

  let foundProps = null;

  const bodyPayload = JSON.stringify({
    qualifiedColumns: qualProps,
    includeHistory: showHistory
  });
  const reqOpts = makeReqOptsPOST(bodyPayload, facilityRegion);
  const requestPath = td_baseURL + `/modeldata/${modelURN}/scan`;
  console.log(requestPath);

  await fetch(requestPath, reqOpts)
    .then((response) => response.json())
    .then((obj) => {
      foundProps = obj;
    })
    .catch(error => console.log('error', error));

  return foundProps;
}

/**
 * Convert a blob to a BlobUrl
 * 
 * @param {Blob} blob 
 * @returns {Promise<string>}
 */
export async function blobToBlobUrl(blob) {
	return new Promise((resolve, _) => {
		const reader = new FileReader();
		reader.onloadend = () => resolve(reader.result);
		reader.readAsDataURL(blob);
	});
}

/**
 * Retrieve a thumbnail blob URL that we can use to display in the UI
 * 
 * @returns {Promise<string>}
 */
export async function getThumbnailBlobURL() {
  const requestPath = td_baseURL + `/twins/${facilityURN}/thumbnail`;
  console.log(requestPath);

  const requestOpts = makeReqOptsGET(facilityRegion);

  let retBlobURL = null;

  const response = await fetch(requestPath, requestOpts);
  if (response.ok) {
    const blob = await response.blob();
    retBlobURL = await blobToBlobUrl(blob);
  }
  else {
    console.log("ERROR: Could not retrieve a Thumbnail image for this facility.");
  }

  return retBlobURL;
}

/**
 * Retrieve a thumbnail blob URL that we can use to display in a new browser tab.
 * TBD: I'm not sure why the above version of this func doesn't work to open the BlobURL in a new tab. ????
 * 
 * @returns {Promise<Blob>}
 */
export async function getThumbnailBlob() {
  const requestPath = td_baseURL + `/twins/${facilityURN}/thumbnail`;
  console.log(requestPath);

  const requestOpts = makeReqOptsGET(facilityRegion);

  let retBlob = null;

  await fetch(requestPath, requestOpts)
    .then((response) => response.blob())
    .then((blob) => {
      retBlob = blob;
    })
    .catch(error => console.log('error', error));

  return retBlob;
}

/**
 * Retrieve a thumbnail blob URL that we can use to display in a new browser tab.
 * TBD: I'm not sure why the above version of this func doesn't work to open the BlobURL in a new tab. ????
 * 
 * @param {string} viewID 
 * @returns {Promise<Blob>}
 */
export async function getViewThumbnailBlob(viewID) {
  const requestPath = td_baseURL + `/twins/${facilityURN}/views/${viewID}/thumbnail`;
  console.log(requestPath);

  const requestOpts = makeReqOptsGET(utils.facilityRegion);

  let retBlob = null;

  await fetch(requestPath, requestOpts)
    .then((response) => response.blob())
    .then((blob) => {
      retBlob = blob;
    })
    .catch(error => console.log('error', error));

  return retBlob;
}

/**
 * Look up a specifc node in the Facility Template
 * 
 * @param {string} classificationStr 
 * @returns {Promise<object>}
 */
export async function findClassificationNode(classificationStr) {

  const requestPath = td_baseURL + `/twins/${facilityURN}/inlinetemplate`;
  //console.log(requestPath);

  let foundClassifNode = null;

  await fetch(requestPath, makeReqOptsGET(facilityRegion))
    .then((response) => response.json())
    .then((templ) => {
      //showResult(templ);
      for (let i=0; i<templ.classification.rows.length; i++) {
        const rowObj = templ.classification.rows[i];   // rowObj is an Array[3], that looks like: ['01 30 00', 'Administrative Requirements', 2]
        if (rowObj[0] === classificationStr) {
          foundClassifNode = rowObj;
          break;
        }
      }
    })
    .catch(error => console.log('error', error));

  return foundClassifNode;
}

/**
 * Returns elements from given model.
 * 
 * @param {string} urn - Model URN.
 * @param {Array.<string>|undefined} [keys] - Optional list of keys to fetch.
 * @param {Array.<string>} [columnFamilies] - Optional list of column families to fetch.
 * @returns {Promise<Array<object>>}
 */
export async function getElements(urn, keys = undefined, columnFamilies = [ ColumnFamilies.Standard ]) {
  const inputs = {
    families: columnFamilies,
    includeHistory: false,
    skipArrays: true
  };
  if (keys?.length > 0) {
    inputs.keys = keys;
  }
  const response = await fetch(`${td_baseURL}/modeldata/${urn}/scan`, makeReqOptsPOST(JSON.stringify(inputs), facilityRegion));
  const data = await response.json();

  return data.slice(1);
}

/**
 * Returns tagged assets from given model.
 * 
 * @param {string} urn 
 * @param {Array.{string}} [columnFamilies] 
 * @returns {Promise<Array<object>>}
 */
export async function getTaggedAssets(urn, columnFamilies = [ ColumnFamilies.Standard, ColumnFamilies.DtProperties, ColumnFamilies.Refs ]) {
  const inputs = {
    families: columnFamilies,
    includeHistory: false,
    skipArrays: true
  };
  const response = await fetch(`${td_baseURL}/modeldata/${urn}/scan`, makeReqOptsPOST(JSON.stringify(inputs), facilityRegion));
  const data = await response.json();
  const results = [];

  for (const item of data) {
    const keys = Object.keys(item);
    const userProps = keys.filter(k => k.startsWith(`${ColumnFamilies.DtProperties}:`));

    if (userProps.length > 0) {
      results.push(item);
    }
  }
  return results;
}

/**
 * 
 * @param {any} value 
 * @param {AttributeType} type 
 * @param {boolean} [useDefault]
 * @returns {any}
 */
export function parseInputAttrValue(value, type, useDefault = true) {
  switch(type) {
    case AttributeType.DbKey:
    case AttributeType.Integer: {
      // empty
      if (value === undefined || value === '') {
        return undefined;
      }
      return useDefault ? Number.parseInt(value) || 0 : Number.parseInt(value);
    }
    case AttributeType.Double: {
      // empty
      if (value === undefined || value === '') {
        return undefined;
      }
      if (useDefault) {
        return Number(value) || 0;
      }
      // Number("") returns 0 in contrast to Number.parseInt/Float("") which return NaN
      // If we return two different values in these cases, we will have to test for empty strings in the UI, lets do it here
      if (value === "") {
        return Number.NaN;
      }
      return Number(value);
    }
    case AttributeType.Float: {
      // empty
      if (value === undefined || value === '') {
        return undefined;
      }
      return useDefault ? Number.parseFloat(value) || 0 : Number.parseFloat(value);
    }
    case AttributeType.String: return (value || "").toString();
    case AttributeType.DateTime: {
      return value || '';
    }
    case AttributeType.Boolean: {
      // empty
      if (value === undefined || value === '') {
        return undefined;
      }
      return typeof value === "boolean"
        ? value ? 1 : 0
        : Number.parseInt(value || '0') ? 1 : 0;
    }
    default: return value;
  }
}
