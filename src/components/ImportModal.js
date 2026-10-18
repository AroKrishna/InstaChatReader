/**
 * Interactive ImportModal Component
 *
 * Implements full JSON file selection, drag-and-drop, validation, parsing,
 * progress feedback, and per-file result reporting entirely in browser memory.
 */

import { icons } from '../utils/icons.js';
import { escapeHTML } from '../utils/formatters.js';
import { validateJSONFile } from '../parser/fileValidator.js';
import { parseInstagramData } from '../parser/instagramParser.js';
import { mergeConversations } from '../parser/conversationMerger.js';

/**
 * Formats bytes to human-readable size.
 * @param {number} bytes 
 * @returns {string}
 */
function formatFileSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function createImportModal({ onClose, onImportComplete }) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.id = 'import-modal-overlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-labelledby', 'modal-import-title');

  // Internal component state
  let stagedFiles = []; // Array<{ file: File, id: string }>
  let isProcessing = false;
  let importResults = null; // { summary: string, fileResults: Array<{ name, status, message }> }
  let unsupportedWarning = null; // Warning message for dropped .zip or .html files

  function renderModalContent() {
    overlay.innerHTML = `
      <div class="modal-card" style="max-width: 580px;">
        <div class="modal-header">
          <div class="modal-title-wrap">
            <div class="brand-logo-icon" style="width: 28px; height: 28px;" aria-hidden="true">
              ${icons.upload()}
            </div>
            <h2 class="modal-title" id="modal-import-title">
              ${importResults ? 'Import Results' : 'Import Instagram Messages'}
            </h2>
          </div>
          <button 
            type="button" 
            class="btn-icon" 
            id="modal-close-icon-btn" 
            aria-label="Close dialog" 
            title="Close dialog"
            ${isProcessing ? 'disabled' : ''}
          >
            ${icons.close()}
          </button>
        </div>

        <div class="modal-body">
          ${importResults ? renderResultsView() : renderUploadView()}
        </div>

        <div class="modal-footer">
          ${renderFooterButtons()}
        </div>
      </div>
    `;

    bindEvents();
  }

  function renderUploadView() {
    const stagedCount = stagedFiles.length;

    return `
      <div class="info-callout">
        <div class="info-callout-title">
          <span aria-hidden="true">${icons.info()}</span>
          <span>How to import your Instagram export</span>
        </div>
        <p>
          1. Manually unzip your exported Instagram archive on your computer.<br />
          2. Locate your message files (e.g. <code>your_instagram_activity/messages/inbox/.../message_1.json</code>).<br />
          3. Select or drag & drop one or multiple <code>.json</code> message files below.
        </p>
        <p style="margin-top: 4px; font-size: 0.75rem; color: var(--text-muted);">
          Note: Direct ZIP uploads and HTML files are not supported. All parsing runs 100% locally in your browser memory.
        </p>
      </div>

      ${unsupportedWarning ? `
        <div class="date-validation-error" role="alert" style="padding: 8px 12px; background-color: #fee2e2; border: 1px solid #fca5a5; border-radius: var(--radius-md); font-size: var(--font-size-xs); color: #991b1b; line-height: 1.4;">
          ${escapeHTML(unsupportedWarning)}
        </div>
      ` : ''}

      <!-- Drag & Drop Zone -->
      <div 
        class="drop-zone" 
        id="drop-zone"
        role="region"
        aria-label="Drag and drop files here"
        tabindex="0"
      >
        <input 
          type="file" 
          id="file-input" 
          class="file-input-hidden" 
          multiple 
          accept=".json"
        />
        <div class="drop-zone-icon" aria-hidden="true">
          ${icons.upload()}
        </div>
        <div class="drop-zone-title">Drag & drop your Instagram JSON files here</div>
        <div class="drop-zone-subtext">or click to browse your computer</div>
      </div>

      <!-- Staged Files List -->
      ${stagedCount > 0 ? `
        <div class="staged-files-container">
          <div class="staged-files-header">
            <span>Selected Files (${stagedCount})</span>
            <button type="button" class="btn-subtle" id="clear-all-staged-btn" style="height: auto; padding: 2px 6px; font-size: var(--font-size-xs);">
              Remove All
            </button>
          </div>
          <ul class="staged-files-list">
            ${stagedFiles.map((sf, idx) => `
              <li class="staged-file-item">
                <div class="file-meta">
                  <span class="file-name" title="${escapeHTML(sf.file.name)}">${escapeHTML(sf.file.name)}</span>
                  <span class="file-size">${formatFileSize(sf.file.size)}</span>
                </div>
                <button 
                  type="button" 
                  class="file-remove-btn" 
                  data-remove-id="${sf.id}" 
                  aria-label="Remove ${escapeHTML(sf.file.name)}" 
                  title="Remove file"
                  ${isProcessing ? 'disabled' : ''}
                >
                  ${icons.close()}
                </button>
              </li>
            `).join('')}
          </ul>
        </div>
      ` : ''}

      ${isProcessing ? `
        <div style="display: flex; align-items: center; justify-content: center; gap: 8px; padding: var(--spacing-md); color: var(--accent-primary); font-size: var(--font-size-sm); font-weight: var(--font-weight-medium);">
          <span>Processing and parsing files in memory...</span>
        </div>
      ` : ''}
    `;
  }

  function renderResultsView() {
    const { summary, fileResults, totalConversations, totalMessages } = importResults;

    return `
      <div class="import-results-summary">
        ${escapeHTML(summary)}
        <div style="font-size: var(--font-size-xs); margin-top: 4px; opacity: 0.9;">
          Total Conversations: <strong>${totalConversations}</strong> • Total Messages: <strong>${totalMessages}</strong>
        </div>
      </div>

      <div style="font-size: var(--font-size-xs); font-weight: var(--font-weight-semibold); color: var(--text-secondary); margin-top: var(--spacing-xs);">
        File Ingestion Details:
      </div>

      <ul class="import-results-list">
        ${fileResults.map(fr => `
          <li class="import-result-item">
            <span class="result-badge ${fr.status}">
              ${fr.status.toUpperCase()}
            </span>
            <div style="min-width: 0; flex: 1;">
              <strong style="color: var(--text-primary); display: block;">${escapeHTML(fr.name)}</strong>
              <span style="color: var(--text-secondary);">${escapeHTML(fr.message)}</span>
            </div>
          </li>
        `).join('')}
      </ul>
    `;
  }

  function renderFooterButtons() {
    if (importResults) {
      return `
        <button type="button" class="btn-primary" id="results-done-btn">
          <span>View Conversations</span>
        </button>
      `;
    }

    return `
      <button 
        type="button" 
        class="btn-subtle" 
        id="modal-cancel-btn"
        ${isProcessing ? 'disabled' : ''}
      >
        Cancel
      </button>
      <button 
        type="button" 
        class="btn-primary" 
        id="modal-import-action-btn"
        ${stagedFiles.length === 0 || isProcessing ? 'disabled' : ''}
      >
        ${icons.upload()}
        <span>${isProcessing ? 'Importing...' : `Import ${stagedFiles.length} File${stagedFiles.length === 1 ? '' : 's'}`}</span>
      </button>
    `;
  }

  function addFiles(filesList) {
    if (!filesList || filesList.length === 0) return;

    const rejectedNames = [];

    for (let i = 0; i < filesList.length; i++) {
      const file = filesList[i];
      // Only stage .json files
      if (file.name.toLowerCase().endsWith('.json')) {
        // Prevent duplicate file names in the same staging batch
        if (!stagedFiles.some(sf => sf.file.name === file.name && sf.file.size === file.size)) {
          stagedFiles.push({
            file,
            id: `sf_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`
          });
        }
      } else {
        rejectedNames.push(file.name);
      }
    }

    if (rejectedNames.length > 0) {
      unsupportedWarning = `Unsupported file: "${rejectedNames.join(', ')}". InstaChatReader requires JSON files (e.g. message_1.json). Please extract your Instagram ZIP archive on your computer first.`;
    } else {
      unsupportedWarning = null;
    }

    renderModalContent();
  }

  async function processImport() {
    if (stagedFiles.length === 0 || isProcessing) return;

    isProcessing = true;
    renderModalContent();

    const fileResults = [];
    const validConversations = [];

    for (const staged of stagedFiles) {
      const { file } = staged;
      try {
        const textContent = await file.text();
        const validation = validateJSONFile(file.name, textContent);

        if (!validation.isValid) {
          fileResults.push({
            name: file.name,
            status: 'error',
            message: validation.error || 'Invalid file format.'
          });
          continue;
        }

        const { conversation, warnings } = parseInstagramData(validation.parsedData, file.name);

        validConversations.push(conversation);

        if (warnings.length > 0) {
          fileResults.push({
            name: file.name,
            status: 'warning',
            message: `Imported with warnings: ${warnings.join(' ')}`
          });
        } else {
          fileResults.push({
            name: file.name,
            status: 'success',
            message: `Successfully parsed (${conversation.messages.length} messages)`
          });
        }
      } catch (err) {
        fileResults.push({
          name: file.name,
          status: 'error',
          message: `Unexpected reading error: ${err.message}`
        });
      }
    }

    // Merge and deduplicate split files and conversations
    const mergedConversations = mergeConversations(validConversations);

    const successCount = fileResults.filter(r => r.status === 'success').length;
    const warningCount = fileResults.filter(r => r.status === 'warning').length;
    const errorCount = fileResults.filter(r => r.status === 'error').length;
    const totalMessages = mergedConversations.reduce((acc, c) => acc + c.messages.length, 0);

    let summary = '';
    if (mergedConversations.length > 0) {
      summary = `Successfully loaded ${mergedConversations.length} conversation${mergedConversations.length === 1 ? '' : 's'} from ${successCount + warningCount} file${(successCount + warningCount) === 1 ? '' : 's'}.`;
      if (errorCount > 0) {
        summary += ` (${errorCount} file${errorCount === 1 ? '' : 's'} could not be imported).`;
      }
    } else {
      summary = `No valid Instagram conversations were imported (${errorCount} file${errorCount === 1 ? '' : 's'} failed).`;
    }

    importResults = {
      summary,
      fileResults,
      totalConversations: mergedConversations.length,
      totalMessages,
      mergedConversations
    };

    isProcessing = false;
    renderModalContent();

    // Notify application state if any conversations were imported
    if (mergedConversations.length > 0) {
      onImportComplete(mergedConversations, importResults);
    }
  }

  function bindEvents() {
    const closeIconBtn = overlay.querySelector('#modal-close-icon-btn');
    if (closeIconBtn) closeIconBtn.addEventListener('click', handleClose);

    const cancelBtn = overlay.querySelector('#modal-cancel-btn');
    if (cancelBtn) cancelBtn.addEventListener('click', handleClose);

    const doneBtn = overlay.querySelector('#results-done-btn');
    if (doneBtn) doneBtn.addEventListener('click', handleClose);

    const importActionBtn = overlay.querySelector('#modal-import-action-btn');
    if (importActionBtn) importActionBtn.addEventListener('click', processImport);

    const clearAllBtn = overlay.querySelector('#clear-all-staged-btn');
    if (clearAllBtn) {
      clearAllBtn.addEventListener('click', () => {
        stagedFiles = [];
        renderModalContent();
      });
    }

    // Drop zone & file input
    const dropZone = overlay.querySelector('#drop-zone');
    const fileInput = overlay.querySelector('#file-input');

    if (dropZone && fileInput) {
      dropZone.addEventListener('click', () => fileInput.click());
      dropZone.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          fileInput.click();
        }
      });

      fileInput.addEventListener('change', (e) => {
        addFiles(e.target.files);
        fileInput.value = ''; // reset so same files can be re-selected if removed
      });

      dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('dragover');
      });

      dropZone.addEventListener('dragleave', () => {
        dropZone.classList.remove('dragover');
      });

      dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('dragover');
        if (e.dataTransfer && e.dataTransfer.files) {
          addFiles(e.dataTransfer.files);
        }
      });
    }

    // Individual file remove buttons
    const removeButtons = overlay.querySelectorAll('.file-remove-btn');
    removeButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const removeId = btn.dataset.removeId;
        stagedFiles = stagedFiles.filter(sf => sf.id !== removeId);
        renderModalContent();
      });
    });
  }

  function handleClose() {
    if (isProcessing) return;
    document.removeEventListener('keydown', handleKeyDown);
    onClose();
  }

  function handleKeyDown(e) {
    if (e.key === 'Escape' && !isProcessing) {
      handleClose();
    }
  }

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay && !isProcessing) {
      handleClose();
    }
  });

  document.addEventListener('keydown', handleKeyDown);

  // Initial render
  renderModalContent();

  return overlay;
}
