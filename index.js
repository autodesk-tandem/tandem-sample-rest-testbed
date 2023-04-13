
import { checkLogin } from './login.js';
import { initLMV, startViewer } from './lmv.js';

import * as fac_stubs from './src/fac_stubs.js';
import * as group_stubs from './src/group_stubs.js';
import * as model_stubs from './src/model_stubs.js';
import * as misc_stubs from './src/misc_stubs.js';
import * as stream_stubs from './src/stream_stubs.js';
import * as prop_stubs from './src/prop_stubs.js';
import * as app_stubs from './src/app_stubs.js';
import * as diagnostic_stubs from './src/diagnostic_stubs.js';
import * as utils from './src/utils.js';

import { ColumnFamilies } from "./sdk/dt-schema.js";

/***************************************************
** FUNC: getAllFacilities()
** DESC: get the list of all facilities we own directly or that are shared with us.
**********************/

async function getAllFacilities() {
  const currentTeamFacilities = await utils.getListOfFacilitiesActiveTeam();;  // Facilities we have access to based on the current team

    // we will construct a readable table to dump out the info for the user
  let printOutFacilities = [];
  let tmp = null;
  for (let i=0; i<currentTeamFacilities.length; i++) {
    tmp = currentTeamFacilities[i];
    printOutFacilities.push({ name: tmp.settings.props["Identity Data"]["Building Name"], shared: "via current team", twinID: tmp.urn });
  }
  console.log("getListOfFacilitiesActiveTeam()", currentTeamFacilities);  // dump out raw return result

  const sharedWithMe = await utils.getListOfFacilities("@me");  // Facilities we have access to because they've been directly shared with us

  for (let i=0; i<sharedWithMe.length; i++) {
    tmp = sharedWithMe[i];
    printOutFacilities.push({ name: tmp.settings.props["Identity Data"]["Building Name"], shared: "directly with me", twinID: tmp.urn });
  }
  console.log("getUsersFacilities()", sharedWithMe);  // dump out raw return result

    // now try to print out a readable table
  console.table(printOutFacilities);

  return [].concat(currentTeamFacilities, sharedWithMe);  // return the full list for the popup selector
}

/***************************************************
** FUNC: updateThumbnailImage()
** DESC: change the thumbnail image in the "viewer" portion of the screen
**********************/

async function updateThumbnailImage() {
  const thumbnailBlobURL = await utils.getThumbnailBlobURL();
  if (thumbnailBlobURL) {
    document.getElementById("img_thumbnailPlaceholder").src = thumbnailBlobURL;
  }
  else {
    document.getElementById("img_thumbnailPlaceholder").src = "./images/no_thumbnail.png";
  }
}

/***************************************************
** FUNC: bootstrap()
** DESC: init the Tandem viewer and get the user to login via their Autodesk ID.
**********************/

async function bootstrap() {
    // login in the user and set UI elements appropriately (args are HTML elementIDs)
  const userLoggedIn = await checkLogin("btn_login", "btn_logout", "btn_userProfile", "viewer");
  if (!userLoggedIn)
    return;   // when user does login, it will go through the bootstrap process again

  const facilities = await getAllFacilities();

  if (facilities.length == 0) {
    alert("NO FACILITIES AVAILABLE");
    return;
  }

    // load preferred or random facility
  const preferredFacilityUrn = window.localStorage.getItem('tandem-testbed-rest-last-facility');
  const preferredFacility = facilities.find(f=>f.urn === preferredFacilityUrn) || facilities[0];
  utils.setCurrentFacility(preferredFacility.urn);  // store this as our "global" variable for all the stub functions
  updateThumbnailImage();

    // setup facility picker UI
  const facilityPicker = document.getElementById('facilityPicker');

  for (let facility of facilities) {
      const option = document.createElement('option');
      option.text = facility.settings.props["Identity Data"]["Building Name"];
      option.selected = facility == preferredFacility;

      facilityPicker.appendChild(option);
  }

    // if the user changes the current facility, update the thumbnail and our global variable in utils.js
  facilityPicker.onchange = async () => {
    const newFacility = facilities[facilityPicker.selectedIndex];
    window.localStorage.setItem('tandem-testbed-rest-last-facility', newFacility.urn);
    utils.setCurrentFacility(newFacility.urn);  // store this as our "global" variable for all the stub functions
    updateThumbnailImage();
  }
  facilityPicker.style.visibility = 'initial';
}


/***************************************************
** FUNC: main()
** DESC: setup all the call backs for the stub functions (bind to the HTML menu buttons)
**********************/

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
    $('#stubInput_getURN').modal('show');
    modalFuncCallbackNum = 6;
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
  $("#btn_getSavedViews").click(app_stubs.getSavedViews);
  $("#btn_getSavedViewByUUID").click(function() {
      $('#stubInput_getUUID').modal('show');
      modalFuncCallbackNum = 0;
    });

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
    else if (modalFuncCallbackNum == 6)
      model_stubs.getModelDataFragments(urn);
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
      app_stubs.getSavedViewByUUID(uuid);
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
    else if (modalFuncCallbackNum == 6)
      stream_stubs.getStreamRollupsLast30Days(keys);
    else if (modalFuncCallbackNum == 7)
      stream_stubs.postGetStreamRollupsLast30Days(keys);
    else if (modalFuncCallbackNum == 8)
      stream_stubs.addHostToStream(keys);
    else if (modalFuncCallbackNum == 9)
      stream_stubs.removeHostFromStream(keys);

    else {
      alert("ASSERT: modalFuncCallbackNum not expected.");
    }
  });

};

main();
