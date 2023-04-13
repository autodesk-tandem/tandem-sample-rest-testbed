
import * as utils from './utils.js';
import { ColumnFamilies } from "../sdk/dt-schema.js";
import * as sdk from '../sdk/Attribute.js';

/***************************************************
** FUNC: getQualifiedProperty()
** DESC: lookup the qualified property info for a given [Category, Name] in a given model
**********************/

export async function getQualifiedProperty(categoryName, propName) {

  console.group("STUB: getQualifiedProperty()");

  const models = await utils.getListOfModels();

  for (let i=0; i<models.length; i++) {
    console.group(`Model[${i}]--> ${models[i].label}`);
    console.log(`Model URN: ${models[i].modelId}`);

    const qualProp = await utils.getQualifiedProperty(models[i].modelId, categoryName, propName);
    // We could do something with the property here, buty the utils function already printed it out for us

    console.groupEnd();
  }

  console.groupEnd();
}

/***************************************************
** FUNC: scanForUserProps()
** DESC: scan the DB for elements with a given property
**********************/

export async function scanForUserProps() {

  console.group("STUB: scanForUserProps()");

  const models = await utils.getListOfModels();
  //console.log("Models", models);

  const showHistory = false;  // change this if you want history

  for (let i=0; i<models.length; i++) {
    console.group(`Model[${i}]--> ${models[i].label}`);
    console.log(`Model URN: ${models[i].modelId}`);

    const bodyPayload = JSON.stringify({
        families: [
          "z"
        ],
        includeHistory: showHistory
      });

    const reqOpts = utils.makeReqOptsPOST(bodyPayload);
    //const requestPath = utils.td_baseURL + `/modeldata/${models[i].modelId}/scan`;
    const requestPath = utils.td_baseURL_v2 + `/modeldata/${models[i].modelId}/scan`; // NOTE: use v2 of /scan because it returns full Keys
    console.log(requestPath);

    await fetch(requestPath, reqOpts)
      .then((response) => response.json())
      .then((obj) => {
        utils.showResult(obj);
      })
      .catch(error => console.log('error', error));

    console.groupEnd();
  }

  console.groupEnd();
}

/***************************************************
** FUNC: scanForQualifiedPropertyImp()
** DESC: scan the DB for elements with a given property
**********************/

export async function scanForQualifiedPropertyImp(categoryName, propertyName, showHistory) {

  const models = await utils.getListOfModels();
  //console.log("Models", models);

  for (let i=0; i<models.length; i++) {
    console.group(`Model[${i}]--> ${models[i].label}`);
    console.log(`Model URN: ${models[i].modelId}`);

    const qualProps = await utils.getQualifiedProperty(models[i].modelId, categoryName, propertyName);
    if (qualProps && qualProps.length) {
      const rawProps = await utils.scanForProperty(qualProps, models[i].modelId, showHistory);
      utils.showResult(rawProps);
      const extractedProps = await utils.digOutPropertyValues(models[i].modelId, qualProps, rawProps, showHistory);
      if (extractedProps)
        console.table(extractedProps);
    }

    console.groupEnd();
  }
}

/***************************************************
** FUNC: scanForQualifiedProperty()
** DESC: scan the DB for elements with a given property
**********************/

export async function scanForQualifiedProperty(categoryName, propertyName) {

  console.group("STUB: scanForQualifiedProperty()");

  await scanForQualifiedPropertyImp(categoryName, propertyName, false);

  console.groupEnd();
}

/***************************************************
** FUNC: scanForQualifiedPropertyWithHistory()
** DESC: scan the DB for elements with a given property
**********************/

export async function scanForQualifiedPropertyWithHistory(categoryName, propertyName) {

  console.group("STUB: scanForQualifiedPropertyWithHistory()");

  await scanForQualifiedPropertyImp(categoryName, propertyName, true);

  console.groupEnd();
}

/***************************************************
** FUNC: findElementsWherePropValueEqualsX()
** DESC: get a specific property across multiple items selected where the property value is what
** we are looking for.   EXAMPLE: find all elements where "Common | Name" = "Basic Wall".  You can
** also specify whether to treat the matchStr as a Javascript regular expression, and you can specify
** whether to only search the elements that are visible in the viewer, or search all elements in the db
**********************/

