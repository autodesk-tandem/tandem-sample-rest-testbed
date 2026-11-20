/**
 * Shared helpers for STUB functions
 */

import { AttributeType } from '../tandem/constants.js';

/**
 * Split comma-separated user input into a list of trimmed, non-empty entries.
 * "a, b,,c, " becomes ["a", "b", "c"]. Empty, whitespace-only, null or undefined
 * input becomes [].
 *
 * Use this for every comma-separated input field: the API rejects the whole
 * request if a key list contains an empty or space-padded key.
 *
 * @param {string} [text]
 * @returns {string[]}
 */
export function parseCommaList(text) {
  return (text ?? '').split(',').map(item => item.trim()).filter(item => item.length > 0);
}

/**
 * Build the function that decides whether a property value matches the search options.
 * Supports: string (partial/exact/regex), numeric (=,!=,>,>=,<,<=), boolean.
 * The matcher is pure CPU work that runs after the scan results arrive, so it is the same for
 * every schema version.
 *
 * @param {Object} searchOptions
 *   For string:  { dataType: 'string', matchType: 'partial'|'exact'|'regex', caseInsensitive: boolean, value: string }
 *   For numeric: { dataType: 'numeric', operator: '='|'!='|'>'|'>='|'<'|'<=', value: number }
 *   For boolean: { dataType: 'boolean', value: boolean }
 * @returns {(val: any) => boolean}
 */
export function buildValueMatcher(searchOptions) {
  let matcher;
  const dataType = searchOptions?.dataType || 'string';
  
  if (dataType === 'boolean') {
    const targetValue = searchOptions.value;
    console.log(`Matching boolean value: ${targetValue}`);
    matcher = (val) => {
      if (typeof val === 'boolean') return val === targetValue;
      const valStr = String(val).toLowerCase();
      return valStr === (targetValue ? 'true' : 'false') || 
             valStr === (targetValue ? '1' : '0');
    };
  } else if (dataType === 'numeric') {
    const targetValue = searchOptions.value;
    const operator = searchOptions.operator || '=';
    console.log(`Matching numeric value: ${operator} ${targetValue}`);
    matcher = (val) => {
      const numVal = typeof val === 'number' ? val : parseFloat(val);
      if (isNaN(numVal)) return false;
      switch (operator) {
        case '=': return numVal === targetValue;
        case '!=': return numVal !== targetValue;
        case '>': return numVal > targetValue;
        case '>=': return numVal >= targetValue;
        case '<': return numVal < targetValue;
        case '<=': return numVal <= targetValue;
        default: return numVal === targetValue;
      }
    };
  } else {
    // String matching
    const value = searchOptions?.value || '';
    const matchType = searchOptions?.matchType || 'partial';
    const caseInsensitive = searchOptions?.caseInsensitive || false;
    
    if (matchType === 'regex') {
      try {
        const regex = new RegExp(value, caseInsensitive ? 'i' : '');
        console.log(`Matching regex: ${regex}`);
        matcher = (val) => regex.test(String(val));
      } catch (e) {
        console.error('Invalid regex:', e.message);
        console.log("TIP: Use 'Partial' or 'Exact' match type for literal string matching.");
        matcher = (val) => {
          const valStr = String(val);
          return caseInsensitive 
            ? valStr.toLowerCase().includes(value.toLowerCase())
            : valStr.includes(value);
        };
      }
    } else if (matchType === 'exact') {
      console.log(`Matching exact: "${value}" (case insensitive: ${caseInsensitive})`);
      matcher = (val) => {
        const valStr = String(val);
        return caseInsensitive 
          ? valStr.toLowerCase() === value.toLowerCase()
          : valStr === value;
      };
    } else {
      // Partial match (default)
      console.log(`Matching partial: "${value}" (case insensitive: ${caseInsensitive})`);
      matcher = (val) => {
        const valStr = String(val);
        return caseInsensitive 
          ? valStr.toLowerCase().includes(value.toLowerCase())
          : valStr.includes(value);
      };
    }
  }
  
  return matcher;
}

/**
 * Pull the facility URN and the selection (an xref) out of a link copied from Tandem, e.g.
 * https://tandem.autodesk.com/pages/facilities/urn:adsk.dtt:XXX?mode=3d&selection=<xref>
 * @param {string} link - Link copied from Tandem
 * @returns {{ facilityURN: string|null, selection: string|null }}
 */
export function parseTandemLink(link) {
  const facilityMatch = link.match(/\/facilities\/(urn:adsk\.dtt:[A-Za-z0-9_-]+)/);
  const selectionMatch = link.match(/[?&]selection=([^&#]*)/);
  let selection = null;

  if (selectionMatch) {
    try {
      selection = decodeURIComponent(selectionMatch[1]);
    } catch {
      selection = selectionMatch[1];
    }
  }
  return { facilityURN: facilityMatch ? facilityMatch[1] : null, selection };
}

/**
 * Convert the text typed by the user to the type of the property, as the schema describes it
 * (`attr.dataType`, see `AttributeType`). Without schema entry the text is used as it is.
 *
 * @param {object|null} attr - attribute of the model schema
 * @param {string} text - value typed by the user
 * @returns {string|number|boolean|string[]}
 * @throws {Error} if the property is numeric and the text is not a number
 */
export function typedValueFor(attr, text) {
  switch (attr?.dataType) {
    case AttributeType.Boolean:
      return String(text).toLowerCase() === 'true';
    case AttributeType.Integer:
    case AttributeType.Double:
    case AttributeType.Float: {
      const value = Number(text);

      if (text === '' || Number.isNaN(value)) {
        throw new Error(`"${text}" is not a number.`);
      }
      if (attr.dataType === AttributeType.Integer && !Number.isInteger(value)) {
        throw new Error(`"${text}" is not a whole number (the property is an Integer).`);
      }
      return value;
    }
    case AttributeType.StringList: // tags
      return String(text).split(',').map(tag => tag.trim()).filter(Boolean);
    default:
      return text;
  }
}
