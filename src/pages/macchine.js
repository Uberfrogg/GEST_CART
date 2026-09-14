/**
 * Macchine Page for Gestionale Ore
 * Lists machines, supports search, addition, editing.
 */

import { api } from '../api.js';
import { openModal, closeModal } from '../components/modal.js';
import { showToast } from '../components/toast.js';

let currentMachineSearch = '';

export async function renderMacchinePage() {
  const machines = await api.getMacchine({ search: currentMachineSearch });

  return `
    <header class="app-topbar">
      <div style="font-size: 16px; font-weight: 700; color: var(--text-primary);">
        Parco Macchine
      </div>
      <div>
        <button type="button" class="btn btn-primary" id="btn-new-macchina">Nuova macchina</button>
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
              id="machine-search-input"
              class="search-input"
              placeholder="Cerca macchina per nome o codice..."
              value="${escapeHtml(currentMachineSearch)}"
            />
          </div>
          <span class="badge badge-counter tabular-nums">${machines.length} macchine</span>
        </div>

        ${
          machines.length === 0
            ? `
              <div class="empty-state">
                <p>Nessuna macchina trovata.</p>
              </div>
            `
            : `
              <table class="data-table">
                <thead>
                  <tr>
                    <th style="width: 120px;">Codice</th>
                    <th>Nome Macchina</th>
                    <th style="width: 140px; text-align: center;">Stato</th>
                    <th style="width: 100px; text-align: center;">Azioni</th>
                  </tr>
                </thead>
                <tbody>
                  ${machines
                    .map((m) => {
                      return `
                        <tr>
                          <td style="font-family: var(--font-mono); font-weight: 600;">
                            ${escapeHtml(m.codice)}
                          </td>
                          <td style="font-weight: 700; color: var(--text-primary);">
                            ${escapeHtml(m.nome)}
                          </td>
                          <td style="text-align: center;">
                            <span class="badge ${m.attiva ? 'badge-completato' : 'badge-archiviato'}">
                              ${m.attiva ? 'Attiva' : 'Disattivata'}
                            </span>
                          </td>
                          <td style="text-align: center;">
                            <div style="display: flex; gap: 6px; justify-content: center; align-items: center;">
                              <button
                                type="button"
                                class="btn-icon btn-icon-primary"
                                data-action="edit-machine"
                                data-machine-id="${m.id}"
                                title="Modifica macchina"
                              >
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                </svg>
                              </button>
                              <button
                                type="button"
                                class="btn-icon btn-icon-danger"
                                data-action="delete-machine"
                                data-machine-id="${m.id}"
                                data-machine-name="${escapeHtml(m.nome)}"
                                title="Elimina macchina"
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

export function initMacchinePage(container, rerender) {
  const searchInput = container.querySelector('#machine-search-input');
  if (searchInput) {
    let debounceTimer;
    searchInput.addEventListener('input', (e) => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        currentMachineSearch = e.target.value;
        rerender();
      }, 250);
    });
  }

  const newMachineBtn = container.querySelector('#btn-new-macchina');
  if (newMachineBtn) {
    newMachineBtn.addEventListener('click', () => {
      openMachineModal({
        title: 'Nuova Macchina',
        onSave: async (formData) => {
          await api.createMacchina(formData);
          showToast('Macchina aggiunta con successo!', 'success');
          rerender();
        },
      });
    });
  }

  container.addEventListener('click', async (e) => {
    const editBtn = e.target.closest('[data-action="edit-machine"]');
    if (editBtn) {
      const machineId = editBtn.getAttribute('data-machine-id');
      const allMachines = await api.getMacchine();
      const m = allMachines.find((item) => item.id === machineId);
      if (m) {
        openMachineModal({
          title: `Modifica Macchina ${m.nome}`,
          initialData: m,
          onSave: async (formData) => {
            await api.updateMacchina(machineId, formData);
            showToast('Macchina aggiornata!', 'success');
            rerender();
          },
        });
      }
      return;
    }

    const deleteBtn = e.target.closest('[data-action="delete-machine"]');
    if (deleteBtn) {
      const machineId = deleteBtn.getAttribute('data-machine-id');
      const machineName = deleteBtn.getAttribute('data-machine-name') || 'questa macchina';

      openDeleteMachineModal({
        machineName,
        onConfirm: async () => {
          try {
            await api.deleteMacchina(machineId);
            showToast(`Macchina "${machineName}" eliminata. Tutti i dati storici sono stati conservati.`, 'info');
            rerender();
          } catch (err) {
            showToast(err.message || 'Errore durante l\'eliminazione della macchina', 'danger');
          }
        },
      });
    }
  });
}

function openDeleteMachineModal({ machineName, onConfirm }) {
  const contentHtml = `
    <div style="display: flex; flex-direction: column; gap: 12px;">
      <p style="margin: 0; font-size: 14px; color: var(--text-primary);">
        Sei sicuro di voler eliminare la macchina <strong>${escapeHtml(machineName)}</strong>?
      </p>
      <div style="padding: 10px 12px; background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 6px; font-size: 12.5px; color: #166534; line-height: 1.4;">
        <strong>Conservazione dati storici:</strong> la macchina verrà rimossa dall'elenco macchine e non sarà più selezionabile per nuove registrazioni di lavoro.
        <br />Tutti i cartellini, le ore e le registrazioni già salvate con questa macchina fino ad oggi rimangono <strong>completamente conservati e consultabili</strong>.
      </div>
    </div>
  `;

  const footerButtonsHtml = `
    <button type="button" class="btn btn-secondary" id="modal-cancel-delete-mac">Annulla</button>
    <button type="button" class="btn btn-danger" id="modal-confirm-delete-mac">Elimina macchina</button>
  `;

  openModal({
    title: 'Conferma eliminazione macchina',
    contentHtml,
    footerButtonsHtml,
    onOpen: (overlay) => {
      const cancelBtn = overlay.querySelector('#modal-cancel-delete-mac');
      const confirmBtn = overlay.querySelector('#modal-confirm-delete-mac');

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

function openMachineModal({ title, initialData = null, onSave }) {
  const modalHtml = `
    <form id="form-macchina">
      <div class="form-group">
        <label class="form-label" for="mac-codice">Codice Macchina</label>
        <input
          type="text"
          id="mac-codice"
          class="form-input"
          placeholder="CNC-1"
          value="${escapeHtml(initialData?.codice || '')}"
        />
      </div>

      <div class="form-group">
        <label class="form-label" for="mac-nome">Nome Macchina *</label>
        <input
          type="text"
          id="mac-nome"
          class="form-input"
          placeholder="FRESATRICE CNC 3"
          value="${escapeHtml(initialData?.nome || '')}"
          required
        />
      </div>

      <div class="form-group">
        <label style="display: flex; align-items: center; gap: 8px; font-weight: 600; cursor: pointer; margin-top: 8px;">
          <input
            type="checkbox"
            id="mac-attiva"
            ${initialData ? (initialData.attiva ? 'checked' : '') : 'checked'}
          />
          <span>Macchina attiva e operativa</span>
        </label>
      </div>
    </form>
  `;

  const footerHtml = `
    <button type="button" class="btn btn-secondary" id="modal-cancel-mac">Annulla</button>
    <button type="button" class="btn btn-primary" id="modal-save-mac">Salva macchina</button>
  `;

  openModal({
    title,
    contentHtml: modalHtml,
    footerButtonsHtml: footerHtml,
    onOpen: (overlay) => {
      const cancelBtn = overlay.querySelector('#modal-cancel-mac');
      const saveBtn = overlay.querySelector('#modal-save-mac');

      cancelBtn.addEventListener('click', closeModal);

      saveBtn.addEventListener('click', async () => {
        const nome = overlay.querySelector('#mac-nome').value.trim();
        if (!nome) {
          alert('Inserisci il nome della macchina.');
          return;
        }

        const data = {
          codice: overlay.querySelector('#mac-codice').value.trim(),
          nome,
          attiva: overlay.querySelector('#mac-attiva').checked,
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
