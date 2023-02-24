
import { getEnv } from '../env.js';


export let facilityURN = null;

export const td_baseURL = getEnv().tandemDbBaseURL;        // get PROD/STG from config file
export const td_baseURL_v2 = getEnv().tandemDbBaseURL_v2;  // get PROD/STG from config file

export const tdApp_baseURL = getEnv().tandemAppBaseURL;  // get PROD/STG from config file


export var myHeaders = new Headers();
myHeaders.append("Authorization", "Bearer " + window.sessionStorage.token); // use our login to the app

export var requestOptionsGET = {
  method: 'GET',
  headers: myHeaders,
  redirect: 'follow'
};

  // dump the result of the function to the Console debug window for the browser
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
** FUNC: getThumbnail()
** DESC: get the thumbnail image for the given Facility
**********************/

export async function getThumbnail() {
  const requestPath = td_baseURL + `/twins/${facilityURN}/thumbnail`;

  let response = await fetch(requestPath, requestOptionsGET);
  return response;
}

/***************************************************
** FUNC: getListOfFacilities()
** DESC: Get the facilities associated with this user
**********************/

export async function getListOfFacilities(userID) {

  const facilities = [];

  const requestPath = td_baseURL + `/users/${userID}/twins`;

  await fetch(requestPath, requestOptionsGET)
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

  const requestPath = tdApp_baseURL + `/preferences`;   // first get the active team from the App.Preferences

  await fetch(requestPath, requestOptionsGET)
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
  await fetch(requestPath2, requestOptionsGET)
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
