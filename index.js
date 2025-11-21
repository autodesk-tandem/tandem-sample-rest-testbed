
import { checkLogin } from './login.js';

import * as fac_stubs from './src/fac_stubs.js';
import * as group_stubs from './src/group_stubs.js';
import * as model_stubs from './src/model_stubs.js';
import * as misc_stubs from './src/misc_stubs.js';
import * as stream_stubs from './src/stream_stubs.js';
import * as prop_stubs from './src/prop_stubs.js';
import * as app_stubs from './src/app_stubs.js';
import * as sdk_stubs from './src/sdk_stubs.js';
import * as diagnostic_stubs from './src/diagnostic_stubs.js';
import * as utils from './src/utils.js';

import { ColumnFamilies, RegionLabelMap, SchemaVersion } from './tandem/constants.js';


/**
 * Check to see if there is at least one account with one facility
 * 
 * @param {any} teams
 * @returns {boolean}
 */
function noFacilitiesAvailable(teams) {

    // check if we are part of any accounts
  if (teams == null) {
    alert("No account found. Make sure you have an account setup in Autodesk Tandem.");
    return true;
  }

  let foundOne = false;
  for (let i = 0; i < teams.length; i++) {
    if (teams[i].facilities.size > 0) {    // check if map of twins is empty
      foundOne = true;
      break;
    }
  }
  if (!foundOne) {
    alert("No facilities found. Make sure you have access to at least one facility in Autodesk Tandem.");
    return true;
  }

  return false; // this means we are OK
}

/**
 * Alphabetically sort the Facilities by BuildingName and return a Map instead of the original Object
 * 
 * @param {any} facilities
 * @returns {Map}
 */
function sortFacilities(facilities) {
  // Convert the object entries to an array of key-value pairs
  const entries = Object.entries(facilities);

  // Sort the entries based on the `Building Name` property in the values
  const sortedEntries = entries.sort((a, b) => {
      const nameA = a[1].props['Identity Data']?.['Building Name'].toLowerCase();
      const nameB = b[1].props['Identity Data']?.['Building Name'].toLowerCase();

      return nameA.localeCompare(nameB);
  });

  // Convert the sorted entries back into a Map so we can use more easily later on
  const sortedMap = new Map(sortedEntries);

  return sortedMap;
}

/**
 * Build up a structure that includes all Teams and their respective Facilities
 * 
 * @returns {object}
 */
async function buildTeamsAndFacilitiesStructure() {

    // get the list of all teams and then sort them alphabetically
  let teams = await utils.getListOfGroups();

  if (teams) {
      // for each team, get the info about its facilities and assign to a new property we create
    for (let i=0; i<teams.length; i++) {
      teams[i].facilities = sortFacilities(await utils.getListOfFacilitiesForGroup(teams[i].urn));
    }
    teams.sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase())); // Sort alphabetically
  }

    // there are also Facilities that are just shared directly with a given user.
    // make a "fake" team to be represented in the drop down if we have some of these
  const sharedWithMe = await utils.getFacilitiesForUser("@me");  // Facilities we have access to because they've been directly shared with us
  if (sharedWithMe != null) {
    const fakeTeam = { name: "** SHARED DIRECTLY **", facilities: sharedWithMe };

    fakeTeam.facilities = sortFacilities(sharedWithMe);

    if (teams == null)  // ?? might be impossible to not have at least one team, but let's be sure
        teams = [];
    teams.push(fakeTeam);   // always push to end, regardless of alphabetical place
  }

  return teams;
}

async function getTeams() {
  let teams = await utils.getListOfGroups();

  teams.sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()));
  teams.push({
    name: "** SHARED DIRECTLY **",
    urn: "@me"
  });
  return teams;
}

/**
 * Populate the entries in the Teams dropdown menu
 * 
 * @param {any} teams
 * @returns {Promise<void>}
 */
