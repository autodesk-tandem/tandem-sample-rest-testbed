/**
 * V2 schema version module.
 *
 * How V2 stores data (see also js/stubs/v3/index.js for the V3 differences):
 * - Every BIM model has its own levels, rooms and elements. User-defined properties (`z:` family)
 *   live on the element, in the model that contains it.
 * - Streams, tickets and systems live in the default model.
 * - /scan rows use 20-byte short keys, other endpoints return 24-byte long keys (toShortKey / toFullKey).
 * - Stream flag is ElementFlags.StreamV2 (0x01000003).
 */

import * as propertyStubs from './propertyStubs.js';
import * as streamStubs from './streamStubs.js';
import * as ticketStubs from './ticketStubs.js';
import * as miscStubs from './miscStubs.js';
import { getKeyFromXref } from '../miscStubs.js';
import * as sdkStubs from './sdkStubs.js';

export default {
  schemaVersion: 2,
  label: 'V2',
  minSchemaVersion: 2,
  stubs: {
    getQualifiedProperty: propertyStubs.getQualifiedProperty,
    scanForProperty: propertyStubs.scanForProperty,
    scanForUserProps: propertyStubs.scanForUserProps,
    findElementsWherePropValueEquals: propertyStubs.findElementsWherePropValueEquals,
    assignClassification: propertyStubs.assignClassification,
    setPropertySelSet: propertyStubs.setPropertySelSet,
    setPropertySelSetQP: propertyStubs.setPropertySelSetQP,
    deletePropertyValue: propertyStubs.deletePropertyValue,

    getStreamsFromDefaultModel: streamStubs.getStreamsFromDefaultModel,
    createStream: streamStubs.createStream,
    assignHostToStream: streamStubs.assignHostToStream,
    removeHostFromStream: streamStubs.removeHostFromStream,
    deleteStreams: streamStubs.deleteStreams,

    getTickets: ticketStubs.getTickets,
    createTicket: ticketStubs.createTicket,
    updateTicket: ticketStubs.updateTicket,

    lookupElements: miscStubs.lookupElements,
    getKeyFromXref: getKeyFromXref,

    getRoomsAndSpaces: sdkStubs.getRoomsAndSpaces,
    getLevels: sdkStubs.getLevels,
    getElementAndTypeProperties: sdkStubs.getElementAndTypeProperties,
    getFacilityStructure: sdkStubs.getFacilityStructure,
    findElementsWithEmptyParameters: sdkStubs.findElementsWithEmptyParameters
  }
};
