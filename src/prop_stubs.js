
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
** FUNC: scanForQualifiedProperty()
** DESC: scan the DB for elements with a given property
**********************/

export async function scanForQualifiedProperty(categoryName, propertyName) {

  console.group("STUB: scanForQualifiedProperty()");

  const models = await utils.getListOfModels();
  console.log("Models", models);

  for (let i=0; i<models.length; i++) {
    console.group(`Model[${i}]--> ${models[i].label}`);

    const qualProp = await utils.getQualifiedProperty(models[i].modelId, categoryName, propertyName);
    if (qualProp) {
      const bodyPayload = JSON.stringify({
        qualifiedColumns: [
          qualProp.id      // NOTE: you could list more if you know the qualifiedPropNames
        ],
        includeHistory: false
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

  console.groupEnd();
}
