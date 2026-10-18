/**
 * Date Filtering Utilities for InstaChatReader
 *
 * Timezone Policy:
 * All date operations use the local browser timezone consistently.
 * This guarantees that dates selected in native <input type="date"> elements (YYYY-MM-DD)
 * align precisely with the local day boundaries, timestamps, and date separators rendered in chat.
 */

/**
 * Parses a YYYY-MM-DD date string into an epoch millisecond timestamp
 * representing either the start of the day (00:00:00.000) or end of the day (23:59:59.999).
 *
 * @param {string} dateStr - Date string formatted as "YYYY-MM-DD"
 * @param {boolean} isEndOfDay - If true, returns 23:59:59.999; otherwise 00:00:00.000
 * @returns {number|null} Epoch milliseconds or null if input is invalid
 */
export function parseLocalDate(dateStr, isEndOfDay = false) {
  if (!dateStr || typeof dateStr !== 'string') return null;
  const match = dateStr.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;

  const year = parseInt(match[1], 10);
  const month = parseInt(match[2], 10) - 1; // 0-indexed month
  const day = parseInt(match[3], 10);

  const date = new Date(year, month, day);
  // Verify date validity (e.g. catches Feb 31)
  if (date.getFullYear() !== year || date.getMonth() !== month || date.getDate() !== day) {
    return null;
  }

  if (isEndOfDay) {
    date.setHours(23, 59, 59, 999);
  } else {
    date.setHours(0, 0, 0, 0);
  }

  return date.getTime();
}

/**
 * Validates a start date and end date range.
 *
 * Behavior:
 * - If both start and end date are provided: ensures start <= end.
 * - If only start date is provided: treats it as a single full-day filter (inclusive 00:00 to 23:59:59).
 * - If only end date is provided: treats it as filtering from earliest up to end of that day.
 * - Handles start date equal to end date inclusively.
 *
 * @param {string} startDateStr - "YYYY-MM-DD"
 * @param {string} endDateStr - "YYYY-MM-DD"
 * @returns {{ isValid: boolean, error: string|null, startMs: number|null, endMs: number|null, isSingleDate: boolean }}
 */
export function validateDateRange(startDateStr, endDateStr) {
  const hasStart = Boolean(startDateStr && startDateStr.trim().length > 0);
  const hasEnd = Boolean(endDateStr && endDateStr.trim().length > 0);

  if (!hasStart && !hasEnd) {
    return { isValid: true, error: null, startMs: null, endMs: null, isSingleDate: false };
  }

  if (hasStart && !hasEnd) {
    const startMs = parseLocalDate(startDateStr, false);
    const endMs = parseLocalDate(startDateStr, true);
    if (startMs === null) {
      return { isValid: false, error: 'Invalid start date format.', startMs: null, endMs: null, isSingleDate: false };
    }
    return { isValid: true, error: null, startMs, endMs, isSingleDate: true };
  }

  if (!hasStart && hasEnd) {
    const endMs = parseLocalDate(endDateStr, true);
    if (endMs === null) {
      return { isValid: false, error: 'Invalid end date format.', startMs: null, endMs: null, isSingleDate: false };
    }
    return { isValid: true, error: null, startMs: 0, endMs, isSingleDate: false };
  }

  // Both provided
  const startMs = parseLocalDate(startDateStr, false);
  const endMs = parseLocalDate(endDateStr, true);

  if (startMs === null) {
    return { isValid: false, error: 'Invalid start date format.', startMs: null, endMs: null, isSingleDate: false };
  }
  if (endMs === null) {
    return { isValid: false, error: 'Invalid end date format.', startMs: null, endMs: null, isSingleDate: false };
  }

  if (startMs > endMs) {
    return {
      isValid: false,
      error: 'Start date cannot be after end date.',
      startMs: null,
      endMs: null,
      isSingleDate: false
    };
  }

  const isSingleDate = startDateStr.trim() === endDateStr.trim();
  return { isValid: true, error: null, startMs, endMs, isSingleDate };
}

/**
 * Checks whether a message falls within the specified timestamp boundaries.
 * Excludes messages with missing or invalid timestamps from date-filtered views.
 *
 * @param {object} message 
 * @param {number|null} startMs 
 * @param {number|null} endMs 
 * @returns {boolean}
 */
export function isMessageInDateRange(message, startMs, endMs) {
  if (startMs === null && endMs === null) return true;
  if (!message || message.timestamp === null || typeof message.timestamp !== 'number' || isNaN(message.timestamp)) {
    // Missing or invalid timestamp: excluded from date-filtered view
    return false;
  }
  const t = message.timestamp;
  if (startMs !== null && t < startMs) return false;
  if (endMs !== null && t > endMs) return false;
  return true;
}

/**
 * Formats a user-facing label for an active date filter.
 * @param {string} startDateStr 
 * @param {string} endDateStr 
 * @returns {string}
 */
export function formatDateRangeLabel(startDateStr, endDateStr) {
  if (!startDateStr && !endDateStr) return '';
  if (startDateStr && (!endDateStr || startDateStr === endDateStr)) {
    const dt = new Date(startDateStr + 'T00:00:00');
    return dt.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
  }
  const s = new Date(startDateStr + 'T00:00:00').toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
  const e = new Date(endDateStr + 'T00:00:00').toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
  return `${s} – ${e}`;
}