async function populateTeamsDropdown(teams) {

  const acctPicker = document.getElementById('acctPicker');
  const preferredTeam = window.localStorage.getItem('tandem-testbed-rest-last-team');  // the last one that was used

  const safePreferredTeam = teams.find(t => t.name === preferredTeam) || teams[0];   // make sure we can find last used, or else use first

    // add all the account names to the acct dropdown picker
  for (const team of teams) {
    const option = document.createElement('option');

    option.value = team.urn;
    option.text = team.name;
    option.selected = team.name === safePreferredTeam.name;  // set initial selection in dropdown
    acctPicker.appendChild(option);
  }
  await populateFacilitiesDropdown(safePreferredTeam);
  // this callback will load the Facilities when the dropdown list gets a different selection
  acctPicker.onchange = () => {
    const newTeamUrn = acctPicker.value;
    const team = teams.find(t => t.urn === newTeamUrn);

    window.localStorage.setItem('tandem-testbed-rest-last-team', team.name);
    populateFacilitiesDropdown(team);
  }
  acctPicker.style.visibility = 'initial';
}

/**
 * Populate the entries in the Facilities dropdown menu
 * 
 * @param {any} teams
 * @param {string} teamName
 * @returns {Promise<void>}
 */
async function populateFacilitiesDropdown(team) {
  // setup facility picker UI
  const facilityPicker = document.getElementById('facilityPicker');
  
  facilityPicker.innerHTML = '';  // clear out any previous options
  // load preferred or random facility
  const preferredFacilityURN = window.localStorage.getItem('tandem-testbed-rest-last-facility');

  if (!team.facilities) {
    team.facilities = sortFacilities(await utils.getListOfFacilitiesForGroup(team.urn));
  }
  // see if we can find that one in our list of facilities
  let [safeFacilityURN, facility] = team.facilities.entries().next().value;

  for (const [key, value] of team.facilities.entries()) {
      if (key === preferredFacilityURN) {
        safeFacilityURN = key;
        facility = value;
        break; // Exit the loop once the key is found
      }
  }
  // now build the dropdown list
  for (const [key, value] of team.facilities.entries()) {
    const option = document.createElement('option');

    option.value = key;
    option.text = value.props['Identity Data']?.['Building Name'];
    option.selected = key == safeFacilityURN;
    facilityPicker.appendChild(option);
  }

  utils.setCurrentFacility(safeFacilityURN, RegionLabelMap[facility.region]);  // store this as our "global" variable for all the stub functions
  await checkSchemaVersion(safeFacilityURN, RegionLabelMap[facility.region]);  // Check schema version and display warning if incompatible
  updateThumbnailImage();

    // this callback will load the facility that the user picked in the Facility dropdown
  facilityPicker.onchange = async () => {
    const facilityURN = facilityPicker.value;
    const facility = team.facilities.get(facilityURN); 
    
    window.localStorage.setItem('tandem-testbed-rest-last-facility', facilityURN);
    utils.setCurrentFacility(facilityURN, RegionLabelMap[facility.region]);  // store this as our "global" variable for all the stub functions
    await checkSchemaVersion(facilityURN, RegionLabelMap[facility.region]);  // Check schema version and display warning if incompatible
    updateThumbnailImage();
  }
  facilityPicker.style.visibility = 'initial';
}


/**
 * Change the thumbnail image in the "viewer" portion of the screen.
 * 
 * @returns {Promise<void>}
 */
async function updateThumbnailImage() {
  const thumbnailBlobURL = await utils.getThumbnailBlobURL();
  if (thumbnailBlobURL) {
    document.getElementById("img_thumbnailPlaceholder").src = thumbnailBlobURL;
  }
  else {
    document.getElementById("img_thumbnailPlaceholder").src = "./images/no_thumbnail.png";
  }
}

/**
 * Check if the facility has a compatible schema version.
 * If not, display a warning message and return false.
 * 
 * @param {string} facilityURN - Facility URN to check
 * @returns {Promise<boolean>} - True if compatible, false otherwise
 */
