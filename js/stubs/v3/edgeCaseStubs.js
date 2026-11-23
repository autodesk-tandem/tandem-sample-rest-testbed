/**
 * API Edge Case STUB Functions - V3 schema
 *
 * These STUBs send requests the other STUBs refuse to send, and report what the SERVER does with them.
 * They exist to show the facts behind the recommendations in docs/write-calls-findings.md: when there is no guardrail,
 * is the request refused (and with which status and message), or accepted and stored (and where)?
 *
 * Every STUB follows the same steps:
 *   1. read the element (scan) to see what is there before
 *   2. send the request exactly as typed: NO validation, NO guardrails
 *   3. report what the server answered
 *   4. read the element again and show what changed, so an accepted write can be located
 *   5. optionally undo the change
 *
 * WARNING: a request the server accepts changes the facility and is recorded in the model history.
 * Use a test facility. Output goes to browser console - open DevTools to see results.
 */

import { tandemBaseURL, tandemV3BaseURL, makeRequestOptionsPOST, getDefaultModelURN, getModels } from '../../api.js';
import { ColumnFamilies, ColumnNames, ElementFlags, MutateActions, OverrideColumnPrefix, QC } from '../../../tandem/constants.js';
import { decodeXref, getElementFlags, makeXrefKey } from '../../../tandem/keys.js';
import { typedValueFor } from '../../utils.js';
import { findWritableAttribute, loadSchemaForModel } from '../../state/schemaCache.js';
import { describeKey, firstValue, nameOf, scanModel } from './helpers.js';

/**
 * Which mutate endpoint to call.
 * - `v3`: POST /v3/modeldata/{model}/mutate on the Tandem host, the endpoint of the V3 STUBs (no Region header)
 * - `v1`: POST /v1/modeldata/{model}/mutate on the APS gateway, the compatibility path
 */
export const MutateEndpoints = {
  V3: 'v3',
  V1: 'v1'
};

/**
 * Send a mutate with NO checks, exactly as given, to any model.
 * Never throws: a refusal or a network failure is reported in the result.
 *
 * @returns {Promise<{ sent: boolean, ok: boolean, status: number|null, statusText: string, text: string, json: any, ms: number }>}
 */
async function sendUnguardedMutate(modelURN, keys, muts, description, { endpoint = MutateEndpoints.V3, region = null } = {}) {
  const isV1 = endpoint === MutateEndpoints.V1;
  const requestPath = `${isV1 ? tandemBaseURL : tandemV3BaseURL}/modeldata/${modelURN}/mutate`;
  const bodyPayload = JSON.stringify({ keys, muts, desc: description });
  const started = performance.now();

  console.log("Request (no guardrails):", requestPath);
  console.log("Payload:", bodyPayload);
  try {
    const response = await fetch(requestPath, makeRequestOptionsPOST(bodyPayload, isV1 ? region : null));
    const text = await response.text();
    let json = null;

    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      // the body is not JSON (error messages are plain text)
    }
    return {
      sent: true,
      ok: response.ok,
      status: response.status,
      statusText: response.statusText,
      text,
      json,
      ms: Math.round(performance.now() - started)
    };
  } catch (error) {
    return { sent: false, ok: false, status: null, statusText: error.message, text: '', json: null, ms: Math.round(performance.now() - started) };
  }
}

/**
 * Read the columns of one element of the default model. Returns null when the scan fails and
 * `{ found: false }` when the element is not in the model.
 */
async function readElement(facilityURN, region, key, qualifiedColumns) {
  try {
    const [row] = await scanModel(getDefaultModelURN(facilityURN), region, { keys: [key], qualifiedColumns });

    return row ? { found: true, row } : { found: false, row: null };
  } catch (error) {
    console.warn(`Could not scan the element: ${error.message}`);
    return null;
  }
}

/**
 * Print what the server answered to a request.
 */
function reportResponse(result) {
  if (!result.sent) {
    console.error(`NO ANSWER: the request did not reach the server or was blocked by the browser (${result.statusText}). `
      + 'Look at the Network tab: a CORS error here means the route is not served by this host.');
    return;
  }
  const answer = `HTTP ${result.status} ${result.statusText} in ${result.ms} ms`;

  if (result.ok) {
    console.log(`SERVER ACCEPTED the request: ${answer}`);
    console.log("Response body:", result.json ?? (result.text || '(empty)'));
  } else {
    console.log(`SERVER REFUSED the request: ${answer}`);
    console.log("Response body (the message is all the server tells you):", result.text || '(empty)');
  }
}

/**
 * Show the columns of an element before and after a request, and flag the ones that changed.
 * @returns {Array<string>} qualified columns that changed
 */
function reportChanges(label, before, after, qualifiedColumns) {
  if (!before || !after) {
    console.warn(`${label}: no before/after comparison (a scan failed).`);
    return [];
  }
  if (!before.found && !after.found) {
    console.log(`${label}: the element is not in the default model, before or after.`);
    return [];
  }
  const changed = [];
  const table = qualifiedColumns.map(column => {
    const was = before.row ? firstValue(before.row[column]) : undefined;
    const now = after.row ? firstValue(after.row[column]) : undefined;
    const hasChanged = JSON.stringify(was) !== JSON.stringify(now);

    if (hasChanged) {
      changed.push(column);
    }
    return { column, before: was ?? '(empty)', after: now ?? '(empty)', changed: hasChanged ? 'YES' : '' };
  });

  console.log(`${label} (a scan of the element before and after):`);
  console.table(table);
  return changed;
}

