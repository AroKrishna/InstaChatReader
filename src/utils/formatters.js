/**
 * Formatting and security helpers
 */

/**
 * Escapes unsafe HTML characters to prevent XSS.
 * @param {string} str 
 * @returns {string}
 */
export function escapeHTML(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Formats timestamp for sidebar previews.
 * @param {number} timestamp 
 * @returns {string}
 */
export function formatSidebarTimestamp(timestamp) {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  const now = new Date();
  
  const isSameDay = date.toDateString() === now.toDateString();
  if (isSameDay) {
    return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  }

  // Same year: e.g., "Apr 14"
  if (date.getFullYear() === now.getFullYear()) {
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  }

  // Different year: e.g., "04/14/23"
  return date.toLocaleDateString([], { month: 'numeric', day: 'numeric', year: '2-digit' });
}

/**
 * Formats timestamp for chat bubble subtitles.
 * @param {number} timestamp 
 * @returns {string}
 */
export function formatBubbleTime(timestamp) {
  if (!timestamp) return '';
  return new Date(timestamp).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

/**
 * Formats timestamp for chat view date separators.
 * @param {number} timestamp 
 * @returns {string}
 */
export function formatDateSeparator(timestamp) {
  if (!timestamp) return '';
  return new Date(timestamp).toLocaleDateString([], { 
    weekday: 'short',
    month: 'short', 
    day: 'numeric', 
    year: 'numeric' 
  });
}

/**
 * Derives display initials from a participant or conversation title.
 * @param {string} name 
 * @returns {string}
 */
export function getInitials(name) {
  if (!name) return '?';
  // Strip trailing emojis for clean initials
  const clean = name.replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '').trim();
  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return name.slice(0, 1).toUpperCase();
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
