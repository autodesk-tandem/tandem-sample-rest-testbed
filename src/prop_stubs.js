
import * as utils from './utils.js';


/***************************************************
** FUNC: getQualifiedProperty()
** DESC: lookup the qualified property info for a given [Category, Name] in a given model
**********************/

export async function getQualifiedProperty(categoryName, propName) {

  console.group("STUB: getQualifiedProperty()");

  const models = await utils.getListOfModels();
  console.log("Models", models);

  for (let i=0; i<models.length; i++) {
    console.group(`Model[${i}]--> ${models[i].label}`);

    const qualProp = await utils.getQualifiedProperty(models[i].modelId, categoryName, propName);
    // We could do something with the property here, buty the utils function already printed it out for us

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

    const qualProp = await utils.getQualifiedProperty(models[i].modelId, categoryName, propertyName);
    if (qualProp) {
      const bodyPayload = JSON.stringify({
        qualifiedColumns: [
          qualProp.id      // NOTE: you could list more if you know the qualifiedPropNames
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
    desc: "Updated from REST TestBedApp"
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
