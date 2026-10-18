/**
 * InstaChatReader Entry Point
 * Application lifecycle, in-memory state coordination, search, date filtering, and view rendering.
 */

import { mockConversations } from './data/mockData.js';
import { createHeader } from './components/Header.js';
import { createSidebar } from './components/Sidebar.js';
import { createChatViewer } from './components/ChatViewer.js';
import { createImportModal } from './components/ImportModal.js';
import { createConfirmModal } from './components/ConfirmModal.js';
import { mergeConversations } from './parser/conversationMerger.js';
import { searchArchive } from './utils/search.js';
import { validateDateRange } from './utils/dateFilters.js';

class InstaChatApp {
  constructor() {
    // Session-only in-memory state (strictly no localStorage / sessionStorage / IndexedDB)
    this.state = {
      theme: 'light',
      isMockData: true,
      conversations: [...mockConversations],
      activeConversationId: mockConversations.length > 0 ? mockConversations[0].id : null,
      ownerName: null,
      detectedParticipants: this.extractParticipants(mockConversations),
      skippedOwnerSelection: false,
      mobileView: 'list', // 'list' | 'chat'
      isImportModalOpen: false,
      isConfirmClearOpen: false,
      importResults: null,

      // Part 4 Search and Date Filter State
      searchQuery: '',
      searchScope: 'all', // 'all' | 'current'
      isDateFilterOpen: false,
      dateFilterStart: '',
      dateFilterEnd: '',
      dateFilterError: null,
      highlightedMessageId: null
    };

    this.highlightTimer = null;
    this.appRoot = document.getElementById('app');
    this.modalRoot = document.getElementById('modal-root');

    this.init();
  }

  init() {
    this.applyTheme(this.state.theme);
    this.render();
  }

  extractParticipants(conversations) {
    const set = new Set();
    for (const c of conversations) {
      if (Array.isArray(c.participants)) {
        c.participants.forEach(p => {
          if (p && p !== 'You') set.add(p);
        });
      }
      if (Array.isArray(c.messages)) {
        c.messages.forEach(m => {
          if (m.senderName && m.senderName !== 'Unknown Sender' && m.senderName !== 'You') {
            set.add(m.senderName);
          }
        });
      }
    }
    return Array.from(set).sort();
  }

