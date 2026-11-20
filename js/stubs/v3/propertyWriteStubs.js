/**
 * Property STUB Functions - V3 schema (write)
 *
 * How V3 differs from V2 (see js/stubs/v2/propertyStubs.js and js/stubs/v3/writeHelpers.js):
 *
 * - Nothing is written to a BIM (source) model. User-defined properties (`z:` family) and overrides
 *   (`n:!n`, `n:!v`, ...) are written to the element in the DEFAULT model.
 * - Writes only happen in the default model, which is the only model of the Model dropdown. Element keys
 *   are keys of the default model. A BIM element can be given by its xref (or a Tandem URL): it is followed
 *   to its asset (QC.HostOfAsset). A BIM element without asset is first converted to an asset with
 *   POST /v3/modeldata/{model}/makeAssets, which is logged. The write then goes to the asset.
 * - The `z:` ids of a property differ per model, so the property is always looked up in the schema
 *   of the default model.
 * - The write uses POST /v3/modeldata/{defaultModel}/mutate (explicit v3 in the path).
 *
 * Output goes to browser console - open DevTools to see results.
 */

import { getDefaultModelURN, getModelSchema } from '../../api.js';
import { ColumnFamilies, ColumnNames, MutateActions, QC } from '../../../tandem/constants.js';
import { parseCommaList, typedValueFor } from '../../utils.js';
import { findWritableAttribute, getNotWritableHint, isWritableAttribute } from '../../state/schemaCache.js';
import { scanModel, firstValue } from './helpers.js';
import {
  findClassificationId,
  mutateV3,
  assertDefaultModel,
  parseElementRefs,
  resolveAssetTargets
} from './writeHelpers.js';

/**
 * Assign a classification to elements
 *
 * The classification override (n:!v) stores the classification ID of the facility template
 * (the first column of template.classification.rows), so the name is looked up first.
 *
 * @param {string} facilityURN - Facility URN
 * @param {string} region - Region header
 * @param {string} classificationStr - Classification name or id
 * @param {string} modelURN - The default model (the only model that is written to)
 * @param {string} elementKeys - Comma-separated 24-byte keys of the default model, or xrefs / Tandem URLs of BIM elements
 */
export async function assignClassification(facilityURN, region, classificationStr, modelURN, elementKeys) {
  console.group("STUB: assignClassification()");

  try {
    assertDefaultModel(facilityURN, modelURN);
    const refs = parseElementRefs(elementKeys, facilityURN);
    const classId = await findClassificationId(facilityURN, region, classificationStr);

    if (!classId) {
      throw new Error(`Could not find classification "${classificationStr}" in the facility template. TIP: Use GET Facility Inline Template to see them.`);
    }
    const targets = await resolveAssetTargets(facilityURN, region, refs, {
      createMissing: true,
      description: 'REST TestBedApp: create assets to classify'
    });
    const targetKeys = targets.map(target => target.targetKey);
    // ColumnNames.OClassification is the override: the classification itself (n:v) cannot be written directly
    const muts = targetKeys.map(() => [MutateActions.Insert, ColumnFamilies.Standard, ColumnNames.OClassification, classId]);

    await mutateV3(facilityURN, region, targetKeys, muts, "REST TestBedApp: updated classification");
  } catch (error) {
    console.error('Error assigning classification:', error.message);
  }

  console.groupEnd();
}

/**
 * Write one property value to the assets of the given elements.
 */
async function writeProperty(facilityURN, region, modelURN, attr, valueText, elementKeys) {
  assertDefaultModel(facilityURN, modelURN);
  const refs = parseElementRefs(elementKeys, facilityURN);
  const typedValue = typedValueFor(attr, valueText);
  const [family, ...columnParts] = attr.id.split(':');
  const column = columnParts.join(':');
  const targets = await resolveAssetTargets(facilityURN, region, refs, {
    createMissing: true,
    description: 'REST TestBedApp: create assets to set a property'
  });
  const targetKeys = targets.map(target => target.targetKey);
  const muts = targetKeys.map(() => [MutateActions.Insert, family, column, typedValue]);

  console.log(`Setting ${attr.id} =`, typedValue);
  await mutateV3(facilityURN, region, targetKeys, muts, "REST TestBedApp: updated property");
}

/**
 * Set property values on elements using category and property name
 *
 * @param {string} modelURN - The default model (the only model that is written to)
 * @param {string} region - Region header
 * @param {string} propCategory - Property category name
 * @param {string} propName - Property name
 * @param {string} propVal - Property value to set
 * @param {string} elementKeys - Comma-separated 24-byte keys of the default model, or xrefs / Tandem URLs of BIM elements
 * @param {string} facilityURN - Facility URN (the default model is derived from it)
 */
export async function setPropertySelSet(modelURN, region, propCategory, propName, propVal, elementKeys, facilityURN) {
  console.group("STUB: setPropertySelSet()");

  try {
    const defaultModelURN = getDefaultModelURN(facilityURN);

    console.log(`Looking up the property in the schema of the default model (${defaultModelURN})...`);
    const schema = await getModelSchema(defaultModelURN, region);
    const attr = findWritableAttribute(schema?.attributes ?? [], propCategory, propName);

    console.log("Qualified property found:", attr);
    await writeProperty(facilityURN, region, modelURN, attr, propVal, elementKeys);
  } catch (error) {
    console.error('Error setting property:', error.message);
  }

  console.groupEnd();
}

