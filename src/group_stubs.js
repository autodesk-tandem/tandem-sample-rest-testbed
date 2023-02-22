
import * as utils from './utils.js';

/***************************************************
** FUNC: getGroups()
** DESC: Get the user groups (teams)
**********************/

export async function getGroups() {

  console.group("STUB: getGroups()");

  const requestPath = utils.td_baseURL + `/groups`;
  console.log(requestPath);

  await fetch(requestPath, utils.requestOptionsGET)
    .then((response) => response.json())
    .then((obj) => {
      utils.showResult(obj);
    })
    .catch(error => console.log('error', error));

  console.groupEnd();
}

/***************************************************
** FUNC: getGroup()
** DESC: Get a specific group
**********************/

export async function getGroup(groupURN) {

  console.group("STUB: getGroup()");

  const requestPath = utils.td_baseURL + `/groups/${groupURN}`;

  console.log(requestPath);

  await fetch(requestPath, utils.requestOptionsGET)
    .then((response) => response.json())
    .then((obj) => {
      utils.showResult(obj);
    })
    .catch(error => console.log('error', error));

  console.groupEnd();
}

/***************************************************
** FUNC: getGroupMetrics()
** DESC: Get metrics for a specific group
**********************/

export async function getGroupMetrics(groupURN) {

  console.group("STUB: getGroupMetrics()");

  const requestPath = utils.td_baseURL + `/groups/${groupURN}/metrics`;

  console.log(requestPath);

  await fetch(requestPath, utils.requestOptionsGET)
    .then((response) => response.json())
    .then((obj) => {
      utils.showResult(obj);
    })
    .catch(error => console.log('error', error));

  console.groupEnd();
}

/***************************************************
** FUNC: getFacilitiesForGroup()
** DESC: Get facilities for a specific group
**********************/

export async function getFacilitiesForGroup(groupURN) {

  console.group("STUB: getFacilitiesForGroup()");

  const requestPath = utils.td_baseURL + `/groups/${groupURN}/twins`;

  console.log(requestPath);

  await fetch(requestPath, utils.requestOptionsGET)
    .then((response) => response.json())
    .then((obj) => {
      utils.showResult(obj);
    })
    .catch(error => console.log('error', error));

  console.groupEnd();
}
