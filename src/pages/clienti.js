/**
 * Clienti Page for Gestionale Ore
 * Lists clients, provides local search, creation and editing.
 * (No global search or "+ Nuovo cartellino" here, as per navigation rule).
 */

import { api } from '../api.js';
import { openModal, closeModal } from '../components/modal.js';
import { showToast } from '../components/toast.js';

let currentClientSearch = '';

export async function renderClientiPage() {
  const clients = await api.getClienti({ search: currentClientSearch });

  return `
    <header class="app-topbar">
      <div style="font-size: 16px; font-weight: 700; color: var(--text-primary);">
        Anagrafica Clienti
      </div>
      <div>
        <button type="button" class="btn btn-primary" id="btn-new-cliente">Nuovo cliente</button>
      </div>
    </header>

    <div class="page-container">
      <div class="data-table-card">
        <div class="table-toolbar">
          <div class="search-container" style="max-width: 380px;">
            <svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
            <input
              type="text"
              id="client-search-input"
              class="search-input"
              placeholder="Cerca cliente per nome o P.IVA..."
              value="${escapeHtml(currentClientSearch)}"
            />
          </div>
          <span class="badge badge-counter tabular-nums">${clients.length} clienti</span>
        </div>

        ${
          clients.length === 0
            ? `
              <div class="empty-state">
                <p>Nessun cliente trovato.</p>
              </div>
            `
            : `
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Nome Cliente</th>
                    <th>P. IVA</th>
                    <th>Indirizzo e Sede</th>
                    <th style="width: 140px; text-align: center;">Cartellini Attivi</th>
                    <th style="width: 100px; text-align: center;">Azioni</th>
                  </tr>
                </thead>
                <tbody>
                  ${clients
                    .map((c) => {
                      const indirizzo = [c.via, c.cap, c.citta].filter(Boolean).join(', ');
                      return `
                        <tr>
                          <td style="font-weight: 700; color: var(--text-primary);">
                            ${escapeHtml(c.nome)}
                          </td>
                          <td class="tabular-nums" style="color: var(--text-secondary);">
                            ${escapeHtml(c.piva || '-')}
                          </td>
                          <td style="color: var(--text-secondary);">
                            ${escapeHtml(indirizzo || '-')}
                          </td>
                          <td style="text-align: center;">
                            <span class="badge ${c.cartellini_attivi_count > 0 ? 'badge-in-lavorazione' : 'badge-archiviato'} tabular-nums">
                              ${c.cartellini_attivi_count} attivi
                            </span>
                          </td>
                          <td style="text-align: center;">
                            <div style="display: flex; gap: 6px; justify-content: center; align-items: center;">
                              <button
                                type="button"
                                class="btn-icon btn-icon-primary"
                                data-action="edit-client"
                                data-client-id="${c.id}"
                                title="Modifica cliente"
                              >
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                </svg>
                              </button>
                              <button
                                type="button"
                                class="btn-icon btn-icon-danger"
                                data-action="delete-client"
                                data-client-id="${c.id}"
                                data-client-name="${escapeHtml(c.nome)}"
                                data-cartellini-count="${c.cartellini_attivi_count || 0}"
                                title="Elimina cliente"
                              >
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                  <polyline points="3 6 5 6 21 6"></polyline>
                                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                </svg>
                              </button>
                            </div>
                          </td>
                        </tr>
                      `;
                    })
                    .join('')}
                </tbody>
              </table>
            `
        }
      </div>
    </div>
  `;
}

