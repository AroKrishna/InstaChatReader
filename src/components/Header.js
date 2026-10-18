/**
 * Header Component
 * Displays application branding, archive status, theme toggle, import trigger, and clear archive.
 */

import { icons } from '../utils/icons.js';

export function createHeader({ currentTheme, hasArchive, onThemeToggle, onOpenImport, onClearArchive }) {
  const header = document.createElement('header');
  header.className = 'app-header';
  header.setAttribute('role', 'banner');

  const themeIcon = currentTheme === 'dark' ? icons.sun() : icons.moon();
  const themeTitle = currentTheme === 'dark' ? 'Switch to Light Theme' : 'Switch to Dark Theme';

  header.innerHTML = `
    <div class="brand-group">
      <div class="brand-logo-icon" aria-hidden="true">
        ${icons.instagram()}
      </div>
      <div class="brand-title-wrap">
        <h1 class="brand-title">InstaChatReader</h1>
        <span class="brand-badge" title="Running in-memory, read-only viewer">
          <span class="badge-dot" aria-hidden="true"></span>
          Archive Viewer
        </span>
      </div>
    </div>

    <div class="header-actions">
      ${hasArchive ? `
        <button 
          type="button" 
          class="btn-danger" 
          id="header-clear-btn" 
          aria-label="Clear imported archive from memory" 
          title="Clear imported archive from browser memory"
        >
          ${icons.trash()}
          <span>Clear Archive</span>
        </button>
      ` : ''}

      <button 
        type="button" 
        class="btn-icon theme-toggle-btn" 
        id="theme-toggle-btn" 
        aria-label="${themeTitle}" 
        title="${themeTitle}"
      >
        ${themeIcon}
      </button>

      <button 
        type="button" 
        class="btn-primary import-trigger-btn" 
        id="header-import-btn" 
        aria-label="Import Instagram JSON files"
      >
        ${icons.upload()}
        <span>Import Archive</span>
      </button>
    </div>
  `;

  // Attach event handlers
  const themeBtn = header.querySelector('#theme-toggle-btn');
  if (themeBtn) themeBtn.addEventListener('click', onThemeToggle);

  const importBtn = header.querySelector('#header-import-btn');
  if (importBtn) importBtn.addEventListener('click', onOpenImport);

  const clearBtn = header.querySelector('#header-clear-btn');
  if (clearBtn) clearBtn.addEventListener('click', onClearArchive);

  return header;
}
