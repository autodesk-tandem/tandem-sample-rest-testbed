/**
 * Main Application Entry Point
 * 
 * This orchestrates the login flow, facility selection, and STUB function UI.
 * Designed to be simple and easy to understand for developers learning the Tandem API.
 */

import { login, logout, checkLogin } from './auth.js';
import { 
  getUserResources,
  getFacilitiesForGroup,
  getFacilityInfo,
  getFacilityThumbnail,
  registerThumbnailURL,
  cleanupThumbnailURLs
} from './api.js';
import { normalizeRegion, SchemaVersion } from '../tandem/constants.js';
import { renderStubs } from './ui/stubUI.js';
import { loadSchemasForFacility, clearSchemaCache } from './state/schemaCache.js';

// DOM Elements
const loginBtn = document.getElementById('loginBtn');
const logoutBtn = document.getElementById('logoutBtn');
const userProfileLink = document.getElementById('userProfileLink');
const userProfileImg = document.getElementById('userProfileImg');
const accountSelect = document.getElementById('accountSelect');
const facilitySelect = document.getElementById('facilitySelect');
const welcomeMessage = document.getElementById('welcomeMessage');
const dashboardContent = document.getElementById('dashboardContent');
const loadingOverlay = document.getElementById('loadingOverlay');
const stubsContainer = document.getElementById('stubsContainer');
const facilityThumbnail = document.getElementById('facilityThumbnail');
const thumbnailPlaceholder = document.getElementById('thumbnailPlaceholder');

// State
let accounts = [];
let currentFacilityURN = null;
let currentFacilityRegion = null;
let userResourcesCache = null;
let facilityRegionMap = new Map();
let lastLoadedFacilityURN = null;

/**
 * Toggle loading overlay
 * @param {boolean} show - Show or hide the loading overlay
 */
function toggleLoading(show) {
  if (show) {
    loadingOverlay.classList.remove('hidden');
  } else {
    loadingOverlay.classList.add('hidden');
  }
}

/**
 * Update UI based on login state
 * @param {boolean} loggedIn - Whether user is logged in
 * @param {string} profileImg - URL to user's profile image
 */
function updateUIForLoginState(loggedIn, profileImg) {
  if (loggedIn) {
    loginBtn.classList.add('hidden');
    logoutBtn.classList.remove('hidden');
    welcomeMessage.classList.add('hidden');
    dashboardContent.classList.remove('hidden');
    
    if (profileImg) {
      userProfileImg.src = profileImg;
      userProfileLink.classList.remove('hidden');
    }
    
    accountSelect.classList.remove('hidden');
    facilitySelect.classList.remove('hidden');
  } else {
    loginBtn.classList.remove('hidden');
    logoutBtn.classList.add('hidden');
    userProfileLink.classList.add('hidden');
    welcomeMessage.classList.remove('hidden');
    dashboardContent.classList.add('hidden');
    accountSelect.classList.add('hidden');
    facilitySelect.classList.add('hidden');
  }
}

/**
 * Load and cache user resources (facilities and groups)
 * 
 * This single API call returns all facilities and groups across all regions.
 * Much more efficient than querying each region separately.
 */
async function loadUserResourcesCache() {
  try {
    console.log('Feching available accounts and facilities...');
    const startTime = Date.now();
    
    userResourcesCache = await getUserResources('@me');
    
    // Build facility region map for quick lookups (normalize region strings from API)
    facilityRegionMap.clear();
    if (userResourcesCache?.twins) {
      userResourcesCache.twins.forEach(twin => {
        facilityRegionMap.set(twin.urn, normalizeRegion(twin.region));
      });
    }
    
    const duration = Date.now() - startTime;
    console.log(`Accounts and facilities loaded in ${duration}ms`);
  } catch (error) {
    console.error('Error fetching available accounts and facilities:', error);
    userResourcesCache = { twins: [], groups: [] };
  }
}

/**
 * Build accounts and facilities data structure from cached user resources
 */
