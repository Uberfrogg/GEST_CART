/**
 * Dashboard Page for Gestionale Ore
 * Central operational dashboard matching specifications & screenshots:
 * - Single Global Search (client, cartellino #, commessa, text)
 * - Exclusive "+ Nuovo cartellino" button
 * - Grouped by client with expandable active cartellini
 * - Direct navigation to cartellino detail
 */

import { api } from '../api.js';
import { state } from '../state.js';
import { router } from '../router.js';
import { openModal, closeModal } from '../components/modal.js';
import { showToast } from '../components/toast.js';
import { fileToThumbnail } from '../utils/image.js';

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
      // If client was soft deleted, still group cartellini under the client's actual name
      const cliName = cart.cliente ? cart.cliente.nome : 'Cliente';
      clientMap.set(cart.cliente_id, {
        id: cart.cliente_id,
        nome: cliName,
        cartellini: [cart],
      });
    }
  }

  // Filter out clients with 0 cartellini if searching or filtering by status, or keep all active client groups
  let clientGroups = Array.from(clientMap.values());
  if (currentSearch.trim() || (!isDipendente && currentStatusFilter !== 'all')) {
    clientGroups = clientGroups.filter((cg) => cg.cartellini.length > 0);
  } else {
    // Sort so clients with active cartellini appear first
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
              <!-- Filtri rapidi stato -->
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

      ${
        clientGroups.length === 0
          ? `
            <div class="empty-state">
              <svg class="empty-state-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
              <div class="empty-state-title">Nessun cartellino trovato</div>
              <p class="empty-state-text">Nessun cartellino attivo corrisponde ai criteri di ricerca "${escapeHtml(currentSearch)}".</p>
            </div>
          `
          : `
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
                                  : cg.cartellini
                                      .map((cart) => {
                                        return `
                                          <div class="cartellino-card" data-cartellino-id="${cart.id}">
                                            <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 12px;">
                                              <div style="flex: 1; min-width: 0;">
                                                <span class="cartellino-number">${escapeHtml(cart.numero)}</span>
                                                <div class="cartellino-commessa" style="margin-top: 4px;">${escapeHtml(cart.commessa)}</div>
                                                <div class="cartellino-desc" style="margin-top: 6px;">${escapeHtml(cart.descrizione || 'Nessuna descrizione specificata')}</div>
                                              </div>
                                              <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 8px; flex-shrink: 0;">
                                                <span class="badge ${cart.stato === 'completato' ? 'badge-completato' : cart.stato === 'archiviato' ? 'badge-archiviato' : 'badge-in-lavorazione'}">${escapeHtml(cart.stato === 'completato' ? 'Completato' : cart.stato === 'archiviato' ? 'Archiviato' : 'In Lavorazione')}</span>
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
                                      })
                                      .join('')
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
          `
      }
    </div>
  `;
}