  applyTheme(theme) {
    this.state.theme = theme;
    if (theme === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
  }

  toggleTheme() {
    const nextTheme = this.state.theme === 'light' ? 'dark' : 'light';
    this.applyTheme(nextTheme);
    this.render();
  }

  selectConversation(convoId) {
    this.state.activeConversationId = convoId;
    this.state.mobileView = 'chat';
    this.render();
  }

  backToList() {
    this.state.mobileView = 'list';
    this.render();
  }

  openImportModal() {
    this.state.isImportModalOpen = true;
    this.renderModal();
  }

  closeImportModal() {
    this.state.isImportModalOpen = false;
    this.renderModal();
  }

  openClearArchiveConfirm() {
    this.state.isConfirmClearOpen = true;
    this.renderModal();
  }

  closeClearArchiveConfirm() {
    this.state.isConfirmClearOpen = false;
    this.renderModal();
  }

  clearArchive() {
    if (this.highlightTimer) clearTimeout(this.highlightTimer);

    // Purges in-memory messages, conversations, search, and date filters entirely
    this.state.conversations = [];
    this.state.activeConversationId = null;
    this.state.ownerName = null;
    this.state.detectedParticipants = [];
    this.state.isMockData = false;
    this.state.importResults = null;
    this.state.searchQuery = '';
    this.state.dateFilterStart = '';
    this.state.dateFilterEnd = '';
    this.state.dateFilterError = null;
    this.state.highlightedMessageId = null;
    this.state.isConfirmClearOpen = false;
    this.render();
  }

  handleImportComplete(newConversations, importResults) {
    if (this.highlightTimer) clearTimeout(this.highlightTimer);

    this.state.importResults = importResults;

    // Reset search and date filters when a new archive is imported
    this.state.searchQuery = '';
    this.state.dateFilterStart = '';
    this.state.dateFilterEnd = '';
    this.state.dateFilterError = null;
    this.state.highlightedMessageId = null;

    // If currently displaying mock data, replace it completely with real data
    const existing = this.state.isMockData ? [] : this.state.conversations;
    const combined = mergeConversations([...existing, ...newConversations]);

    this.state.isMockData = false;
    this.state.conversations = combined;
    this.state.detectedParticipants = this.extractParticipants(combined);

    if (this.state.ownerName) {
      this.applyOwnerNameToMessages(this.state.ownerName);
    } else {
      this.state.skippedOwnerSelection = false;
    }

    if (combined.length > 0) {
      this.state.activeConversationId = combined[0].id;
    }

    this.render();
  }

  setAccountOwner(ownerName) {
    this.state.ownerName = ownerName;
    this.state.skippedOwnerSelection = false;
    this.applyOwnerNameToMessages(ownerName);
    this.render();
  }

  skipAccountOwner() {
    this.state.skippedOwnerSelection = true;
    this.render();
  }

  applyOwnerNameToMessages(ownerName) {
    for (const c of this.state.conversations) {
      for (const m of c.messages) {
        m.isOwner = m.senderName === ownerName;
      }
    }
  }

  // Search and Date Filter Handlers
  handleSearchChange(query) {
    this.state.searchQuery = query;
    this.render();
  }

  handleClearSearch() {
    this.state.searchQuery = '';
    this.render();
  }

  handleScopeChange(scope) {
    this.state.searchScope = scope;
    this.render();
  }

  handleToggleDateFilter() {
    this.state.isDateFilterOpen = !this.state.isDateFilterOpen;
    this.render();
  }

  handleApplyDateFilter(startStr, endStr) {
    const validation = validateDateRange(startStr, endStr);
    if (!validation.isValid) {
      this.state.dateFilterError = validation.error;
    } else {
      this.state.dateFilterStart = startStr;
      this.state.dateFilterEnd = endStr;
      this.state.dateFilterError = null;
    }
    this.render();
  }

  handleClearDateFilter() {
    this.state.dateFilterStart = '';
    this.state.dateFilterEnd = '';
    this.state.dateFilterError = null;
    this.render();
  }

  handleSelectSearchResult(conversationId, messageId) {
    this.state.activeConversationId = conversationId;
    this.state.highlightedMessageId = messageId;
    this.state.mobileView = 'chat';

    // If an active date filter excludes this message, clear the filter so target is rendered
    if (this.state.dateFilterStart || this.state.dateFilterEnd) {
      const targetConvo = this.state.conversations.find(c => c.id === conversationId);
      const targetMsg = targetConvo?.messages.find(m => m.id === messageId);
      if (targetMsg && targetMsg.timestamp !== null) {
        const { startMs, endMs } = validateDateRange(this.state.dateFilterStart, this.state.dateFilterEnd);
        if (!isMessageInDateRange(targetMsg, startMs, endMs)) {
          this.state.dateFilterStart = '';
          this.state.dateFilterEnd = '';
          this.state.dateFilterError = null;
        }
      }
    }

    this.render();

    // Auto-clear temporary highlight pulse after 2.5 seconds
    if (this.highlightTimer) clearTimeout(this.highlightTimer);
    this.highlightTimer = setTimeout(() => {
      this.state.highlightedMessageId = null;
      const target = document.querySelector('.message-row.highlight-target');
      if (target) target.classList.remove('highlight-target');
    }, 2500);
  }

  renderModal() {
    this.modalRoot.innerHTML = '';

    if (this.state.isImportModalOpen) {
      const modal = createImportModal({
        onClose: () => this.closeImportModal(),
        onImportComplete: (convo, results) => this.handleImportComplete(convo, results)
      });
      this.modalRoot.appendChild(modal);
    } else if (this.state.isConfirmClearOpen) {
      const confirmModal = createConfirmModal({
        title: 'Clear Imported Archive?',
        message: 'This will purge all loaded conversations and messages from your browser memory. Local files on your computer will not be touched.',
        confirmText: 'Clear Archive',
        onConfirm: () => this.clearArchive(),
        onCancel: () => this.closeClearArchiveConfirm()
      });
      this.modalRoot.appendChild(confirmModal);
    }
  }

  render() {
    this.appRoot.innerHTML = '';
    this.appRoot.setAttribute('data-mobile-view', this.state.mobileView);

    const hasArchive = this.state.conversations.length > 0;

    // Validate and prepare active date filter timestamps
    const dateRangeValidation = validateDateRange(this.state.dateFilterStart, this.state.dateFilterEnd);
    const dateRangeMs = {
      startMs: dateRangeValidation.startMs,
      endMs: dateRangeValidation.endMs
    };

    // Calculate Search Results
    const searchResultData = searchArchive({
      conversations: this.state.conversations,
      query: this.state.searchQuery,
      scope: this.state.searchScope,
      activeConversationId: this.state.activeConversationId,
      dateRange: dateRangeMs
    });

    // 1. Header
    const header = createHeader({
      currentTheme: this.state.theme,
      hasArchive,
      onThemeToggle: () => this.toggleTheme(),
      onOpenImport: () => this.openImportModal(),
      onClearArchive: () => this.openClearArchiveConfirm()
    });
    this.appRoot.appendChild(header);

    // 2. Main Shell
    const mainShell = document.createElement('main');
    mainShell.className = 'app-main';
    mainShell.id = 'main-content';

    // 3. Sidebar (with integrated Search & Date navigation)
    const sidebar = createSidebar({
      conversations: this.state.conversations,
      activeConversationId: this.state.activeConversationId,
      isMockData: this.state.isMockData,
      searchQuery: this.state.searchQuery,
      searchScope: this.state.searchScope,
      searchResults: searchResultData.results,
      isDateFilterOpen: this.state.isDateFilterOpen,
      dateFilterStart: this.state.dateFilterStart,
      dateFilterEnd: this.state.dateFilterEnd,
      dateFilterError: this.state.dateFilterError,
      onSelectConversation: (id) => this.selectConversation(id),
      onSearchChange: (q) => this.handleSearchChange(q),
      onClearSearch: () => this.handleClearSearch(),
      onScopeChange: (scope) => this.handleScopeChange(scope),
      onToggleDateFilter: () => this.handleToggleDateFilter(),
      onApplyDateFilter: (start, end) => this.handleApplyDateFilter(start, end),
      onClearDateFilter: () => this.handleClearDateFilter(),
      onSelectSearchResult: (convoId, msgId) => this.handleSelectSearchResult(convoId, msgId)
    });
    mainShell.appendChild(sidebar);

    // 4. Chat Viewport
    const activeConvo = this.state.conversations.find(
      c => c.id === this.state.activeConversationId
    ) || null;

    const showOwnerBanner = !this.state.skippedOwnerSelection && this.state.ownerName === null;

    const chatViewer = createChatViewer({
      conversation: activeConvo,
      ownerName: this.state.ownerName,
      detectedParticipants: showOwnerBanner ? this.state.detectedParticipants : [],
      dateFilterStart: this.state.dateFilterStart,
      dateFilterEnd: this.state.dateFilterEnd,
      dateFilterMs: dateRangeMs,
      searchQuery: this.state.searchQuery,
      highlightedMessageId: this.state.highlightedMessageId,
      onBackToList: () => this.backToList(),
      onOpenImport: () => this.openImportModal(),
      onSelectOwner: (owner) => this.setAccountOwner(owner),
      onSkipOwner: () => this.skipAccountOwner(),
      onClearDateFilter: () => this.handleClearDateFilter()
    });
    mainShell.appendChild(chatViewer);

    this.appRoot.appendChild(mainShell);

    // 5. Ensure Modal state matches
    this.renderModal();
  }
}

// Bootstrap application on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  new InstaChatApp();
});
