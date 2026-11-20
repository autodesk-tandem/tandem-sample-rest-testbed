/**
 * Ticket STUB Functions - V3 schema
 *
 * A ticket is an element of the default model with ElementFlags.Ticket (see js/stubs/ticketCommon.js). In V3:
 * - The ticket key is the 24-byte key whose first 4 bytes are the flags, so the flags tell a ticket from any other element.
 * - Its host (the Parent xref, QC.XParent) has to be an element of the default model: an asset, or a room or level. A host
 *   from a BIM model is given by its xref and followed to its asset, like for streams.
 * - The ticket gets the location of its host asset (QC.OLocation, else QC.Location), as the app does.
 * - A new ticket is created with POST /create, an existing one is changed with the explicit POST /v3/.../mutate.
 *
 * Output goes to browser console - open DevTools to see results.
 */

import { tandemBaseURL, makeRequestOptionsPOST, getDefaultModelURN } from '../../api.js';
import { ColumnFamilies, ColumnNames, ElementFlags, MutateActions, QC } from '../../../tandem/constants.js';
import { decodeXref, getElementFlags, makeXrefKey } from '../../../tandem/keys.js';
import { parseCommaList } from '../../utils.js';
import { CloseActions, makeTicketMuts, makeTicketUpdateMuts } from '../ticketCommon.js';
import { describeKey, firstValue, nameOf, scanModel } from './helpers.js';
import { parseV3Keys, mutateV3 } from './writeHelpers.js';
import { resolveHostKey } from './streamStubs.js';

/**
 * Throw unless every key is a ticket.
 */
function assertTicketKeys(keys) {
  const notTickets = keys.filter(key => getElementFlags(key) !== ElementFlags.Ticket);

  if (notTickets.length > 0) {
    throw new Error(`Not a ticket (ElementFlags.Ticket): ${notTickets.map(key => `${key} is ${describeKey(key)}`).join(', ')}. `
      + 'Setting Priority or Open Date on another element does not make it a ticket: use Create Ticket.');
  }
}

/**
 * Scan for tickets in the default model
 */
export async function getTickets(facilityURN, region) {
  console.group("STUB: getTickets()");

  try {
    const defaultModelURN = getDefaultModelURN(facilityURN);

    console.log("Default model:", defaultModelURN);
    const rows = await scanModel(defaultModelURN, region, {
      families: [ColumnFamilies.Standard, ColumnFamilies.Xrefs]
    });

    console.log("Filtering for type Ticket (ElementFlags.Ticket)...");
    const tickets = rows.filter(row => getElementFlags(row[QC.Key]) === ElementFlags.Ticket);

    console.log(`Found ${tickets.length} tickets:`, tickets);
    if (tickets.length > 0) {
      console.table(tickets.map(row => {
        const hostXref = firstValue(row[QC.XParent]);
        const host = hostXref ? decodeXref(hostXref) : null;
        const closeDate = firstValue(row[QC.CloseDate]);

        return {
          key: row[QC.Key],
          name: nameOf(row),
          priority: firstValue(row[QC.Priority]),
          openDate: firstValue(row[QC.OpenDate]),
          closeDate,
          status: closeDate ? 'closed' : 'open',
          hostKey: host?.elementKey ?? ''
        };
      }));
    }
    console.groupEnd();
    return tickets;
  } catch (error) {
    console.error('Error:', error.message);
    console.groupEnd();
    return [];
  }
}

/**
 * Create a ticket
 *
 * Creating is not a mutate: POST /create adds an element to the default model, and the ticket mutations are all
 * inserts. Besides the name, priority and open date, the ticket needs the flag and Tandem category that make it a ticket,
 * and the Parent xref of its host to be useful.
 */
export async function createTicket(facilityURN, region, ticketName, priority, hostModelURN, hostKey) {
  console.group("STUB: createTicket()");

  try {
    const defaultModelURN = getDefaultModelURN(facilityURN);

    console.log("Default model:", defaultModelURN);
    console.log("Ticket name:", ticketName);
    if (!ticketName) {
      throw new Error("Ticket name is required");
    }
    const muts = makeTicketMuts(ticketName, priority);

    if (hostKey) {
      console.log("Host model:", hostModelURN || "(default model)");
      console.log("Host key:", hostKey);
      const hostInDefaultModel = await resolveHostKey(facilityURN, region, hostModelURN, hostKey);

      muts.push([MutateActions.Insert, ColumnFamilies.Xrefs, ColumnNames.Parent, makeXrefKey(defaultModelURN, hostInDefaultModel)]);

      const [host] = await scanModel(defaultModelURN, region, {
        keys: [hostInDefaultModel],
        qualifiedColumns: [QC.Location, QC.OLocation]
      });
      const location = firstValue(host?.[QC.OLocation]) ?? firstValue(host?.[QC.Location]);

      if (location) {
        muts.push([MutateActions.Insert, ColumnFamilies.Xrefs, ColumnNames.Location, location]);
      }
    } else if (hostModelURN) {
      console.warn("A host model without a host element key - creating the ticket without a host.");
    }
    console.log("Mutations:", muts);

    const requestPath = `${tandemBaseURL}/modeldata/${defaultModelURN}/create`;
    const bodyPayload = JSON.stringify({ muts, desc: "REST TestBed: created ticket" });

    console.log("Request:", requestPath);
    const response = await fetch(requestPath, makeRequestOptionsPOST(bodyPayload, region));
    const text = await response.text();

    if (!response.ok) {
      throw new Error(`Create failed - HTTP ${response.status}: ${text || response.statusText}`);
    }
    const result = JSON.parse(text);

    console.log("Result from Tandem DB Server -->", result);
    console.log(`Created ticket ${ticketName} (${result.key}): ${describeKey(result.key)}`);
    console.groupEnd();
    return result;
  } catch (error) {
    console.error('Error:', error.message);
    console.groupEnd();
    return null;
  }
}

/**
 * Change tickets: set the priority, close them (Close Date = today) or reopen them (delete the Close Date)
 *
 * Every key is checked to be a ticket first.
 */
export async function updateTicket(facilityURN, region, ticketKeys, priority, closeAction) {
  console.group("STUB: updateTicket()");

  try {
    console.log("Default model:", getDefaultModelURN(facilityURN));
    const ticketKeyList = parseV3Keys(ticketKeys, parseCommaList);

    console.log("Ticket keys:", ticketKeyList);
    assertTicketKeys(ticketKeyList);

    // keys and muts are parallel: repeat each key for each of its mutations
    const changes = makeTicketUpdateMuts(priority, closeAction);
    const keys = ticketKeyList.flatMap(key => changes.map(() => key));
    const muts = ticketKeyList.flatMap(() => changes);
    const result = await mutateV3(facilityURN, region, keys, muts,
      closeAction === CloseActions.Close ? "REST TestBed: closed ticket(s)" : "REST TestBed: changed ticket(s)");

    console.groupEnd();
    return result;
  } catch (error) {
    console.error('Error:', error.message);
    console.groupEnd();
    return null;
  }
}