export function initDashboardPage(container, rerender) {
  // Search input handler
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
      // place cursor at end
      searchInput.setSelectionRange(currentSearch.length, currentSearch.length);
    }
  }

  if (clearSearchBtn) {
    clearSearchBtn.addEventListener('click', () => {
      currentSearch = '';
      rerender();
    });
  }

  // Status filter buttons handler
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

  // Client accordion toggle
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

    // Card click -> navigate to cartellino
    const cartCard = e.target.closest('.cartellino-card');
    if (cartCard) {
      const cartId = cartCard.getAttribute('data-cartellino-id');
      if (cartId) {
        router.navigate(`#cartellino/${cartId}`);
      }
      return;
    }
  });

  // + Nuovo cartellino button
  if (newCartellinoBtn) {
    newCartellinoBtn.addEventListener('click', async () => {
      const clientsList = await api.getClienti({ onlyActive: true });

      const modalContent = `
        <form id="new-cartellino-form">
          <div class="form-group">
            <label class="form-label" for="nc-cliente">Cliente *</label>
            <select id="nc-cliente" class="form-select" required>
              <option value="">-- Seleziona un cliente --</option>
              ${clientsList
                .filter((c) => c.attivo)
                .map((c) => `<option value="${c.id}">${escapeHtml(c.nome)}</option>`)
                .join('')}
            </select>
          </div>

          <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 14px;">
            <div class="form-group">
              <label class="form-label" for="nc-commessa">Commessa / Riferimento *</label>
              <input
                type="text"
                id="nc-commessa"
                class="form-input"
                placeholder="es. Commessa A, Progetto X, Flangia 02"
                required
              />
            </div>
            <div class="form-group">
              <label class="form-label" for="nc-quantita">Quantità Pezzi *</label>
              <input
                type="number"
                id="nc-quantita"
                class="form-input tabular-nums"
                min="1"
                step="1"
                value="1"
                required
              />
            </div>
          </div>

          <div class="form-group">
            <label class="form-label" for="nc-descrizione">Descrizione Lavorazione</label>
            <textarea
              id="nc-descrizione"
              class="form-textarea"
              rows="3"
              placeholder="Dettaglio della lavorazione richiesta..."
            ></textarea>
          </div>

          <div class="form-group">
            <label class="form-label" for="nc-note">Note Aggiuntive</label>
            <input
              type="text"
              id="nc-note"
              class="form-input"
              placeholder="Note tecniche, tolleranze, finiture..."
            />
          </div>

          <div class="form-group">
            <label class="form-label" id="nc-foto-label">Foto del Pezzo (miniatura)</label>
            <div
              id="nc-dropzone"
              style="border: 2px dashed var(--border-color); border-radius: var(--radius-md); padding: 16px; background-color: #f8fafc; cursor: pointer; transition: all 0.2s ease;"
            >
              <input
                type="file"
                id="nc-foto-input"
                accept="image/*"
                style="display: none;"
              />
              <div id="nc-foto-empty-view" style="display: flex; flex-direction: column; align-items: center; text-align: center; gap: 6px;">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" style="color: var(--text-muted);">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                  <circle cx="8.5" cy="8.5" r="1.5"></circle>
                  <polyline points="21 15 16 10 5 21"></polyline>
                </svg>
                <div style="font-size: 13px; font-weight: 600; color: var(--text-primary);">
                  Carica miniatura foto pezzo
                </div>
                <div style="font-size: 11.5px; color: var(--text-muted);">
                  Trascina qui l'immagine o clicca per selezionarla (PNG, JPG, WEBP)
                </div>
              </div>

              <div id="nc-foto-preview-view" style="display: none; align-items: center; justify-content: space-between; gap: 12px;">
                <div style="display: flex; align-items: center; gap: 12px;">
                  <img
                    id="nc-preview-img"
                    src=""
                    alt="Anteprima pezzo"
                    style="width: 80px; height: 45px; aspect-ratio: 16 / 9; object-fit: cover; border-radius: 6px; border: 1px solid var(--border-color); background: #ffffff; box-shadow: 0 1px 2px rgba(0,0,0,0.05);"
                  />
                  <div>
                    <div id="nc-preview-filename" style="font-size: 13px; font-weight: 600; color: var(--text-primary);">foto_pezzo.jpg</div>
                    <div style="font-size: 11.5px; color: #16a34a; font-weight: 500;">Miniatura pronta per il cartellino</div>
                  </div>
                </div>
                <button
                  type="button"
                  id="btn-remove-nc-foto"
                  class="btn btn-secondary btn-sm"
                  style="font-size: 11px; padding: 4px 8px; color: #dc2626;"
                >
                  Rimuovi
                </button>
              </div>
            </div>
          </div>
        </form>
      `;

      const footerButtons = `
        <button type="button" class="btn btn-secondary" id="modal-cancel-btn">Annulla</button>
        <button type="button" class="btn btn-primary" id="modal-save-btn">Crea cartellino</button>
      `;

      const modalOverlay = openModal({
        title: 'Nuovo Cartellino di Lavorazione',
        contentHtml: modalContent,
        footerButtonsHtml: footerButtons,
        onOpen: (overlay) => {
          const cancelBtn = overlay.querySelector('#modal-cancel-btn');
          const saveBtn = overlay.querySelector('#modal-save-btn');
          const dropzone = overlay.querySelector('#nc-dropzone');
          const fileInput = overlay.querySelector('#nc-foto-input');
          const emptyView = overlay.querySelector('#nc-foto-empty-view');
          const previewView = overlay.querySelector('#nc-foto-preview-view');
          const previewImg = overlay.querySelector('#nc-preview-img');
          const previewName = overlay.querySelector('#nc-preview-filename');
          const removeFotoBtn = overlay.querySelector('#btn-remove-nc-foto');

          let uploadedFoto = null;

          const handleFileSelect = async (file) => {
            if (!file) return;
            if (!file.type.startsWith('image/')) {
              alert('Seleziona un file immagine valido (PNG, JPG, WEBP).');
              return;
            }
            try {
              const thumbnailDataUrl = await fileToThumbnail(file, 400, 400);
              uploadedFoto = thumbnailDataUrl;
              previewImg.src = thumbnailDataUrl;
              previewName.textContent = file.name || 'foto_pezzo.jpg';
              emptyView.style.display = 'none';
              previewView.style.display = 'flex';
            } catch (err) {
              alert(err.message || 'Errore durante la creazione della miniatura.');
            }
          };

          // Trigger file picker on dropzone click (except when clicking remove button)
          dropzone.addEventListener('click', (e) => {
            if (e.target.closest('#btn-remove-nc-foto')) return;
            fileInput.click();
          });

          fileInput.addEventListener('change', (e) => {
            const file = e.target.files && e.target.files[0];
            if (file) {
              handleFileSelect(file);
            }
          });

          // Drag and drop handlers
          dropzone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropzone.style.borderColor = 'var(--primary)';
            dropzone.style.backgroundColor = '#eff6ff';
          });

          dropzone.addEventListener('dragleave', (e) => {
            e.preventDefault();
            dropzone.style.borderColor = 'var(--border-color)';
            dropzone.style.backgroundColor = '#f8fafc';
          });

          dropzone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropzone.style.borderColor = 'var(--border-color)';
            dropzone.style.backgroundColor = '#f8fafc';
            const file = e.dataTransfer.files && e.dataTransfer.files[0];
            if (file) {
              handleFileSelect(file);
            }
          });

          removeFotoBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            uploadedFoto = null;
            fileInput.value = '';
            previewImg.src = '';
            emptyView.style.display = 'flex';
            previewView.style.display = 'none';
          });

          cancelBtn.addEventListener('click', closeModal);

          saveBtn.addEventListener('click', async () => {
            const clienteId = overlay.querySelector('#nc-cliente').value;
            const commessa = overlay.querySelector('#nc-commessa').value.trim();
            const quantita = overlay.querySelector('#nc-quantita').value;
            const descrizione = overlay.querySelector('#nc-descrizione').value.trim();
            const note = overlay.querySelector('#nc-note').value.trim();

            if (!clienteId) {
              alert('Seleziona un cliente.');
              return;
            }
            if (!commessa) {
              alert('Inserisci la commessa.');
              return;
            }

            try {
              const newCart = await api.createCartellino({
                cliente_id: clienteId,
                commessa,
                quantita,
                descrizione,
                note,
                foto_pezzo: uploadedFoto,
              });

              closeModal();
              showToast(`Cartellino ${newCart.numero} creato con successo!`, 'success');
              const currentIds = state.getExpandedClientIds();
              currentIds.add(clienteId);
              state.setExpandedClientIds(currentIds);
              rerender();
            } catch (err) {
              alert(err.message || 'Errore durante la creazione del cartellino');
            }
          });
        },
      });
    });
  }
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