export function initClientiPage(container, rerender) {
  const searchInput = container.querySelector('#client-search-input');
  if (searchInput) {
    let debounceTimer;
    searchInput.addEventListener('input', (e) => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        currentClientSearch = e.target.value;
        rerender();
      }, 250);
    });
  }

  // + Nuovo cliente
  const newClientBtn = container.querySelector('#btn-new-cliente');
  if (newClientBtn) {
    newClientBtn.addEventListener('click', () => {
      openClientModal({
        title: 'Nuovo Cliente',
        onSave: async (formData) => {
          await api.createCliente(formData);
          showToast('Cliente creato con successo!', 'success');
          rerender();
        },
      });
    });
  }

  // Edit & Delete client
  container.addEventListener('click', async (e) => {
    const editBtn = e.target.closest('[data-action="edit-client"]');
    if (editBtn) {
      const clientId = editBtn.getAttribute('data-client-id');
      const [allClients, allCartellini] = await Promise.all([
        api.getClienti(),
        api.getCartelliniByCliente(clientId),
      ]);
      const cli = allClients.find((c) => c.id === clientId);
      if (cli) {
        openClientModal({
          title: `Modifica Cliente ${cli.nome}`,
          initialData: cli,
          associatedCartellini: allCartellini,
          onSave: async (formData) => {
            await api.updateCliente(clientId, formData);
            showToast('Cliente aggiornato!', 'success');
            rerender();
          },
        });
      }
      return;
    }

    const deleteBtn = e.target.closest('[data-action="delete-client"]');
    if (deleteBtn) {
      const clientId = deleteBtn.getAttribute('data-client-id');
      const clientName = deleteBtn.getAttribute('data-client-name') || 'questo cliente';
      const cartelliniCount = parseInt(deleteBtn.getAttribute('data-cartellini-count'), 10) || 0;

      openDeleteClientModal({
        clientName,
        cartelliniCount,
        onConfirm: async () => {
          try {
            await api.deleteCliente(clientId);
            showToast(`Cliente "${clientName}" eliminato. I cartellini e i dati storici sono stati conservati.`, 'info');
            rerender();
          } catch (err) {
            showToast(err.message || 'Errore durante l\'eliminazione del cliente', 'danger');
          }
        },
      });
    }
  });
}

function openDeleteClientModal({ clientName, cartelliniCount, onConfirm }) {
  const hasCartellini = cartelliniCount > 0;
  const contentHtml = `
    <div style="display: flex; flex-direction: column; gap: 12px;">
      <p style="margin: 0; font-size: 14px; color: var(--text-primary);">
        Sei sicuro di voler eliminare il cliente <strong>${escapeHtml(clientName)}</strong>?
      </p>
      <div style="padding: 10px 12px; background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 6px; font-size: 12.5px; color: #166534; line-height: 1.4;">
        <strong>Conservazione dati storici:</strong> il cliente verrà rimosso dall'elenco clienti e non sarà più selezionabile per nuovi cartellini.
        ${
          hasCartellini
            ? `<br />Tutti i <strong>${cartelliniCount}</strong> cartellin${cartelliniCount === 1 ? 'o' : 'i'} e le ore registrate fino ad oggi rimangono <strong>completamente conservati e consultabili</strong>.`
            : ''
        }
      </div>
    </div>
  `;

  const footerButtonsHtml = `
    <button type="button" class="btn btn-secondary" id="modal-cancel-delete-cli">Annulla</button>
    <button type="button" class="btn btn-danger" id="modal-confirm-delete-cli">Elimina cliente</button>
  `;

  openModal({
    title: 'Conferma eliminazione cliente',
    contentHtml,
    footerButtonsHtml,
    onOpen: (overlay) => {
      const cancelBtn = overlay.querySelector('#modal-cancel-delete-cli');
      const confirmBtn = overlay.querySelector('#modal-confirm-delete-cli');

      cancelBtn.addEventListener('click', closeModal);
      confirmBtn.addEventListener('click', async () => {
        confirmBtn.disabled = true;
        confirmBtn.textContent = 'Eliminazione...';
        closeModal();
        await onConfirm();
      });
    },
  });
}

