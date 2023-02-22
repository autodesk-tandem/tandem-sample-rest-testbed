
import { getEnv } from '../env.js';


export const facilityURN = "urn:adsk.dtt:d5eZt_XtRzqUHT93-vNZxw";

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
** FUNC: getListOfFacilities()
** DESC: Get the facilities associated with this user
**********************/

export async function getListOfFacilities(userID) {

  const requestPath = td_baseURL + `/users/${userID}/twins`;

  let response = await fetch(requestPath, requestOptionsGET);
  return response;
}