/**
 * EDGE CASE: write the ticket columns (Priority, Open Date, Close Date) to an element that is not a ticket
 *
 * The guarded STUBs refuse this (`mutateV3` and the SET Property STUBs). Here the request is sent as typed to
 * POST /v3/.../mutate, with the plain `Insert` action on the Standard family, whatever the element is and
 * whatever the value is. The element key and the value are not validated either, so a wrong key, a wrong
 * length or a priority that is not in the list can be tried too.
 *
 * The question: does the server know that these columns only apply to tickets? The answer is in the report:
 * refused (status and message), or stored (and then what a scan of the element shows, and why the Tandem app
 * still does not list the element as a ticket).
 *
 * @param {string} elementKey - key of an element of the default model, sent as typed
 * @param {string} column - ColumnNames.Priority, ColumnNames.OpenDate or ColumnNames.CloseDate
 * @param {string} value - sent as typed, always a string
 * @param {boolean} restore - put the previous value back afterwards
 */
export async function writeTicketColumnOnNonTicket(facilityURN, region, elementKey, column, value, restore) {
  console.group("STUB (edge case): writeTicketColumnOnNonTicket()");

  try {
    const qualifiedColumn = `${ColumnFamilies.Standard}:${column}`;
    const watched = [qualifiedColumn, QC.Name, QC.OName];
    const typeOfElement = describeKey(elementKey);
    const isTicket = getElementFlags(elementKey) === ElementFlags.Ticket;

    console.log("Default model:", getDefaultModelURN(facilityURN));
    console.log(`Writing ${qualifiedColumn} = ${JSON.stringify(value)} to ${elementKey}`);
    console.log(`Type of the element, from the first 4 bytes of its key: ${typeOfElement}`);
    if (isTicket) {
      console.warn("This key IS a ticket, so it is not the edge case. Use the key of an asset, a stream, a room, ...");
    }
    console.warn("No guardrails: the request is sent as typed. If the server accepts it, the change is real and stays in the model history.");

    console.group("1. Before");
    const before = await readElement(facilityURN, region, elementKey, watched);

    console.groupEnd();
    if (before && !before.found) {
      console.warn("The element is not in the default model. The V3 mutate is an update: this run shows whether the server refuses a missing row or ignores it.");
    }

    console.group("2. The request");
    const response = await sendUnguardedMutate(getDefaultModelURN(facilityURN),
      [elementKey],
      [[MutateActions.Insert, ColumnFamilies.Standard, column, value]],
      "REST TestBed (edge case): ticket column on a non-ticket element");

    reportResponse(response);
    console.groupEnd();

    console.group("3. After");
    const after = response.sent ? await readElement(facilityURN, region, elementKey, watched) : before;
    const changed = response.sent ? reportChanges("Result", before, after, watched) : [];

    console.groupEnd();

    console.group("4. What this means");
    if (!response.sent) {
      console.log("Nothing was sent, so there is nothing to conclude. Fix the request first.");
    } else if (!response.ok) {
      console.log(`The server refuses this write (HTTP ${response.status}). The message above is the only explanation it gives.`);
    } else if (!before || !after) {
      console.log("The server answered OK but the element could not be scanned, so we cannot tell where (or whether) the value was stored.");
    } else if (!before.found && !after.found) {
      console.log("The server answered OK for an element that does not exist, and nothing was created: the scan still finds no row. "
        + "The update of a missing row was accepted but not applied (or the row is invisible to a scan).");
    } else if (changed.includes(qualifiedColumn) && isTicket) {
      console.log(`The server accepted and stored ${qualifiedColumn} on a ticket: the expected case.`);
    } else if (changed.includes(qualifiedColumn)) {
      console.log(`The server ACCEPTED and STORED ${qualifiedColumn} on a ${typeOfElement}. It does not check that the element is a ticket.`);
      console.log("Where it went: the cell is on the row of this element in the default model (see the table). "
        + "The Tandem app shows the value in the properties panel of the element, under Tickets, but its Tickets panel "
        + `does not list the element: it lists a ticket by its element flag, 0x${ElementFlags.Ticket.toString(16).padStart(8, '0')}, `
        + "which is part of the key and cannot change.");
      console.log(`Element: ${after.row ? nameOf(after.row, '(no name)') : '(no name)'}. Run GET Tickets: it is not listed.`);
    } else {
      console.log("The server answered OK but the scan shows no change: the value was the same as before, or the server ignored it.");
    }
    console.groupEnd();

    if (restore && response.ok && before && after && after.found) {
      console.group("5. Restore");
      const previous = before?.row ? firstValue(before.row[qualifiedColumn]) : undefined;
      const undo = isNoValue(previous)
        ? [MutateActions.Delete, ColumnFamilies.Standard, column, '']
        : [MutateActions.Insert, ColumnFamilies.Standard, column, previous];

      console.log(isNoValue(previous)
        ? "There was no value before: deleting the cell (MutateActions.Delete)."
        : `Writing the previous value back: ${JSON.stringify(previous)}.`);
      const undoResponse = await sendUnguardedMutate(getDefaultModelURN(facilityURN), [elementKey], [undo],
        "REST TestBed (edge case): restore after ticket column test");

      reportResponse(undoResponse);
      const restored = await readElement(facilityURN, region, elementKey, watched);

      reportChanges("After restore", after, restored, watched);
      console.log("The history keeps both changes: the cell is restored, the log is not rewritten.");
      console.groupEnd();
    } else if (response.ok && after?.found) {
      console.log(`Not restored. To undo, send [${MutateActions.Delete}, ${ColumnFamilies.Standard}, ${column}, ""] (or write the previous value) to this key.`);
    }

    console.groupEnd();
    return { elementKey, column, value, response, before, after, changed };
  } catch (error) {
    console.error('Error:', error.message);
    console.groupEnd();
    return null;
  }
}

/**
 * Everything in the rows of an element that a mutate can change: the Standard, Xrefs and user-defined families.
 */
