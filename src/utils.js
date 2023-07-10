
import { getEnv } from '../env.js';
import { makeWebsafe } from "../sdk/encode.js";


export let facilityURN = null;  // our global var (set by the popup menu at the top of the app)

export const td_baseURL = getEnv().tandemDbBaseURL;        // get PROD/STG from config file
export const td_baseURL_v2 = getEnv().tandemDbBaseURL_v2;  // get PROD/STG from config file

export const tdApp_baseURL = getEnv().tandemAppBaseURL;  // get PROD/STG from config file


/***************************************************
** FUNC: makeReqOptsGET()
** DESC: pull this out to consistently generate the Request Options
**********************/

export function makeReqOptsGET() {
  const myHeadersGET = new Headers();
  myHeadersGET.append("Authorization", "Bearer " + window.sessionStorage.token); // use our login to the app

  const requestOptionsGET = {
    method: 'GET',
    headers: myHeadersGET,
    redirect: 'follow'
  };

  return requestOptionsGET;
}

/***************************************************
** FUNC: makeReqOptsGET_noAuth()
** DESC: pull this out to consistently generate the Request Options
**********************/

export function makeReqOptsGET_noAuth() {
  const myHeadersGET = new Headers();
  //myHeadersGET.append("Authorization", "Bearer " + window.sessionStorage.token); // use our login to the app

  const requestOptionsGET = {
    method: 'GET',
    headers: myHeadersGET,
    redirect: 'follow'
  };

  return requestOptionsGET;
}

/***************************************************
** FUNC: makeReqOptsPOST()
** DESC: pull this out to consistently generate the Request Options
**********************/

export function makeReqOptsPOST(bodyPayload) {
  let myHeadersPOST = new Headers();
  myHeadersPOST.append("Authorization", "Bearer " + window.sessionStorage.token); // use our login to the app
  myHeadersPOST.append("Content-Type", "application/json");

  let requestOptionsPOST = {
    method: 'POST',
    headers: myHeadersPOST,
    body: bodyPayload,
    redirect: 'follow'
  };

  return requestOptionsPOST;
}

/***************************************************
** FUNC: showResult()
** DESC: dump the result of the function to the Console debug window for the browser
**********************/

export function showResult(obj) {
  console.log("Result from Tandem DB Server -->", obj);
}

/***************************************************
** FUNC: getCurrentFacility()
** DESC: getter function for our global variable keeping track of the current facility
**********************/

export function getCurrentFacility()
{
  return facilityURN; // return our global var
}

/***************************************************
** FUNC: setCurrentFacility()
** DESC: setter function for our global variable keeping track of the current facility
**********************/

export function setCurrentFacility(urn)
{
  facilityURN = urn; // set our global var
}

/***************************************************
** FUNC: getListOfFacilities()
** DESC: Get the facilities associated with this user
**********************/

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

/***************************************************
** FUNC: getListOfFacilitiesActiveTeam()
** DESC: get the the list of Facilities owned by the current team that is active
**********************/

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

/***************************************************
** FUNC: getDefaultModel()
** DESC: the "default" model is the one where stream exist.  We could get all the models
**  and iterate through them looking for the one marked as default, but there is also a shortcut
**  to just swap the "dtt" to "dtm" in the Facility URN.
**********************/

export function getDefaultModel() {
  const defaultModelURN = getCurrentFacility().replace("urn:adsk.dtt:", "urn:adsk.dtm:");
  return defaultModelURN;
}

/***************************************************
** FUNC: getSchema()
** DESC: given a modelURN, find the schema for this particular model.  This is a utilty function to retrieve it since
**  we need it in multiple other fucitons.
**********************/

export async function getSchema(modelURN) {

  const requestOpts = makeReqOptsGET();

  const requestPath = td_baseURL + `/modeldata/${modelURN}/schema`;
  console.log(requestPath);

  let response = await fetch(requestPath, requestOpts);
  return response;
}

/***************************************************
** FUNC: getListOfModels()
** DESC: get the the list of models for the given Facility
**********************/

export async function getListOfModels(facURN) {

  if (facURN == null)
    facURN = facilityURN; // default to the globally set one (current in app)

  let models = null;

  const requestOpts = makeReqOptsGET();
  const requestPath = td_baseURL + `/twins/${facURN}`;

  await fetch(requestPath, requestOpts)
    .then((response) => response.json())
    .then((obj) => {
      models = obj.links; // this is the array of model info
    })
    .catch(error => console.log('error', error));

  return models;
}

/***************************************************
** FUNC: getQualifiedProperty()
** DESC: lookup the qualified property info for a given [Category, Name] in a given model
**  NOTE: this returns an array of property objects because there could be duplicates for a
**  given displayName.
**********************/

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

/***************************************************
** FUNC: lookupQualifiedProperty()
** DESC: lookup the qualified property info for a fully qualified Name.  This is
**  to ensure it exists and to return the full information about that paroperty (dataType, etc)
**********************/

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

