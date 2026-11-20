/**
 * Ticket STUB Functions - V2 schema
 *
 * A ticket is an element of the default model with ElementFlags.Ticket (see js/stubs/ticketCommon.js). In V2:
 * - Scan rows have 20-byte short keys and the flag is in the QC.ElementFlags column. The other endpoints
 *   want the 24-byte long key (toFullKey adds the logical key flags).
 * - The host (the Parent xref, QC.XParent) is an element of a BIM model: its model URN and long key.
 * - A new ticket is created with POST /create, an existing one is changed with POST /mutate.
 *
 * The Tandem app also copies the rooms and the level of the host to the ticket. These STUBs only link the host.
 *
 * Output goes to browser console - open DevTools to see results.
 */

import { tandemBaseURL, makeRequestOptionsPOST, getDefaultModelURN } from '../../api.js';
import { ColumnFamilies, ColumnNames, ElementFlags, MutateActions, QC } from '../../../tandem/constants.js';
import { decodeXref, makeXrefKey, toFullKey, toShortKey } from '../../../tandem/keys.js';
import { parseCommaList } from '../../utils.js';
import { CloseActions, makeTicketMuts, makeTicketUpdateMuts } from '../ticketCommon.js';

const LongKeyLength = 32; // 24 bytes in unpadded base64

/**
 * POST a request to the default model and return the parsed body, throwing on a failure.
 */
async function postToDefaultModel(facilityURN, region, endpoint, payload) {
  const requestPath = `${tandemBaseURL}/modeldata/${getDefaultModelURN(facilityURN)}/${endpoint}`;

  console.log("Request:", requestPath);
  console.log("Payload:", JSON.stringify(payload));
  const response = await fetch(requestPath, makeRequestOptionsPOST(JSON.stringify(payload), region));
  const text = await response.text();

  if (!response.ok) {
    throw new Error(`${endpoint} failed - HTTP ${response.status}: ${text || response.statusText}`);
  }
  const result = text ? JSON.parse(text) : null;

  console.log("Result from Tandem DB Server -->", result);
  return result;
}

/**
 * Throw unless every key is the key of a ticket. A V2 long key does not tell the type of an element, so
 * the elements are scanned for their flag.
 */
async function assertTicketKeys(facilityURN, region, keys) {
  const shortKeys = keys.map(key => key.length === LongKeyLength ? toShortKey(key) : key);
  const rows = await postToDefaultModel(facilityURN, region, 'scan', {
    keys: shortKeys,
    families: [ColumnFamilies.Standard],
    includeHistory: false
  });
  const flagsByKey = new Map(rows
    .filter(row => typeof row === 'object' && row !== null && row[QC.Key])
    .map(row => [row[QC.Key], row[QC.ElementFlags]?.[0]]));
  const notTickets = keys.filter((key, i) => flagsByKey.get(shortKeys[i]) !== ElementFlags.Ticket);

  if (notTickets.length > 0) {
    throw new Error(`Not a ticket (ElementFlags.Ticket) in the default model: ${notTickets.join(', ')}. `
      + 'Setting Priority or Open Date on another element does not make it a ticket: use Create Ticket.');
  }
}

/**
 * Scan for tickets in the default model
 */
export async function getTickets(facilityURN, region) {
  console.group("STUB: getTickets()");

  try {
    console.log("Default model:", getDefaultModelURN(facilityURN));
    const rows = await postToDefaultModel(facilityURN, region, 'scan', {
      families: [ColumnFamilies.Standard, ColumnFamilies.Xrefs],
      includeHistory: false
    });

    console.log("Filtering for type Ticket (ElementFlags.Ticket)...");
    const tickets = rows.filter(row => row?.[QC.ElementFlags]?.[0] === ElementFlags.Ticket);

    console.log(`Found ${tickets.length} tickets:`, tickets);
    if (tickets.length > 0) {
      console.table(tickets.map(row => {
        const hostXref = row[QC.XParent]?.[0];
        const host = hostXref ? decodeXref(hostXref) : null;
        const closeDate = row[QC.CloseDate]?.[0];

        return {
          shortKey: row[QC.Key],
          longKey: toFullKey(row[QC.Key], true),
          name: row[QC.OName]?.[0] ?? row[QC.Name]?.[0] ?? '',
          priority: row[QC.Priority]?.[0],
          openDate: row[QC.OpenDate]?.[0],
          closeDate,
          status: closeDate ? 'closed' : 'open',
          hostModel: host?.modelURN ?? '',
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
    console.log("Default model:", getDefaultModelURN(facilityURN));
    console.log("Ticket name:", ticketName);
    if (!ticketName) {
      throw new Error("Ticket name is required");
    }
    const muts = makeTicketMuts(ticketName, priority);

    if (hostModelURN && hostKey) {
      console.log("Host model:", hostModelURN);
      console.log("Host key:", hostKey);
      muts.push([MutateActions.Insert, ColumnFamilies.Xrefs, ColumnNames.Parent, makeXrefKey(hostModelURN, hostKey)]);
    } else if (hostModelURN || hostKey) {
      console.warn("A host needs both its model URN and its element key - creating the ticket without a host.");
    }
    console.log("Mutations:", muts);

    const result = await postToDefaultModel(facilityURN, region, 'create', { muts, desc: "REST TestBed: created ticket" });

    console.log(`Created ticket ${ticketName} (${result.key})`);
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
    const ticketKeyList = [...new Set(parseCommaList(ticketKeys))];

    if (ticketKeyList.length === 0) {
      throw new Error("Please enter at least one ticket key (comma-separated).");
    }
    console.log("Default model:", getDefaultModelURN(facilityURN));
    console.log("Ticket keys:", ticketKeyList);
    await assertTicketKeys(facilityURN, region, ticketKeyList);

    // keys and muts are parallel: repeat each key for each of its mutations
    const changes = makeTicketUpdateMuts(priority, closeAction);
    const keys = ticketKeyList.flatMap(key => changes.map(() => key));
    const muts = ticketKeyList.flatMap(() => changes);
    const result = await postToDefaultModel(facilityURN, region, 'mutate', {
      keys,
      muts,
      desc: closeAction === CloseActions.Close ? "REST TestBed: closed ticket(s)" : "REST TestBed: changed ticket(s)"
    });

    console.groupEnd();
    return result;
  } catch (error) {
    console.error('Error:', error.message);
    console.groupEnd();
    return null;
  }
}
