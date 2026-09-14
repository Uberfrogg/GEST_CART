/**
 * Dashboard Page for Gestionale Ore
 * Central operational dashboard matching specifications & screenshots:
 * - Single Global Search (client, cartellino #, commessa, text)
 * - Exclusive "+ Nuovo cartellino" button
 * - Grouped by client with expandable active cartellini
 * - Direct navigation to cartellino detail
 * Coordinated with modular sub-components in /src/components/dashboard/
 */

import { api } from '../api.js';
import { state } from '../state.js';
import { router } from '../router.js';
import { escapeHtml } from '../utils/dom.js';
import { renderClientGroups } from '../components/dashboard/clientGroup.js';
import { openNuovoCartellinoModal } from '../components/dashboard/nuovoCartellinoModal.js';

let currentSearch = '';
let currentStatusFilter = 'all'; // 'all' | 'in-lavorazione' | 'completato'

export async function renderDashboardPage() {
  const isDipendente = state.isDipendente();
  const expandedClients = state.getExpandedClientIds();
  const [allClients, allCartellini] = await Promise.all([
    api.getClienti(),
    api.getCartellini({ search: currentSearch }),
  ]);

  // I cartellini attivi nella dashboard comprendono sia quelli in lavorazione che quelli completati
  // Vengono rimossi dalla dashboard solo quando spostati in archivio
  let activeCartellini = allCartellini.filter((c) => c.stato !== 'archiviato');

  if (!isDipendente && currentStatusFilter === 'in-lavorazione') {
    activeCartellini = activeCartellini.filter((c) => c.stato === 'in-lavorazione');
  } else if (!isDipendente && currentStatusFilter === 'completato') {
    activeCartellini = activeCartellini.filter((c) => c.stato === 'completato');
  }

  // Group active cartellini by client
  const clientMap = new Map();
  for (const client of allClients) {
    clientMap.set(client.id, {
      ...client,
      cartellini: [],
    });
  }

  for (const cart of activeCartellini) {
    if (clientMap.has(cart.cliente_id)) {
      clientMap.get(cart.cliente_id).cartellini.push(cart);
    } else {
      const cliName = cart.cliente ? cart.cliente.nome : 'Cliente';
      clientMap.set(cart.cliente_id, {
        id: cart.cliente_id,
        nome: cliName,
        cartellini: [cart],
      });
    }
  }

  let clientGroups = Array.from(clientMap.values());
  if (currentSearch.trim() || (!isDipendente && currentStatusFilter !== 'all')) {
    clientGroups = clientGroups.filter((cg) => cg.cartellini.length > 0);
  } else {
    clientGroups.sort((a, b) => b.cartellini.length - a.cartellini.length);
  }

  const totalActiveCount = activeCartellini.length;

  return `
    <header class="app-topbar" id="dashboard-topbar">
      <div style="display: flex; align-items: center; gap: 12px; flex: 1; max-width: 720px;">
        <div class="search-container" style="flex: 1;">
          <svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <input
            type="text"
            id="dashboard-search-input"
            class="search-input"
            placeholder="Cerca cliente, cartellino, commessa, testo..."
            value="${escapeHtml(currentSearch)}"
            autocomplete="off"
          />
          ${
            currentSearch
              ? `<button type="button" id="btn-clear-search" class="search-clear" title="Cancella ricerca">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                </button>`
              : ''
          }
        </div>

        ${
          !isDipendente
            ? `
              <div style="display: flex; gap: 4px; background: #f1f5f9; padding: 3px; border-radius: var(--radius-md); border: 1px solid var(--border-color);" id="dashboard-status-filters">
                <button
                  type="button"
                  class="btn btn-sm ${currentStatusFilter === 'all' ? 'btn-primary' : 'btn-secondary'}"
                  data-filter-status="all"
                  style="padding: 4px 10px; font-size: 12px; border: none;"
                >
                  Tutti
                </button>
                <button
                  type="button"
                  class="btn btn-sm ${currentStatusFilter === 'in-lavorazione' ? 'btn-primary' : 'btn-secondary'}"
                  data-filter-status="in-lavorazione"
                  style="padding: 4px 10px; font-size: 12px; border: none;"
                >
                  In corso
                </button>
                <button
                  type="button"
                  class="btn btn-sm ${currentStatusFilter === 'completato' ? 'btn-primary' : 'btn-secondary'}"
                  data-filter-status="completato"
                  style="padding: 4px 10px; font-size: 12px; border: none;"
                >
                  Completati
                </button>
              </div>
            `
            : ''
        }
      </div>

      <div>
        <button type="button" class="btn btn-primary" id="btn-new-cartellino">Nuovo cartellino</button>
      </div>
    </header>

    <div class="page-container" id="dashboard-content">
      <div class="page-header">
        <div>
          <h1 class="page-title">
            <span>Cartellini attivi</span>
            <span class="badge badge-counter tabular-nums">${totalActiveCount} attivi</span>
          </h1>
          <p class="page-subtitle">
            ${
              currentSearch
                ? `Risultati della ricerca per: "<strong>${escapeHtml(currentSearch)}</strong>"`
                : 'Seleziona un cliente per visualizzare o gestire i cartellini in lavorazione'
            }
          </p>
        </div>
      </div>

      ${renderClientGroups(clientGroups, expandedClients, currentSearch)}
    </div>
  `;
}

export function initDashboardPage(container, rerender) {
  const searchInput = container.querySelector('#dashboard-search-input');
  const clearSearchBtn = container.querySelector('#btn-clear-search');
  const newCartellinoBtn = container.querySelector('#btn-new-cartellino');

  if (searchInput) {
    let debounceTimer = null;
    searchInput.addEventListener('input', (e) => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        currentSearch = e.target.value;
        rerender();
      }, 250);
    });

    if (currentSearch) {
      searchInput.focus();
      searchInput.setSelectionRange(currentSearch.length, currentSearch.length);
    }
  }

  if (clearSearchBtn) {
    clearSearchBtn.addEventListener('click', () => {
      currentSearch = '';
      rerender();
    });
  }

  const filterContainer = container.querySelector('#dashboard-status-filters');
  if (filterContainer) {
    filterContainer.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-filter-status]');
      if (btn) {
        const status = btn.getAttribute('data-filter-status');
        if (status && status !== currentStatusFilter) {
          currentStatusFilter = status;
          rerender();
        }
      }
    });
  }

  container.addEventListener('click', (e) => {
    const toggleHeader = e.target.closest('[data-action="toggle-client"]');
    if (toggleHeader) {
      const clientId = toggleHeader.getAttribute('data-client-id');
      if (clientId) {
        state.toggleExpandedClient(clientId);
        rerender();
      }
      return;
    }

    const cartCard = e.target.closest('.cartellino-card');
    if (cartCard) {
      const cartId = cartCard.getAttribute('data-cartellino-id');
      if (cartId) {
        router.navigate(`#cartellino/${cartId}`);
      }
      return;
    }
  });

  if (newCartellinoBtn) {
    newCartellinoBtn.addEventListener('click', () => {
      openNuovoCartellinoModal({
        onCreated: () => rerender(),
      });
    });
  }
}