const SnapshotFamilies = [ColumnFamilies.Standard, ColumnFamilies.Xrefs, ColumnFamilies.DtProperties];

/**
 * Read the whole row (Standard, Xrefs and DtProperties families) of an element of any model.
 * Returns null when the scan fails and `{ found: false }` when the element is not in the model.
 */
async function snapshotElement(modelURN, region, key) {
  try {
    const [row] = await scanModel(modelURN, region, { keys: [key], families: SnapshotFamilies });

    return row ? { found: true, row } : { found: false, row: null };
  } catch (error) {
    console.warn(`Could not scan the element: ${error.message}`);
    return null;
  }
}

/**
 * Look for a key in the other models of the facility, to explain a key that is not a row of the target model.
 * @returns {Promise<string|null>} "label (modelURN)" of the first model that has the row, or null
 */
async function findElementInOtherModels(facilityURN, region, key, targetModelURN) {
  try {
    const models = (await getModels(facilityURN, region)) ?? [];

    for (const { modelId, label } of models.filter(model => model.modelId !== targetModelURN)) {
      const [row] = await scanModel(modelId, region, { keys: [key], families: [ColumnFamilies.Standard] });

      if (row) {
        return `${label || 'the default model'} (${modelId})`;
      }
    }
  } catch (error) {
    console.warn(`Could not search the other models: ${error.message}`);
  }
  return null;
}

/**
 * "Category | Name" of a column in the schema of a model, empty when the schema does not know it.
 */
function labelOfColumn(schema, qualifiedColumn) {
  const attr = schema?.lookup.get(qualifiedColumn);

  return attr ? `${attr.category} | ${attr.name}` : '';
}

/**
 * Cells that differ between two snapshots of a row.
 * @returns {Array<{ column: string, before: any, after: any }>} raw values (as in the scan)
 */
function diffSnapshots(before, after) {
  const columns = new Set([...Object.keys(before?.row ?? {}), ...Object.keys(after?.row ?? {})]);
  const changes = [];

  columns.delete(QC.Key);
  for (const column of columns) {
    const was = before?.row?.[column];
    const now = after?.row?.[column];

    if (JSON.stringify(was) !== JSON.stringify(now)) {
      changes.push({ column, before: was, after: now });
    }
  }
  return changes;
}

/**
 * Print the cells that changed in a row, with the name of the property from the schema of its model.
 */
function reportRowChanges(title, schema, changes) {
  if (changes.length === 0) {
    console.log(`${title}: no cell changed.`);
    return;
  }
  console.log(`${title}: ${changes.length} cell(s) changed:`);
  console.table(changes.map(({ column, before, after }) => ({
    column,
    property: labelOfColumn(schema, column),
    before: firstValue(before) ?? '(empty)',
    after: firstValue(after) ?? '(empty)'
  })));
}

/**
 * The asset a BIM element hosts (QC.HostOfAsset: an xref to an element of the default model), if any.
 * @returns {{ modelURN: string, elementKey: string } | null}
 */
function findHostedAsset(snapshot) {
  const xref = firstValue(snapshot?.row?.[QC.HostOfAsset]);

  return xref ? decodeXref(xref) : null;
}

/**
 * Tell what kind of element a key is, for the report: the flags are in the key, the link to an asset in the row.
 */
function describeAssetStatus(key, snapshot, elsewhere = null) {
  if (getElementFlags(key) === ElementFlags.GenericAsset) {
    return snapshot?.found === false
      ? 'this key IS an asset (GenericAsset), but it is not a row of the target model: assets live in the default model'
      : 'this element IS an asset (GenericAsset)';
  }
  if (!snapshot) {
    return 'unknown: the scan of the element failed (see the warning above), so its row could not be read';
  }
  if (!snapshot.found) {
    return elsewhere
      ? `unknown: the key is not a row of the target model. It was found in ${elsewhere}, which is where to send the request to test that element`
      : 'unknown: the key is not a row of the target model, and was not found in any other model of the facility either (wrong key, or deleted)';
  }
  const hosted = findHostedAsset(snapshot);

  return hosted
    ? `not an asset, but it hosts the asset ${hosted.elementKey} in ${hosted.modelURN} (${QC.HostOfAsset})`
    : `not an asset and no asset was made from it (${QC.HostOfAsset} is empty)`;
}

/**
 * Whether a scanned cell holds no value. A cell deleted with MutateActions.Delete still comes back from SCAN, as "".
 */
function isNoValue(value) {
  return value === undefined || value === null || value === '';
}

/**
 * Put back the cells of a row that a test changed: the previous value, or delete the cell if there was none.
 */
async function restoreCells(modelURN, key, changes, description, options) {
  const muts = changes.map(({ column, before }) => {
    const [family, ...columnParts] = column.split(':');
    const previous = firstValue(before);

    return isNoValue(previous)
      ? [MutateActions.Delete, family, columnParts.join(':'), '']
      : [MutateActions.Insert, family, columnParts.join(':'), previous];
  });

  return sendUnguardedMutate(modelURN, muts.map(() => key), muts, description, options);
}

/**
 * EDGE CASE: write a user-defined property to an element without checking that it is an asset
 *
 * The guarded STUBs follow a BIM element to its asset first (and make the asset when there is none), because
 * in V3 user-defined (`z:`) properties belong to the default model. Here the element key is sent as typed, to the
 * model and the endpoint you pick, whether or not the element is an asset, and whether or not the model is the
 * default one. Pick a BIM model and the key of a BIM element to see what the server does.
 *
 * The property comes from the dropdowns, which list the user-defined properties of the DEFAULT model. A `z:` id
 * belongs to the schema of one model: the report says whether the id also exists in the model you write to.
 *
 * The report reads the element before and after, and the asset it hosts, so that a write can be found wherever it
 * went: on the element itself, or redirected to its asset.
 *
 * @param {string} typedModelURN - model the request is sent to (any model of the facility)
 * @param {string} category - category of the property, from the dropdown
 * @param {string} propertyName - name of the property, from the dropdown
 * @param {string} valueText - value as typed, converted to the data type of the property
 * @param {string} typedElementKey - key of the element, sent as typed
 * @param {string} endpoint - MutateEndpoints value
 * @param {boolean} restore - put the changed cells back afterwards
 * @param {boolean} followToAsset - opt-in: swap a BIM key for the key of the asset it hosts, and send to the asset's model
 */
