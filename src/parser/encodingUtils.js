/**
 * Encoding utility for Instagram JSON export strings.
 *
 * Background: Meta's export tool has historically encoded UTF-8 strings by escaping each byte
 * as an ISO-8859-1 (Latin-1) code point (e.g., "\u00c3\u00a9" for "é" or "\u00f0\u009f\u0098\u0082" for "😂").
 *
 * Rules:
 * - Preserve original message text exactly unless there is strong evidence of byte-level mojibake.
 * - Never blindly reinterpret every string.
 * - Do not corrupt valid Unicode, emojis, non-English text, or accented names.
 */

/**
 * Checks if a string contains sequences indicative of Latin-1 encoded UTF-8 bytes.
 * Common byte indicators: \xC2-\xF4 followed by \x80-\xBF continuation bytes.
 * @param {string} str 
 * @returns {boolean}
 */
export function hasMojibakePattern(str) {
  if (typeof str !== 'string' || str.length === 0) return false;
  // Regex detecting common Latin-1 misinterpreted 2-byte, 3-byte, and 4-byte UTF-8 lead sequences
  // e.g., Ã followed by \x80-\xBF, or ð\x9F followed by \x80-\xBF
  return /[\u00C2-\u00DF][\u0080-\u00BF]|[\u00E0-\u00EF][\u0080-\u00BF]{2}|[\u00F0-\u00F4][\u0080-\u00BF]{3}/.test(str);
}

/**
 * Carefully repairs Latin-1 / UTF-8 mojibake ONLY if the mojibake pattern is present
 * and decoding produces a valid UTF-8 string.
 * @param {string} str 
 * @returns {string}
 */
export function safeRepairMojibake(str) {
  if (typeof str !== 'string' || !hasMojibakePattern(str)) {
    return str;
  }

  try {
    // Convert string character codes to raw bytes (treating each char code <= 255 as a byte)
    const bytes = new Uint8Array(str.length);
    for (let i = 0; i < str.length; i++) {
      const code = str.charCodeAt(i);
      if (code > 255) {
        // Contains characters outside Latin-1 range, not a pure Latin-1 byte stream
        return str;
      }
      bytes[i] = code;
    }

    // Attempt decoding as UTF-8 with fatal: true to avoid producing replacement chars
    const decoder = new TextDecoder('utf-8', { fatal: true });
    return decoder.decode(bytes);
  } catch {
    // If decoding fails, return the original string completely untouched
    return str;
  }
}
