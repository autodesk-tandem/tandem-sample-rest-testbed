
import { checkLogin } from './login.js';
import { initLMV, startViewer } from './lmv.js';

import * as fac_stubs from './src/fac_stubs.js';
import * as group_stubs from './src/group_stubs.js';
import * as model_stubs from './src/model_stubs.js';
import * as misc_stubs from './src/misc_stubs.js';
import * as stream_stubs from './src/stream_stubs.js';
import * as prop_stubs from './src/prop_stubs.js';
import * as tdApp_stubs from './src/app_stubs.js';
import * as utils from './src/utils.js';

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
  $("#btn_getModelDataScan").click(function() {
    $('#stubInput_getURN').modal('show');
    modalFuncCallbackNum = 12;
  });
  $("#btn_getModelDataScanElements").click(function() {
    $('#stubInput_getURNandKeys').modal('show');
    modalFuncCallbackNum = 1;
  });
  $("#btn_getModelDataScanElementsUserOnlyWithHistory").click(function() {
    $('#stubInput_getURNandKeys').modal('show');
    modalFuncCallbackNum = 2;
  });
  $("#btn_getModelDataScanElementsFullChangeHistory").click(function() {
    $('#stubInput_getURNandKeys').modal('show');
    modalFuncCallbackNum = 3;
  });

  $("#btn_testScan").click(model_stubs.testScan);


    // Stream Stubs
  $("#btn_getStreamsFromDefaultModel").click(stream_stubs.getStreamsFromDefaultModel);
  $("#btn_getStreamsFromDefaultModelPOST").click(stream_stubs.getStreamsFromDefaultModelPOST);

  $("#btn_getStreamSecrets").click(function() {
    $('#stubInput_getURNandKeys').modal('show');
    modalFuncCallbackNum = 0;
  });

  $("#btn_resetStreamSecrets").click(function() {
    $('#stubInput_getURNandKeys').modal('show');
    modalFuncCallbackNum = 5;
  });

  $("#btn_getStreamValues30Days").click(function() {
    $('#stubInput_getURNandKeys').modal('show');
    modalFuncCallbackNum = 4;
  });
  $("#btn_postNewStreamValues").click(function() {
    $('#stubInput_getURNandKeys').modal('show');
    modalFuncCallbackNum = 6;
  });
  $("#btn_getLastSeenStreamValues").click(function() {
    $('#stubInput_getURNandKeys').modal('show');
    modalFuncCallbackNum = 7;
  });
  $("#btn_getStreamRollup30Days").click(function() {
    $('#stubInput_getURNandKeys').modal('show');
    modalFuncCallbackNum = 8;
  });
  $("#btn_postGetStreamRollup30Days").click(function() {
    $('#stubInput_getURNandKeys').modal('show');
    modalFuncCallbackNum = 9;
  });

    // Property Stubs
  $("#btn_getQualifiedProp").click(function() {
    $('#stubInput_getPropertyName').modal('show');
    modalFuncCallbackNum = 0;
  });
  $("#btn_scanForQualifiedProp").click(function() {
    $('#stubInput_getPropertyName').modal('show');
    modalFuncCallbackNum = 1;
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
  $("#btn_getSavedViews").click(tdApp_stubs.getSavedViews);
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

  $("#btn_getPreferences").click(tdApp_stubs.getPreferences);



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
      tdApp_stubs.getClassifications(urn);
    else if (modalFuncCallbackNum == 9)
      tdApp_stubs.getFacilityTemplates(urn);
    else if (modalFuncCallbackNum == 10)
      tdApp_stubs.getParameters(urn);
    else if (modalFuncCallbackNum == 11)
      model_stubs.getModelDataSchema(urn);
    else if (modalFuncCallbackNum == 12)
      model_stubs.getModelDataScan(urn);
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
      tdApp_stubs.getSavedViewByUUID(uuid);
    else {
      alert("ASSERT: modalFuncCallbackNum not expected.");
    }
  });

  $('#stubInput_getURNandUUID_OK').click(function() {
    const urn = $("#stubInput_urnuuid_urn").val();
    const uuid = $("#stubInput_urnuuid_uuid").val();

    if (modalFuncCallbackNum == 0)
      tdApp_stubs.getClassificationByUUID(urn, uuid);
    else if (modalFuncCallbackNum == 1)
      tdApp_stubs.getFacilityTemplateByUUID(urn, uuid);
    else if (modalFuncCallbackNum == 2)
      tdApp_stubs.getParameterByUUID(urn, uuid);
    else {
      alert("ASSERT: modalFuncCallbackNum not expected.");
    }
  });

  $('#stubInput_getURNandKeys_OK').click(function() {
    const urn = $("#stubInput_urnkeys_urn").val();
    const keys = $("#stubInput_urnkeys_key").val();

    if (modalFuncCallbackNum == 0)
      stream_stubs.getStreamSecrets(urn, keys);
    else if (modalFuncCallbackNum == 1)
      model_stubs.getModelDataScanElements(urn, keys);
    else if (modalFuncCallbackNum == 2)
      model_stubs.getModelDataScanElementsUserOnlyWithHistory(urn, keys);
    else if (modalFuncCallbackNum == 3)
      model_stubs.getModelDataScanElementsFullChangeHistory(urn, keys);
    else if (modalFuncCallbackNum == 4)
      stream_stubs.getStreamValues30Days(urn, keys);
    else if (modalFuncCallbackNum == 5)
      stream_stubs.resetStreamSecrets(urn, keys);
    else if (modalFuncCallbackNum == 6)
      stream_stubs.postNewStreamValues(urn, keys);
    else if (modalFuncCallbackNum == 7)
      stream_stubs.getLastSeenStreamValues(urn, keys);
    else if (modalFuncCallbackNum == 8)
      stream_stubs.getStreamRollupsLast30Days(urn, keys);
    else if (modalFuncCallbackNum == 9)
      stream_stubs.postGetStreamRollupsLast30Days(urn, keys);
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
    else {
      alert("ASSERT: modalFuncCallbackNum not expected.");
    }
  });

    // this gets called from above via modal dialog (#btn_setPropertySelSet, and others)
