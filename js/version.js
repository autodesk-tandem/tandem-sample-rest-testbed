/**
 * Version registry.
 *
 * Facilities exist in two schema versions that live side by side. The app shell loads exactly
 * one schema-version module (js/stubs/v2/index.js or js/stubs/v3/index.js) and registers it here.
 * The UI asks the registry for the STUB to run instead of importing from a version folder, so
 * there is no version if/else in the UI code.
 *
 * A version module is an object with this shape:
 *
 *   {
 *     schemaVersion,        number - schema version the module implements (2 or 3)
 *     label,                string - label shown in the UI ('V2' / 'V3')
 *     minSchemaVersion,     number - lowest facility schema version the module can display
 *     stubs: {              name -> STUB function. Same names in every version, same arguments.
 *       getQualifiedProperty, scanForProperty, scanForUserProps, findElementsWherePropValueEquals,
 *       getStreamsFromDefaultModel, lookupElements,
 *       getRoomsAndSpaces, getLevels, getElementAndTypeProperties, getFacilityStructure,
 *       findElementsWithEmptyParameters,
 *       assignClassification, setPropertySelSet, setPropertySelSetQP, deletePropertyValue,
 *       createStream, assignHostToStream, removeHostFromStream, deleteStreams
 *     }
 *   }
 *
 * A version module only lists the STUBs it implements. The menu hides the others.
 * STUBs that work the same in both versions (groups, facility, model, documents, generic scans,
 * stream data) are not in the modules, they live directly in js/stubs/.
 */

let activeVersion = null;

/**
 * Register the version module that the UI should use.
 * @param {object} versionModule
 */
export function setActiveVersion(versionModule) {
  activeVersion = versionModule;
}

/**
 * @returns {object} The active version module
 */
export function getActiveVersion() {
  if (!activeVersion) {
    throw new Error('No schema version module is active');
  }
  return activeVersion;
}