/***************************************************
** FUNC: digOutPropertyValues()
** DESC: build a simple to deal with table of propValues for easy processing later.  We include enough info,
**  so that some processing function later can do whatever is necessary (use the Key, the Model ID, ... whatever)
**  If returnHistory=true, then it will return arrays for the property value, otherwise it will just return a single "last value".
**********************/

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

/***************************************************
** FUNC: scanForProperty()
** DESC: scan for all elements with this property
**********************/

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
  const reqOpts = makeReqOptsPOST(bodyPayload);
  const requestPath = td_baseURL_v2 + `/modeldata/${modelURN}/scan`; // NOTE: use v2 of /scan because it returns full Keys
  console.log(requestPath);

  await fetch(requestPath, reqOpts)
    .then((response) => response.json())
    .then((obj) => {
      foundProps = obj;
    })
    .catch(error => console.log('error', error));

  return foundProps;
}

/***************************************************
** FUNC: scanForPropertyQPLiteral()
** DESC: scan for all elements with this property (specified by a known hardwired string in the form ["n:c", "n:v". ...])
**********************/

export async function scanForPropertyQPLiteral(qualProps, modelURN, showHistory) {

  let foundProps = null;

  const bodyPayload = JSON.stringify({
    qualifiedColumns: qualProps,
    includeHistory: showHistory
  });
  const reqOpts = makeReqOptsPOST(bodyPayload);
  const requestPath = td_baseURL_v2 + `/modeldata/${modelURN}/scan`; // NOTE: use v2 of /scan because it returns full Keys
  console.log(requestPath);

  await fetch(requestPath, reqOpts)
    .then((response) => response.json())
    .then((obj) => {
      foundProps = obj;
    })
    .catch(error => console.log('error', error));

  return foundProps;
}

/***************************************************
** FUNC: blobToBlobUrl()
** DESC: convert a blob to a BlobUrl
**********************/

export async function blobToBlobUrl(blob) {
	return new Promise((resolve, _) => {
		const reader = new FileReader();
		reader.onloadend = () => resolve(reader.result);
		reader.readAsDataURL(blob);
	});
}

/***************************************************
** FUNC: getThumbnailBlobURL()
** DESC: retrieve a thumbnail blob URL that we can use to display in the UI
**********************/

export async function getThumbnailBlobURL() {
  const requestPath = td_baseURL + `/twins/${facilityURN}/thumbnail`;
  console.log(requestPath);

  const requestOpts = makeReqOptsGET();

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

/***************************************************
** FUNC: getThumbnailBlob()
** DESC: retrieve a thumbnail blob URL that we can use to display in a new browser tab.
**  TBD: I'm not sure why the above version of this func doesn't work to open the BlobURL in a new tab. ????
**********************/

export async function getThumbnailBlob() {
  const requestPath = td_baseURL + `/twins/${facilityURN}/thumbnail`;
  console.log(requestPath);

  const requestOpts = makeReqOptsGET();

  let retBlob = null;

  await fetch(requestPath, requestOpts)
    .then((response) => response.blob())
    .then((blob) => {
      retBlob = blob;
    })
    .catch(error => console.log('error', error));

  return retBlob;
}

/***************************************************
** FUNC: getViewThumbnailBlob()
** DESC: retrieve a thumbnail blob URL that we can use to display in a new browser tab.
**  TBD: I'm not sure why the above version of this func doesn't work to open the BlobURL in a new tab. ????
**********************/

export async function getViewThumbnailBlob(viewID) {
  const requestPath = td_baseURL + `/twins/${facilityURN}/views/${viewID}/thumbnail`;
  console.log(requestPath);

  const requestOpts = makeReqOptsGET();

  let retBlob = null;

  await fetch(requestPath, requestOpts)
    .then((response) => response.blob())
    .then((blob) => {
      retBlob = blob;
    })
    .catch(error => console.log('error', error));

  return retBlob;
}

/***************************************************
** FUNC: findClassificationNode()
** DESC: look up a specifc node in the Facility Template
**********************/

export async function findClassificationNode(classificationStr) {

  const requestPath = td_baseURL + `/twins/${facilityURN}/inlinetemplate`;
  //console.log(requestPath);

  let foundClassifNode = null;

  await fetch(requestPath, makeReqOptsGET())
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

/***************************************************
** FUNC: makeXrefKey()
** DESC: make an Xref key for the database that is the modelURN + the element Key
**********************/

export function makeXrefKey(modelURN, elemKey) {

  const modelId = modelURN.slice(13);   // strip off the "urn:adsk.dtm:" prefix

    // convert from websafe to regular so it works with atob()
  const modelId_enc = modelId.replace(/-/g, '+').replace(/_/g, '/');
  const modelId_dec = atob(modelId_enc);

  const elemKey_enc = elemKey.replace(/-/g, '+').replace(/_/g, '/');
  const elemKey_dec = atob(elemKey_enc);

  const concatStr = modelId_dec + elemKey_dec;  // concat them together

  return makeWebsafe(btoa(concatStr));    // re-encode and make web-safe to get our xrefKey
}