async function checkSchemaVersion(facilityURN, region) {
  try {
    const facilityInfo = await utils.getFacilityInfo(facilityURN, region);
    
    if (!facilityInfo || facilityInfo.schemaVersion === undefined) {
      console.warn('Unable to determine facility schema version');
      return true; // Allow to proceed if we can't determine version
    }
    
    if (facilityInfo.schemaVersion < SchemaVersion) {
      // Display warning message
      const imgElement = document.getElementById("img_thumbnailPlaceholder");
      imgElement.style.display = 'none';
      
      // Create or update warning div
      let warningDiv = document.getElementById("schema_version_warning");
      if (!warningDiv) {
        warningDiv = document.createElement('div');
        warningDiv.id = "schema_version_warning";
        warningDiv.style.cssText = `
          padding: 40px;
          margin: 20px;
          background-color: #fff3cd;
          border: 2px solid #ffc107;
          border-radius: 8px;
          text-align: center;
        `;
        imgElement.parentNode.appendChild(warningDiv);
      }
      
      warningDiv.innerHTML = `
        <h3 style="color: #856404; margin-bottom: 20px;">
          ⚠️ Incompatible Schema Version
        </h3>
        <p style="color: #856404; font-size: 16px; margin-bottom: 15px;">
          This facility is using <strong>schema version ${facilityInfo.schemaVersion}</strong>.
        </p>
        <p style="color: #856404; font-size: 16px; margin-bottom: 15px;">
          The API currently only supports <strong>schema version ${SchemaVersion}</strong>.
        </p>
        <p style="color: #856404; font-size: 16px; margin-bottom: 20px;">
          To use this facility, please open it in <strong>Autodesk Tandem</strong> first to upgrade the schema.
        </p>
        <a href="https://tandem.autodesk.com" target="_blank" class="btn btn-warning" style="font-size: 16px;">
          Open in Tandem
        </a>
      `;
      
      console.warn(`⚠️ Facility schema version (${facilityInfo.schemaVersion}) is incompatible. Required: ${SchemaVersion}`);
      return false;
    } else {
      // Schema version is compatible, remove warning if it exists
      const warningDiv = document.getElementById("schema_version_warning");
      if (warningDiv) {
        warningDiv.remove();
      }
      const imgElement = document.getElementById("img_thumbnailPlaceholder");
      imgElement.style.display = 'block';
      return true;
    }
  } catch (error) {
    console.error('Error checking schema version:', error);
    return true; // Allow to proceed on error
  }
}

/** 
 * Init the Tandem viewer and get the user to login via their Autodesk ID.
 * 
 * @returns {Promise<void>}
 */
async function bootstrap() {
    // login in the user and set UI elements appropriately (args are HTML elementIDs)
  const userLoggedIn = await checkLogin("btn_login", "btn_logout", "btn_userProfile", "viewer");
  if (!userLoggedIn)
    return;   // when user does login, it will go through the bootstrap process again

  const teams = await getTeams();
  
  console.log("Teams:", teams);
  populateTeamsDropdown(teams);
}

/**
 * Setup all the call backs for the stub functions (bind to the HTML menu buttons)
 * 
 * @returns {Promise<void>}
 */
