/**
 * ChatViewer Component
 * Renders the active conversation message history, date separators, reactions,
 * incoming/outgoing bubbles, active date filter banner, and jump-to-message highlights.
 */

import { 
  escapeHTML, 
  formatDateSeparator, 
  formatBubbleTime, 
  getInitials 
} from '../utils/formatters.js';
import { icons } from '../utils/icons.js';
import { isMessageInDateRange, formatDateRangeLabel } from '../utils/dateFilters.js';
import { highlightMatchedText } from '../utils/search.js';

export function createChatViewer({ 
  conversation, 
  ownerName, 
  detectedParticipants = [], 
  dateFilterStart = '',
  dateFilterEnd = '',
  dateFilterMs = { startMs: null, endMs: null },
  searchQuery = '',
  highlightedMessageId = null,
  onBackToList, 
  onOpenImport,
  onSelectOwner,
  onSkipOwner,
  onClearDateFilter
}) {
  const section = document.createElement('section');
  section.className = 'chat-viewport';
  section.setAttribute('aria-label', 'Chat conversation viewer');

  // Handle empty state when no conversation is selected
  if (!conversation) {
    section.innerHTML = `
      <div class="chat-empty-state">
        <div class="empty-state-icon-wrap" aria-hidden="true">
          ${icons.chatBubble()}
        </div>
        <h2 class="empty-state-title">Your Messages</h2>
        <p class="empty-state-description">
          Select an Instagram conversation from the list to read messages, or click below to import your JSON export files.
        </p>
        <button type="button" class="btn-primary" id="empty-state-import-btn">
          ${icons.upload()}
          <span>Import Archive</span>
        </button>
      </div>
    `;

    const emptyImportBtn = section.querySelector('#empty-state-import-btn');
    if (emptyImportBtn) {
      emptyImportBtn.addEventListener('click', onOpenImport);
    }
    return section;
  }

  // Active Conversation Header
  const initials = getInitials(conversation.title);
  const subtitle = conversation.isGroup 
    ? `${conversation.participants.length} participants • Group Chat` 
    : (conversation.participants.length > 1 ? conversation.participants.join(', ') : 'Direct Message • Offline Archive');

  // Account Owner Selection Banner (shown if ownerName is unresolved and there are participants)
  const showOwnerBanner = ownerName === null && detectedParticipants.length > 0;
  const ownerBannerMarkup = showOwnerBanner ? `
    <div class="owner-select-banner" role="region" aria-label="Account owner selection">
      <span>
        <strong>Sent/Received Alignment:</strong> Select which participant is you so outgoing messages appear on the right:
      </span>
      <div class="owner-select-controls">
        <select class="owner-dropdown" id="owner-select-dropdown" aria-label="Select your participant name">
          ${detectedParticipants.map(name => `
            <option value="${escapeHTML(name)}">${escapeHTML(name)}</option>
          `).join('')}
        </select>
        <button type="button" class="btn-primary" id="confirm-owner-btn" style="height: 28px; padding: 0 10px; font-size: 12px;">
          Set as My Account
        </button>
        <button type="button" class="btn-subtle" id="skip-owner-btn" style="height: 28px; padding: 0 8px; font-size: 12px;">
          Keep Unknown
        </button>
      </div>
    </div>
  ` : '';

  // Active Date Filter Banner
  const isDateFilterActive = Boolean(dateFilterStart || dateFilterEnd);
  const { startMs, endMs } = dateFilterMs;
  const dateRangeLabel = isDateFilterActive ? formatDateRangeLabel(dateFilterStart, dateFilterEnd) : '';

  // Filter messages by active date range (if active)
  const totalMessageCount = conversation.messages.length;
  const displayedMessages = isDateFilterActive 
    ? conversation.messages.filter(msg => isMessageInDateRange(msg, startMs, endMs))
    : conversation.messages;

  const dateFilterBannerMarkup = isDateFilterActive ? `
    <div class="chat-filter-banner" role="status">
      <span>
        ${icons.calendar()} 
        Filtered: <strong>${escapeHTML(dateRangeLabel)}</strong> (${displayedMessages.length} of ${totalMessageCount} messages)
      </span>
      <button type="button" id="chat-clear-date-filter-btn">
        Clear Filter ✕
      </button>
    </div>
  ` : '';

  // Group messages chronologically and insert date separators
  let lastDateStr = null;
  const trimmedSearchQuery = searchQuery.trim();

  const messagesMarkup = displayedMessages.map(msg => {
    let separatorHtml = '';

    // Date Separator (only if timestamp is valid)
    if (msg.timestamp !== null) {
      const msgDateStr = formatDateSeparator(msg.timestamp);
      if (msgDateStr !== lastDateStr) {
        lastDateStr = msgDateStr;
        separatorHtml = `
          <div class="date-separator" role="separator" aria-label="${escapeHTML(msgDateStr)}">
            <span class="date-separator-text">${escapeHTML(msgDateStr)}</span>
          </div>
        `;
      }
    }

    // Determine bubble alignment & sender badge
    let isOutgoing = false;
    let showSenderLabel = false;

    if (msg.isOwner === true) {
      isOutgoing = true;
    } else if (msg.isOwner === false) {
      isOutgoing = false;
      showSenderLabel = conversation.isGroup;
    } else {
      isOutgoing = false;
      showSenderLabel = true;
    }

    const isTargetHighlight = msg.id === highlightedMessageId;
    const rowClass = `message-row ${isOutgoing ? 'outgoing' : 'incoming'} ${isTargetHighlight ? 'highlight-target' : ''}`;

    // Reactions pill
    let reactionsMarkup = '';
    if (Array.isArray(msg.reactions) && msg.reactions.length > 0) {
      const reactionItems = msg.reactions.map(r => 
        `<span>${escapeHTML(r.reaction)} <small style="opacity: 0.8;">${escapeHTML(r.actor)}</small></span>`
      ).join(' ');
      reactionsMarkup = `
        <div class="message-reactions" aria-label="Reactions: ${escapeHTML(msg.reactions.map(r => `${r.actor} reacted ${r.reaction}`).join(', '))}">
          ${reactionItems}
        </div>
      `;
    }

    // Timestamp formatting
    const timeDisplay = msg.timestamp !== null 
      ? formatBubbleTime(msg.timestamp) 
      : 'Time unavailable';

    // Bubble content: render compact shared card when message is a reel or post share
    let bubbleContent = '';
    if (msg.shareData) {
      const { isReel, owner, truncatedDescription, link } = msg.shareData;
      const cardTitle = isReel ? 'Shared reel' : 'Shared post';
      const cardIcon = isReel ? '🎬' : '🔗';

      // Highlight matching query in sender commentary if present
      const formattedSenderText = msg.senderText 
        ? (trimmedSearchQuery ? highlightMatchedText(msg.senderText, trimmedSearchQuery) : escapeHTML(msg.senderText))
        : '';

      const senderTextHtml = formattedSenderText 
        ? `<div class="message-sender-text">${formattedSenderText}</div>`
        : '';

      const ownerHtml = owner 
        ? `<span class="shared-card-owner">@${escapeHTML(owner)}</span>` 
        : '';

      const descHtml = truncatedDescription 
        ? `<p class="shared-card-desc">${escapeHTML(truncatedDescription)}</p>` 
        : '';

      const linkHtml = link 
        ? `<a href="${escapeHTML(link)}" class="shared-card-link" target="_blank" rel="noopener noreferrer">View on Instagram ↗</a>` 
        : '';

      bubbleContent = `
        ${senderTextHtml}
        <div class="shared-card" role="article" aria-label="${escapeHTML(cardTitle)}">
          <div class="shared-card-header">
            <span class="shared-card-icon" aria-hidden="true">${cardIcon}</span>
            <span class="shared-card-badge">${escapeHTML(cardTitle)}</span>
            ${ownerHtml}
          </div>
          ${descHtml}
          ${linkHtml}
        </div>
      `;
    } else {
      bubbleContent = trimmedSearchQuery && !msg.isUnsent
        ? highlightMatchedText(msg.content, trimmedSearchQuery)
        : escapeHTML(msg.content);
    }

    return `
      ${separatorHtml}
      <div class="${rowClass}" data-message-id="${escapeHTML(msg.id)}">
        ${showSenderLabel ? `<span class="sender-label">${escapeHTML(msg.senderName)}</span>` : ''}
        <div class="bubble-container">
          <div class="message-bubble ${msg.isUnsent ? 'unsent' : ''} ${msg.shareData ? 'has-share' : ''}">
            ${bubbleContent}
          </div>
        </div>
        ${reactionsMarkup}
        <time class="message-time">${escapeHTML(timeDisplay)}</time>
      </div>
    `;
  }).join('');

  section.innerHTML = `
    <div class="chat-header">
      <div class="chat-header-info">
        <button 
          type="button" 
          class="btn-icon mobile-back-btn" 
          id="chat-back-btn" 
          aria-label="Back to conversation list" 
          title="Back to conversation list"
        >
          ${icons.arrowLeft()}
        </button>

        <div class="avatar direct-avatar" style="width: 40px; height: 40px;" aria-hidden="true">
          <div class="avatar-inner" style="width: 36px; height: 36px; font-size: var(--font-size-xs);">
            ${escapeHTML(initials)}
          </div>
        </div>

        <div class="chat-header-text">
          <h2 class="chat-header-title">${escapeHTML(conversation.title)}</h2>
          <span class="chat-header-subtitle">${escapeHTML(subtitle)}</span>
        </div>
      </div>
    </div>

    ${ownerBannerMarkup}
    ${dateFilterBannerMarkup}

    <div class="chat-messages-container" id="chat-messages-scroll" role="log" aria-label="Messages in ${escapeHTML(conversation.title)}">
      ${displayedMessages.length === 0 ? `
        <div style="padding: var(--spacing-2xl); text-align: center; color: var(--text-secondary); margin: auto;">
          <p style="font-weight: var(--font-weight-bold); font-size: var(--font-size-lg); margin-bottom: 8px;">
            No messages found for this date range.
          </p>
          <p style="font-size: var(--font-size-sm); margin-bottom: 16px;">
            Try selecting a different date range or clear the filter.
          </p>
          <button type="button" class="btn-primary" id="empty-clear-date-btn">
            Clear Date Filter
          </button>
        </div>
      ` : messagesMarkup}
    </div>
  `;

  // Attach mobile back button handler
  const backBtn = section.querySelector('#chat-back-btn');
  if (backBtn) {
    backBtn.addEventListener('click', onBackToList);
  }

  // Attach clear date filter handlers
  const clearDateFilterBtn = section.querySelector('#chat-clear-date-filter-btn');
  if (clearDateFilterBtn) {
    clearDateFilterBtn.addEventListener('click', onClearDateFilter);
  }
  const emptyClearDateBtn = section.querySelector('#empty-clear-date-btn');
  if (emptyClearDateBtn) {
    emptyClearDateBtn.addEventListener('click', onClearDateFilter);
  }

  // Attach owner selection handlers
  if (showOwnerBanner) {
    const confirmOwnerBtn = section.querySelector('#confirm-owner-btn');
    const skipOwnerBtn = section.querySelector('#skip-owner-btn');
    const ownerDropdown = section.querySelector('#owner-select-dropdown');

    if (confirmOwnerBtn && ownerDropdown) {
      confirmOwnerBtn.addEventListener('click', () => {
        const chosen = ownerDropdown.value;
        if (chosen && onSelectOwner) onSelectOwner(chosen);
      });
    }

    if (skipOwnerBtn) {
      skipOwnerBtn.addEventListener('click', () => {
        if (onSkipOwner) onSkipOwner();
      });
    }
  }

  // Scroll target message into view or scroll to bottom
  requestAnimationFrame(() => {
    const scrollContainer = section.querySelector('#chat-messages-scroll');
    if (!scrollContainer) return;

    if (highlightedMessageId) {
      const targetEl = scrollContainer.querySelector(`[data-message-id="${highlightedMessageId}"]`);
      if (targetEl) {
        targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
      }
    }

    // Default: scroll to bottom of conversation
    scrollContainer.scrollTop = scrollContainer.scrollHeight;
  });

  return section;
}