async function buildAccountsAndFacilities() {
  try {
    // Ensure cache is loaded
    if (!userResourcesCache) {
      await loadUserResourcesCache();
    }
    
    const accounts = [];
    const { twins = [], groups = [] } = userResourcesCache;
    
    // Group facility URNs by their grantedViaGroup
    const facilityUrnsByGroup = new Map();
    const directlySharedUrns = [];
    
    twins.forEach(twin => {
      if (twin.grantedViaGroup) {
        if (!facilityUrnsByGroup.has(twin.grantedViaGroup)) {
          facilityUrnsByGroup.set(twin.grantedViaGroup, []);
        }
        facilityUrnsByGroup.get(twin.grantedViaGroup).push(twin.urn);
      } else {
        directlySharedUrns.push(twin.urn);
      }
    });

    // Build accounts from groups (facilities lazy loaded)
    for (const group of groups) {
      const urns = facilityUrnsByGroup.get(group.urn) || [];
      
      accounts.push({
        id: group.urn,
        name: group.name || 'Unnamed Account',
        facilityCount: urns.length,
        facilities: null // Lazy loaded when dropdown is populated
      });
    }

    // Add directly shared facilities account if any exist
    if (directlySharedUrns.length > 0) {
      accounts.push({
        id: '@me',
        name: '** SHARED DIRECTLY **',
        facilityCount: directlySharedUrns.length,
        facilities: null // Lazy loaded when dropdown is populated
      });
    }

    return accounts;
  } catch (error) {
    console.error('Error building accounts and facilities:', error);
    return [];
  }
}

/**
 * Populate accounts dropdown
 */
async function populateAccountsDropdown(accounts) {
  accountSelect.innerHTML = '<option value="">Select Account...</option>';
  
  // Sort accounts alphabetically, but keep "** SHARED DIRECTLY **" at the end
  const sortedAccounts = [...accounts].sort((a, b) => {
    const sharedDirectlyName = '** SHARED DIRECTLY **';
    if (a.name === sharedDirectlyName) return 1;
    if (b.name === sharedDirectlyName) return -1;
    return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
  });
  
  sortedAccounts.forEach(account => {
    const option = document.createElement('option');
    option.value = account.name;
    option.textContent = account.name;
    accountSelect.appendChild(option);
  });

  // Try to restore last selected account, or select the first one
  const lastAccount = window.localStorage.getItem('tandem-testbed-ai-last-account');
  let selectedAccount = null;
  
  if (lastAccount && accounts.some(a => a.name === lastAccount)) {
    selectedAccount = lastAccount;
  } else if (sortedAccounts.length > 0) {
    selectedAccount = sortedAccounts[0].name;
  }
  
  if (selectedAccount) {
    accountSelect.value = selectedAccount;
    await populateFacilitiesDropdown(accounts, selectedAccount);
    
    // Remove placeholder after selection
    const placeholder = accountSelect.querySelector('option[value=""]');
    if (placeholder) placeholder.remove();
  }
}

/**
 * Get the last used facility for a specific account
 */
function getLastFacilityForAccount(accountName) {
  try {
    const facilitiesJson = window.localStorage.getItem('tandem-testbed-ai-last-facilities');
    if (!facilitiesJson) return null;
    
    const facilitiesMap = JSON.parse(facilitiesJson);
    return facilitiesMap[accountName] || null;
  } catch (error) {
    console.error('Error reading last facilities from localStorage:', error);
    return null;
  }
}

/**
 * Set the last used facility for a specific account
 */
function setLastFacilityForAccount(accountName, facilityURN) {
  try {
    const facilitiesJson = window.localStorage.getItem('tandem-testbed-ai-last-facilities');
    const facilitiesMap = facilitiesJson ? JSON.parse(facilitiesJson) : {};
    
    facilitiesMap[accountName] = facilityURN;
    window.localStorage.setItem('tandem-testbed-ai-last-facilities', JSON.stringify(facilitiesMap));
  } catch (error) {
    console.error('Error saving last facilities to localStorage:', error);
  }
}

/**
 * Populate facilities dropdown based on selected account
 */
async function populateFacilitiesDropdown(accounts, accountName) {
  facilitySelect.innerHTML = '<option value="">Select Facility...</option>';
  
  const account = accounts.find(a => a.name === accountName);
  if (!account) return;

  // If facilities are not loaded, load them now with names
  if (!account.facilities) {
    const { twins = [] } = userResourcesCache;
    const accountFacilities = account.id === '@me' 
      ? twins.filter(t => !t.grantedViaGroup)
      : twins.filter(t => t.grantedViaGroup === account.id);
    
    if (accountFacilities.length === 0) {
      account.facilities = [];
    } else {
      console.log(`Fetching facilities for ${accountName}...`);
      
      const facilitiesObj = await getFacilitiesForGroup(account.id);
      
      // Extract facility names from API response
      const facilities = facilitiesObj ? Object.entries(facilitiesObj).map(([urn, settings]) => ({
          urn,
          name: settings?.props?.["Identity Data"]?.["Building Name"] || 'Unnamed Facility',
          region: settings?.region || 'us'
        })) : [];

      // Cache for future use
      account.facilities = facilities;
    }
  }
  
  if (account.facilities.length === 0) {
    const option = document.createElement('option');
    option.value = '';
    option.textContent = 'No facilities available';
    option.disabled = true;
    facilitySelect.appendChild(option);
    return;
  }
  
  // Sort facilities alphabetically by name
  const sortedFacilities = [...account.facilities].sort((a, b) => 
    a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
  );
  
  sortedFacilities.forEach(facility => {
    const option = document.createElement('option');
    option.value = facility.urn;
    option.textContent = facility.name;
    facilitySelect.appendChild(option);
  });

  // Try to restore last selected facility for THIS account, or select the first one
  const lastFacility = getLastFacilityForAccount(accountName);
  let selectedFacilityURN = null;
  
  if (lastFacility && account.facilities.some(f => f.urn === lastFacility)) {
    selectedFacilityURN = lastFacility;
  } else if (sortedFacilities.length > 0) {
    selectedFacilityURN = sortedFacilities[0].urn;
  }
  
  if (selectedFacilityURN) {
    facilitySelect.value = selectedFacilityURN;
    loadFacility(selectedFacilityURN);
    
    // Remove placeholder after selection
    const placeholder = facilitySelect.querySelector('option[value=""]');
    if (placeholder) placeholder.remove();
  }
}