export async function writeUserPropertyWithoutAssetCheck(typedModelURN, region, category, propertyName, valueText, typedElementKey, facilityURN, endpoint, restore, followToAsset = false) {
  console.group("STUB (edge case): writeUserPropertyWithoutAssetCheck()");

  try {
    const defaultModelURN = getDefaultModelURN(facilityURN);
    const options = { endpoint, region };
    let targetModelURN = typedModelURN;
    let elementKey = typedElementKey;
    let isDefaultTarget = targetModelURN === defaultModelURN;

    // The property the dropdowns picked, with its id and data type (the default model is the one that has user-defined properties in V3)
    const defaultSchema = await loadSchemaForModel(defaultModelURN, region);
    const attr = findWritableAttribute(defaultSchema.attributes, category, propertyName);
    const value = typedValueFor(attr, valueText);
    let targetSchema = await loadSchemaForModel(targetModelURN, region);
    const sameIdInTarget = targetSchema.lookup.get(attr.id);
    // dt-server finds an attribute by its column name alone, whatever its family: "Fw" can be r:Fw in a BIM model
    const columnName = attr.id.slice(attr.id.indexOf(':') + 1);
    const sameColumnInTarget = targetSchema.attributes.filter(a => a.id !== attr.id && a.id.slice(a.id.indexOf(':') + 1) === columnName);

    console.log(`Target model: ${targetModelURN} (${isDefaultTarget ? 'the default model' : 'a BIM model, NOT the default model'})`);
    console.log(`Endpoint: ${endpoint === MutateEndpoints.V1 ? 'POST /v1/.../mutate (gateway, compatibility path)' : 'POST /v3/.../mutate (Tandem host)'}`);
    console.log(`Property: ${category} | ${propertyName} = ${attr.id} in the default model, data type ${attr.dataType}`);
    console.log(`Writing ${attr.id} = ${JSON.stringify(value)} to ${elementKey}`);
    console.log(`Type of the element, from the first 4 bytes of its key: ${describeKey(elementKey)}`);
    if (!isDefaultTarget) {
      console.log(sameIdInTarget
        ? `${attr.id} also exists in the schema of the target model, as "${sameIdInTarget.category} | ${sameIdInTarget.name}"`
          + (sameIdInTarget.name === attr.name && sameIdInTarget.category === attr.category ? ' (the same property).' : ' (a DIFFERENT property).')
        : `${attr.id} does NOT exist in the schema of the target model.`);
      if (sameColumnInTarget.length > 0) {
        console.log(`But the column name "${columnName}" is used in the target model by `
          + sameColumnInTarget.map(a => `${a.id} "${a.category} | ${a.name}"`).join(', ')
          + `. dt-server looks a ${ColumnFamilies.DtProperties}: column up by its name alone when it retargets a write to an asset (/v1), so it would read it as that property.`);
      }
    }
    console.warn("No guardrails: the element is not checked (asset or not) and the model is not checked. If the server accepts the request, the change is real and stays in the model history.");

    console.group("1. Before");
    let before = await snapshotElement(targetModelURN, region, elementKey);
    let assetBefore = findHostedAsset(before);
    let assetSnapshotBefore = assetBefore ? await snapshotElement(assetBefore.modelURN, region, assetBefore.elementKey) : null;

    const elsewhere = before && !before.found ? await findElementInOtherModels(facilityURN, region, elementKey, targetModelURN) : null;

    console.log(`Is the element an asset? ${describeAssetStatus(elementKey, before, elsewhere)}. (Information only: it does not change what is sent.)`);
    if (followToAsset) {
      if (assetBefore) {
        console.log(`"Use the asset instead" is ticked: the BIM key ${elementKey} is replaced by the key of the asset it hosts, `
          + `${assetBefore.elementKey}, and the request goes to the model of the asset (${assetBefore.modelURN}).`);
        targetModelURN = assetBefore.modelURN;
        elementKey = assetBefore.elementKey;
        isDefaultTarget = targetModelURN === defaultModelURN;
        targetSchema = await loadSchemaForModel(targetModelURN, region);
        before = assetSnapshotBefore;
        assetBefore = null;
        assetSnapshotBefore = null;
        console.log(`Now writing ${attr.id} to ${elementKey}: ${describeKey(elementKey)}`);
      } else if (getElementFlags(elementKey) === ElementFlags.GenericAsset) {
        if (targetModelURN !== defaultModelURN) {
          console.log(`"Use the asset instead" is ticked and the key is already an asset key: it is sent to the default model (${defaultModelURN}) `
            + `instead of the model selected (${targetModelURN}), because assets live in the default model.`);
          targetModelURN = defaultModelURN;
          isDefaultTarget = true;
          targetSchema = defaultSchema;
          before = await snapshotElement(targetModelURN, region, elementKey);
        } else {
          console.log('"Use the asset instead" is ticked, but the key already is an asset key in the default model: the request is sent as typed.');
        }
      } else {
        console.log('"Use the asset instead" is ticked, but no asset was found for this element: the request is sent as typed.');
      }
    }
    console.groupEnd();

    console.group("2. The request");
    const response = await sendUnguardedMutate(targetModelURN, [elementKey],
      [[MutateActions.Insert, attr.fam ?? attr.id.split(':')[0], attr.col ?? attr.id.split(':').slice(1).join(':'), value]],
      "REST TestBed (edge case): user-defined property without asset check", options);

    reportResponse(response);
    console.groupEnd();

    console.group("3. After");
    let after = before;
    let assetAfter = assetBefore;
    let assetSnapshotAfter = assetSnapshotBefore;
    let elementChanges = [];
    let assetChanges = [];

    if (response.sent) {
      after = await snapshotElement(targetModelURN, region, elementKey);
      assetAfter = findHostedAsset(after);
      assetSnapshotAfter = assetAfter ? await snapshotElement(assetAfter.modelURN, region, assetAfter.elementKey) : null;
      elementChanges = diffSnapshots(before, after);
      reportRowChanges(`The element in ${isDefaultTarget ? 'the default model' : 'the target model'}`, targetSchema, elementChanges);
      if (assetAfter) {
        assetChanges = diffSnapshots(assetBefore ? assetSnapshotBefore : null, assetSnapshotAfter);
        reportRowChanges(`The asset it hosts (${assetAfter.elementKey}, default model)`, defaultSchema, assetChanges);
      } else {
        console.log("The element hosts no asset, so there is no asset to look at.");
      }
    }
    console.groupEnd();

    console.group("4. What this means");
    const storedColumns = elementChanges.map(change => change.column);
    const assetColumns = assetChanges.map(change => change.column);
    const remapped = [...storedColumns, ...assetColumns].filter(column => column !== attr.id);

    if (!response.sent) {
      console.log("Nothing was sent, so there is nothing to conclude. Fix the request first.");
    } else if (!response.ok) {
      console.log(`The server refuses this write (HTTP ${response.status}). The message above is the only explanation it gives.`);
    } else if (!before || !after) {
      console.log("The server answered OK but the element could not be scanned, so we cannot tell where (or whether) the value was stored.");
    } else if (!before.found && !after.found) {
      console.log(`The server answered OK for an element that is not in the target model, and nothing was created: the scan still finds no row. `
        + "The update of a missing row was accepted but not applied (or the row is invisible to a scan).");
    } else if (storedColumns.length > 0) {
      console.log(`The server ACCEPTED the write and stored it on the element itself, in ${isDefaultTarget ? 'the default model' : 'a BIM model'}: `
        + `${storedColumns.join(', ')}.`);
      if (!isDefaultTarget) {
        console.log("A BIM element now carries a user-defined value. The V3 rule is that user-defined properties live in the default model, on the asset; "
          + "the guarded STUBs write there. Check in the Tandem UI whether this value shows on the element.");
      } else if (getElementFlags(elementKey) !== ElementFlags.GenericAsset) {
        console.log(`The element is a ${describeKey(elementKey)}, not an asset: the server stored the value on it all the same.`);
      } else {
        console.log("The element is an asset in the default model: the expected case.");
      }
    } else if (assetColumns.length > 0) {
      console.log(`The server ACCEPTED the write and REDIRECTED it to the asset ${assetAfter.elementKey} in the default model: ${assetColumns.join(', ')}. `
        + "The element itself was not changed.");
    } else {
      console.log("The server answered OK but no cell of the element or of its asset changed: the value was the same as before, or the server ignored it.");
    }
    if (response.ok && remapped.length > 0) {
      console.log(`NOTE: the id sent was ${attr.id}, the cell(s) changed: ${remapped.join(', ')}. A different id means the server translated it to another model's schema.`);
    }
    console.groupEnd();

    const toRestore = [
      { modelURN: targetModelURN, key: elementKey, changes: elementChanges, snapshotBefore: before },
      { modelURN: assetAfter?.modelURN, key: assetAfter?.elementKey, changes: assetChanges, snapshotBefore: assetSnapshotBefore }
    ].filter(item => item.changes.length > 0);

    if (response.ok && toRestore.length > 0) {
      if (restore) {
        console.group("5. Restore");
        for (const item of toRestore) {
          // A BIM element that holds a user-defined cell has to be restored through the endpoint that wrote it
          const response2 = await restoreCells(item.modelURN, item.key, item.changes,
            "REST TestBed (edge case): restore after user-defined property test", options);

          console.log(`Restoring ${item.changes.length} cell(s) of ${item.key} in ${item.modelURN}:`);
          reportResponse(response2);
          const restored = await snapshotElement(item.modelURN, region, item.key);

          reportRowChanges("After restore", item.modelURN === defaultModelURN ? defaultSchema : targetSchema,
            diffSnapshots(item.snapshotBefore, restored));
        }
        console.log("The history keeps all the changes: the cells are restored, the log is not rewritten.");
        console.groupEnd();
      } else {
        console.log(`Not restored. To undo, send ${MutateActions.Delete} (or the previous value) for ${toRestore.map(item => item.changes.map(change => change.column).join(', ')).join(' and ')}.`);
      }
    }

    console.groupEnd();
    return { elementKey, targetModelURN, followedToAsset: elementKey !== typedElementKey, attribute: attr, response, elementChanges, assetChanges };
  } catch (error) {
    console.error('Error:', error.message);
    console.groupEnd();
    return null;
  }
}

