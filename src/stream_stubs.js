
import * as utils from './utils.js';

/***************************************************
** FUNC: getStreamSecrets()
** DESC: Get the secrets for the given streams
**********************/

export async function getStreamSecrets(modelURN, streamKeys) {

  console.group("STUB: getStreamSecrets()");

  const streamKeysArray = streamKeys.split(',');
  console.log("stream keys", streamKeysArray);

  /*const reqOpts = {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      "Authorization": "Bearer " + window.sessionStorage.token // use our login to the app
    },
    body: JSON.stringify({
        "keys": streamKeysArray
    })
  };*/

  var myHeaders = new Headers();
  myHeaders.append("Authorization", "Bearer " + window.sessionStorage.token); // use our login to the app
  myHeaders.append("Content-Type", "application/json");

  var raw = JSON.stringify({
    "keys": streamKeysArray
  });

  var reqOpts = {
    method: 'POST',
    headers: myHeaders,
    body: raw,
    redirect: 'follow'
  };

  const requestPath = utils.td_baseURL + `/models/${modelURN}/getstreamssecrets`;

  console.log(requestPath);

  await fetch(requestPath, reqOpts)
    .then((response) => response.json())
    .then((obj) => {
      utils.showResult(obj);
    })
    .catch(error => console.log('error', error));

  console.groupEnd();
}
