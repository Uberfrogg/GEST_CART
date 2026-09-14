/**
 * Cartellino Righe Operative Component
 * Handles the operative rows table (OPER vs MACCH), deletion, and modal to add a new row with 0.5h validation.
 */

import { api } from '../../api.js';
import { state } from '../../state.js';
import { openModal, closeModal } from '../modal.js';
import { showToast } from '../toast.js';
import { formatDate } from '../../utils/date.js';
import { escapeHtml } from '../../utils/dom.js';

export function renderCartellinoRighe(cartellino, dipendentiMap, macchineMap, canManageHours) {
  return `
    <div class="data-table-card" style="margin-bottom: 24px;">
      <div class="table-toolbar">
        <div>
          <h2 style="font-size: 16px; font-weight: 700; color: var(--text-primary); margin: 0;">
            Righe Operative (Storico Lavoro)
          </h2>
          <div style="font-size: 12px; color: var(--text-muted); margin-top: 2px;">
            Distinzione esplicita per riga: <strong>OPER</strong> (personale dipendente) e <strong>MACCH</strong> (tempo macchina).
          </div>
        </div>
        ${
          canManageHours
            ? `
              <button type="button" class="btn btn-primary btn-sm" id="btn-add-riga">
                <span>Aggiungi attività</span>
              </button>
            `
            : ''
        }
      </div>

      ${
        cartellino.righe.length === 0
          ? `
            <div class="empty-state" style="padding: 32px 16px;">
              <p>Nessuna riga operativa registrata per questo cartellino.</p>
            </div>
          `
          : `
            <table class="data-table">
              <thead>
                <tr>
                  <th style="width: 110px;">Tipo</th>
                  <th style="width: 120px;">Data</th>
                  <th>Operatore / Macchina</th>
                  <th style="width: 100px; text-align: right;">Ore</th>
                  <th>Note / Descrizione</th>
                  ${canManageHours ? `<th style="width: 70px; text-align: center;">Azioni</th>` : ''}
                </tr>
              </thead>
              <tbody>
                ${cartellino.righe
                  .map((r) => {
                    const isOper = r.kind === 'OPER';
                    const refName = isOper
                      ? dipendentiMap.get(r.ref_id) || 'Dipendente sconosciuto'
                      : macchineMap.get(r.ref_id) || 'Macchina sconosciuta';
                    return `
                      <tr>
                        <td>
                          <span class="badge ${isOper ? 'badge-in-lavorazione' : 'badge-archiviato'}" style="${!isOper ? 'background-color: #f3e8ff; color: #6b21a8; border-color: #d8b4fe;' : ''}">
                            ${r.kind}
                          </span>
                        </td>
                        <td class="tabular-nums" style="font-weight: 500;">
                          ${escapeHtml(formatDate(r.data_lavoro))}
                        </td>
                        <td style="font-weight: 600;">
                          ${escapeHtml(refName)}
                        </td>
                        <td style="text-align: right; font-weight: 700;" class="tabular-nums">
                          ${parseFloat(r.ore).toFixed(1)} h
                        </td>
                        <td style="color: var(--text-secondary);">
                          ${escapeHtml(r.nota || '-')}
                        </td>
                        ${
                          canManageHours
                            ? `
                              <td style="text-align: center;">
                                <button type="button" class="btn-icon" data-action="delete-riga" data-riga-id="${r.id}" title="Elimina riga">
                                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <polyline points="3 6 5 6 21 6"></polyline>
                                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                  </svg>
                                </button>
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
    </div>
  `;
}

export function initCartellinoRighe(container, cartellinoId, rerender) {
  // Delete riga handler
  container.addEventListener('click', async (e) => {
    const deleteRigaBtn = e.target.closest('[data-action="delete-riga"]');
    if (deleteRigaBtn) {
      const rigaId = deleteRigaBtn.getAttribute('data-riga-id');
      if (confirm('Rimuovere questa riga operativa?')) {
        try {
          await api.deleteRigaOperativa(rigaId);
          showToast('Riga operativa rimossa', 'info');
          rerender();
        } catch (err) {
          alert(err.message || 'Errore');
        }
      }
    }
  });

  // + Aggiungi attività (Riga Operativa)
  const addRigaBtn = container.querySelector('#btn-add-riga');
  if (addRigaBtn) {
    addRigaBtn.addEventListener('click', async () => {
      const [dipendenti, macchine] = await Promise.all([
        api.getDipendenti({ onlyActive: true }),
        api.getMacchine({ onlyActive: true }),
      ]);

      const todayStr = new Date().toISOString().slice(0, 10);

      const modalHtml = `
        <form id="form-new-riga">
          <div class="form-group">
            <label class="form-label">Tipo di Attività *</label>
            <div style="display: flex; gap: 16px;">
              <label style="display: flex; align-items: center; gap: 6px; font-weight: 600; cursor: pointer;">
                <input type="radio" name="riga-kind" value="OPER" checked />
                <span>OPER (Dipendente / Operatore)</span>
              </label>
              <label style="display: flex; align-items: center; gap: 6px; font-weight: 600; cursor: pointer;">
                <input type="radio" name="riga-kind" value="MACCH" />
                <span>MACCH (Macchina)</span>
              </label>
            </div>
            <div style="font-size: 11.5px; color: var(--text-muted); margin-top: 2px;">
              Le ore OPER confluiscono nel calendario del dipendente; le ore MACCH non confluiscono in nessun calendario personale.
            </div>
          </div>

          <div class="form-group" id="group-ref-oper">
            <label class="form-label" for="select-ref-oper">Dipendente *</label>
            ${
              state.isAdmin()
                ? `
                  <select id="select-ref-oper" class="form-select">
                    ${dipendenti
                      .map((d) => `<option value="${d.id}" ${state.getCurrentUser() && d.id === state.getCurrentUser().id ? 'selected' : ''}>${escapeHtml(d.nickname || d.username || d.nome)}</option>`)
                      .join('')}
                  </select>
                `
                : `
                  <div style="font-weight: 700; color: var(--text-primary); padding: 8px 12px; background: #f8fafc; border-radius: var(--radius-md); border: 1px solid var(--border-color); font-size: 13.5px;">
                    ${escapeHtml(state.getCurrentUser() ? state.getCurrentUser().nickname || state.getCurrentUser().username : 'Utente Corrente')}
                  </div>
                  <input type="hidden" id="select-ref-oper" value="${state.getCurrentUser() ? state.getCurrentUser().id : ''}" />
                `
            }
          </div>

          <div class="form-group" id="group-ref-macch" style="display: none;">
            <label class="form-label" for="select-ref-macch">Macchina *</label>
            <select id="select-ref-macch" class="form-select">
              ${macchine
                .filter((m) => m.attiva)
                .map((m) => `<option value="${m.id}">${escapeHtml(m.nome)} (${m.codice})</option>`)
                .join('')}
            </select>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px;">
            <div class="form-group">
              <label class="form-label" for="input-riga-data">Data Lavoro *</label>
              <input type="date" id="input-riga-data" class="form-input" value="${todayStr}" required />
            </div>

            <div class="form-group">
              <label class="form-label" for="input-riga-ore">Ore (passo 0,5h) *</label>
              <input
                type="number"
                id="input-riga-ore"
                class="form-input"
                value="4.0"
                step="0.5"
                min="0.5"
                required
              />
            </div>
          </div>

          <div class="form-group">
            <label class="form-label" for="input-riga-nota">Nota / Descrizione Attività</label>
            <input
              type="text"
              id="input-riga-nota"
              class="form-input"
              placeholder="es. Sgrossatura, filettatura M8, pulizia banco..."
            />
          </div>
        </form>
      `;

      const footerHtml = `
        <button type="button" class="btn btn-secondary" id="modal-cancel-riga">Annulla</button>
        <button type="button" class="btn btn-primary" id="modal-save-riga">Salva attività</button>
      `;

      openModal({
        title: 'Aggiungi Attività Operativa',
        contentHtml: modalHtml,
        footerButtonsHtml: footerHtml,
        onOpen: (overlay) => {
          const kindRadios = overlay.querySelectorAll('input[name="riga-kind"]');
          const groupOper = overlay.querySelector('#group-ref-oper');
          const groupMacch = overlay.querySelector('#group-ref-macch');
          const cancelBtn = overlay.querySelector('#modal-cancel-riga');
          const saveBtn = overlay.querySelector('#modal-save-riga');

          kindRadios.forEach((r) => {
            r.addEventListener('change', (e) => {
              if (e.target.value === 'OPER') {
                groupOper.style.display = 'block';
                groupMacch.style.display = 'none';
              } else {
                groupOper.style.display = 'none';
                groupMacch.style.display = 'block';
              }
            });
          });

          cancelBtn.addEventListener('click', closeModal);

          saveBtn.addEventListener('click', async () => {
            const kind = overlay.querySelector('input[name="riga-kind"]:checked').value;
            const refId =
              kind === 'OPER'
                ? overlay.querySelector('#select-ref-oper').value
                : overlay.querySelector('#select-ref-macch').value;
            const dataLavoro = overlay.querySelector('#input-riga-data').value;
            const ore = parseFloat(overlay.querySelector('#input-riga-ore').value);
            const nota = overlay.querySelector('#input-riga-nota').value.trim();

            if (!dataLavoro) {
              alert('Inserisci la data.');
              return;
            }
            if (isNaN(ore) || ore <= 0 || (ore * 2) % 1 !== 0) {
              alert('Le ore devono essere in incrementi di 0,5 (es. 0.5, 1.0, 1.5).');
              return;
            }

            try {
              await api.addRigaOperativa({
                cartellino_id: cartellinoId,
                kind,
                ref_id: refId,
                data_lavoro: dataLavoro,
                ore,
                nota,
              });

              closeModal();
              showToast('Attività registrata con successo!', 'success');
              rerender();
            } catch (err) {
              alert(err.message || 'Errore');
            }
          });
        },
      });
    });
  }
}