function openClientModal({ title, initialData = null, onSave, associatedCartellini = [] }) {
  const modalHtml = `
    <form id="form-cliente">
      <div class="form-group">
        <label class="form-label" for="cli-nome">Nome / Ragione Sociale *</label>
        <input
          type="text"
          id="cli-nome"
          class="form-input"
          placeholder="CLIENTE S.R.L."
          value="${escapeHtml(initialData?.nome || '')}"
          required
        />
      </div>

      <div class="form-group">
        <label class="form-label" for="cli-piva">Partita IVA / Codice Fiscale</label>
        <input
          type="text"
          id="cli-piva"
          class="form-input"
          placeholder="01234567890"
          value="${escapeHtml(initialData?.piva || '')}"
        />
      </div>

      <div class="form-group">
        <label class="form-label" for="cli-via">Indirizzo (Via / Piazza)</label>
        <input
          type="text"
          id="cli-via"
          class="form-input"
          placeholder="Via Roma 1"
          value="${escapeHtml(initialData?.via || '')}"
        />
      </div>

      <div style="display: grid; grid-template-columns: 1fr 2fr; gap: 14px;">
        <div class="form-group">
          <label class="form-label" for="cli-cap">CAP</label>
          <input
            type="text"
            id="cli-cap"
            class="form-input"
            placeholder="20121"
            value="${escapeHtml(initialData?.cap || '')}"
          />
        </div>
        <div class="form-group">
          <label class="form-label" for="cli-citta">Città</label>
          <input
            type="text"
            id="cli-citta"
            class="form-input"
            placeholder="Milano"
            value="${escapeHtml(initialData?.citta || '')}"
          />
        </div>
      </div>

      ${
        initialData && associatedCartellini.length > 0
          ? `
            <div style="margin-top: 20px; border-top: 1px solid var(--border-color); padding-top: 16px;">
              <div style="font-size: 13px; font-weight: 700; color: var(--text-primary); margin-bottom: 8px;">
                Cartellini Associati (${associatedCartellini.length})
              </div>
              <div style="max-height: 150px; overflow-y: auto; border: 1px solid var(--border-color); border-radius: var(--radius-md);">
                <table style="width: 100%; font-size: 12px;">
                  <thead style="background: #f8fafc; border-bottom: 1px solid var(--border-color);">
                    <tr>
                      <th style="padding: 6px 10px; text-align: left;">N°</th>
                      <th style="padding: 6px 10px; text-align: left;">Commessa</th>
                      <th style="padding: 6px 10px; text-align: center;">Stato</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${associatedCartellini
                      .map(
                        (ac) => `
                      <tr style="border-bottom: 1px solid #f1f5f9;">
                        <td style="padding: 6px 10px; font-family: var(--font-mono); font-weight: 600; color: var(--primary);">${escapeHtml(ac.numero)}</td>
                        <td style="padding: 6px 10px;">${escapeHtml(ac.commessa)}</td>
                        <td style="padding: 6px 10px; text-align: center;">
                          <span class="badge ${ac.stato === 'completato' ? 'badge-completato' : ac.stato === 'archiviato' ? 'badge-archiviato' : 'badge-in-lavorazione'}" style="font-size: 10.5px; padding: 2px 6px;">
                            ${escapeHtml(ac.stato)}
                          </span>
                        </td>
                      </tr>
                    `
                      )
                      .join('')}
                  </tbody>
                </table>
              </div>
            </div>
          `
          : ''
      }
    </form>
  `;

  const footerHtml = `
    <button type="button" class="btn btn-secondary" id="modal-cancel-cli">Annulla</button>
    <button type="button" class="btn btn-primary" id="modal-save-cli">Salva cliente</button>
  `;

  openModal({
    title,
    contentHtml: modalHtml,
    footerButtonsHtml: footerHtml,
    onOpen: (overlay) => {
      const cancelBtn = overlay.querySelector('#modal-cancel-cli');
      const saveBtn = overlay.querySelector('#modal-save-cli');

      cancelBtn.addEventListener('click', closeModal);

      saveBtn.addEventListener('click', async () => {
        const nome = overlay.querySelector('#cli-nome').value.trim();
        if (!nome) {
          alert('Inserisci il nome del cliente.');
          return;
        }

        const data = {
          nome,
          piva: overlay.querySelector('#cli-piva').value.trim(),
          via: overlay.querySelector('#cli-via').value.trim(),
          cap: overlay.querySelector('#cli-cap').value.trim(),
          citta: overlay.querySelector('#cli-citta').value.trim(),
        };

        try {
          await onSave(data);
          closeModal();
        } catch (err) {
          alert(err.message || 'Errore');
        }
      });
    },
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
