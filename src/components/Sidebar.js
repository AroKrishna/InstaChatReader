/**
 * Sidebar Component with Search & Date Navigation
 * Displays search bar, scope selector, date filter controls, search results, and conversation list.
 */

import { escapeHTML, formatSidebarTimestamp, getInitials } from '../utils/formatters.js';
import { icons } from '../utils/icons.js';
import { formatDateRangeLabel } from '../utils/dateFilters.js';

export function createSidebar({ 
  conversations = [], 
  activeConversationId = null, 
  isMockData = false,
  searchQuery = '',
  searchScope = 'all',
  searchResults = [],
  isDateFilterOpen = false,
  dateFilterStart = '',
  dateFilterEnd = '',
  dateFilterError = null,
  onSelectConversation,
  onSearchChange,
  onClearSearch,
  onScopeChange,
  onToggleDateFilter,
  onApplyDateFilter,
  onClearDateFilter,
  onSelectSearchResult
}) {
  const aside = document.createElement('aside');
  aside.className = 'sidebar';
  aside.setAttribute('aria-label', 'Conversations navigation and search');

  const count = conversations.length;
  const isSearching = searchQuery.trim().length > 0;
  const isDateFilterActive = Boolean(dateFilterStart || dateFilterEnd);

  let bannerText = '';
  if (isMockData) {
    bannerText = 'Sample layout active. Click "Import Archive" to load your real JSON files.';
  } else if (count > 0) {
    bannerText = `Archive active: ${count} conversation${count === 1 ? '' : 's'} in memory.`;
  } else {
    bannerText = 'No archive loaded. Click "Import Archive" to load files.';
  }

  const activeDateLabel = isDateFilterActive ? formatDateRangeLabel(dateFilterStart, dateFilterEnd) : '';

  aside.innerHTML = `
    <div class="sidebar-header">
      <div class="sidebar-title-group">
        <h2 class="sidebar-heading">Messages</h2>
        <span class="conversation-count-badge" aria-label="${count} conversations available">${count}</span>
      </div>
    </div>

    <!-- Search & Date Filter Container -->
    <div class="search-container" role="search">
      <div class="search-input-wrap">
        <span class="search-icon-adornment" aria-hidden="true">${icons.search()}</span>
        <input 
          type="text" 
          class="search-input" 
          id="sidebar-search-input" 
          placeholder="Search message text..." 
          value="${escapeHTML(searchQuery)}" 
          aria-label="Search message text"
          autocomplete="off"
        />
        ${searchQuery.length > 0 ? `
          <button 
            type="button" 
            class="search-clear-btn" 
            id="sidebar-search-clear-btn" 
            aria-label="Clear search query" 
            title="Clear search"
          >
            ${icons.close()}
          </button>
        ` : ''}
      </div>

      <div class="search-controls-row">
        <div class="search-scope-group" role="radiogroup" aria-label="Search scope">
          <button 
            type="button" 
            class="btn-scope ${searchScope === 'all' ? 'active' : ''}" 
            id="scope-all-btn" 
            role="radio" 
            aria-checked="${searchScope === 'all'}"
            title="Search across all conversations"
          >
            All Chats
          </button>
          <button 
            type="button" 
            class="btn-scope ${searchScope === 'current' ? 'active' : ''}" 
            id="scope-current-btn" 
            role="radio" 
            aria-checked="${searchScope === 'current'}"
            title="Search only within active chat"
            ${!activeConversationId ? 'disabled' : ''}
          >
            This Chat
          </button>
        </div>

        <button 
          type="button" 
          class="btn-filter-toggle ${isDateFilterActive || isDateFilterOpen ? 'active' : ''}" 
          id="toggle-date-filter-btn" 
          aria-expanded="${isDateFilterOpen}"
          aria-controls="date-filter-panel"
          title="Filter conversations by date"
        >
          ${icons.calendar()}
          <span>Dates${isDateFilterActive ? ' •' : ''}</span>
        </button>
      </div>

      <!-- Collapsible Date Filter Panel -->
      ${isDateFilterOpen ? `
        <div class="date-filter-panel" id="date-filter-panel">
          <div class="date-inputs-row">
            <div class="date-input-group">
              <label for="date-start-input" class="date-label">From</label>
              <input type="date" id="date-start-input" class="date-field" value="${escapeHTML(dateFilterStart)}" />
            </div>
            <div class="date-input-group">
              <label for="date-end-input" class="date-label">To (Inclusive)</label>
              <input type="date" id="date-end-input" class="date-field" value="${escapeHTML(dateFilterEnd)}" />
            </div>
          </div>
          ${dateFilterError ? `
            <div class="date-validation-error" role="alert">${escapeHTML(dateFilterError)}</div>
          ` : ''}
          <div class="date-actions-row">
            ${isDateFilterActive ? `
              <button type="button" class="btn-subtle" id="clear-date-filter-btn" style="height: 26px; padding: 0 6px; font-size: 11px;">
                Clear
              </button>
            ` : ''}
            <button type="button" class="btn-primary" id="apply-date-filter-btn" style="height: 26px; padding: 0 10px; font-size: 11px;">
              Apply
            </button>
          </div>
        </div>
      ` : ''}
    </div>

    <!-- Active Filters Badge / Notice -->
    ${isDateFilterActive ? `
      <div class="sidebar-info-banner" role="status" style="background-color: var(--badge-bg); color: var(--badge-text); border-color: var(--accent-primary);">
        <span aria-hidden="true">${icons.calendar()}</span>
        <span style="flex: 1;">Filter: <strong>${escapeHTML(activeDateLabel)}</strong></span>
        <button type="button" id="badge-clear-date-btn" style="background: none; border: none; cursor: pointer; color: inherit; padding: 2px;" aria-label="Remove date filter">
          ${icons.close()}
        </button>
      </div>
    ` : `
      <div class="sidebar-info-banner" role="note">
        <span aria-hidden="true">${icons.info()}</span>
        <span>${escapeHTML(bannerText)}</span>
      </div>
    `}

    <!-- Body: Search Results or Conversation List -->
    ${isSearching ? renderSearchResults(searchResults, searchQuery, searchScope) : renderConversationList(conversations, activeConversationId)}
  `;

  function renderSearchResults(results, query, scope) {
    const scopeLabel = scope === 'all' ? 'all chats' : 'this chat';
    return `
      <div class="search-results-panel">
        <div class="search-results-header">
          <span>${results.length} match${results.length === 1 ? '' : 'es'} in ${scopeLabel}</span>
          <button type="button" class="btn-subtle" id="results-clear-btn" style="height: 22px; padding: 0 6px; font-size: 11px;">
            Clear
          </button>
        </div>
        <ul class="search-results-list" role="listbox" aria-label="Search results">
          ${results.length === 0 ? `
            <li style="padding: var(--spacing-xl); text-align: center; color: var(--text-muted); font-size: var(--font-size-sm);">
              No messages found matching "<strong>${escapeHTML(query)}</strong>" in ${scopeLabel}.
            </li>
          ` : results.map(r => `
            <li 
              class="search-result-item" 
              data-convo-id="${escapeHTML(r.conversationId)}" 
              data-msg-id="${escapeHTML(r.messageId)}"
              role="option"
              tabindex="0"
              aria-label="Result in ${escapeHTML(r.conversationTitle)}: ${escapeHTML(r.snippet)}"
            >
              <div class="search-result-top">
                <span class="search-result-convo">${escapeHTML(r.conversationTitle)}</span>
                <time class="search-result-time">${escapeHTML(formatSidebarTimestamp(r.timestamp))}</time>
              </div>
              <div class="search-result-sender">${escapeHTML(r.senderName)}</div>
              <div class="search-result-snippet">${r.highlightedSnippet}</div>
            </li>
          `).join('')}
        </ul>
      </div>
    `;
  }

  function renderConversationList(convos, activeId) {
    return `
      <ul class="conversation-list" role="listbox" aria-label="Conversation list">
        ${convos.length === 0 ? `
          <li style="padding: var(--spacing-xl); text-align: center; color: var(--text-muted); font-size: var(--font-size-sm);">
            No conversations in memory.
          </li>
        ` : convos.map(convo => {
          const isActive = convo.id === activeId;
          const initials = getInitials(convo.title);
          const formattedTime = formatSidebarTimestamp(convo.lastMessageTimestamp);
          const avatarClass = convo.isGroup ? 'avatar group-avatar' : 'avatar direct-avatar';

          return `
            <li 
              class="conversation-item ${isActive ? 'active' : ''}" 
              data-id="${escapeHTML(convo.id)}"
              role="option"
              aria-selected="${isActive}"
              tabindex="0"
            >
              <div class="${avatarClass}" aria-hidden="true">
                <div class="avatar-inner">
                  ${escapeHTML(initials)}
                </div>
              </div>

              <div class="conversation-meta">
                <div class="conversation-row-top">
                  <span class="conversation-title">${escapeHTML(convo.title)}</span>
                  <time class="conversation-timestamp">${escapeHTML(formattedTime)}</time>
                </div>
                <p class="conversation-preview">${escapeHTML(convo.lastMessagePreview)}</p>
              </div>
            </li>
          `;
        }).join('')}
      </ul>
    `;
  }

  // Bind Event Listeners
  const searchInput = aside.querySelector('#sidebar-search-input');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      onSearchChange(e.target.value);
    });
  }

  const clearSearchBtn = aside.querySelector('#sidebar-search-clear-btn');
  if (clearSearchBtn) {
    clearSearchBtn.addEventListener('click', onClearSearch);
  }

  const resultsClearBtn = aside.querySelector('#results-clear-btn');
  if (resultsClearBtn) {
    resultsClearBtn.addEventListener('click', onClearSearch);
  }

  const scopeAllBtn = aside.querySelector('#scope-all-btn');
  if (scopeAllBtn) {
    scopeAllBtn.addEventListener('click', () => onScopeChange('all'));
  }

  const scopeCurrentBtn = aside.querySelector('#scope-current-btn');
  if (scopeCurrentBtn) {
    scopeCurrentBtn.addEventListener('click', () => onScopeChange('current'));
  }

  const toggleDateBtn = aside.querySelector('#toggle-date-filter-btn');
  if (toggleDateBtn) {
    toggleDateBtn.addEventListener('click', onToggleDateFilter);
  }

  const applyDateBtn = aside.querySelector('#apply-date-filter-btn');
  if (applyDateBtn) {
    applyDateBtn.addEventListener('click', () => {
      const startVal = aside.querySelector('#date-start-input')?.value || '';
      const endVal = aside.querySelector('#date-end-input')?.value || '';
      onApplyDateFilter(startVal, endVal);
    });
  }

  const clearDateBtn = aside.querySelector('#clear-date-filter-btn');
  if (clearDateBtn) {
    clearDateBtn.addEventListener('click', onClearDateFilter);
  }

  const badgeClearDateBtn = aside.querySelector('#badge-clear-date-btn');
  if (badgeClearDateBtn) {
    badgeClearDateBtn.addEventListener('click', onClearDateFilter);
  }

  // Conversation list item selection
  const listEl = aside.querySelector('.conversation-list');
  if (listEl) {
    function handleConvoSelect(itemEl) {
      if (!itemEl) return;
      const convoId = itemEl.dataset.id;
      if (convoId) onSelectConversation(convoId);
    }

    listEl.addEventListener('click', (e) => {
      const item = e.target.closest('.conversation-item');
      if (item) handleConvoSelect(item);
    });

    listEl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        const item = e.target.closest('.conversation-item');
        if (item) {
          e.preventDefault();
          handleConvoSelect(item);
        }
      }
    });
  }

  // Search result item selection
  const resultsListEl = aside.querySelector('.search-results-list');
  if (resultsListEl) {
    function handleResultSelect(itemEl) {
      if (!itemEl) return;
      const convoId = itemEl.dataset.convoId;
      const msgId = itemEl.dataset.msgId;
      if (convoId && msgId) {
        onSelectSearchResult(convoId, msgId);
      }
    }

    resultsListEl.addEventListener('click', (e) => {
      const item = e.target.closest('.search-result-item');
      if (item) handleResultSelect(item);
    });

    resultsListEl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        const item = e.target.closest('.search-result-item');
        if (item) {
          e.preventDefault();
          handleResultSelect(item);
        }
      }
    });
  }

  return aside;
}