/**
 * Show a modal dialog for schema version incompatibility
 */
function showSchemaWarningModal(facilityName, schemaVersion) {
  // Create modal backdrop
  const backdrop = document.createElement('div');
  backdrop.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
  backdrop.id = 'schema-warning-modal';
  
  const modal = document.createElement('div');
  modal.className = 'bg-dark-card border border-dark-border rounded-lg p-6 max-w-md mx-4 shadow-xl';
  modal.innerHTML = `
    <div class="flex items-start space-x-4">
      <div class="flex-shrink-0">
        <svg class="w-8 h-8 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
        </svg>
      </div>
      <div class="flex-1">
        <h3 class="text-lg font-semibold text-dark-text mb-2">Incompatible Schema Version</h3>
        <p class="text-dark-text-secondary text-sm mb-4">
          The facility "<span class="text-dark-text font-medium">${facilityName}</span>" uses schema version ${schemaVersion}, 
          but this application requires version ${SchemaVersion} or higher.
        </p>
        <p class="text-dark-text-secondary text-sm mb-4">
          Please open this facility in <a href="https://tandem.autodesk.com" target="_blank" class="text-tandem-blue hover:underline">Autodesk Tandem</a> to upgrade it.
        </p>
        <button id="schema-warning-ok-btn" class="w-full bg-tandem-blue hover:bg-tandem-blue-dark text-white py-2 px-4 rounded text-sm font-medium transition-colors">
          OK
        </button>
      </div>
    </div>
  `;
  
  backdrop.appendChild(modal);
  document.body.appendChild(backdrop);
  
  // Close on button click
  document.getElementById('schema-warning-ok-btn').addEventListener('click', () => {
    backdrop.remove();
  });
  
  // Close on backdrop click
  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) {
      backdrop.remove();
    }
  });
  
  // Close on Escape key
  const handleEscape = (e) => {
    if (e.key === 'Escape') {
      backdrop.remove();
      document.removeEventListener('keydown', handleEscape);
    }
  };
  document.addEventListener('keydown', handleEscape);
}

/**
 * Try to load the next compatible facility in the list
 */
function tryNextCompatibleFacility(skipFacilityURN) {
  if (!facilitySelect) return;
  
  const options = Array.from(facilitySelect.options);
  for (const option of options) {
    if (option.value && option.value !== skipFacilityURN) {
      facilitySelect.value = option.value;
      facilitySelect.dispatchEvent(new Event('change'));
      return;
    }
  }
  
  // No other facilities available
  console.warn('No compatible facilities available');
}

/**
 * Load facility information and render STUB functions
 */
