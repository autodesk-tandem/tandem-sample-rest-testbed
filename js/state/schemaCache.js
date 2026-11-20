/**
 * Schema Cache Module
 * 
 * Caches model schemas for autocomplete and property lookups.
 * This is for UI convenience - developers can see the API calls in console.
 */

import { tandemBaseURL, makeRequestOptionsGET } from '../api.js';
import { AttributeFlags, AttributeType, ColumnFamilies, OverrideColumnPrefix, QC } from '../../tandem/constants.js';

// Schema cache: modelURN -> { attributes: [...], lookup: Map(qualifiedProp -> attribute) }
const schemaCache = {};

/**
 * Fetch schema for a model (logs to console for educational purposes)
 * @param {string} modelURN - Model URN
 * @param {string} region - Region header
 * @returns {Promise<Object>} Schema object
 */
async function fetchSchema(modelURN, region) {
  const requestPath = `${tandemBaseURL}/modeldata/${modelURN}/schema`;
  console.log(`SCHEMA CACHE: GET ${requestPath}`);
  
  try {
    const response = await fetch(requestPath, makeRequestOptionsGET(region));
    
    if (!response.ok) {
      throw new Error(`Failed to fetch schema: ${response.statusText}`);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching schema:', error);
    return { attributes: [] };
  }
}

/**
 * Load and cache schema for a model
 * @param {string} modelURN - Model URN
 * @param {string} region - Region header
 * @returns {Promise<Object>} Schema object with attributes array and lookup map
 */
export async function loadSchemaForModel(modelURN, region) {
  if (schemaCache[modelURN]) {
    return schemaCache[modelURN];
  }
  
  const schema = await fetchSchema(modelURN, region);
  
  // Create a lookup map for quick property lookups
  const lookup = new Map();
  if (schema.attributes) {
    schema.attributes.forEach(attr => {
      lookup.set(attr.id, attr);
    });
  }
  
  schemaCache[modelURN] = {
    attributes: schema.attributes || [],
    lookup: lookup
  };
  
  console.log(`SCHEMA CACHE: Model ${modelURN} → ${schema.attributes?.length || 0} attributes cached`);
  
  return schemaCache[modelURN];
}

/**
 * Load schemas for all models in a facility
 * @param {Array} models - Array of model objects from facility info
 * @param {string} region - Region header
 * @returns {Promise<void>}
 */
export async function loadSchemasForFacility(models, region) {
  console.group("SCHEMA CACHE: Loading schemas for all models...");
  
  const promises = models.map(model => loadSchemaForModel(model.modelId, region));
  await Promise.all(promises);
  
  const totalAttributes = Object.values(schemaCache).reduce((sum, schema) => sum + schema.attributes.length, 0);
  console.log(`✓ Schema cache ready (${totalAttributes} total attributes across ${models.length} models)`);
  console.groupEnd();
}

/**
 * Value types a STUB can write to a built-in column. The ref and xref columns (l:!l, x:!loc, ...) need an
 * xref as value and are not offered.
 */
const WritableBuiltInTypes = [
  AttributeType.Boolean,
  AttributeType.Integer,
  AttributeType.Double,
  AttributeType.Float,
  AttributeType.String,
  AttributeType.DateTime
];

/**
 * Built-in columns we do not offer although the server accepts a write: `n:tol` is deprecated (the app keeps
 * the tolerance in QC.Config).
 */
const NotOfferedBuiltIns = [QC.Tolerance];

/**
 * The columns of a ticket. The Ticket Stubs create and change tickets, because a ticket is more than these
 * columns (it needs the ticket flag, the Tandem category and a host), so the SET Property STUBs do not offer them.
 */
const TicketColumns = [QC.Priority, QC.OpenDate, QC.CloseDate];

/**
 * Sentence to add to the error of a refused write: where to go instead, when there is one.
 * @param {Array<string>} ids - qualified ids of the attributes that were refused
 * @returns {string}
 */
export function getNotWritableHint(ids) {
  return ids.some(id => TicketColumns.includes(id))
    ? ' Tickets are created and changed with the Ticket Stubs (Create Ticket, Update Ticket).'
    : '';
}

/**
 * Categories of the parameters of the Tandem library that hold the values of calculated streams (metrics). The
 * server only sets `AttributeFlags.Stream` on parameters that are mapped to a data source, so a metric
 * parameter does not carry it, but its values come from the stream calculation and are not written by hand.
 */
const StreamOnlyCategories = ['Tandem Metrics'];

/**
 * Can the attribute be written with mutate? This follows what the Tandem app lets a user edit
 * (its property panel and the Inventory grid), and what the server accepts:
 * - user-defined properties (family z) can be written. Stream attributes (`AttributeFlags.Stream`) and the
 *   metric parameters of the Tandem library (`StreamOnlyCategories`) are not offered: their values are
 *   readings or come from a calculation.
 * - source properties (family r, extracted from the model file) are read-only.
 * - `AttributeFlags.ReadOnly` is set by the server on built-in columns it refuses to mutate (n:n, n:v, n:z,
 *   n:u, l:l, ...). The app writes their override column instead (n:!n, n:!v, ...): the override columns
 *   are writable.
 * - the other built-in column of the Standard family the app edits directly is the room height. It is only
 *   writable when the schema has no override column for it: Elevation (n:el) is not, because the app writes
 *   n:!el. The ticket columns (Priority, Open Date, Close Date) are not offered, see TicketColumns.
 * Hidden columns, and columns whose value is a ref or xref, are not offered.
 *
 * @param {Object} attr - Attribute of a model schema
 * @param {{ has: function(string): boolean }} [schemaIds] - ids of the attributes of the same schema, used to
 *   find the override column of a built-in column
 * @returns {boolean}
 */
export function isWritableAttribute(attr, schemaIds = null) {
  const flags = attr.flags ?? 0;
  const [family, ...columnParts] = (attr.id ?? '').split(':');
  const column = attr.col ?? columnParts.join(':');

  if (flags & AttributeFlags.ReadOnly) {
    return false;
  }
  if (family === ColumnFamilies.DtProperties) {
    return !(flags & AttributeFlags.Stream) && !StreamOnlyCategories.includes(attr.category);
  }
  if (family === ColumnFamilies.Source
    || (flags & AttributeFlags.Hidden)
    || !WritableBuiltInTypes.includes(attr.dataType)
    || NotOfferedBuiltIns.includes(attr.id)
    || TicketColumns.includes(attr.id)) {
    return false;
  }
  if (column.startsWith(OverrideColumnPrefix)) {
    return true;
  }
  return family === ColumnFamilies.Standard
    && !schemaIds?.has(`${family}:${OverrideColumnPrefix}${column}`);
}

/**
 * Attributes of the cached schemas.
 * @param {{ writableOnly?: boolean, modelURN?: string }} options - `writableOnly` keeps what can be written,
 *   `modelURN` limits the list to the schema of one model (the z: ids of a model mean nothing in another one)
 */
function* listAttributes({ writableOnly = false, modelURN = null } = {}) {
  for (const [schemaModelURN, schema] of Object.entries(schemaCache)) {
    if (modelURN && schemaModelURN !== modelURN) {
      continue;
    }
    for (const attr of schema.attributes) {
      if (!writableOnly || isWritableAttribute(attr, schema.lookup)) {
        yield attr;
      }
    }
  }
}

/**
 * Get unique category names from the cached schemas
 * @param {{ writableOnly?: boolean, modelURN?: string }} [options] - see listAttributes()
 * @returns {Array<string>} Sorted array of unique category names
 */
export function getUniqueCategoryNames(options = {}) {
  const categories = new Set();

  for (const attr of listAttributes(options)) {
    if (attr.category) {
      categories.add(attr.category);
    }
  }
  return Array.from(categories).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
}

/**
 * Get unique property names from the cached schemas, optionally filtered by category
 * @param {string} [categoryFilter] - Optional category name to filter by
 * @param {{ writableOnly?: boolean, modelURN?: string }} [options] - see listAttributes()
 * @returns {Array<string>} Sorted array of unique property names
 */
export function getUniquePropertyNames(categoryFilter = null, options = {}) {
  const properties = new Set();

  for (const attr of listAttributes(options)) {
    if (attr.name && (!categoryFilter || attr.category === categoryFilter)) {
      properties.add(attr.name);
    }
  }
  return Array.from(properties).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
}

/**
 * Find the attribute a STUB is going to write, by category and name. `Common | Name` is both `n:n` (read-only)
 * and `n:!n` (the override you can write): the writable one wins.
 * @param {Array<Object>} attributes - Attributes of a model schema
 * @returns {Object} The writable attribute
 * @throws {Error} if there is none, or only read-only ones
 */
export function findWritableAttribute(attributes, category, name) {
  const matches = attributes.filter(attr => attr.category === category && attr.name === name);

  if (matches.length === 0) {
    throw new Error(`Could not find property "${category} | ${name}" in the schema. TIP: Use GET Model Data Schema to see the available properties.`);
  }
  const schemaIds = new Set(attributes.map(attr => attr.id));
  const writable = matches.find(attr => isWritableAttribute(attr, schemaIds));

  if (!writable) {
    throw new Error(`"${category} | ${name}" (${matches.map(attr => attr.id).join(', ')}) is read-only. `
      + `Only user-defined properties (z:) and the override columns of built-in properties (e.g. n:!n) can be written. See isWritableAttribute().${getNotWritableHint(matches.map(attr => attr.id))}`);
  }
  return writable;
}

/**
 * Get the schema cache object
 * @returns {Object} Schema cache
 */
export function getSchemaCache() {
  return schemaCache;
}

/**
 * Clear the schema cache
 * Should be called when switching facilities
 */
export function clearSchemaCache() {
  for (const key in schemaCache) {
    delete schemaCache[key];
  }
  console.log('SCHEMA CACHE: Cleared');
}

/**
 * Check if schemas are loaded
 * @returns {boolean} True if any schemas are cached
 */
export function areSchemasLoaded() {
  return Object.keys(schemaCache).length > 0;
}

/**
 * Look up a property's attribute info by category and name
 * @param {string} category - Category name (e.g., "Identity Data")
 * @param {string} propertyName - Property name (e.g., "Mark")
 * @param {{ writableOnly?: boolean, modelURN?: string }} [options] - see listAttributes()
 * @returns {Object|null} Property attribute object with dataType, or null if not found
 */
export function getPropertyInfo(category, propertyName, options = {}) {
  for (const attr of listAttributes(options)) {
    if (attr.category === category && attr.name === propertyName) {
      return attr;
    }
  }
  return null;
}

/**
 * Look up a property's attribute info by qualified property ID
 * @param {string} qualifiedPropId - Qualified property ID (e.g., "z:5mQ")
 * @param {{ modelURN?: string }} [options] - limit the lookup to the schema of one model
 * @returns {Object|null} Property attribute object with dataType, or null if not found
 */
export function getPropertyInfoByQualifiedId(qualifiedPropId, { modelURN = null } = {}) {
  if (!qualifiedPropId) return null;
  
  // The lookup map uses the full attribute ID (e.g., "z:5mQ"). The ids of a model mean nothing in another one
  for (const [schemaModelURN, schema] of Object.entries(schemaCache)) {
    if (modelURN && schemaModelURN !== modelURN) {
      continue;
    }
    const attr = schema.lookup.get(qualifiedPropId);
    if (attr) {
      return attr;
    }
  }
  return null;
}

/**
 * Data type constants for Tandem properties
 * 
 * These match the AttributeType enum from Tandem:
 *   0 = Unknown
 *   1 = Boolean
 *   2 = Integer
 *   3 = Double
 *   4 = Float
 *   20 = String
 */
export const DataTypes = {
  UNKNOWN: AttributeType.Unknown,
  BOOLEAN: AttributeType.Boolean,
  INTEGER: AttributeType.Integer,
  DOUBLE: AttributeType.Double,
  FLOAT: AttributeType.Float,
  STRING: AttributeType.String,
  
  // Helper to check if a property is numeric (Integer, Double, or Float)
  isNumeric: (propInfo) => {
    if (!propInfo) return false;
    const dt = propInfo.dataType;
    return dt === AttributeType.Integer || dt === AttributeType.Double || dt === AttributeType.Float;
  },
  
  // Helper to check if a property is boolean
  isBoolean: (propInfo) => {
    if (!propInfo) return false;
    return propInfo.dataType === AttributeType.Boolean;
  },
  
  // Helper to check if a property is a string
  isString: (propInfo) => {
    if (!propInfo) return true; // Default to string if unknown
    return propInfo.dataType === AttributeType.String;
  },
  
  // Helper to get a friendly name for a property's type
  getName: (propInfo) => {
    if (!propInfo) return 'Unknown';
    
    // If it has unit context, extract the unit name for display
    if (propInfo.dataTypeContext) {
      const match = propInfo.dataTypeContext.match(/:([a-zA-Z]+)/);
      if (match) {
        const typeName = match[1];
        return typeName.charAt(0).toUpperCase() + typeName.slice(1);
      }
    }
    
    // Fallback to dataType code
    switch (propInfo.dataType) {
      case AttributeType.Boolean: return 'Boolean';
      case AttributeType.Integer: return 'Integer';
      case AttributeType.Double: return 'Double';
      case AttributeType.Float: return 'Float';
      case AttributeType.String: return 'String';
      default: return 'Unknown';
    }
  }
};

