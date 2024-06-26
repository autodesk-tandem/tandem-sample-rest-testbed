import * as utils from './utils.js';

/**
 * Get the health stats of the systems
 * 
 * @returns {Promise<void>}
 */
export async function getHealth() {

  console.group("STUB: getHealth()");

  const requestPath = utils.td_baseURL + `/health?verbose=true`;  // obviously, set to false if you want less info

  console.log(requestPath);

  //await fetch(requestPath, utils.makeReqOptsGET_noAuth())
  await fetch(requestPath, utils.makeReqOptsGET())  // TBD: Still trying to figure out why this doesn't work!!!
    .then((response) => response.json())
    .then((obj) => {
      utils.showResult(obj);
    })
    .catch(error => console.log('error', error));

  console.groupEnd();
}

/**
 * Get the facilities associated with this user.
 * 
 * @param {string} userID 
 * @returns {Promise<void>}
 */
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