/**
 * Read-only columns the stub offers: the ones the guarded STUBs never write.
 * Each has an override column (the same name with a `!` in front) that holds a user's change on top of the original value.
 */
export const ReadOnlyColumns = [
  { qualifiedColumn: QC.Name, label: 'Name' },
  { qualifiedColumn: `${ColumnFamilies.Standard}:${ColumnNames.UniformatClass}`, label: 'Uniformat Class' },
  { qualifiedColumn: QC.Classification, label: 'Classification' },
  { qualifiedColumn: QC.TandemCategory, label: 'Tandem Category' },
  { qualifiedColumn: QC.Level, label: 'Level (reference)' }
];

/**
 * EDGE CASE: write a read-only column, or its override column, to any element of any model
 *
 * The guarded STUBs never write these columns. Here the request is sent as typed to the model and endpoint
 * you pick, with the plain `Insert` action, whatever the element is. Tick "use ! override" to write the override
 * column (`n:!n` instead of `n:n`): the override holds a change on top of the original, which stays as it was.
 *
 * The report reads the whole row of the element (and of the asset it hosts) before and after, so that a write can
 * be found wherever it went, and shows the original and override cells side by side.
 *
 * @param {string} targetModelURN - model the request is sent to (any model of the facility)
 * @param {string} baseColumn - qualified column from ReadOnlyColumns, e.g. QC.Name
 * @param {string} elementKey - key of the element, sent as typed
 * @param {string} valueText - value, sent as typed (a string)
 * @param {boolean} useOverride - write the override column (`!` in front of the column name) instead
 * @param {string} endpoint - MutateEndpoints value
 * @param {boolean} restore - put the changed cells back afterwards
 * @param {boolean} followToAsset - opt-in: send to the default model instead, swapping a BIM key for the key of the asset it hosts
 */
