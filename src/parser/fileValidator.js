/**
 * File validation module for InstaChatReader.
 *
 * Responsibilities:
 * - Accept only .json files for this MVP.
 * - Check file extension, non-empty contents, and valid JSON syntax.
 * - Distinguish valid Instagram message exports from unrelated JSON files.
 * - Return structured validation results with actionable error messages.
 */

/**
 * Validates a single JSON file's text content and basic structure.
 * @param {string} fileName 
 * @param {string} textContent 
 * @returns {{
 *   isValid: boolean,
 *   parsedData: any | null,
 *   error: string | null,
 *   warnings: string[]
 * }}
 */
export function validateJSONFile(fileName, textContent) {
  const warnings = [];

  // 1. Verify file name / extension
  if (!fileName || typeof fileName !== 'string' || !fileName.toLowerCase().endsWith('.json')) {
    return {
      isValid: false,
      parsedData: null,
      error: `File "${fileName || 'unknown'}" does not have a .json extension. Only JSON message exports are supported.`,
      warnings
    };
  }

  // 2. Check for empty file content
  if (!textContent || typeof textContent !== 'string' || textContent.trim().length === 0) {
    return {
      isValid: false,
      parsedData: null,
      error: `File "${fileName}" is empty (0 bytes).`,
      warnings
    };
  }

  // 3. Parse JSON syntax safely
  let parsed;
  try {
    parsed = JSON.parse(textContent);
  } catch (err) {
    return {
      isValid: false,
      parsedData: null,
      error: `File "${fileName}" contains invalid JSON syntax: ${err.message}`,
      warnings
    };
  }

  // 4. Verify root structure
  if (!parsed || typeof parsed !== 'object') {
    return {
      isValid: false,
      parsedData: null,
      error: `File "${fileName}" does not contain a JSON object or array.`,
      warnings
    };
  }

  // 5. Check whether the parsed structure is a recognized Instagram message export
  // Instagram message files have at minimum a "messages" array or a "participants" array.
  const hasMessagesArray = Array.isArray(parsed.messages);
  const hasParticipantsArray = Array.isArray(parsed.participants);

  if (!hasMessagesArray && !hasParticipantsArray) {
    return {
      isValid: false,
      parsedData: null,
      error: `File "${fileName}" is valid JSON, but does not contain Instagram conversation data (missing 'messages' or 'participants' array).`,
      warnings
    };
  }

  if (!hasMessagesArray) {
    warnings.push(`File "${fileName}" has a participants list but contains no messages array.`);
  }

  if (!hasParticipantsArray) {
    warnings.push(`File "${fileName}" has messages but contains no participants array.`);
  }

  return {
    isValid: true,
    parsedData: parsed,
    error: null,
    warnings
  };
}
