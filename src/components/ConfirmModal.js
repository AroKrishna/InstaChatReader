/**
 * ConfirmModal Component
 * Accessible confirmation dialog for destructive actions such as clearing the in-memory archive.
 */

import { icons } from '../utils/icons.js';

export function createConfirmModal({ title, message, confirmText, onConfirm, onCancel }) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.id = 'confirm-modal-overlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-labelledby', 'confirm-modal-title');

  overlay.innerHTML = `
    <div class="modal-card" style="max-width: 440px;">
      <div class="modal-header">
        <h2 class="modal-title" id="confirm-modal-title">${title}</h2>
        <button type="button" class="btn-icon" id="confirm-close-btn" aria-label="Cancel">
          ${icons.close()}
        </button>
      </div>

      <div class="modal-body">
        <p style="color: var(--text-primary); font-size: var(--font-size-base); line-height: 1.5;">
          ${message}
        </p>
      </div>

      <div class="modal-footer">
        <button type="button" class="btn-subtle" id="confirm-cancel-btn">
          Cancel
        </button>
        <button type="button" class="btn-danger" id="confirm-action-btn">
          ${confirmText || 'Confirm'}
        </button>
      </div>
    </div>
  `;

  function cleanup() {
    document.removeEventListener('keydown', handleKeyDown);
  }

  function handleKeyDown(e) {
    if (e.key === 'Escape') {
      cleanup();
      onCancel();
    }
  }

  document.addEventListener('keydown', handleKeyDown);

  overlay.querySelector('#confirm-close-btn').addEventListener('click', () => {
    cleanup();
    onCancel();
  });

  overlay.querySelector('#confirm-cancel-btn').addEventListener('click', () => {
    cleanup();
    onCancel();
  });

  overlay.querySelector('#confirm-action-btn').addEventListener('click', () => {
    cleanup();
    onConfirm();
  });

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      cleanup();
      onCancel();
    }
  });

  return overlay;
}
