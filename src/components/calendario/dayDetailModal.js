/**
 * Day Detail and Edit Row Modals for Calendario
 * Displays all OPER entries for the selected day and employee with edit and delete operations.
 */

import { api } from '../../api.js';
import { state } from '../../state.js';
import { openModal, closeModal } from '../modal.js';
import { showToast } from '../toast.js';
import { formatDate } from '../../utils/date.js';
import { escapeHtml } from '../../utils/dom.js';
import { openNuovaAttivitaModal } from './nuovaAttivitaModal.js';

export async function showDayDetailModal({ dateStr, selectedDipendenteId, onUpdated = () => {} }) {
  const dettaglio = await api.getDettaglioGiornata(selectedDipendenteId, dateStr);

  const isSaturdayDate = new Date(dateStr + 'T00:00:00').getDay() === 6;
  const dayOvertime = dettaglio.totale_ore > 0
    ? (isSaturdayDate ? dettaglio.totale_ore : (dettaglio.totale_ore > 8 ? +(dettaglio.totale_ore - 8).toFixed(1) : 0))
    : 0;

  const currentUser = state.getCurrentUser();
  const isMarina = state.isSegreteria() || (currentUser && (currentUser.nickname || currentUser.username || '').toUpperCase() === 'MARINA');
  const canModifyDayRows = !isMarina && (state.isAdmin() || (state.isDipendente() && (!selectedDipendenteId || currentUser?.id === selectedDipendenteId)));

  const modalHtml = `
    <div>
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px;">
        <div style="font-size: 13.5px; color: var(--text-muted);">
          Dettaglio attività registrate per la data: <strong style="color: var(--text-primary);">${formatDate(dateStr)}</strong>
        </div>
        ${
          canModifyDayRows
            ? `
              <button type="button" class="btn btn-secondary btn-sm" id="btn-add-activity-for-day">
                Aggiungi per questo giorno
              </button>
            `
            : ''
        }
      </div>

      ${
        dettaglio.righe.length === 0
          ? `
            <div class="empty-state" style="padding: 24px 0;">
              <p>Nessuna riga operativa (OPER) registrata per questa giornata.</p>
            </div>
          `
          : `
            <table class="data-table">
              <thead>
                <tr>
                  <th style="width: 100px;">Cartellino</th>
                  <th>Cliente</th>
                  <th>Commessa</th>
                  <th style="width: 90px; text-align: right;">Ore</th>
                  <th>Note</th>
                  ${canModifyDayRows ? '<th style="width: 85px; text-align: center;">Azioni</th>' : ''}
                </tr>
              </thead>
              <tbody>
                ${dettaglio.righe
                  .map((r) => {
                    let noteContent = '';
                    const isPermesso = r.tipo_assenza === 'PERMESSO';
                    const isFerie = r.tipo_assenza === 'FERIE';
                    const rawNota = (r.nota || '').trim();

                    if (isPermesso) {
                      const badge = `<span style="background-color: #dcfce7; color: #15803d; border: 1px solid #86efac; padding: 2px 6px; border-radius: 4px; font-weight: 700; font-size: 11px; display: inline-block;">PERMESSO</span>`;
                      if (!rawNota || rawNota.toUpperCase() === 'PERMESSO' || rawNota === '-') {
                        noteContent = badge;
                      } else {
                        noteContent = `${badge} <span style="margin-left: 6px;">${escapeHtml(rawNota)}</span>`;
                      }
                    } else if (isFerie) {
                      const badge = `<span style="background-color: #fee2e2; color: #b91c1c; border: 1px solid #fca5a5; padding: 2px 6px; border-radius: 4px; font-weight: 700; font-size: 11px; display: inline-block;">FERIE</span>`;
                      if (!rawNota || rawNota.toUpperCase() === 'FERIE' || rawNota === '-') {
                        noteContent = badge;
                      } else {
                        noteContent = `${badge} <span style="margin-left: 6px;">${escapeHtml(rawNota)}</span>`;
                      }
                    } else {
                      noteContent = escapeHtml(rawNota || '-');
                    }

                    return `
                      <tr>
                        <td style="font-family: var(--font-mono); font-weight: 700; color: var(--primary);">
                          ${escapeHtml(r.cartellino_numero)}
                        </td>
                        <td style="font-weight: 600;">
                          ${escapeHtml(r.cliente_nome)}
                        </td>
                        <td>${escapeHtml(r.commessa)}</td>
                        <td style="text-align: right; font-weight: 700;" class="tabular-nums">
                          ${parseFloat(r.ore).toFixed(1)} h
                        </td>
                        <td style="color: var(--text-secondary); font-size: 12.5px;">
                          ${noteContent}
                        </td>
                        ${
                          canModifyDayRows
                            ? `
                              <td style="text-align: center; white-space: nowrap;">
                                <div style="display: flex; gap: 6px; justify-content: center; align-items: center;">
                                  <button
                                    type="button"
                                    class="btn-icon btn-icon-primary"
                                    data-action="edit-day-riga"
                                    data-riga-id="${r.riga_id}"
                                    title="Modifica riga"
                                  >
                                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                    </svg>
                                  </button>
                                  <button
                                    type="button"
                                    class="btn-icon btn-icon-danger"
                                    data-action="delete-day-riga"
                                    data-riga-id="${r.riga_id}"
                                    title="Elimina riga"
                                  >
                                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                      <polyline points="3 6 5 6 21 6"></polyline>
                                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                    </svg>
                                  </button>
                                </div>
                              </td>
                            `
                            : ''
                        }
                      </tr>
                    `;
                  })
                  .join('')}
              </tbody>
            </table>
          `
      }

      <div style="display: flex; justify-content: flex-end; align-items: center; gap: 12px; margin-top: 18px; padding-top: 14px; border-top: 1px solid var(--border-color); flex-wrap: wrap;">
        <div style="font-size: 15px; font-weight: 700; color: var(--text-primary);">
          Totale Lavoro: <span style="color: var(--primary);" class="tabular-nums">${dettaglio.totale_ore.toFixed(1)} h</span>
        </div>
        ${
          (dettaglio.totale_permessi || 0) > 0
            ? `
              <div style="display: inline-flex; align-items: center; background-color: #dcfce7; color: #15803d; font-weight: 700; font-size: 13px; padding: 3px 8px; border-radius: 4px; border: 1px solid #86efac;" class="tabular-nums">
                Permessi: ${dettaglio.totale_permessi.toFixed(1)} h
              </div>
            `
            : ''
        }
        ${
          (dettaglio.totale_ferie || 0) > 0
            ? `
              <div style="display: inline-flex; align-items: center; background-color: #fee2e2; color: #b91c1c; font-weight: 700; font-size: 13px; padding: 3px 8px; border-radius: 4px; border: 1px solid #fca5a5;" class="tabular-nums">
                Ferie: ${dettaglio.totale_ferie.toFixed(1)} h
              </div>
            `
            : ''
        }
        ${
          dayOvertime > 0
            ? `
              <div style="display: inline-flex; align-items: center; background-color: #fef9c3; color: #854d0e; font-weight: 700; font-size: 13px; padding: 3px 8px; border-radius: 4px; border: 1px solid #fde047;" class="tabular-nums">
                Straordinario${isSaturdayDate ? ' (Sabato 100%)' : ''}: ${dayOvertime.toFixed(1)} h
              </div>
            `
            : ''
        }
      </div>
    </div>
  `;

  const footerHtml = `
    <button type="button" class="btn btn-secondary" id="modal-close-day">Chiudi</button>
  `;

  openModal({
    title: `Dettaglio Giornata — ${formatDate(dateStr)}`,
    contentHtml: modalHtml,
    footerButtonsHtml: footerHtml,
    onOpen: (overlay) => {
      overlay.querySelector('#modal-close-day').addEventListener('click', closeModal);

      const addForDayBtn = overlay.querySelector('#btn-add-activity-for-day');
      if (addForDayBtn) {
        addForDayBtn.addEventListener('click', () => {
          closeModal();
          openNuovaAttivitaModal({
            defaultDate: dateStr,
            defaultDipendenteId: selectedDipendenteId,
            onSaved: () => {
              onUpdated();
              showDayDetailModal({ dateStr, selectedDipendenteId, onUpdated });
            },
          });
        });
      }

      if (canModifyDayRows) {
        overlay.addEventListener('click', async (evt) => {
          const editBtn = evt.target.closest('[data-action="edit-day-riga"]');
          if (editBtn) {
            const rigaId = editBtn.getAttribute('data-riga-id');
            const rigaObj = dettaglio.righe.find((r) => r.riga_id === rigaId);
            if (rigaObj) {
              closeModal();
              openModificaRigaModal({
                riga: rigaObj,
                onSaved: () => {
                  onUpdated();
                  showDayDetailModal({ dateStr, selectedDipendenteId, onUpdated });
                },
                onCancel: () => {
                  showDayDetailModal({ dateStr, selectedDipendenteId, onUpdated });
                },
              });
            }
            return;
          }

          const deleteBtn = evt.target.closest('[data-action="delete-day-riga"]');
          if (deleteBtn) {
            const rigaId = deleteBtn.getAttribute('data-riga-id');
            if (confirm('Sei sicuro di voler eliminare questa riga di attività?')) {
              try {
                await api.deleteRigaOperativa(rigaId);
                showToast('Attività eliminata con successo', 'success');
                onUpdated();
                closeModal();
                showDayDetailModal({ dateStr, selectedDipendenteId, onUpdated });
              } catch (err) {
                alert(err.message || 'Errore durante l’eliminazione');
              }
            }
          }
        });
      }
    },
  });
}