async function main() {
    // init the Viewer and login
  await bootstrap();

  //console.log('Begin stall for input stub loading...');
  //await new Promise(resolve => setTimeout(resolve, 2000)); // 2 sec
  //console.log('End stall.');

    // bind all the callbacks from the UI to the stub functions
    // TBD: not super happy about how this callback mechanism works... I did trial and error
    // forever to get these partial HTML snippets to work for the modal input.  Will try later
    // to make a more elegant mechanism.  (JMA - 03/28/22)
  var modalFuncCallbackNum = 0;

      // Facility Stubs
  $("#btn_getFacilityInfo").click(fac_stubs.getFacilityInfo);
  $("#btn_getFacilityTemplate").click(fac_stubs.getTemplate);
  $("#btn_getFacilityInlineTemplate").click(fac_stubs.getInlineTemplate);
  $("#btn_getFacilitySubjects").click(fac_stubs.getSubjects);
  $("#btn_getFacilityUserAccessLevels").click(fac_stubs.getFacilityUserAccessLevels);
  $("#btn_getFacilityUserAccessLevel").click(function() {
    $('#stubInput_getUserID').modal('show');
    modalFuncCallbackNum = 0;
  });
  $("#btn_getFacilityThumbnail").click(fac_stubs.getThumbnail);
  $("#btn_getSavedViews").click(fac_stubs.getSavedViews);
  $("#btn_getSavedViewByUUID").click(function() {
      $('#stubInput_getUUID').modal('show');
      modalFuncCallbackNum = 0;
    });
  $("#btn_getSavedViewThumbnail").click(function() {
      $('#stubInput_getUUID').modal('show');
      modalFuncCallbackNum = 1;
    });

    // Group Stubs
  $("#btn_getGroups").click(group_stubs.getGroups);

  $("#btn_getGroup").click(function() {
    $('#stubInput_getURN').modal('show');
    modalFuncCallbackNum = 0;
  });

  $("#btn_getGroupMetrics").click(function() {
    $('#stubInput_getURN').modal('show');
    modalFuncCallbackNum = 1;
  });

  $("#btn_getFacilitiesForGroup").click(function() {
    $('#stubInput_getURN').modal('show');
    modalFuncCallbackNum = 2;
  });


    // Model Stubs
  $("#btn_getModelProperties").click(function() {
    $('#stubInput_getURN').modal('show');
    modalFuncCallbackNum = 3;
  });
  $("#btn_getAECModelData").click(function() {
    $('#stubInput_getURN').modal('show');
    modalFuncCallbackNum = 4;
  });
  $("#btn_getModelDataAttrs").click(function() {
    $('#stubInput_getURN').modal('show');
    modalFuncCallbackNum = 5;
  });
  $("#btn_getModelDataFragments").click(function() {
    $('#stubInput_getURNandKeys').modal('show');
    modalFuncCallbackNum = 2;
  });
  $("#btn_getModel").click(function() {
    $('#stubInput_getURN').modal('show');
    modalFuncCallbackNum = 7;
  });
  $("#btn_getModelDataSchema").click(function() {
    $('#stubInput_getURN').modal('show');
    modalFuncCallbackNum = 11;
  });

    // Property Stubs
  $("#btn_getQualifiedProp").click(function() {
    $('#stubInput_getPropertyName').modal('show');
    modalFuncCallbackNum = 0;
  });

  $("#btn_scanForUserProps").click(prop_stubs.scanForUserProps);

  $("#btn_scanForQualifiedProp").click(function() {
    $('#stubInput_getPropertyName').modal('show');
    modalFuncCallbackNum = 1;
  });
  $("#btn_scanForQualifiedPropWithHistory").click(function() {
    $('#stubInput_getPropertyName').modal('show');
    modalFuncCallbackNum = 2;
  });
  $("#btn_findElementsWherePropValueEqualsX").click(function() {
    $('#stubInput_getPropertyFilter').modal('show');
    modalFuncCallbackNum = 0;
  });
  $("#btn_assignClassificaiton").click(function() {
    $('#stubInput_setClassification').modal('show');
    modalFuncCallbackNum = 0;
  });
  $("#btn_getScanBruteForce").click(function() {
    $('#stubInput_getURN').modal('show');
    modalFuncCallbackNum = 12;
  });
  $("#btn_getScanElementsOptions").click(function() {
    $('#stubInput_getScanOptions').modal('show');
    modalFuncCallbackNum = 0;
  });
  $("#btn_getScanElementsQualProps").click(function() {
    $('#stubInput_getScanQualProps').modal('show');
    modalFuncCallbackNum = 0;
  });
  $("#btn_getScanElementsFullChangeHistory").click(function() {
    $('#stubInput_getURNandKeys').modal('show');
    modalFuncCallbackNum = 0;
  });
  $("#btn_setPropertyOnElements").click(function() {
    $('#stubInput_setPropertyValue').modal('show');
    modalFuncCallbackNum = 0;
  });
  $("#btn_setPropertyOnElementsQP").click(function() {
    $('#stubInput_setPropertyValueQP').modal('show');
    modalFuncCallbackNum = 0;
  });

    // Stream Stubs
  $("#btn_getStreamsFromDefaultModelPOST").click(stream_stubs.getStreamsFromDefaultModelPOST);

  $("#btn_getStreamSecrets").click(function() {
    $('#stubInput_getKeys').modal('show');
    modalFuncCallbackNum = 0;
  });
  $("#btn_resetStreamSecrets").click(function() {
    $('#stubInput_getKeys').modal('show');
    modalFuncCallbackNum = 1;
  });
  $("#btn_getStreamValues30Days").click(function() {
    $('#stubInput_getKeys').modal('show');
    modalFuncCallbackNum = 2;
  });
  $("#btn_getStreamValues365Days").click(function() {
    $('#stubInput_getKeys').modal('show');
    modalFuncCallbackNum = 3;
  });
  $("#btn_postNewStreamValues").click(function() {
    $('#stubInput_getKeys').modal('show');
    modalFuncCallbackNum = 4;
  });
  $("#btn_getLastSeenStreamValues").click(function() {
    $('#stubInput_getKeys').modal('show');
    modalFuncCallbackNum = 5;
  });
  $("#btn_getStreamRollup30Days").click(function() {
    $('#stubInput_getKeys').modal('show');
    modalFuncCallbackNum = 6;
  });
  $("#btn_postGetStreamRollup30Days").click(function() {
    $('#stubInput_getKeys').modal('show');
    modalFuncCallbackNum = 7;
  });
  $("#btn_createStream").click(function() {
    $('#stubInput_createStream').modal('show');
  });
  $("#btn_assignHostToStream").click(function() {
    $('#stubInput_addStreamHost').modal('show');
  });
  $("#btn_removeHostFromStream").click(function() {
    $('#stubInput_getKeys').modal('show');
    modalFuncCallbackNum = 9;
  });
  $("#btn_deleteStream").click(function() {
    $('#stubInput_getKeys').modal('show');
    modalFuncCallbackNum = 10;
  });

    // MISC Stubs
  $("#btn_getHealth").click(misc_stubs.getHealth);
  $("#btn_getFacilitiesForMe").click(function() {
    misc_stubs.getFacilitiesForUser("@me");
  });
  $("#btn_getFacilitiesForUser").click(function() {
    $('#stubInput_getUserID').modal('show');
    modalFuncCallbackNum = 1;
  });


    // App Stubs
  $("#btn_getClassifications").click(function() {
      $('#stubInput_getURN').modal('show');
      modalFuncCallbackNum = 8; // URN , not UUID
    });

  $("#btn_getClassificationByUUID").click(function() {
      $('#stubInput_getURNandUUID').modal('show');
      modalFuncCallbackNum = 0;
    });

  $("#btn_getFacilityTemplates").click(function() {
      $('#stubInput_getURN').modal('show');
      modalFuncCallbackNum = 9; // URN , not UUID
    });

  $("#btn_getFacilityTemplateByUUID").click(function() {
      $('#stubInput_getURNandUUID').modal('show');
      modalFuncCallbackNum = 1;
    });

  $("#btn_getParameters").click(function() {
      $('#stubInput_getURN').modal('show');
      modalFuncCallbackNum = 10;
    });

  $("#btn_getParameterByUUID").click(function() {
      $('#stubInput_getURNandUUID').modal('show');
      modalFuncCallbackNum = 2;
    });

  $("#btn_getPreferences").click(app_stubs.getPreferences);

    // SDK Stubs
  $("#btn_getRoomsAndSpaces").click(sdk_stubs.getRoomsAndSpaces);
  $("#btn_getLevels").click(sdk_stubs.getLevels);
  $("#btn_getElementAndTypeProperties").click(function() {
    $('#stubInput_getURNandKeys').modal('show');
    modalFuncCallbackNum = 1;
  });
  $("#btn_getFacilityStructure").click(sdk_stubs.getFacilityStructure);
    // Diagnostic Stubs
  $("#btn_checkForDuplicateProperties").click(diagnostic_stubs.checkForDuplicateProperties);



    // this gets called from above via modal dialog (#btn_getGroup, and others)
  $('#stubInput_getURN_OK').click(function() {
    const urn = $("#stubInput_urn").val();

    if (modalFuncCallbackNum == 0)
      group_stubs.getGroup(urn);
    else if (modalFuncCallbackNum == 1)
      group_stubs.getGroupMetrics(urn);
    else if (modalFuncCallbackNum == 2)
      group_stubs.getFacilitiesForGroup(urn);
    else if (modalFuncCallbackNum == 3)
      model_stubs.getModelProperties(urn);
    else if (modalFuncCallbackNum == 4)
      model_stubs.getAECModelData(urn);
    else if (modalFuncCallbackNum == 5)
      model_stubs.getModelDataAttrs(urn);
    else if (modalFuncCallbackNum == 7)
      model_stubs.getModel(urn);
    else if (modalFuncCallbackNum == 8)
      app_stubs.getClassifications(urn);
    else if (modalFuncCallbackNum == 9)
      app_stubs.getFacilityTemplates(urn);
    else if (modalFuncCallbackNum == 10)
      app_stubs.getParameters(urn);
    else if (modalFuncCallbackNum == 11)
      model_stubs.getModelDataSchema(urn);
    else if (modalFuncCallbackNum == 12)
      prop_stubs.getScanBruteForce(urn);
    else {
      alert("ASSERT: modalFuncCallbackNum not expected.");
    }
  });

    // this gets called from above via modal dialog (#btn_getGroup, and others)
  $('#stubInput_getUserID_OK').click(function() {
    const userID = $("#stubInput_userID").val();

    if (modalFuncCallbackNum == 0)
      fac_stubs.getFacilityUserAccessLevel(userID);
    else if (modalFuncCallbackNum == 1)
      misc_stubs.getFacilitiesForUser(userID);
    else {
      alert("ASSERT: modalFuncCallbackNum not expected.");
    }
  });

  $('#stubInput_getUUID_OK').click(function() {
    const uuid = $("#stubInput_uuid").val();

    if (modalFuncCallbackNum == 0)
      fac_stubs.getSavedViewByUUID(uuid);
    else if (modalFuncCallbackNum == 1)
      fac_stubs.getSavedViewThumbnail(uuid);
    else {
      alert("ASSERT: modalFuncCallbackNum not expected.");
    }
  });

  $('#stubInput_getURNandUUID_OK').click(function() {
    const urn = $("#stubInput_urnuuid_urn").val();
    const uuid = $("#stubInput_urnuuid_uuid").val();

    if (modalFuncCallbackNum == 0)
      app_stubs.getClassificationByUUID(urn, uuid);
    else if (modalFuncCallbackNum == 1)
      app_stubs.getFacilityTemplateByUUID(urn, uuid);
    else if (modalFuncCallbackNum == 2)
      app_stubs.getParameterByUUID(urn, uuid);
    else {
      alert("ASSERT: modalFuncCallbackNum not expected.");
    }
  });

  $('#stubInput_getURNandKeys_OK').click(function() {
    const urn = $("#stubInput_urnkeys_urn").val();
    const keys = $("#stubInput_urnkeys_key").val();

    if (modalFuncCallbackNum == 0)
      prop_stubs.getScanElementsFullChangeHistory(urn, keys);
    else if (modalFuncCallbackNum == 1)
      sdk_stubs.getElementAndTypeProperties(urn, keys);
    else if (modalFuncCallbackNum == 2)
      model_stubs.getModelDataFragments(urn, keys);
    else {
      alert("ASSERT: modalFuncCallbackNum not expected.");
    }
  });

  $('#stubInput_getScanOptions_OK').click(function() {
    const urn = $("#stubInput_scanoptions_urn").val();
    const keys = $("#stubInput_scanoptions_key").val();

    const history = $("#stubInput_scanOptions_history").is(":checked");

    const cf_std = $("#stubInput_scanOptions_cf_standard").is(":checked");
    const cf_refs = $("#stubInput_scanOptions_cf_refs").is(":checked");
    const cf_xrefs = $("#stubInput_scanOptions_cf_xrefs").is(":checked");
    const cf_source = $("#stubInput_scanOptions_cf_source").is(":checked");
    const cf_user = $("#stubInput_scanOptions_cf_user").is(":checked");

    const colFamilies = [];
    if (cf_std)
      colFamilies.push(ColumnFamilies.Standard);
    if (cf_refs)
      colFamilies.push(ColumnFamilies.Refs);
    if (cf_xrefs)
      colFamilies.push(ColumnFamilies.Xrefs);
    if (cf_source)
      colFamilies.push(ColumnFamilies.Source);
    if (cf_user)
      colFamilies.push(ColumnFamilies.DtProperties);

    if (modalFuncCallbackNum == 0)
      prop_stubs.getScanElementsOptions(urn, keys, history, colFamilies);
    else {
      alert("ASSERT: modalFuncCallbackNum not expected.");
    }
  });

  $('#stubInput_getScanQualProps_OK').click(function() {
    const urn = $("#stubInput_scanQualProps_urn").val();
    const qualProps = $("#stubInput_scanQualProps_qps").val();
    const keys = $("#stubInput_scanQualProps_key").val();

    const history = $("#stubInput_scanQualProps_history").is(":checked");

    if (modalFuncCallbackNum == 0)
      prop_stubs.getScanElementsQualProps(urn, keys, history, qualProps);
    else {
      alert("ASSERT: modalFuncCallbackNum not expected.");
    }
  });

/*    $("#btn_restGetQualifiedProp").click(rest_stubs.restGetQualifiedProperty);
    $("#btn_restScanQualifiedProp").click(rest_stubs.restScanQualifiedProperty);*/


    // this gets called from above via modal dialog (#btn_getQualifiedPropName, and others)
  $('#stubInput_getPropertyName_OK').click(function() {
    const propCategory = $("#stubInput_propCategory").val();
    const propName = $("#stubInput_propName").val();

    if (modalFuncCallbackNum == 0)
      prop_stubs.getQualifiedProperty(propCategory, propName);
    else if (modalFuncCallbackNum == 1)
      prop_stubs.scanForQualifiedProperty(propCategory, propName);
    else if (modalFuncCallbackNum == 2)
      prop_stubs.scanForQualifiedPropertyWithHistory(propCategory, propName);
    else {
      alert("ASSERT: modalFuncCallbackNum not expected.");
    }
  });

    // this gets called from above via modal dialog (#btn_setPropertySelSet, and others)
  $('#stubInput_setPropertyValue_OK').click(function() {
    const propCategory = $("#stubInput_propCategorySet").val();
    const propName = $("#stubInput_propNameSet").val();
    const propVal = $("#stubInput_propValSet").val();
    const modelURN = $("#stubInput_propURNSet").val();
    const keys = $("#stubInput_propKeysSet").val();

    if (modalFuncCallbackNum == 0)
      prop_stubs.setPropertySelSet(propCategory, propName, propVal, modelURN, keys);
    else {
      alert("ASSERT: modalFuncCallbackNum not expected.");
    }
  });

    // this gets called from above via modal dialog (#btn_setPropertySelSetQP, and others)
  $('#stubInput_setPropertyValueQP_OK').click(function() {
    const qualPropStr = $("#stubInput_propSetQP").val();
    const propVal = $("#stubInput_propValSetQP").val();
    const modelURN = $("#stubInput_propURNSetQP").val();
    const keys = $("#stubInput_propKeysSetQP").val();

    if (modalFuncCallbackNum == 0)
      prop_stubs.setPropertySelSetQP(qualPropStr, propVal, modelURN, keys);
    else {
      alert("ASSERT: modalFuncCallbackNum not expected.");
    }
  });

    // this gets called from above via modal dialog (#btn_findElementsWherePropValueEqualsX)
  $('#stubInput_getPropertyFilter_OK').click(function() {
    const propCategory = $("#stubInput_propCategoryFilter").val();
    const propName = $("#stubInput_propNameFilter").val();
    const matchStr = $("#stubInput_propValFilter").val();
    const isRegEx = $("#stubInput_propValIsRegEx").is(":checked");
    const isCaseInsensitive = $("#stubInput_propValIsCaseInsensitive").is(":checked");

    prop_stubs.findElementsWherePropValueEqualsX(propCategory, propName, matchStr, isRegEx, isCaseInsensitive);
  });

    // this gets called from above via modal dialog (#btn_assignClassification)
  $('#stubInput_setClassification_OK').click(function() {
    const classificationStr = $("#stubInput_classificationStr").val();
    const modelURN = $("#stubInput_classificationURN").val();
    const keys = $("#stubInput_classificationKeys").val();

    prop_stubs.assignClassification(classificationStr, modelURN, keys);
  });

    // this gets called from above via modal dialog (#btn_createStream)
  $('#stubInput_createStream_OK').click(function() {
    const name = $("#stubInput_createStreamName").val();
    const modelURN = $("#stubInput_createStreamModelURN").val();
    const elemKey = $("#stubInput_createStreamElemKey").val();
    const classificationStr = $("#stubInput_createStreamClassifStr").val();

    stream_stubs.createStream(name, modelURN, elemKey, classificationStr);
  });

    // this gets called from above via modal dialog (#btn_addStreamHost)
  $('#stubInput_addStreamHost_OK').click(function() {
    const streamKey = $("#stubInput_addStreamHostStreamKey").val();
    const modelURN = $("#stubInput_addStreamHostModelURN").val();
    const elemKey = $("#stubInput_addStreamHostElemKey").val();

    stream_stubs.assignHostToStream(streamKey, modelURN, elemKey);
  });

    // this gets called from above via modal dialog (#btn_getStreamSecrets) and others
  $('#stubInput_getKeys_OK').click(function() {
    const keys = $("#stubInput_keys").val();

    if (modalFuncCallbackNum == 0)
      stream_stubs.getStreamSecrets(keys);
    else if (modalFuncCallbackNum == 1)
      stream_stubs.resetStreamSecrets(keys);
    else if (modalFuncCallbackNum == 2)
      stream_stubs.getStreamValues30Days(keys);
    else if (modalFuncCallbackNum == 3)
      stream_stubs.getStreamValues365Days(keys);
    else if (modalFuncCallbackNum == 4)
      stream_stubs.postNewStreamValues(keys);
    else if (modalFuncCallbackNum == 5)
      stream_stubs.getLastSeenStreamValues(keys);
    else if (modalFuncCallbackNum == 8)
      stream_stubs.addHostToStream(keys);
    else if (modalFuncCallbackNum == 9)
      stream_stubs.removeHostFromStream(keys);
    else if (modalFuncCallbackNum == 10)
      stream_stubs.deleteStreams(keys);
    else {
      alert("ASSERT: modalFuncCallbackNum not expected.");
    }
  });

};


// trigger things when the HTML is loaded
document.addEventListener('DOMContentLoaded', function() {
  //console.log("DOMContentLoaded");
  main();
});
