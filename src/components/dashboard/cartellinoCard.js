/**
 * Cartellino Card Component for Dashboard
 * Displays individual cartellino summary, status badge, 16:9 photo preview, and weight.
 */

import { escapeHtml } from '../../utils/dom.js';

export function renderCartellinoCard(cart) {
  return `
    <div class="cartellino-card" data-cartellino-id="${cart.id}">
      <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 12px;">
        <div style="flex: 1; min-width: 0;">
          <span class="cartellino-number">${escapeHtml(cart.numero)}</span>
          <div class="cartellino-commessa" style="margin-top: 4px;">${escapeHtml(cart.commessa)}</div>
          <div class="cartellino-desc" style="margin-top: 6px;">${escapeHtml(cart.descrizione || 'Nessuna descrizione specificata')}</div>
        </div>
        <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 8px; flex-shrink: 0;">
          <span class="badge ${cart.stato === 'completato' ? 'badge-completato' : cart.stato === 'archiviato' ? 'badge-archiviato' : 'badge-in-lavorazione'}">
            ${escapeHtml(cart.stato === 'completato' ? 'Completato' : cart.stato === 'archiviato' ? 'Archiviato' : 'In Lavorazione')}
          </span>
          ${
            cart.foto_pezzo
              ? `
                <img
                  src="${escapeHtml(cart.foto_pezzo)}"
                  alt="Foto pezzo ${escapeHtml(cart.numero)}"
                  title="Foto del pezzo (16:9 - 142x80)"
                  style="width: 142px; height: 80px; aspect-ratio: 16 / 9; object-fit: cover; border-radius: 6px; border: 1px solid var(--border-color); background: #ffffff; box-shadow: 0 1px 3px rgba(0,0,0,0.06); display: block;"
                />
              `
              : `
                <div
                  title="Nessuna foto pezzo caricata"
                  style="width: 142px; height: 80px; aspect-ratio: 16 / 9; border-radius: 6px; border: 1px dashed var(--border-color); background: #f8fafc; display: flex; flex-direction: column; align-items: center; justify-content: center; color: var(--text-muted); gap: 4px;"
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                    <circle cx="8.5" cy="8.5" r="1.5"></circle>
                    <polyline points="21 15 16 10 5 21"></polyline>
                  </svg>
                  <span style="font-size: 10px; font-weight: 500; color: var(--text-muted);">No foto</span>
                </div>
              `
          }
        </div>
      </div>
      <div class="cartellino-footer">
        <div class="cartellino-stats">
          <span class="stat-item" title="Peso totale calcolato dai materiali">
            <span>Peso:</span>
            <strong class="stat-val tabular-nums">${cart.peso_totale ? cart.peso_totale.toFixed(2) : '0.00'} kg</strong>
          </span>
        </div>
        <div
          class="btn-icon btn-icon-primary"
          title="Apri cartellino"
          aria-label="Apri cartellino"
          style="padding: 4px;"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
            <polyline points="15 3 21 3 21 9"></polyline>
            <line x1="10" y1="14" x2="21" y2="3"></line>
          </svg>
        </div>
      </div>
    </div>
  `;
}
