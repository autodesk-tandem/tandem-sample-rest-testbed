
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

/***************************************************
** FUNC: testPromise()
** DESC: get the thumbnail image for the given Facility
**********************/

export async function testPromise() {
  console.group("STUB: testPromise()");

  const currentTeamFacilities = await utils.getListOfFacilitiesActiveTeam();;  // Facilities we have access to based on the current team

    // we will construct a readable table to dump out the info for the user
  let printOutFacilities = [];
  let tmp = null;
  for (let i=0; i<currentTeamFacilities.length; i++) {
    tmp = currentTeamFacilities[i];
    printOutFacilities.push({ name: tmp.settings.props["Identity Data"]["Building Name"], shared: "via current team", twinID: tmp.urn });
  }
  console.log("getListOfFacilitiesActiveTeam()", currentTeamFacilities);  // dump out raw return result

  const sharedWithMe = await utils.getListOfFacilities2("@me");  // Facilities we have access to because they've been directly shared with us

  for (let i=0; i<sharedWithMe.length; i++) {
    tmp = sharedWithMe[i];
    printOutFacilities.push({ name: tmp.settings.props["Identity Data"]["Building Name"], shared: "directly with me", twinID: tmp.urn });
  }
  console.log("getUsersFacilities()", sharedWithMe);  // dump out raw return result

    // now try to print out a readable table
  console.table(printOutFacilities);

  //return [].concat(currentTeamFacilities, sharedWithMe);  // return the full list for the popup selector

  console.groupEnd();
}
