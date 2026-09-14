/**
 * Modal helper for Gestionale Ore
 */

export function openModal({
  title = '',
  contentHtml,
  bodyHtml,
  footerButtonsHtml,
  footerHtml = '',
  onOpen = null,
  onMounted = null,
}) {
  // Remove existing modals
  closeModal();

  const finalContent = contentHtml !== undefined ? contentHtml : (bodyHtml !== undefined ? bodyHtml : '');
  const finalFooter = footerButtonsHtml !== undefined ? footerButtonsHtml : (footerHtml || '');
  const finalCallback = onOpen || onMounted;

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.id = 'active-modal-overlay';

  overlay.innerHTML = `
    <div class="modal-dialog" role="dialog" aria-modal="true">
      <div class="modal-header">
        <h2 class="modal-title">${title}</h2>
        <button type="button" class="modal-close" id="modal-close-btn" aria-label="Chiudi">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>
      <div class="modal-body" id="modal-body-container">
        ${finalContent}
      </div>
      ${
        finalFooter
          ? `<div class="modal-footer">${finalFooter}</div>`
          : ''
      }
    </div>
  `;

  document.body.appendChild(overlay);

  const closeBtn = overlay.querySelector('#modal-close-btn');
  if (closeBtn) {
    closeBtn.addEventListener('click', closeModal);
  }

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      closeModal();
    }
  });

  const handleEsc = (e) => {
    if (e.key === 'Escape') {
      closeModal();
      document.removeEventListener('keydown', handleEsc);
    }
  };
  document.addEventListener('keydown', handleEsc);

  if (finalCallback) {
    finalCallback(overlay);
  }

  return overlay;
}

export function closeModal() {
  const existing = document.getElementById('active-modal-overlay');
  if (existing) {
    existing.remove();
  }
}