export async function writeReadOnlyColumn(targetModelURN, region, facilityURN, baseColumn, elementKey, valueText, useOverride, endpoint, restore, followToAsset = false) {
  console.group("STUB (edge case): writeReadOnlyColumn()");

  try {
    const defaultModelURN = getDefaultModelURN(facilityURN);
    const options = { endpoint, region };
    let isDefaultTarget = targetModelURN === defaultModelURN;
    const [family, ...nameParts] = baseColumn.split(':');
    const baseName = nameParts.join(':');
    const overrideColumn = `${family}:${OverrideColumnPrefix}${baseName}`;
    const sentColumn = useOverride ? overrideColumn : baseColumn;
    const sentName = sentColumn.slice(family.length + 1);
    let targetSchema = await loadSchemaForModel(targetModelURN, region);
    const defaultSchema = await loadSchemaForModel(defaultModelURN, region);

    console.log(`Target model: ${targetModelURN} (${isDefaultTarget ? 'the default model' : 'a BIM model, NOT the default model'})`);
    console.log(`Endpoint: ${endpoint === MutateEndpoints.V1 ? 'POST /v1/.../mutate (gateway, compatibility path)' : 'POST /v3/.../mutate (Tandem host)'}`);
    const propertyLabel = labelOfColumn(targetSchema, baseColumn);

    console.log(`Column: ${sentColumn}${useOverride ? `, the override of ${baseColumn}` : ''}${propertyLabel ? ` (${propertyLabel})` : ''}`);
    console.log(`Writing ${sentColumn} = ${JSON.stringify(valueText)} to ${elementKey}`);
    console.log(`Type of the element, from the first 4 bytes of its key: ${describeKey(elementKey)}`);
    console.warn("No guardrails: the column is not checked and neither is the model. If the server accepts the request, the change is real and stays in the model history.");

    console.group("1. Before");
    let before = await snapshotElement(targetModelURN, region, elementKey);
    let assetBefore = findHostedAsset(before);
    let assetSnapshotBefore = assetBefore ? await snapshotElement(assetBefore.modelURN, region, assetBefore.elementKey) : null;
    const elsewhere = before && !before.found ? await findElementInOtherModels(facilityURN, region, elementKey, targetModelURN) : null;

    console.log(`Is the element an asset? ${describeAssetStatus(elementKey, before, elsewhere)}.`);
    if (followToAsset) {
      if (assetBefore) {
        console.log(`"Send to the default model" is ticked: the BIM key ${elementKey} is replaced by the key of the asset it hosts, `
          + `${assetBefore.elementKey}, and the request goes to the model of the asset (${assetBefore.modelURN}).`);
        targetModelURN = assetBefore.modelURN;
        elementKey = assetBefore.elementKey;
        isDefaultTarget = targetModelURN === defaultModelURN;
        targetSchema = await loadSchemaForModel(targetModelURN, region);
        before = assetSnapshotBefore;
        assetBefore = null;
        assetSnapshotBefore = null;
        console.log(`Now writing ${sentColumn} to ${elementKey}: ${describeKey(elementKey)}`);
      } else if (getElementFlags(elementKey) === ElementFlags.GenericAsset) {
        if (targetModelURN !== defaultModelURN) {
          console.log(`"Send to the default model" is ticked and the key is an asset key: it is sent to the default model (${defaultModelURN}) `
            + `instead of the model selected (${targetModelURN}), because assets live in the default model.`);
          targetModelURN = defaultModelURN;
          isDefaultTarget = true;
          targetSchema = defaultSchema;
          before = await snapshotElement(targetModelURN, region, elementKey);
        } else {
          console.log('"Send to the default model" is ticked, but the key already is an asset key in the default model: the request is sent as typed.');
        }
      } else {
        console.log('"Send to the default model" is ticked, but no asset was found for this element: the request is sent as typed.');
      }
    }
    console.groupEnd();

    console.group("2. The request");
    const response = await sendUnguardedMutate(targetModelURN, [elementKey],
      [[MutateActions.Insert, family, sentName, valueText]],
      "REST TestBed (edge case): read-only column", options);

    reportResponse(response);
    console.groupEnd();

    console.group("3. After");
    let after = before;
    let assetAfter = assetBefore;
    let assetSnapshotAfter = assetSnapshotBefore;
    let elementChanges = [];
    let assetChanges = [];

    if (response.sent) {
      after = await snapshotElement(targetModelURN, region, elementKey);
      assetAfter = findHostedAsset(after);
      assetSnapshotAfter = assetAfter ? await snapshotElement(assetAfter.modelURN, region, assetAfter.elementKey) : null;
      elementChanges = diffSnapshots(before, after);
      reportRowChanges(`The element in ${isDefaultTarget ? 'the default model' : 'the target model'}`, targetSchema, elementChanges);
      if (before?.found || after?.found) {
        console.log("The original and the override cell of the element, before and after:");
        console.table([baseColumn, overrideColumn].map(column => ({
          column,
          before: firstValue(before?.row?.[column]) ?? '(empty)',
          after: firstValue(after?.row?.[column]) ?? '(empty)'
        })));
      }
      if (assetAfter) {
        assetChanges = diffSnapshots(assetBefore ? assetSnapshotBefore : null, assetSnapshotAfter);
        reportRowChanges(`The asset it hosts (${assetAfter.elementKey}, default model)`, defaultSchema, assetChanges);
      }
    }
    console.groupEnd();

    console.group("4. What this means");
    const storedColumns = elementChanges.map(change => change.column);
    const assetColumns = assetChanges.map(change => change.column);

    if (!response.sent) {
      console.log("Nothing was sent, so there is nothing to conclude. Fix the request first.");
    } else if (!response.ok) {
      console.log(`The server refuses this write (HTTP ${response.status}). The message above is the only explanation it gives.`);
      if (before && !before.found) {
        console.log("NOTE: the key is not a row of the model the request was sent to, so the refusal may be about the key and the model, not about the column. "
          + 'Tick "Send to the default model", or pick the model that holds the element.');
      }
      if (!useOverride) {
        console.log(`Tick "use ! override" to send ${overrideColumn} instead, and see whether the override column is accepted.`);
      }
    } else if (!before || !after) {
      console.log("The server answered OK but the element could not be scanned, so we cannot tell where (or whether) the value was stored.");
    } else if (!before.found && !after.found) {
      console.log("The server answered OK for an element that is not in the target model, and nothing was created: the scan still finds no row. "
        + "The update of a missing row was accepted but not applied (or the row is invisible to a scan).");
    } else if (storedColumns.includes(sentColumn)) {
      console.log(`The server ACCEPTED the write and stored it on the element itself, in ${isDefaultTarget ? 'the default model' : 'a BIM model'}: ${sentColumn}.`);
      console.log(useOverride
        ? `The original ${baseColumn} is ${storedColumns.includes(baseColumn) ? 'CHANGED too' : 'unchanged'}: the override sits next to it. `
          + "Check in the Tandem UI which of the two it shows."
        : `${baseColumn} is a column the guarded STUBs never write, and the server did not stop the write. Check in the Tandem UI whether the new value shows.`);
    } else if (assetColumns.length > 0) {
      console.log(`The server ACCEPTED the write and REDIRECTED it to the asset ${assetAfter.elementKey} in the default model: ${assetColumns.join(', ')}. `
        + "The element itself was not changed.");
    } else if (storedColumns.length > 0) {
      console.log(`The server answered OK and a different cell changed than the one sent (${sentColumn}): ${storedColumns.join(', ')}.`);
    } else {
      console.log("The server answered OK but no cell of the element or of its asset changed: the value was the same as before, or the server ignored it.");
    }
    console.groupEnd();

    const toRestore = [
      { modelURN: targetModelURN, key: elementKey, changes: elementChanges, snapshotBefore: before },
      { modelURN: assetAfter?.modelURN, key: assetAfter?.elementKey, changes: assetChanges, snapshotBefore: assetSnapshotBefore }
    ].filter(item => item.changes.length > 0);

    if (response.ok && toRestore.length > 0) {
      if (restore) {
        console.group("5. Restore");
        for (const item of toRestore) {
          const response2 = await restoreCells(item.modelURN, item.key, item.changes,
            "REST TestBed (edge case): restore after read-only column test", options);

          console.log(`Restoring ${item.changes.length} cell(s) of ${item.key} in ${item.modelURN}:`);
          reportResponse(response2);
          const restored = await snapshotElement(item.modelURN, region, item.key);

          reportRowChanges("After restore", item.modelURN === defaultModelURN ? defaultSchema : targetSchema,
            diffSnapshots(item.snapshotBefore, restored));
        }
        console.log("The history keeps all the changes: the cells are restored, the log is not rewritten.");
        console.groupEnd();
      } else {
        console.log(`Not restored. To undo, send ${MutateActions.Delete} (or the previous value) for ${toRestore.map(item => item.changes.map(change => change.column).join(', ')).join(' and ')}.`);
      }
    }

    console.groupEnd();
    return { elementKey, targetModelURN, sentColumn, response, elementChanges, assetChanges };
  } catch (error) {
    console.error('Error:', error.message);
    console.groupEnd();
    return null;
  }
}

