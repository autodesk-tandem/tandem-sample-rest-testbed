/**
 * Ticket helpers shared by the V2 and V3 ticket STUBs.
 *
 * What a ticket is: an element of the DEFAULT model with the element flag `ElementFlags.Ticket`, the Tandem
 * category `TC.Ticket` and a Parent xref (`QC.XParent`) to the element it is about. Setting `Priority` or
 * `Open Date` on any other element does not make it a ticket: the Tandem app lists only elements with the
 * ticket flag, so create the ticket with the Create Ticket STUB first.
 *
 * The columns of a ticket (see tutorial-rest/tickets):
 * - Priority (`n:pr`): one of TicketPriorities
 * - Open Date (`n:od`) and Close Date (`n:cd`): a date in the form YYYY-MM-DD. A ticket with a Close Date is closed.
 */

import { ColumnFamilies, ColumnNames, ElementFlags, MutateActions, TC, TicketPriorities } from '../../tandem/constants.js';

/**
 * What the Update Ticket STUB can do with the Close Date.
 */
export const CloseActions = {
  Close: 'close',
  Reopen: 'reopen'
};

/**
 * Today as YYYY-MM-DD in the local time zone. The Tandem app does not accept a date in the future, and the
 * UTC date can already be tomorrow in the evening.
 */
export function todayDate() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');

  return `${now.getFullYear()}-${month}-${day}`;
}

/**
 * Throw unless the priority is one of the values of the schema.
 */
export function assertPriority(priority) {
  if (!Object.values(TicketPriorities).includes(priority)) {
    throw new Error(`Priority must be one of ${Object.values(TicketPriorities).join(', ')} (got "${priority}").`);
  }
}

/**
 * Mutations that make a new element a ticket. Used with POST /modeldata/{defaultModel}/create, where every
 * mutation is an insert of one column of the new element.
 */
export function makeTicketMuts(name, priority) {
  assertPriority(priority);
  return [
    [MutateActions.Insert, ColumnFamilies.Standard, ColumnNames.Name, name],
    [MutateActions.Insert, ColumnFamilies.Standard, ColumnNames.ElementFlags, ElementFlags.Ticket],
    [MutateActions.Insert, ColumnFamilies.Standard, ColumnNames.TandemCategory, TC.Ticket],
    [MutateActions.Insert, ColumnFamilies.Standard, ColumnNames.Priority, priority],
    [MutateActions.Insert, ColumnFamilies.Standard, ColumnNames.OpenDate, todayDate()]
  ];
}

/**
 * Mutations of one ticket for the Update Ticket STUB.
 * - closing a ticket sets its Close Date to today
 * - reopening it deletes the Close Date (MutateActions.Delete)
 *
 * @param {string} priority - new priority, empty to keep it
 * @param {string} closeAction - CloseActions value, empty to keep the Close Date
 * @returns {Array<Array>} Mutations to apply to every ticket
 */
export function makeTicketUpdateMuts(priority, closeAction) {
  const muts = [];

  if (priority) {
    assertPriority(priority);
    muts.push([MutateActions.Insert, ColumnFamilies.Standard, ColumnNames.Priority, priority]);
  }
  if (closeAction === CloseActions.Close) {
    muts.push([MutateActions.Insert, ColumnFamilies.Standard, ColumnNames.CloseDate, todayDate()]);
  } else if (closeAction === CloseActions.Reopen) {
    muts.push([MutateActions.Delete, ColumnFamilies.Standard, ColumnNames.CloseDate, '']);
  } else if (closeAction) {
    throw new Error(`Unknown close action "${closeAction}".`);
  }
  if (muts.length === 0) {
    throw new Error('Nothing to change: pick a new priority and/or close or reopen the ticket.');
  }
  return muts;
}