export function openModificaRigaModal({ riga, onSaved = () => {}, onCancel = () => {} }) {
  const currentTipo = riga.tipo_assenza || '';
  const currentOre = riga.ore || 0;
  const currentNota = (riga.nota || '').trim();
  const initialNota = currentNota && currentNota.toUpperCase() !== currentTipo.toUpperCase() ? currentNota : '';

  const modalHtml = `
    <form id="form-cal-modifica-attivita" onsubmit="return false;" style="display: flex; flex-direction: column; gap: 14px;">
      <div style="font-size: 13.5px; color: var(--text-muted); margin-bottom: 2px;">
        Modifica riga: <strong style="color: var(--text-primary);">${escapeHtml(riga.cartellino_numero && riga.cartellino_numero !== '-' ? `Cartellino ${riga.cartellino_numero} (${riga.cliente_nome})` : (riga.nota || currentTipo || 'Attività generica'))}</strong>
      </div>

      <div class="form-group">
        <label class="form-label" for="cal-edit-riga-ore">Ore (passo 0,5h) *</label>
        <input
          type="number"
          id="cal-edit-riga-ore"
          class="form-input"
          value="${currentOre}"
          step="0.5"
          min="0.5"
          max="24"
          required
        />
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px;">
        <div class="form-group">
          <label class="form-label" for="cal-edit-riga-nota">Nota / Descrizione Attività</label>
          <input
            type="text"
            id="cal-edit-riga-nota"
            class="form-input"
            value="${escapeHtml(initialNota)}"
            placeholder="es. Manutenzione, visita medica..."
          />
        </div>

        <div class="form-group">
          <label class="form-label" for="cal-edit-riga-tipo">Tipologia</label>
          <select id="cal-edit-riga-tipo" class="form-select">
            <option value="" ${!currentTipo ? 'selected' : ''}>Lavoro Ordinario</option>
            <option value="PERMESSO" ${currentTipo === 'PERMESSO' ? 'selected' : ''}>PERMESSO</option>
            <option value="FERIE" ${currentTipo === 'FERIE' ? 'selected' : ''}>FERIE</option>
          </select>
        </div>
      </div>
    </form>
  `;

  const footerHtml = `
    <button type="button" class="btn btn-secondary" id="cal-edit-cancel">Annulla</button>
    <button type="button" class="btn btn-primary" id="cal-edit-save">Salva modifiche</button>
  `;

  openModal({
    title: 'Modifica Attività',
    contentHtml: modalHtml,
    footerButtonsHtml: footerHtml,
    onOpen: (overlay) => {
      overlay.querySelector('#cal-edit-cancel').addEventListener('click', () => {
        closeModal();
        if (onCancel) onCancel();
      });

      overlay.querySelector('#cal-edit-save').addEventListener('click', async () => {
        const ore = parseFloat(overlay.querySelector('#cal-edit-riga-ore').value);
        const nota = overlay.querySelector('#cal-edit-riga-nota').value.trim();
        const tipoAssenza = overlay.querySelector('#cal-edit-riga-tipo').value;

        if (isNaN(ore) || ore <= 0 || (ore * 2) % 1 !== 0) {
          alert('Le ore devono essere in incrementi di 0,5 (es. 0.5, 1.0, 1.5).');
          return;
        }

        try {
          await api.updateRigaOperativa(riga.riga_id, {
            ore,
            nota,
            tipo_assenza: tipoAssenza,
          });
          closeModal();
          showToast('Attività aggiornata con successo!', 'success');
          onSaved();
        } catch (err) {
          alert(err.message || 'Errore durante la modifica dell’attività');
        }
      });
    },
  });
}