/**
 * Set property values on elements using qualified property ID directly
 *
 * @param {string} modelURN - The default model (the only model that is written to)
 * @param {string} region - Region header
 * @param {string} qualPropStr - Qualified property ID of the default model (e.g., "z:5mQ" or an override like "n:!n")
 * @param {string} propVal - Property value to set
 * @param {string} elementKeys - Comma-separated 24-byte keys of the default model, or xrefs / Tandem URLs of BIM elements
 * @param {string} facilityURN - Facility URN (the default model is derived from it)
 */
export async function setPropertySelSetQP(modelURN, region, qualPropStr, propVal, elementKeys, facilityURN) {
  console.group("STUB: setPropertySelSetQP()");

  try {
    const firstColon = qualPropStr.indexOf(':');

    if (firstColon < 1) {
      throw new Error(`Invalid qualified property format: "${qualPropStr}". Expected "family:column" (e.g., "z:5mQ")`);
    }
    const defaultModelURN = getDefaultModelURN(facilityURN);

    console.log(`Looking up the property in the schema of the default model (${defaultModelURN})...`);
    const schema = await getModelSchema(defaultModelURN, region);
    let attr = (schema?.attributes ?? []).find(a => a.id === qualPropStr);

    if (attr && !isWritableAttribute(attr)) {
      throw new Error(`"${qualPropStr}" is read-only. Only user-defined properties (z:) and the override columns of built-in properties (e.g. n:!n) can be written.${getNotWritableHint([qualPropStr])}`);
    } else if (attr) {
      console.log("Qualified property found:", attr);
    } else if (qualPropStr.slice(0, firstColon) === ColumnFamilies.DtProperties) {
      throw new Error(`"${qualPropStr}" is not a user-defined property of the default model. The z: ids of a BIM model are different and cannot be used.`);
    } else {
      console.warn(`Property "${qualPropStr}" not found in schema. Proceeding with string value.`);
      attr = { id: qualPropStr };
    }
    await writeProperty(facilityURN, region, modelURN, attr, propVal, elementKeys);
  } catch (error) {
    console.error('Error setting property:', error.message);
  }

  console.groupEnd();
}

/**
 * Delete (clear) a property value from selected elements using MutateActions.Delete ('d').
 *
 * What "delete" means in Tandem: the server never physically removes a cell. MutateActions.Delete
 * sets the value to empty and records it in history, so the column still shows in scans, empty.
 * Do not delete columns that were never written: the server would create an empty cell. This stub
 * scans first and only deletes columns that hold a value.
 *
 * V3: the values live on the assets of the default model. BIM elements are followed to their asset;
 * a BIM element without asset has no values to delete, so no asset is created for it.
 *
 * @param {string} facilityURN - Facility URN
 * @param {string} region - Region header
 * @param {string} modelURN - The default model (the only model that is written to)
 * @param {string} elementKeys - Comma-separated 24-byte keys of the default model, or xrefs / Tandem URLs of BIM elements
 * @param {string} qualPropNames - Comma-separated qualified property names of the default model
 *   (family:column, split on the first colon), e.g. "z:4wc"
 */
export async function deletePropertyValue(facilityURN, region, modelURN, elementKeys, qualPropNames) {
  console.group("STUB: deletePropertyValue()");

  try {
    assertDefaultModel(facilityURN, modelURN);
    const refs = parseElementRefs(elementKeys, facilityURN);
    const props = parseCommaList(qualPropNames).map(qualName => {
      const firstColon = qualName.indexOf(':');

      if (firstColon < 1) {
        throw new Error(`Invalid qualified property: "${qualName}". Expected "family:column" e.g. "z:4wc"`);
      }
      return { qualName, family: qualName.slice(0, firstColon), column: qualName.slice(firstColon + 1) };
    });

    if (props.length === 0) {
      throw new Error('At least one qualified property name is required.');
    }
    const targets = (await resolveAssetTargets(facilityURN, region, refs, {
      createMissing: false
    })).filter(target => {
      if (!target.targetKey) {
        console.log(`  — ${target.sourceKey} has no asset, so it has no values to delete`);
      }
      return target.targetKey;
    });

    if (targets.length === 0) {
      console.log("Nothing to delete.");
      console.groupEnd();
      return;
    }

    // Scan first: only delete columns that hold a value
    console.log("Scanning the elements first to confirm which columns have data...");
    const targetKeys = targets.map(target => target.targetKey);
    const rows = await scanModel(getDefaultModelURN(facilityURN), region, {
      keys: targetKeys,
      families: [...new Set(props.map(prop => prop.family))]
    });
    const deleteKeys = [];
    const muts = [];

    for (const row of rows) {
      const rowKey = row[QC.Key];

      for (const { qualName, family, column } of props) {
        const value = firstValue(row[qualName]);

        if (value === undefined || value === null || value === '') {
          console.log(`  — Skipping "${qualName}" on ${rowKey}: already empty or absent`);
          continue;
        }
        console.log(`  ✓ Found "${qualName}" = ${JSON.stringify(value)} on ${rowKey} — will delete`);
        deleteKeys.push(rowKey);
        muts.push([MutateActions.Delete, family, column, '']);
      }
    }
    if (deleteKeys.length === 0) {
      console.log("Nothing to delete — all specified columns are already empty or absent.");
      console.groupEnd();
      return;
    }
    console.log(`Sending ${deleteKeys.length} delete mutation(s)...`);
    await mutateV3(facilityURN, region, deleteKeys, muts, "REST TestBed: delete property value(s)");
    console.log("Done. Re-run 'SCAN for all User-defined properties' to confirm — deleted columns now show an empty value.");
  } catch (error) {
    console.error('Error deleting property:', error.message);
  }

  console.groupEnd();
}
