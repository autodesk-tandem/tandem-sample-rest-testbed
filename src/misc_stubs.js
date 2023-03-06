
import * as utils from './utils.js';

/***************************************************
** FUNC: getHealth()
** DESC: Get the health stats of the systems
**********************/

export async function getHealth() {

  console.group("STUB: getHealth()");

  const requestPath = utils.td_baseURL + `/health?verbose=true`;  // obviously, set to false if you want less info

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
** FUNC: getFacilitiesForUser()
** DESC: Get the facilities associated with this user
**********************/

export async function getFacilitiesForUser(userID) {

  console.group("STUB: getFacilitiesForUser()");

  const requestPath = utils.td_baseURL + `/users/${userID}/twins`;

  console.log(requestPath);

  await fetch(requestPath, utils.makeReqOptsGET())
    .then((response) => response.json())
    .then((obj) => {
      utils.showResult(obj);

      for (const [key, value] of Object.entries(obj)) {
        console.log(key, value);
      }
    })
    .catch(error => console.log('error', error));

  console.groupEnd();
}