/**
 * The host of a stream, from its Parent xref (QC.XParent), for the report.
 */
function describeStreamHost(snapshot) {
  const xref = firstValue(snapshot?.row?.[QC.XParent]);

  if (isNoValue(xref)) {
    return '(no host)';
  }
  const host = decodeXref(xref);

  return host ? `${host.elementKey} in ${host.modelURN}, ${describeKey(host.elementKey)}` : `${xref} (not a valid xref)`;
}

/**
 * EDGE CASE: host a stream directly on a BIM element, without going through its asset
 *
 * The guarded STUBs (Create Stream, Assign Host) follow a BIM element to its asset first, and make the asset when
 * there is none, because in V3 a stream is hosted by an element of the default model. Here the Parent xref of the
 * stream (QC.XParent) is written as the xref of the element you give, in the model you pick, as typed: a BIM element
 * of a BIM model stays a BIM element.
 *
 * The stream is a row of the default model, so the request goes there. Only the Parent xref is written; the room
 * and level the guarded STUBs also set for a room host are left alone.
 *
 * @param {string} hostModelURN - model of the host element, typically a BIM model
 * @param {string} streamKey - key of a stream of the default model, sent as typed
 * @param {string} hostKey - key of the host element in hostModelURN, sent as typed (not followed to its asset)
 * @param {string} endpoint - MutateEndpoints value
 * @param {boolean} restore - put the previous host back afterwards
 */
