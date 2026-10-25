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