export async function findElementsWherePropValueEqualsX(propCategory, propName, matchStr, isRegEx, isCaseInsensitive) {

  console.group("STUB: findElementsWherePropValueEqualsX()");

  const models = await utils.getListOfModels();

  for (let i=0; i<models.length; i++) {
    console.group(`Model[${i}]--> ${models[i].label}`);
    console.log(`Model URN: ${models[i].modelId}`);

    const qualProps = await utils.getQualifiedProperty(models[i].modelId, propCategory, propName);
    if (qualProps && qualProps.length) {
      const rawProps = await utils.scanForProperty(qualProps, models[i].modelId, false);
      const propValues = await utils.digOutPropertyValues(models[i].modelId, qualProps, rawProps, false);
      if (propValues && propValues.length) {
        console.log("Raw properties returned-->", rawProps);
        console.log("Extracted properties-->", propValues);

          // now see if they match our expression
        let matchingProps = null;
        if (isRegEx) {
          let regEx = null;
          if (isCaseInsensitive)
            regEx = new RegExp(matchStr, "i");
          else
            regEx = new RegExp(matchStr);

          console.log("Doing RegularExpression match for:", regEx);
          matchingProps = propValues.filter(prop => regEx.test(prop.value)); // filter out the ones that match our query using a RegEx
        }
        else {
          if (isCaseInsensitive) {
            console.log(`Doing case insensitive match for: "${matchStr}..."`);
            matchingProps = propValues.filter(prop => prop.value.toLowerCase() === matchStr.toLowerCase());   // filter out the ones that match our query exactly
          }
          else {
            console.log(`Doing literal match for: "${matchStr}..."`);
            matchingProps = propValues.filter(prop => prop.value === matchStr);   // filter out the ones that match our query exactly
          }
        }

        if (matchingProps.length) {
          console.log("Matching property values-->");
          console.table(matchingProps);
        }
        else {
          console.log("No elements found with that value");
        }
      }
      else {
        console.log("Could not find any elements with that property: ", propName);
      }
    }

    console.groupEnd();
  }

  console.groupEnd();
}

/***************************************************
** FUNC: assignClassification()
** DESC: apply a Classification to the selected elements, which will determine which Properties
** are associated with the element. NOTE: the act of applying the classification will cause the
** associated properties to show up in subsequent calls to get the property, but as of now, the value
** is "undefined".  To give the value a default or initial value, you have to make a subsequent call
** via some code like setPropertySingleElement() in the above example.
**
** NOTE: if you need help figuring out raw input (classifStr, modelURN, elementKeys), use the TandemTestBedApp
** with the embedded Viewer.  It will allow you to select elements and then convert the selection to Keys:
** See Stub: "Model Stubs: ViewerIDs -> ElementIds"
**********************/

export async function assignClassification(classificationStr, modelURN, elementKeys) {

  const classificationNode = await utils.findClassificationNode(classificationStr);
  if (classificationNode == null) {
    alert("Could not find that classification in the current Facility Template.");
    return;
  }

  const elementKeysArray = elementKeys.split(',');
  if (elementKeysArray.length == 0) {
    alert("ERROR: no element keys specified.");
    return;
  }

  console.group("STUB: assignClassification()");

  console.log("Element keys:", elementKeysArray);
  console.log("Classification node-->", classificationNode);
  console.log(`Setting classifiction to "${classificationStr}"`);

    // create the mutations array. Number if mutations must match number of elements, even if they all
    // the same mutation.
  const mutsArray = [];
  for (let i=0; i<elementKeysArray.length; i++) {
    const mutObj = ["i", "n", "!v", classificationStr];  // "i"=insert, "n:!v" is the hardwired qualified PropName to overrid classificaiton.
    mutsArray.push(mutObj);
  }
    //  create the payload for the call to /mutate
  const bodyPayload = JSON.stringify({
    keys: elementKeysArray,
    muts: mutsArray,
    desc: "REST TestBedApp: updated classification"
  });

  const reqOpts = utils.makeReqOptsPOST(bodyPayload);
  const requestPath = utils.td_baseURL + `/modeldata/${modelURN}/mutate`;
  console.log(requestPath);

  await fetch(requestPath, reqOpts)
    .then((response) => response.json())
    .then((obj) => {
      utils.showResult(obj);
    })
    .catch(error => console.log('error', error));

  console.groupEnd();
}

/***************************************************
** FUNC: getScanBruteForce()
** DESC: Get all the main properties for elements in the database
**********************/