export async function writeStreamHostWithoutAssetCheck(hostModelURN, region, facilityURN, streamKey, hostKey, endpoint, restore) {
  console.group("STUB (edge case): writeStreamHostWithoutAssetCheck()");

  try {
    const defaultModelURN = getDefaultModelURN(facilityURN);
    const options = { endpoint, region };
    const isStream = getElementFlags(streamKey) === ElementFlags.StreamV3;
    const hostXref = makeXrefKey(hostModelURN, hostKey);

    console.log("Stream (default model):", streamKey, `- ${describeKey(streamKey)}`);
    console.log(`Host model: ${hostModelURN} (${hostModelURN === defaultModelURN ? 'the default model' : 'a BIM model, NOT the default model'})`);
    console.log("Host key:", hostKey, `- ${describeKey(hostKey)}`);
    console.log(`Endpoint: ${endpoint === MutateEndpoints.V1 ? 'POST /v1/.../mutate (gateway, compatibility path)' : 'POST /v3/.../mutate (Tandem host)'}`);
    console.log(`Writing ${QC.XParent} = ${hostXref} (the xref of the host key in the host model)`);
    if (!isStream) {
      console.warn("This key is NOT a stream (ElementFlags.StreamV3), so the test is about another element type.");
    }
    console.warn("No guardrails: the host is not followed to its asset and the model is not checked. If the server accepts the request, the change is real and stays in the model history.");

    console.group("1. Before");
    const before = await snapshotElement(defaultModelURN, region, streamKey);
    const hostSnapshot = await snapshotElement(hostModelURN, region, hostKey);
    const elsewhere = hostSnapshot && !hostSnapshot.found
      ? await findElementInOtherModels(facilityURN, region, hostKey, hostModelURN)
      : null;

    if (before && !before.found) {
      console.warn("The stream is not a row of the default model.");
    }
    console.log("Current host of the stream:", describeStreamHost(before));
    console.log(`Is the host an asset? ${describeAssetStatus(hostKey, hostSnapshot, elsewhere)}.`);
    console.groupEnd();

    console.group("2. The request");
    const response = await sendUnguardedMutate(defaultModelURN,
      [streamKey],
      [[MutateActions.Insert, ColumnFamilies.Xrefs, ColumnNames.Parent, hostXref]],
      "REST TestBed (edge case): stream host without asset check", options);

    reportResponse(response);
    console.groupEnd();

    console.group("3. After");
    const after = response.sent ? await snapshotElement(defaultModelURN, region, streamKey) : before;
    const changes = response.sent ? diffSnapshots(before, after) : [];
    const defaultSchema = await loadSchemaForModel(defaultModelURN, region);

    reportRowChanges("The stream", defaultSchema, changes);
    console.log("Host of the stream after the request:", describeStreamHost(after));
    console.groupEnd();

    console.group("4. What this means");
    const hostChanged = changes.some(change => change.column === QC.XParent);
    const hostedAsset = findHostedAsset(hostSnapshot);

    if (!response.sent) {
      console.log("Nothing was sent, so there is nothing to conclude. Fix the request first.");
    } else if (!response.ok) {
      console.log(`The server refuses this write (HTTP ${response.status}). The message above is the only explanation it gives.`);
    } else if (!before || !after) {
      console.log("The server answered OK but the stream could not be scanned, so we cannot tell whether the host changed.");
    } else if (hostChanged && hostModelURN !== defaultModelURN) {
      console.log(`The server ACCEPTED and STORED a host in a BIM model: the stream's ${QC.XParent} now points to ${hostKey} in ${hostModelURN}. `
        + "It does not check that the host is an element of the default model.");
      console.log(hostedAsset
        ? `That BIM element hosts the asset ${hostedAsset.elementKey}: the guarded STUBs would have used the asset as the host.`
        : "That BIM element has no asset: the guarded STUBs would have made one and used it as the host.");
      console.log("Check in the Tandem app: the host and the location of the stream, the BIM element, and its asset if any.");
    } else if (hostChanged) {
      console.log(`The server accepted and stored the host ${hostKey}, an element of the default model: the expected case.`);
    } else {
      console.log("The server answered OK but the stream's host did not change: it was the same as before, or the server ignored it.");
    }
    console.groupEnd();

    if (response.ok && changes.length > 0) {
      if (restore) {
        console.group("5. Restore");
        const undoResponse = await restoreCells(defaultModelURN, streamKey, changes,
          "REST TestBed (edge case): restore after stream host test", options);

        reportResponse(undoResponse);
        const restored = await snapshotElement(defaultModelURN, region, streamKey);

        reportRowChanges("After restore, compared with before the test", defaultSchema, diffSnapshots(before, restored));
        console.log("Host of the stream after restore:", describeStreamHost(restored));
        console.log("The history keeps all the changes: the cells are restored, the log is not rewritten.");
        console.groupEnd();
      } else {
        console.log(`Not restored. To undo, write the previous ${QC.XParent} back, or send ${MutateActions.Delete} for it if there was none.`);
      }
    }

    console.groupEnd();
    return { streamKey, hostModelURN, hostKey, hostXref, response, before, after, changes };
  } catch (error) {
    console.error('Error:', error.message);
    console.groupEnd();
    return null;
  }
}
