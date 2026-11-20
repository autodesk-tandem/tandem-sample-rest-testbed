// Configuration for different environments

const prodEnvironment = {
  name: "prod",
  oxygenHost: "https://accounts.autodesk.com",
  apsHost: "https://developer.api.autodesk.com",
  apsKey: "clRKnlW7NbEfU1D0ukdYZ7iDaV8GXQJeH5irtVSxoFI2q0NG", // Safe to commit - this app uses PKCE (see README for details)
  loginRedirect: "http://localhost:8000",
  userProfileUrl: "https://api.userprofile.autodesk.com/userinfo",
  tandemDbBaseURL: "https://developer.api.autodesk.com/tandem/v1",
  tandemAppBaseURL: "https://tandem.autodesk.com/app",
  tandemV3BaseURL: "https://tandem.autodesk.com/api/v3", // explicit v3 endpoints are not behind the APS gateway: call the Tandem host
  tandemWebURL: "https://tandem.autodesk.com",
  regions: ['US', 'EMEA', 'AUS'],
};

const stgEnvironment = {
  name: "stg",
  oxygenHost: "https://accounts-staging.autodesk.com",
  apsHost: "https://developer-stg.api.autodesk.com",
  apsKey: "ZqM23ODo74qzT0SFz7gCZuqu2EGMSNMaWZqRXedan6d3yIyU", // Safe to commit - public PKCE client ID for staging, same as the prod key above
  loginRedirect: "http://localhost:8000",
  userProfileUrl: null, // The production profile service does not accept staging tokens
  tandemDbBaseURL: "https://developer-stg.api.autodesk.com/tandem/v1", // APS gateway, like prod: the direct tandem-stg host rejects the Region header in CORS preflight
  tandemAppBaseURL: "https://tandem-stg.autodesk.com/app",
  tandemV3BaseURL: "https://tandem-stg.autodesk.com/api/v3", // explicit v3 endpoints are not behind the APS gateway: call the Tandem host
  tandemWebURL: "https://tandem-stg.autodesk.com",
  regions: ['US', 'EMEA'], // Staging has no AUS region and answers 400 for it
};

const environments = {
  prod: prodEnvironment,
  stg: stgEnvironment
};

const ENV_STORAGE_KEY = 'tandem-sample-testbed-env';

/**
 * Work out which environment to use.
 *
 * Add `?env=stg` (or `?env=prod`) to the URL to switch. The choice is remembered in
 * localStorage so it survives the OAuth redirect and page reloads. Switching clears the
 * session tokens, because a token issued by one environment is not valid in the other.
 *
 * @returns {"prod"|"stg"}
 */
function resolveEnvironmentName() {
  const url = new URL(window.location.href);
  const requested = url.searchParams.get('env');
  const stored = window.localStorage.getItem(ENV_STORAGE_KEY) || 'prod';

  if (requested && Object.hasOwn(environments, requested)) {
    if (requested !== stored) {
      window.sessionStorage.removeItem('token');
      window.sessionStorage.removeItem('refreshToken');
      window.sessionStorage.removeItem('tokenExpiry');
    }
    window.localStorage.setItem(ENV_STORAGE_KEY, requested);

    url.searchParams.delete('env');
    window.history.replaceState({}, document.title, url.pathname + url.search + url.hash);
    return requested;
  }
  return Object.hasOwn(environments, stored) ? stored : 'prod';
}

/**
 * Get the current environment configuration
 * @returns {object} Environment configuration
 */
export function getEnv() {
  // Auto-detect redirect URL based on current location
  const isGitHubPages = window.location.hostname.includes('github.io');
  const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  
  let loginRedirect;
  if (isGitHubPages) {
    // Remove trailing slash for consistency with APS callback registration
    let path = window.location.pathname;
    if (path.endsWith('/')) {
      path = path.slice(0, -1);
    }
    loginRedirect = window.location.origin + path;
  } else if (isLocalhost) {
    loginRedirect = `http://localhost:${window.location.port || 8000}`;
  } else {
    // Default to current origin for other deployments
    loginRedirect = window.location.origin;
  }

  return {
    ...environments[resolveEnvironmentName()],
    loginRedirect: loginRedirect
  };
}