export async function getScanBruteForce(modelURN) {

  console.group("STUB: getScanBruteForce()");

  //const requestPath = utils.td_baseURL_v2 + `/modeldata/${modelURN}/scan`;    // TBD: this has been flaky!
  const requestPath = utils.td_baseURL + `/modeldata/${modelURN}/scan`;

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
** FUNC: getScanElementsOptions()
** DESC: get the properties for a specific set of Keys
**********************/

export async function getScanElementsOptions(modelURN, elemKeys, history, colFamilies) {

  console.group("STUB: getScanElementsOptions()");

  const elemKeysArray = elemKeys.split(',');
  console.log("Element keys", elemKeysArray);

  let bodyPayload = JSON.stringify({
    families: colFamilies,
    includeHistory: history,
    keys: elemKeysArray
  });
  const reqOpts = utils.makeReqOptsPOST(bodyPayload);

  const requestPath = utils.td_baseURL_v2 + `/modeldata/${modelURN}/scan`;
  console.log(requestPath);

  await fetch(requestPath, reqOpts)
    .then((response) => response.json())
    .then((obj) => {
      utils.showResult(obj);
    })
    .catch(error => console.log('error', error));

  console.groupEnd();
}

/***************************************************
** FUNC: getScanElementsFullChangeHistory()
** DESC: get the full change history of all properties for the given elements
**********************/

export async function getScanElementsFullChangeHistory(modelURN, elemKeys) {

  console.group("STUB: getScanElementsFullChangeHistory()");

  const elemKeysArray = elemKeys.split(',');
  console.log("Element keys", elemKeysArray);

  let bodyPayload = JSON.stringify({
    includeHistory: true,
    keys: elemKeysArray
  });
  const reqOpts = utils.makeReqOptsPOST(bodyPayload);

  const requestPath = utils.td_baseURL_v2 + `/modeldata/${modelURN}/scan`;

  console.log(requestPath);

  await fetch(requestPath, reqOpts)
    .then((response) => response.json())
    .then((obj) => {
      utils.showResult(obj);
    })
    .catch(error => console.log('error', error));

  console.groupEnd();
}

/***************************************************
** FUNC: setPropertySelSet()
** DESC: set prop values on the selected entities
**********************/

export async function setPropertySelSet(propCategory, propName, propVal, modelURN, elementKeys) {

  const qualProp = await utils.getQualifiedProperty(modelURN, propCategory, propName);
  if (qualProp == null) {
    alert("Could not find that property in the current Facility Template.");
    return;
  }

  const elementKeysArray = elementKeys.split(',');
  if (elementKeysArray.length == 0) {
    alert("ERROR: no element keys specified.");
    return;
  }

  console.group("STUB: setPropertySelSet()");

  const typedValue =  sdk.parseInputAttrValue(propVal, qualProp.dataType);  // convert from the String in dialog input to proper data type

  console.log("Element keys:", elementKeysArray);
  console.log(`Setting value for "${propCategory} | ${propName}" = `, typedValue);

    // create the mutations array. Number of mutations must match number of elements, even if they all
    // the same mutation.
  const mutsArray = [];
  for (let i=0; i<elementKeysArray.length; i++) {
    const mutObj = ["i", qualProp.fam, qualProp.col, typedValue];  // "i"=insert
    mutsArray.push(mutObj);
  }
    //  create the payload for the call to /mutate
  const bodyPayload = JSON.stringify({
    keys: elementKeysArray,
    muts: mutsArray,
    desc: "REST TestBedApp: updated property"
  });

  const reqOpts = utils.makeReqOptsPOST(bodyPayload);
  const requestPath = utils.td_baseURL + `/modeldata/${modelURN}/mutate`;
  console.log(requestPath);

  await fetch(requestPath, reqOpts)
    .then((response) => response.json())
    .then((obj) => {
      utils.showResult(obj);
    })
    .catch(error => console.log('error', error));

  console.groupEnd();
}

/***************************************************
** FUNC: setPropertySelSetQP()
** DESC: set prop values on the selected entities
**********************/

export async function setPropertySelSetQP(qualPropStr, propVal, modelURN, elementKeys) {

  const qualProp = await utils.lookupQualifiedProperty(modelURN, qualPropStr);
  if (qualProp == null) {
    alert("Could not find that property in the current Facility Template.");
    return;
  }

  const elementKeysArray = elementKeys.split(',');
  if (elementKeysArray.length == 0) {
    alert("ERROR: no element keys specified.");
    return;
  }

  console.group("STUB: setPropertySelSetQP()");

  const typedValue =  sdk.parseInputAttrValue(propVal, qualProp.dataType);  // convert from the String in dialog input to proper data type

  console.log("Element keys:", elementKeysArray);
  console.log(`Setting value for "${qualProp.category} | ${qualProp.name}" = `, typedValue);

    // create the mutations array. Number of mutations must match number of elements, even if they all
    // the same mutation.
  const mutsArray = [];
  for (let i=0; i<elementKeysArray.length; i++) {
    const mutObj = ["i", qualProp.fam, qualProp.col, typedValue];  // "i"=insert
    mutsArray.push(mutObj);
  }
    //  create the payload for the call to /mutate
  const bodyPayload = JSON.stringify({
    keys: elementKeysArray,
    muts: mutsArray,
    desc: "REST TestBedApp: updated property"
  });

  const reqOpts = utils.makeReqOptsPOST(bodyPayload);
  const requestPath = utils.td_baseURL + `/modeldata/${modelURN}/mutate`;
  console.log(requestPath);

  await fetch(requestPath, reqOpts)
    .then((response) => response.json())
    .then((obj) => {
      utils.showResult(obj);
    })
    .catch(error => console.log('error', error));

  console.groupEnd();
}
