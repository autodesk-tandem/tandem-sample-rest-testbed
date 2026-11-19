/**
 * Shared helpers for STUB functions
 */

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