async function loadFacility(facilityURN) {
  if (currentFacilityURN === facilityURN && lastLoadedFacilityURN === facilityURN) {
    return; // Already loaded
  }
  
  // Get region from cache (instant lookup, no API call needed!)
  // Region is already normalized to 'US', 'EMEA', or 'AUS' during caching
  const region = facilityRegionMap.get(facilityURN) || 'US';
  
  toggleLoading(true);
  
  try {
    // Get facility info first to check schema version
    const info = await getFacilityInfo(facilityURN, region);
    const facilityName = info?.props?.['Identity Data']?.['Building Name'] || 'Unnamed Facility';
    const schemaVersion = info?.schemaVersion;
    
    // Check schema version BEFORE proceeding
    if (schemaVersion !== undefined && schemaVersion < SchemaVersion) {
      console.warn(`Facility "${facilityName}" has incompatible schema version ${schemaVersion} (required: ${SchemaVersion})`);
      
      toggleLoading(false);
      
      // Show modal warning
      showSchemaWarningModal(facilityName, schemaVersion);
      
      // Revert dropdown to last loaded facility or try next
      if (lastLoadedFacilityURN && facilitySelect) {
        facilitySelect.value = lastLoadedFacilityURN;
      } else {
        // First load - try next compatible facility
        tryNextCompatibleFacility(facilityURN);
      }
      return;
    }
    
    // Clear previous facility's schema cache
    if (currentFacilityURN && currentFacilityURN !== facilityURN) {
      clearSchemaCache();
    }
    
    currentFacilityURN = facilityURN;
    currentFacilityRegion = region;
    
    // Get thumbnail
    const thumbnailUrl = await getFacilityThumbnail(facilityURN, region);
    
    // Display thumbnail in viewer area
    if (thumbnailUrl) {
      registerThumbnailURL(thumbnailUrl);
      facilityThumbnail.src = thumbnailUrl;
      facilityThumbnail.classList.remove('hidden');
      thumbnailPlaceholder.classList.add('hidden');
    } else {
      facilityThumbnail.classList.add('hidden');
      thumbnailPlaceholder.classList.remove('hidden');
    }
    
    // Load schemas for all models (for autocomplete)
    const models = info?.links || [];
    if (models.length > 0) {
      await loadSchemasForFacility(models, region);
    }
    
    // Track successfully loaded facility
    lastLoadedFacilityURN = facilityURN;
    
    // Render STUB functions UI
    await renderStubs(stubsContainer, facilityURN, region);
    
  } catch (error) {
    console.error('Error loading facility:', error);
    stubsContainer.innerHTML = `<p class="text-red-600 text-sm p-4">Error loading facility information</p>`;
    
    // Revert dropdown on error
    if (lastLoadedFacilityURN && facilitySelect) {
      facilitySelect.value = lastLoadedFacilityURN;
    }
  } finally {
    toggleLoading(false);
  }
}

/**
 * Initialize the application
 */
async function initialize() {
  // Set up event listeners
  loginBtn.addEventListener('click', login);
  logoutBtn.addEventListener('click', logout);

  accountSelect.addEventListener('change', async (e) => {
    const accountName = e.target.value;
    if (accountName) {
      window.localStorage.setItem('tandem-testbed-ai-last-account', accountName);
      await populateFacilitiesDropdown(accounts, accountName);
      // Remove placeholder after selection
      const placeholder = accountSelect.querySelector('option[value=""]');
      if (placeholder) placeholder.remove();
    }
  });

  facilitySelect.addEventListener('change', (e) => {
    const facilityURN = e.target.value;
    if (facilityURN) {
      // Save last facility per account
      const accountName = accountSelect.value;
      if (accountName) {
        setLastFacilityForAccount(accountName, facilityURN);
      }
      loadFacility(facilityURN);
      // Remove placeholder after selection
      const placeholder = facilitySelect.querySelector('option[value=""]');
      if (placeholder) placeholder.remove();
    }
  });

  // Check login status
  toggleLoading(true);
  const { loggedIn, profileImg } = await checkLogin();
  
  if (loggedIn) {
    updateUIForLoginState(true, profileImg);
    
    // Load user resources cache first (single API call for all data)
    await loadUserResourcesCache();
    
    // Build accounts and facilities from cached data
    accounts = await buildAccountsAndFacilities();
    
    if (accounts && accounts.length > 0) {
      await populateAccountsDropdown(accounts);
    } else {
      stubsContainer.innerHTML = '<p class="text-red-600 text-sm p-4">No accounts or facilities found. Please ensure you have access to at least one Tandem facility.</p>';
    }
  } else {
    updateUIForLoginState(false, null);
  }
  
  toggleLoading(false);
}

// Clean up blob URLs when page is unloaded to prevent memory leaks
window.addEventListener('beforeunload', () => {
  cleanupThumbnailURLs();
});

// Start the application when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initialize);
} else {
  initialize();
}

/**
 * Get cached groups from user resources
 * Returns groups from the initial getUserResources call
 */
export function getCachedGroups() {
  return userResourcesCache?.groups || [];
}

/**
 * Get the current selected account/group URN
 * Returns the URN of the currently selected account in the dropdown
 */
export function getCurrentGroupURN() {
  const accountName = accountSelect.value;
  if (!accountName) return null;
  
  const account = accounts.find(a => a.name === accountName);
  return account ? account.id : null;
}

// Export for use by STUB functions
export { currentFacilityURN, currentFacilityRegion };

