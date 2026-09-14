/**
 * Dipendenti Page for Gestionale Ore
 * Lists employees and users, supports search, addition, editing, and deletion.
 * Accessible strictly to ADMIN users.
 */

import { api } from '../api.js';
import { state } from '../state.js';
import { openModal, closeModal } from '../components/modal.js';
import { showToast } from '../components/toast.js';

let currentDipendentiSearch = '';

export async function renderDipendentiPage() {
  const users = await api.getUsers({ search: currentDipendentiSearch });

  return `
    <header class="app-topbar">
      <div style="font-size: 16px; font-weight: 700; color: var(--text-primary);">
        Gestione Dipendenti e Utenti
      </div>
      <div>
        <button type="button" class="btn btn-primary" id="btn-new-dipendente">
          Nuovo dipendente
        </button>
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
              id="dipendenti-search-input"
              class="search-input"
              placeholder="Cerca dipendente per nickname o ruolo..."
              value="${escapeHtml(currentDipendentiSearch)}"
            />
          </div>
          <span class="badge badge-counter tabular-nums">${users.length} utenti</span>
        </div>

        ${
          users.length === 0
            ? `
              <div class="empty-state">
                <p>Nessun dipendente o utente trovato.</p>
              </div>
            `
            : `
              <table class="data-table">
                <thead>
                  <tr>
                    <th style="width: 180px;">Nickname</th>
                    <th style="width: 140px; text-align: center;">Ruolo</th>
                    <th>Permessi & Moduli Visibili</th>
                    <th style="width: 120px; text-align: center;">Stato</th>
                    <th style="width: 100px; text-align: center;">Azioni</th>
                  </tr>
                </thead>
                <tbody>
                  ${users
                    .map((u) => {
                      const roleUpper = (u.ruolo || 'DIPENDENTE').toUpperCase();
                      let roleBadgeClass = 'badge-in-lavorazione';
                      let roleLabel = 'Dipendente';
                      let accessDesc = 'Dashboard, Calendario (ore proprie), Archivio';

                      if (roleUpper === 'ADMIN') {
                        roleBadgeClass = 'badge-completato';
                        roleLabel = 'Admin';
                        accessDesc = 'Accesso completo senza limitazioni';
                      } else if (roleUpper === 'SEGRETERIA') {
                        roleBadgeClass = 'badge-segreteria';
                        roleLabel = 'Segreteria';
                        accessDesc = 'Dashboard, Clienti, Macchine, Archivio, Calendario';
                      }

                      const currentUser = state.getCurrentUser();
                      const isSelf = currentUser && currentUser.id === u.id;
                      const isEliminato = !!u.eliminato;

                      let statusBadge = '';
                      if (isEliminato) {
                        const dateFormatted = u.eliminato_dal
                          ? u.eliminato_dal.split('-').reverse().join('/')
                          : 'domani';
                        statusBadge = `<span class="badge badge-archiviato" style="font-size: 11px;" title="Eliminazione con decorrenza da ${dateFormatted}">Eliminato (dal ${dateFormatted})</span>`;
                      } else if (u.attivo !== false) {
                        statusBadge = `<span class="badge badge-in-lavorazione" style="font-size: 11px;">Attivo</span>`;
                      } else {
                        statusBadge = `<span class="badge badge-archiviato" style="font-size: 11px;">Disattivato</span>`;
                      }

                      return `
                        <tr style="${isEliminato ? 'opacity: 0.75; background: #fafafa;' : ''}">
                          <td style="font-weight: 700; color: var(--text-primary); font-size: 14px;">
                            ${escapeHtml(u.nickname || u.username)}
                            ${isSelf ? '<span style="font-size: 11px; font-weight: 500; color: var(--text-muted); margin-left: 6px;">(Tu)</span>' : ''}
                          </td>
                          <td style="text-align: center;">
                            <span class="badge ${roleBadgeClass}">
                              ${escapeHtml(roleLabel)}
                            </span>
                          </td>
                          <td style="color: var(--text-secondary); font-size: 13px;">
                            ${escapeHtml(accessDesc)}
                          </td>
                          <td style="text-align: center;">
                            ${statusBadge}
                          </td>
                          <td style="text-align: center;">
                            ${
                              u.ruolo === 'ADMIN' || (u.nickname && u.nickname.toUpperCase() === 'ADMIN')
                                ? `<span style="color: var(--text-muted); font-size: 14px;">—</span>`
                                : `
                                  <div style="display: flex; gap: 6px; justify-content: center; align-items: center;">
                                    <button
                                      type="button"
                                      class="btn-icon btn-icon-primary"
                                      data-action="edit-dipendente"
                                      data-dipendente-id="${u.id}"
                                      title="Modifica dipendente (nome, password, ruolo)"
                                    >
                                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                      </svg>
                                    </button>
                                    <button
                                      type="button"
                                      class="btn-icon btn-icon-danger"
                                      data-action="delete-dipendente"
                                      data-dipendente-id="${u.id}"
                                      data-dipendente-nick="${escapeHtml(u.nickname || u.username)}"
                                      title="${isEliminato ? 'Dipendente già eliminato' : 'Elimina dipendente'}"
                                      ${isSelf || isEliminato ? 'disabled style="opacity: 0.35; cursor: not-allowed;"' : ''}
                                    >
                                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <polyline points="3 6 5 6 21 6"></polyline>
                                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                      </svg>
                                    </button>
                                  </div>
                                `
                            }
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

export function initDipendentiPage(container, rerender) {
  const searchInput = container.querySelector('#dipendenti-search-input');
  const btnNew = container.querySelector('#btn-new-dipendente');

  // Search input debounced
  let searchTimer;
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(() => {
        currentDipendentiSearch = e.target.value;
        rerender();
      }, 250);
    });
  }

  // Create new dipendente
  if (btnNew) {
    btnNew.addEventListener('click', () => {
      openDipendenteModal(null, rerender);
    });
  }

  // Row actions
  container.addEventListener('click', async (e) => {
    const editBtn = e.target.closest('[data-action="edit-dipendente"]');
    if (editBtn) {
      const id = editBtn.getAttribute('data-dipendente-id');
      try {
        const dipendente = await api.getUser(id);
        openDipendenteModal(dipendente, rerender);
      } catch (err) {
        showToast(err.message, 'danger');
      }
      return;
    }

    const deleteBtn = e.target.closest('[data-action="delete-dipendente"]');
    if (deleteBtn && !deleteBtn.disabled) {
      const id = deleteBtn.getAttribute('data-dipendente-id');
      const nick = deleteBtn.getAttribute('data-dipendente-nick') || 'questo dipendente';

      openDeleteModal(id, nick, rerender);
    }
  });
}

function openDipendenteModal(dipendente, rerender) {
  const isEdit = !!dipendente;

  const modalHtml = `
    <form id="form-dipendente">
      <div class="form-group">
        <label class="form-label" for="input-dipendente-nickname">Nickname / Nome *</label>
        <input
          type="text"
          id="input-dipendente-nickname"
          class="form-input"
          placeholder="es. ANDREA, GABRIELE, MARINA..."
          value="${escapeHtml(isEdit ? dipendente.nickname || dipendente.username : '')}"
          style="text-transform: uppercase;"
          required
          autofocus
        />
        <div style="font-size: 11.5px; color: var(--text-muted); margin-top: 3px;">
          Identificativo univoco dell’utente per login e registrazione ore.
        </div>
      </div>

      <div class="form-group">
        <label class="form-label" for="input-dipendente-password">
          ${isEdit ? 'Nuova Password (opzionale)' : 'Password Provvisoria *'}
        </label>
        <div style="position: relative; display: flex; align-items: center;">
          <input
            type="password"
            id="input-dipendente-password"
            class="form-input"
            placeholder="${isEdit ? 'Lascia vuoto per non modificare la password' : 'Inserisci password provvisoria...'}"
            value=""
            ${!isEdit ? 'required' : ''}
            autocomplete="new-password"
            style="padding-right: 40px;"
          />
          <button
            type="button"
            id="btn-toggle-password-visibility"
            class="btn-icon"
            style="position: absolute; right: 6px; top: 50%; transform: translateY(-50%); width: 28px; height: 28px; border: none; background: transparent; color: var(--text-muted);"
            title="Mostra/Nascondi password"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
              <circle cx="12" cy="12" r="3"></circle>
            </svg>
          </button>
        </div>
        <div style="font-size: 11.5px; color: var(--text-muted); margin-top: 3px;">
          ${isEdit ? 'Compila solo per impostare una nuova password.' : 'Password provvisoria da comunicare al dipendente per il primo accesso.'}
        </div>
      </div>

      <div class="form-group">
        <label class="form-label" for="select-dipendente-ruolo">Ruolo *</label>
        <select id="select-dipendente-ruolo" class="form-select" required>
          <option value="DIPENDENTE" ${isEdit && (dipendente.ruolo || '').toUpperCase() === 'DIPENDENTE' ? 'selected' : ''}>DIPENDENTE (Dashboard, Calendario, Archivio)</option>
          <option value="SEGRETERIA" ${isEdit && (dipendente.ruolo || '').toUpperCase() === 'SEGRETERIA' ? 'selected' : ''}>SEGRETERIA (Dashboard, Clienti, Macchine, Archivio, Calendario)</option>
          <option value="ADMIN" ${isEdit && (dipendente.ruolo || '').toUpperCase() === 'ADMIN' ? 'selected' : ''}>ADMIN (Accesso Completo)</option>
        </select>
      </div>

      <div class="form-group" style="margin-top: 14px;">
        <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; font-size: 13.5px; font-weight: 500;">
          <input
            type="checkbox"
            id="check-dipendente-attivo"
            ${!isEdit || dipendente.attivo !== false ? 'checked' : ''}
          />
          <span>Utente attivo (consente l'accesso e la registrazione ore)</span>
        </label>
      </div>
    </form>
  `;

  const footerHtml = `
    <button type="button" class="btn btn-secondary" id="btn-modal-cancel">Annulla</button>
    <button type="button" class="btn btn-primary" id="btn-modal-save">
      ${isEdit ? 'Salva modifiche' : 'Crea dipendente'}
    </button>
  `;

  openModal({
    title: isEdit ? `Modifica Dipendente: ${dipendente.nickname || dipendente.username}` : 'Nuovo Dipendente',
    contentHtml: modalHtml,
    footerButtonsHtml: footerHtml,
    onOpen: (overlay) => {
      const cancelBtn = overlay.querySelector('#btn-modal-cancel');
      const saveBtn = overlay.querySelector('#btn-modal-save');
      const nickInput = overlay.querySelector('#input-dipendente-nickname');
      const pwdInput = overlay.querySelector('#input-dipendente-password');
      const togglePwdBtn = overlay.querySelector('#btn-toggle-password-visibility');
      const roleSelect = overlay.querySelector('#select-dipendente-ruolo');
      const attivoCheck = overlay.querySelector('#check-dipendente-attivo');

      if (togglePwdBtn && pwdInput) {
        togglePwdBtn.addEventListener('click', () => {
          const isPass = pwdInput.getAttribute('type') === 'password';
          pwdInput.setAttribute('type', isPass ? 'text' : 'password');
        });
      }

      cancelBtn.addEventListener('click', closeModal);

      saveBtn.addEventListener('click', async () => {
        const nickname = (nickInput.value || '').trim().toUpperCase();
        const password = (pwdInput.value || '').trim();
        const ruolo = roleSelect.value;
        const attivo = attivoCheck.checked;

        if (!nickname) {
          showToast('Inserisci il nickname / nome del dipendente.', 'warning');
          nickInput.focus();
          return;
        }

        if (!isEdit && !password) {
          showToast('Inserisci la password provvisoria.', 'warning');
          pwdInput.focus();
          return;
        }

        try {
          saveBtn.disabled = true;
          if (isEdit) {
            await api.updateDipendente(dipendente.id, {
              nickname,
              password: password || undefined,
              ruolo,
              attivo,
            });
            showToast(`Dipendente "${nickname}" aggiornato con successo.`, 'success');
          } else {
            await api.createDipendente({
              nickname,
              password,
              ruolo,
              attivo,
            });
            showToast(`Nuovo dipendente "${nickname}" creato con successo.`, 'success');
          }
          closeModal();
          rerender();
        } catch (err) {
          showToast(err.message || 'Errore durante il salvataggio del dipendente', 'danger');
          saveBtn.disabled = false;
        }
      });
    },
  });
}

function openDeleteModal(id, nick, rerender) {
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const tomorrowFormatted = tomorrow.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' });

  const bodyHtml = `
    <div style="font-size: 14px; color: var(--text-secondary); line-height: 1.6;">
      <p style="margin: 0 0 12px 0;">
        Sei sicuro di voler eliminare il dipendente <strong>${escapeHtml(nick)}</strong>?
      </p>
      
      <div style="padding: 12px 14px; background: #fefce8; border: 1px solid #fef08a; border-radius: var(--radius-md); font-size: 13px; color: #854d0e; line-height: 1.5;">
        <div style="font-weight: 700; margin-bottom: 4px; display: flex; align-items: center; gap: 6px;">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
          Effetto dal giorno successivo (${tomorrowFormatted})
        </div>
        <div>
          L'eliminazione avrà effetto a partire da domani.
        </div>
        <div style="margin-top: 6px; font-weight: 600; color: #713f12;">
          ✓ Tutti i dati storici sui cartellini e sul calendario ore vengono mantenuti fino ad oggi e NON verranno cancellati.
        </div>
      </div>
    </div>
  `;

  const footerHtml = `
    <button type="button" class="btn btn-secondary" id="btn-delete-cancel">Annulla</button>
    <button type="button" class="btn btn-danger" id="btn-delete-confirm">Elimina dipendente</button>
  `;

  openModal({
    title: 'Conferma Eliminazione Dipendente',
    contentHtml: bodyHtml,
    footerButtonsHtml: footerHtml,
    onOpen: (overlay) => {
      const cancelBtn = overlay.querySelector('#btn-delete-cancel');
      const confirmBtn = overlay.querySelector('#btn-delete-confirm');
      const currentUser = state.getCurrentUser();

      cancelBtn.addEventListener('click', closeModal);

      confirmBtn.addEventListener('click', async () => {
        try {
          confirmBtn.disabled = true;
          const res = await api.deleteDipendente(id, currentUser ? currentUser.id : null);
          showToast(`Dipendente "${nick}" eliminato. I dati storici rimangono conservati.`, 'info');
          closeModal();
          rerender();
        } catch (err) {
          showToast(err.message || 'Errore durante l’eliminazione', 'danger');
          confirmBtn.disabled = false;
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
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