/*  $('#stubInput_setPropertyValue_OK').click(function() {
    const propCategory = $("#stubInput_propCategorySet").val();
    const propName = $("#stubInput_propNameSet").val();
    const propVal = $("#stubInput_propValSet").val();

    if (modalFuncCallbackNum == 0)
      td_stubs.setPropertySelSet(propCategory, propName, propVal);
    else {
      alert("ASSERT: modalFuncCallbackNum not expected.");
    }
  });

    // this gets called from above via modal dialog (#btn_findElementsWherePropValueEqualsX)
  $('#stubInput_getPropertyFilter_OK').click(function() {
    const propCategory = $("#stubInput_propCategoryFilter").val();
    const propName = $("#stubInput_propNameFilter").val();
    const matchStr = $("#stubInput_propValFilter").val();
    const isCaseInsensitive = $("#stubInput_propValIsCaseInsensitive").is(":checked");
    const isRegEx = $("#stubInput_propValIsRegEx").is(":checked");
    const searchVisibleOnly = $("#stubInput_searchVisibleOnly").is(":checked");

    td_stubs.findElementsWherePropValueEqualsX(propCategory, propName, matchStr, isRegEx, searchVisibleOnly, isCaseInsensitive);
  });

    // this gets called from above via modal dialog (#btn_findElementsWherePropValueEqualsX)
  $('#stubInput_setClassification_OK').click(function() {
    const classificationStr = $("#stubInput_classificationStr").val();

    td_stubs.assignClassification(classificationStr);
  });


  $('#stubInput_getKey_OK').click(function() {
    const key = $("#stubInput_key").val();

    if (modalFuncCallbackNum == 0)
      st_stubs.resetStreamSecrets(key);
    else {
      alert("ASSERT: modalFuncCallbackNum not expected.");
    }
  });

  $('#stubInput_getName_OK').click(function() {
    const nameStr = $("#stubInput_name").val();

    if (modalFuncCallbackNum == 0)
      st_stubs.createStream(nameStr);
    else {
      alert("ASSERT: modalFuncCallbackNum not expected.");
    }
  });

  $('#stubInput_getInt_OK').click(function() {
    const rawStr = $("#stubInput_int").val();

    if (modalFuncCallbackNum == 0)
      st_stubs.deleteStream(parseInt(rawStr));
    else {
      alert("ASSERT: modalFuncCallbackNum not expected.");
    }
  });*/
};

main();
