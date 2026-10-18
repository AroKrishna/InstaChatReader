/**
 * Search Engine Module for InstaChatReader
 *
 * Implements:
 * - Scoped search (All Conversations vs. Current Conversation).
 * - Case-insensitive text matching on genuine sender-authored text.
 * - Strict exclusion of embedded reel captions, hashtags, and URLs.
 * - Safe contextual snippet generation and match highlighting without raw HTML injection.
 * - Integration with date boundaries.
 */

import { escapeHTML } from './formatters.js';
import { getSearchableText } from '../parser/instagramParser.js';
import { isMessageInDateRange } from './dateFilters.js';

/**
 * Generates a safe contextual snippet around a search match.
 *
 * @param {string} text - Full message text
 * @param {number} matchIndex - Index of the match
 * @param {number} queryLength - Length of the query
 * @param {number} maxContext - Context window around match
 * @returns {string} Safe contextual snippet
 */
export function generateSnippet(text, matchIndex, queryLength, maxContext = 45) {
  if (!text) return '';

  const start = Math.max(0, matchIndex - maxContext);
  const end = Math.min(text.length, matchIndex + queryLength + maxContext);

  let snippet = text.slice(start, end);
  if (start > 0) snippet = '...' + snippet;
  if (end < text.length) snippet = snippet + '...';

  return snippet;
}

/**
 * Safely highlights occurrences of query within a snippet using <mark> tags.
 * Ensures the snippet is escaped before inserting HTML markup to prevent XSS.
 *
 * @param {string} snippet - Raw text snippet
 * @param {string} query - Search term
 * @returns {string} Sanitized HTML string with <mark> tags
 */
export function highlightMatchedText(snippet, query) {
  if (!snippet || !query) return escapeHTML(snippet || '');

  const escapedSnippet = escapeHTML(snippet);
  const trimmedQuery = query.trim();
  if (trimmedQuery.length === 0) return escapedSnippet;

  // Escape special regex characters in query
  const escapedQueryRegex = trimmedQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${escapedQueryRegex})`, 'gi');

  return escapedSnippet.replace(regex, '<mark class="search-highlight">$1</mark>');
}

/**
 * Searches the imported conversations in memory.
 *
 * @param {object} params
 * @param {object[]} params.conversations - All loaded conversations
 * @param {string} params.query - Search query string
 * @param {'all'|'current'} [params.scope='all'] - Search scope
 * @param {string|null} [params.activeConversationId=null] - Currently active conversation ID
 * @param {{ startMs: number|null, endMs: number|null }} [params.dateRange] - Optional timestamp filters
 * @returns {{
 *   results: Array<{
 *     messageId: string,
 *     conversationId: string,
 *     conversationTitle: string,
 *     senderName: string,
 *     timestamp: number|null,
 *     snippet: string,
 *     highlightedSnippet: string,
 *     fullText: string
 *   }>,
 *   totalMatches: number,
 *   searchedConversationCount: number
 * }}
 */
export function searchArchive({
  conversations = [],
  query = '',
  scope = 'all',
  activeConversationId = null,
  dateRange = { startMs: null, endMs: null }
}) {
  const trimmedQuery = query.trim();
  const normalizedQuery = trimmedQuery.toLowerCase();

  // If query is empty and no date range is set, return empty results
  if (normalizedQuery.length === 0 && dateRange.startMs === null && dateRange.endMs === null) {
    return { results: [], totalMatches: 0, searchedConversationCount: 0 };
  }

  // Filter conversations according to scope
  let targetConversations = conversations;
  if (scope === 'current' && activeConversationId) {
    targetConversations = conversations.filter(c => c.id === activeConversationId);
  }

  const results = [];
  const { startMs = null, endMs = null } = dateRange;

  for (const convo of targetConversations) {
    for (const msg of convo.messages) {
      // 1. Date Range Filter check (if active)
      if (startMs !== null || endMs !== null) {
        if (!isMessageInDateRange(msg, startMs, endMs)) {
          continue;
        }
      }

      // 2. Extract genuine searchable text (excludes embedded reel captions/descriptions)
      const searchable = getSearchableText(msg);

      if (normalizedQuery.length === 0) {
        // Date-only filtering: if no text query was provided, all messages matching date range are included
        const snippet = searchable.slice(0, 100);
        results.push({
          messageId: msg.id,
          conversationId: convo.id,
          conversationTitle: convo.title,
          senderName: msg.senderName,
          timestamp: msg.timestamp,
          snippet,
          highlightedSnippet: escapeHTML(snippet),
          fullText: searchable
        });
        continue;
      }

      // 3. Case-insensitive text search
      if (searchable.length === 0) continue;

      const matchIdx = searchable.toLowerCase().indexOf(normalizedQuery);
      if (matchIdx !== -1) {
        const snippet = generateSnippet(searchable, matchIdx, trimmedQuery.length);
        const highlightedSnippet = highlightMatchedText(snippet, trimmedQuery);

        results.push({
          messageId: msg.id,
          conversationId: convo.id,
          conversationTitle: convo.title,
          senderName: msg.senderName,
          timestamp: msg.timestamp,
          snippet,
          highlightedSnippet,
          fullText: searchable
        });
      }
    }
  }

  return {
    results,
    totalMatches: results.length,
    searchedConversationCount: targetConversations.length
  };
}
