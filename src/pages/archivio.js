/**
 * Archivio Page for Gestionale Ore
 * Grouped by client with expandable accordions and data-table rows.
 * Features monthly interval date filtering (Mese & Anno) and search.
 */

import { api } from '../api.js';
import { router } from '../router.js';
import { formatDate } from '../utils/date.js';

let currentArchivioSearch = '';
let currentArchivioMese = 'all'; // 'all' | '1'..'12'
let currentArchivioAnno = 'all'; // 'all' | '2026' | '2025' ...
const expandedArchivioClients = new Set();

const MESI_NOMI = [
  { val: '1', label: 'Gennaio' },
  { val: '2', label: 'Febbraio' },
  { val: '3', label: 'Marzo' },
  { val: '4', label: 'Aprile' },
  { val: '5', label: 'Maggio' },
  { val: '6', label: 'Giugno' },
  { val: '7', label: 'Luglio' },
  { val: '8', label: 'Agosto' },
  { val: '9', label: 'Settembre' },
  { val: '10', label: 'Ottobre' },
  { val: '11', label: 'Novembre' },
  { val: '12', label: 'Dicembre' },
];

function getCartellinoDateInfo(c) {
  const rawDate = c.data_creazione || c.creato_il || c.data_lavoro || c.data || '2026-09-08';
  let year = 2026;
  let month = 9;
  let dateFormatted = '08/09/2026';

  try {
    const d = new Date(rawDate);
    if (!isNaN(d.getTime())) {
      year = d.getFullYear();
      month = d.getMonth() + 1;
      dateFormatted = formatDate(rawDate);
    }
  } catch (e) {
    // ignore
  }

  return { year, month, dateFormatted, rawDate };
}

