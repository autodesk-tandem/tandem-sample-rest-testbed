/**
 * V3 ("No-BIM") schema version module.
 *
 * How V3 stores data (see also js/stubs/v2/index.js for the V2 differences):
 * - Everything the user defines lives in the DEFAULT model: levels, rooms, streams, tickets, systems,
 *   assets and the user-defined properties (`z:` family) of those assets. There is no need to walk the models.
 * - Read-only source properties (`r:` family) stay on the BIM element in its own model. An asset points
 *   to its BIM element with QC.BimElmOfAsset, a BIM element to its asset with QC.HostOfAsset.
 * - There is one kind of key: the 24-byte key. Its first 4 bytes are the ElementFlags. Never convert it.
 * - Stream flag is ElementFlags.StreamV3 (0x01000000), levels and rooms are ElementFlags.Location with
 *   QC.TandemCategory = TC.Levels / TC.Rooms.
 *
 * This module only lists the STUBs that are implemented for V3, the menu hides the others.
 */

import * as propertyStubs from './propertyStubs.js';
import * as streamStubs from './streamStubs.js';
import * as ticketStubs from './ticketStubs.js';
import * as sdkStubs from './sdkStubs.js';
import * as miscStubs from './miscStubs.js';
import * as propertyWriteStubs from './propertyWriteStubs.js';

export default {
  schemaVersion: 3,
  label: 'V3',
  minSchemaVersion: 3,
  stubs: {
    getQualifiedProperty: propertyStubs.getQualifiedProperty,
    scanForProperty: propertyStubs.scanForProperty,
    scanForUserProps: propertyStubs.scanForUserProps,
    findElementsWherePropValueEquals: propertyStubs.findElementsWherePropValueEquals,

    assignClassification: propertyWriteStubs.assignClassification,
    setPropertySelSet: propertyWriteStubs.setPropertySelSet,
    setPropertySelSetQP: propertyWriteStubs.setPropertySelSetQP,
    deletePropertyValue: propertyWriteStubs.deletePropertyValue,

    getStreamsFromDefaultModel: streamStubs.getStreamsFromDefaultModel,
    createStream: streamStubs.createStream,
    assignHostToStream: streamStubs.assignHostToStream,
    removeHostFromStream: streamStubs.removeHostFromStream,
    deleteStreams: streamStubs.deleteStreams,

    getTickets: ticketStubs.getTickets,
    createTicket: ticketStubs.createTicket,
    updateTicket: ticketStubs.updateTicket,

    lookupElements: miscStubs.lookupElements,

    getRoomsAndSpaces: sdkStubs.getRoomsAndSpaces,
    getLevels: sdkStubs.getLevels,
    getElementAndTypeProperties: sdkStubs.getElementAndTypeProperties,
    getFacilityStructure: sdkStubs.getFacilityStructure,
    findElementsWithEmptyParameters: sdkStubs.findElementsWithEmptyParameters
  }
};
