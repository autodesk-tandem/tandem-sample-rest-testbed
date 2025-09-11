import { getEnv } from './env.js';

// get our URL and Keys from the environment.js config file
const env = getEnv();

  // helper functions to get/show/hide HTML elements
const getElem = (id) => {return document.getElementById(id)};
const show = (id) => { getElem(id).style.display="block"};
const hide = (id) => { getElem(id).style.display="none"};


export function login() {
  const scope = encodeURIComponent('data:read data:write user-profile:read');
  doRedirection(env.forgeKey, scope);
}

export function logout() {
  delete(window.sessionStorage.token);
  location.reload();
};

  // when HTML page opens up, attach callbacks for login.logout and set values for current state UI
export async function checkLogin(idStr_login, idStr_logout, idStr_userProfile, idStr_viewer) {

  getElem(idStr_login).addEventListener("click", login);
  getElem(idStr_logout).addEventListener("click", logout);

  // Always attempt to fetch token from backend on page load
  await setTokenStorage();

  if (window.sessionStorage.token) {
    hide(idStr_login);
    show(idStr_logout);
    show(idStr_userProfile);
    loadUserProfileImg(idStr_userProfile);
    location.hash="";

    return true;  // they are logged in
  }
  else {
    hide(idStr_logout);
    hide(idStr_userProfile);

    return false; // they are not logged in
  }
}

export function doRedirection(forge_clientID, scope) {
    // Use Authorization Code flow
    const redirect_uri = encodeURIComponent('http://localhost:5000/oauth/callback');
    location.href = `${env.forgeHost}/authentication/v2/authorize?response_type=code&client_id=${forge_clientID}&redirect_uri=${redirect_uri}&scope=${scope}`;
}

export async function setTokenStorage() {
    // Fetch access token from backend after OAuth code exchange
    try {
        const res = await fetch('/api/token');
        if (res.ok) {
            const data = await res.json();
            window.sessionStorage.token = data.access_token;
        }
    } catch (e) {
        console.error('Failed to fetch access token:', e);
    }
}

  // look up the profile image for this user's Autodesk ID and put in the specified <div> in the DOM
export async function loadUserProfileImg(div) {
    const res = await fetch(`https://api.userprofile.autodesk.com/userinfo`, {
        headers : { "Authorization":`Bearer ${window.sessionStorage.token}` }
    });
    const user = await res.json();
    getElem(div).src = user.picture;
}