export async function renderArchivioPage() {
  const [allCartellini, allClients] = await Promise.all([
    api.getCartellini(),
    api.getClienti(),
  ]);

  const clientMap = new Map();
  allClients.forEach((cli) => {
    clientMap.set(cli.id, {
      ...cli,
      cartellini: [],
    });
  });

  // Collect available years from historical archived cartellini
  const yearsSet = new Set([2026, 2025]);
  allCartellini
    .filter((c) => c.stato === 'archiviato')
    .forEach((c) => {
      const { year } = getCartellinoDateInfo(c);
      if (year) yearsSet.add(year);
    });
  const availableYears = Array.from(yearsSet).sort((a, b) => b - a);

  // Filter ONLY archived cartellini (stato === 'archiviato')
  const searchLower = currentArchivioSearch.trim().toLowerCase();
  const filterMeseNum = currentArchivioMese !== 'all' ? parseInt(currentArchivioMese, 10) : null;
  const filterAnnoNum = currentArchivioAnno !== 'all' ? parseInt(currentArchivioAnno, 10) : null;

  const historicalCartellini = allCartellini.filter((c) => {
    // Only cartellini with stato === 'archiviato'
    if (c.stato !== 'archiviato') return false;

    const { year, month } = getCartellinoDateInfo(c);

    if (filterAnnoNum && year !== filterAnnoNum) {
      return false;
    }
    if (filterMeseNum && month !== filterMeseNum) {
      return false;
    }

    if (searchLower) {
      const client = allClients.find((cli) => cli.id === c.cliente_id) || c.cliente;
      const clientName = client ? client.nome.toLowerCase() : '';
      const num = (c.numero || '').toLowerCase();
      const commessa = (c.commessa || '').toLowerCase();
      const desc = (c.descrizione || '').toLowerCase();
      const note = (c.note || '').toLowerCase();

      const match =
        clientName.includes(searchLower) ||
        num.includes(searchLower) ||
        commessa.includes(searchLower) ||
        desc.includes(searchLower) ||
        note.includes(searchLower);

      if (!match) return false;
    }

    return true;
  });

  // Group historical cartellini by client
  historicalCartellini.forEach((c) => {
    if (clientMap.has(c.cliente_id)) {
      clientMap.get(c.cliente_id).cartellini.push(c);
    } else {
      const cliName = c.cliente ? c.cliente.nome : 'Cliente';
      clientMap.set(c.cliente_id, {
        id: c.cliente_id,
        nome: cliName,
        cartellini: [c],
      });
    }
  });

  // ONLY show clients that actually have archived cartellini
  const isFilterActive = searchLower || currentArchivioMese !== 'all' || currentArchivioAnno !== 'all';
  const clientGroups = Array.from(clientMap.values()).filter((cg) => cg.cartellini.length > 0);
  clientGroups.sort((a, b) => b.cartellini.length - a.cartellini.length);

  const totalArchivedCount = historicalCartellini.length;

  return `
    <header class="app-topbar" id="archivio-topbar">
      <div style="display: flex; align-items: center; gap: 12px; flex: 1; max-width: 820px; flex-wrap: wrap;">
        <!-- Ricerca -->
        <div class="search-container" style="flex: 1; min-width: 220px;">
          <svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <input
            type="text"
            id="archivio-search-input"
            class="search-input"
            placeholder="Cerca cliente, n° cartellino, commessa..."
            value="${escapeHtml(currentArchivioSearch)}"
            autocomplete="off"
          />
          ${
            currentArchivioSearch
              ? `<button type="button" id="archivio-btn-clear-search" class="search-clear" title="Cancella ricerca">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                </button>`
              : ''
          }
        </div>

        <!-- Filtro Intervallo Mensile (Mese & Anno) -->
        <div style="display: flex; align-items: center; gap: 8px; background: #ffffff; padding: 4px 10px; border-radius: var(--radius-md); border: 1px solid var(--border-color);">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color: var(--text-muted);">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
            <line x1="16" y1="2" x2="16" y2="6"></line>
            <line x1="8" y1="2" x2="8" y2="6"></line>
            <line x1="3" y1="10" x2="21" y2="10"></line>
          </svg>
          <span style="font-size: 12px; font-weight: 600; color: var(--text-muted);">Mese:</span>
          <select id="archivio-select-mese" class="form-select" style="width: auto; padding: 3px 8px; font-size: 12.5px; height: 30px;">
            <option value="all" ${currentArchivioMese === 'all' ? 'selected' : ''}>Tutti i mesi</option>
            ${MESI_NOMI.map((m) => `<option value="${m.val}" ${currentArchivioMese === m.val ? 'selected' : ''}>${m.label}</option>`).join('')}
          </select>

          <span style="font-size: 12px; font-weight: 600; color: var(--text-muted); margin-left: 4px;">Anno:</span>
          <select id="archivio-select-anno" class="form-select" style="width: auto; padding: 3px 8px; font-size: 12.5px; height: 30px;">
            <option value="all" ${currentArchivioAnno === 'all' ? 'selected' : ''}>Tutti gli anni</option>
            ${availableYears.map((y) => `<option value="${y}" ${currentArchivioAnno === String(y) ? 'selected' : ''}>${y}</option>`).join('')}
          </select>

          ${
            currentArchivioMese !== 'all' || currentArchivioAnno !== 'all'
              ? `
                <button
                  type="button"
                  id="archivio-btn-reset-date"
                  class="btn btn-secondary btn-sm"
                  style="padding: 2px 8px; font-size: 11.5px; height: 26px; margin-left: 2px;"
                  title="Azzera filtri data"
                >
                  Azzera
                </button>
              `
              : ''
          }
        </div>
      </div>

      <div style="display: flex; align-items: center; gap: 8px;">
        <span class="badge badge-counter tabular-nums" style="font-size: 13px; padding: 6px 14px;">
          Totale Archivio: <strong>${totalArchivedCount}</strong>
        </span>
      </div>
    </header>

    <div class="page-container" id="archivio-content">
      <div class="page-header" style="margin-bottom: 18px;">
        <div>
          <h1 class="page-title" style="display: flex; align-items: center; gap: 10px;">
            <span>Archivio Storico Cartellini</span>
            <span class="badge badge-counter tabular-nums">${totalArchivedCount} cartellini</span>
          </h1>
          <p class="page-subtitle">
            ${
              isFilterActive
                ? `Filtri attivi: ${currentArchivioSearch ? `Ricerca "<strong>${escapeHtml(currentArchivioSearch)}</strong>"` : ''} ${currentArchivioMese !== 'all' ? `• Mese: <strong>${MESI_NOMI.find((m) => m.val === currentArchivioMese)?.label}</strong>` : ''} ${currentArchivioAnno !== 'all' ? `• Anno: <strong>${currentArchivioAnno}</strong>` : ''}`
                : 'Seleziona un cliente per visualizzare i cartellini archiviati'
            }
          </p>
        </div>
      </div>

      ${
        clientGroups.length === 0
          ? `
            <div class="empty-state">
              <svg class="empty-state-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
              <div class="empty-state-title">Nessun cartellino trovato</div>
              <p class="empty-state-text">Nessun cartellino archiviato corrisponde ai filtri selezionati.</p>
            </div>
          `
          : `
            <div class="client-groups-list">
              ${clientGroups
                .map((cg) => {
                  const isExpanded = isFilterActive || expandedArchivioClients.has(cg.id);
                  const count = cg.cartellini.length;
                  return `
                    <div class="client-group ${isExpanded ? 'expanded' : ''}" data-client-id="${cg.id}">
                      <div class="client-header" data-action="toggle-client-archivio" data-client-id="${cg.id}">
                        <div class="client-title-wrap">
                          <svg class="client-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="9 18 15 12 9 6"></polyline>
                          </svg>
                          <div class="client-name">${escapeHtml(cg.nome)}</div>
                          <span class="client-badge">
                            ${count === 1 ? '1 cartellino in archivio' : `${count} cartellini in archivio`}
                          </span>
                        </div>
                      </div>

                      ${
                        isExpanded
                          ? `
                            <div style="background-color: #f8fafc; border-top: 1px solid var(--border-color); padding: 12px 16px 16px 16px;">
                              <div class="data-table-card" style="margin: 0; box-shadow: 0 1px 3px rgba(0,0,0,0.05); overflow: hidden; border: 1px solid var(--border-color);">
                                <table class="data-table">
                                  <thead>
                                    <tr>
                                      <th style="width: 100px;">N° Cartellino</th>
                                      <th>Commessa</th>
                                      <th>Descrizione</th>
                                      <th style="width: 110px;">Data</th>
                                      <th style="width: 110px; text-align: right;">Peso Totale</th>
                                      <th style="width: 130px; text-align: center;">Stato</th>
                                      <th style="width: 90px; text-align: center;">Azioni</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    ${cg.cartellini
                                      .map((cart) => {
                                        const dateInfo = getCartellinoDateInfo(cart);
                                        return `
                                          <tr
                                            style="cursor: pointer;"
                                            data-action="open-cartellino-row"
                                            data-cartellino-id="${cart.id}"
                                            title="Clicca per aprire la scheda cartellino"
                                          >
                                            <td style="font-family: var(--font-mono); font-weight: 700; color: var(--primary);">
                                              ${escapeHtml(cart.numero)}
                                            </td>
                                            <td style="font-weight: 600; color: var(--text-primary);">
                                              ${escapeHtml(cart.commessa)}
                                            </td>
                                            <td style="color: var(--text-secondary); max-width: 280px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                                              ${escapeHtml(cart.descrizione || '-')}
                                            </td>
                                            <td class="tabular-nums" style="color: var(--text-secondary); font-size: 12.5px;">
                                              ${escapeHtml(dateInfo.dateFormatted)}
                                            </td>
                                            <td style="text-align: right; font-weight: 600;" class="tabular-nums">
                                              ${cart.peso_totale ? cart.peso_totale.toFixed(2) : '0.00'} kg
                                            </td>
                                            <td style="text-align: center;">
                                              <span class="badge badge-archiviato" style="font-size: 11px;">
                                                Archiviato
                                              </span>
                                            </td>
                                            <td style="text-align: center;">
                                              <button
                                                type="button"
                                                class="btn-icon btn-icon-primary"
                                                data-action="open-cartellino"
                                                data-cartellino-id="${cart.id}"
                                                title="Apri cartellino"
                                                aria-label="Apri cartellino"
                                              >
                                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                                                  <polyline points="15 3 21 3 21 9"></polyline>
                                                  <line x1="10" y1="14" x2="21" y2="3"></line>
                                                </svg>
                                              </button>
                                            </td>
                                          </tr>
                                        `;
                                      })
                                      .join('')}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          `
                          : ''
                      }
                    </div>
                  `;
                })
                .join('')}
            </div>
          `
      }
    </div>
  `;
}

