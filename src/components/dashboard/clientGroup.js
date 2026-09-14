/**
 * Client Group List Component for Dashboard
 * Renders accordion groups of clients with their active cartellini.
 */

import { escapeHtml } from '../../utils/dom.js';
import { renderCartellinoCard } from './cartellinoCard.js';

export function renderClientGroups(clientGroups, expandedClients, currentSearch) {
  if (clientGroups.length === 0) {
    return `
      <div class="empty-state">
        <svg class="empty-state-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="11" cy="11" r="8"></circle>
          <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
        </svg>
        <div class="empty-state-title">Nessun cartellino trovato</div>
        <p class="empty-state-text">Nessun cartellino attivo corrisponde ai criteri di ricerca "${escapeHtml(currentSearch)}".</p>
      </div>
    `;
  }

  return `
    <div class="client-groups-list">
      ${clientGroups
        .map((cg) => {
          const isExpanded = currentSearch.trim() || expandedClients.has(cg.id);
          const count = cg.cartellini.length;
          return `
            <div class="client-group ${isExpanded ? 'expanded' : ''}" data-client-id="${cg.id}">
              <div class="client-header" data-action="toggle-client" data-client-id="${cg.id}">
                <div class="client-title-wrap">
                  <svg class="client-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="9 18 15 12 9 6"></polyline>
                  </svg>
                  <div class="client-name">${escapeHtml(cg.nome)}</div>
                  <span class="client-badge">
                    ${count === 1 ? '1 cartellino attivo' : `${count} cartellini attivi`}
                  </span>
                </div>
              </div>

              ${
                isExpanded
                  ? `
                    <div class="cartellini-list">
                      ${
                        count === 0
                          ? `<div style="grid-column: 1/-1; padding: 12px; color: var(--text-muted); font-size: 13px;">Nessun cartellino attivo per questo cliente.</div>`
                          : cg.cartellini.map(renderCartellinoCard).join('')
                      }
                    </div>
                  `
                  : ''
              }
            </div>
          `;
        })
        .join('')}
    </div>
  `;
}