export function initArchivioPage(container, rerender) {
  // Ricerca input
  const searchInput = container.querySelector('#archivio-search-input');
  if (searchInput) {
    let debounceTimer;
    searchInput.addEventListener('input', (e) => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        currentArchivioSearch = e.target.value;
        rerender();
      }, 250);
    });
  }

  // Clear search button
  const clearSearchBtn = container.querySelector('#archivio-btn-clear-search');
  if (clearSearchBtn) {
    clearSearchBtn.addEventListener('click', () => {
      currentArchivioSearch = '';
      rerender();
    });
  }

  // Selettore Mese
  const selectMese = container.querySelector('#archivio-select-mese');
  if (selectMese) {
    selectMese.addEventListener('change', (e) => {
      currentArchivioMese = e.target.value;
      rerender();
    });
  }

  // Selettore Anno
  const selectAnno = container.querySelector('#archivio-select-anno');
  if (selectAnno) {
    selectAnno.addEventListener('change', (e) => {
      currentArchivioAnno = e.target.value;
      rerender();
    });
  }

  // Reset Date Button
  const resetDateBtn = container.querySelector('#archivio-btn-reset-date');
  if (resetDateBtn) {
    resetDateBtn.addEventListener('click', () => {
      currentArchivioMese = 'all';
      currentArchivioAnno = 'all';
      rerender();
    });
  }

  // Client accordion toggle & Cartellino open actions
  container.addEventListener('click', (e) => {
    // Toggle client accordion
    const headerToggle = e.target.closest('[data-action="toggle-client-archivio"]');
    if (headerToggle) {
      const clientId = headerToggle.getAttribute('data-client-id');
      if (expandedArchivioClients.has(clientId)) {
        expandedArchivioClients.delete(clientId);
      } else {
        expandedArchivioClients.add(clientId);
      }
      rerender();
      return;
    }

    // Open Cartellino from button
    const openBtn = e.target.closest('[data-action="open-cartellino"]');
    if (openBtn) {
      e.stopPropagation();
      const cartId = openBtn.getAttribute('data-cartellino-id');
      if (cartId) {
        router.navigate(`#cartellino/${cartId}`);
      }
      return;
    }

    // Open Cartellino from table row
    const openRow = e.target.closest('[data-action="open-cartellino-row"]');
    if (openRow) {
      const cartId = openRow.getAttribute('data-cartellino-id');
      if (cartId) {
        router.navigate(`#cartellino/${cartId}`);
      }
    }
  });
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
