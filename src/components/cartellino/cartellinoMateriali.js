/**
 * Cartellino Materiali Component
 * Handles bill of materials list, real-time volume/weight calculation, and material addition/deletion.
 */

import { api } from '../../api.js';
import { openModal, closeModal } from '../modal.js';
import { showToast } from '../toast.js';
import { MATERIAL_DENSITIES, calculateTotalWeightKg } from '../../utils/materials.js';
import { escapeHtml } from '../../utils/dom.js';

export function renderCartellinoMateriali(cartellino) {
  return `
    <div class="data-table-card">
      <div class="table-toolbar">
        <div>
          <h2 style="font-size: 16px; font-weight: 700; color: var(--text-primary); margin: 0;">
            Materiali Pezzi e Calcolo Pesi
          </h2>
          <div style="font-size: 12px; color: var(--text-muted); margin-top: 2px;">
            Formula: Volume = (X × Y × Z) / 1.000.000.000 m³ — Peso = Volume × Densità.
          </div>
        </div>
        <button type="button" class="btn btn-secondary btn-sm" id="btn-add-materiale">
          <span>Aggiungi materiale</span>
        </button>
      </div>

      ${
        cartellino.materiali.length === 0
          ? `
            <div class="empty-state" style="padding: 32px 16px;">
              <p>Nessun materiale specificato per questo cartellino.</p>
            </div>
          `
          : `
            <table class="data-table">
              <thead>
                <tr>
                  <th>Materiale</th>
                  <th style="width: 80px; text-align: right;">Q.tà</th>
                  <th style="width: 180px; text-align: right;">Dimensioni X × Y × Z (mm)</th>
                  <th style="width: 140px; text-align: right;">Densità (kg/m³)</th>
                  <th style="width: 130px; text-align: right;">Peso Totale</th>
                  <th style="width: 70px; text-align: center;">Azioni</th>
                </tr>
              </thead>
              <tbody>
                ${cartellino.materiali
                  .map((m) => {
                    return `
                      <tr>
                        <td style="font-weight: 600;">
                          ${escapeHtml(m.nome)}
                        </td>
                        <td style="text-align: right;" class="tabular-nums">
                          ${m.qty}
                        </td>
                        <td style="text-align: right;" class="tabular-nums">
                          ${m.x_mm} × ${m.y_mm} × ${m.z_mm} mm
                        </td>
                        <td style="text-align: right; color: var(--text-muted);" class="tabular-nums">
                          ${m.densita} kg/m³
                        </td>
                        <td style="text-align: right; font-weight: 700; color: #059669;" class="tabular-nums">
                          ${m.peso_kg.toFixed(2)} kg
                        </td>
                        <td style="text-align: center;">
                          <button type="button" class="btn-icon" data-action="delete-materiale" data-mat-id="${m.id}" title="Elimina materiale">
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                              <polyline points="3 6 5 6 21 6"></polyline>
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                            </svg>
                          </button>
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

    <!-- Firme solo per stampa cartacea -->
    <div class="print-only" style="margin-top: 40px; page-break-inside: avoid;">
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 48px;">
        <div style="border-top: 1.5px solid #0f172a; padding-top: 8px; text-align: center;">
          <div style="font-size: 9.5pt; font-weight: 600; color: #334155;">Firma Operatore / Esecutore</div>
        </div>
        <div style="border-top: 1.5px solid #0f172a; padding-top: 8px; text-align: center;">
          <div style="font-size: 9.5pt; font-weight: 600; color: #334155;">Firma Controllo Qualità / Consegna</div>
        </div>
      </div>
    </div>
  `;
}

export function initCartellinoMateriali(container, cartellinoId, rerender) {
  // Delete materiale handler
  container.addEventListener('click', async (e) => {
    const deleteMatBtn = e.target.closest('[data-action="delete-materiale"]');
    if (deleteMatBtn) {
      const matId = deleteMatBtn.getAttribute('data-mat-id');
      if (confirm('Rimuovere questo materiale?')) {
        try {
          await api.deleteMaterialeCartellino(matId);
          showToast('Materiale rimosso', 'info');
          rerender();
        } catch (err) {
          alert(err.message || 'Errore');
        }
      }
    }
  });

  // + Aggiungi materiale
  const addMaterialeBtn = container.querySelector('#btn-add-materiale');
  if (addMaterialeBtn) {
    addMaterialeBtn.addEventListener('click', async () => {
      const materialOptions = Object.keys(MATERIAL_DENSITIES)
        .map((name) => `<option value="${name}">${name} (${MATERIAL_DENSITIES[name]} kg/m³)</option>`)
        .join('');

      const modalHtml = `
        <form id="form-new-mat">
          <div class="form-group">
            <label class="form-label" for="mat-select-type">Materiale *</label>
            <select id="mat-select-type" class="form-select">
              ${materialOptions}
            </select>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px;">
            <div class="form-group">
              <label class="form-label" for="mat-input-qty">Quantità Pezzi *</label>
              <input type="number" id="mat-input-qty" class="form-input" value="1" min="1" step="1" required />
            </div>

            <div class="form-group">
              <label class="form-label" for="mat-input-x">Dimensione X (mm) *</label>
              <input type="number" id="mat-input-x" class="form-input" value="100" min="0.1" step="0.1" required />
            </div>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px;">
            <div class="form-group">
              <label class="form-label" for="mat-input-y">Dimensione Y (mm) *</label>
              <input type="number" id="mat-input-y" class="form-input" value="100" min="0.1" step="0.1" required />
            </div>

            <div class="form-group">
              <label class="form-label" for="mat-input-z">Dimensione Z (mm) *</label>
              <input type="number" id="mat-input-z" class="form-input" value="50" min="0.1" step="0.1" required />
            </div>
          </div>

          <div style="background-color: #f1f5f9; padding: 12px 16px; border-radius: var(--radius-md); margin-top: 8px;">
            <div style="font-size: 12px; color: var(--text-muted); text-transform: uppercase; font-weight: 600;">Anteprima Calcolo Peso</div>
            <div style="font-size: 18px; font-weight: 700; color: #059669; margin-top: 2px;" id="preview-peso-calc">
              0.00 kg
            </div>
          </div>
        </form>
      `;

      const footerHtml = `
        <button type="button" class="btn btn-secondary" id="modal-cancel-mat">Annulla</button>
        <button type="button" class="btn btn-primary" id="modal-save-mat">Aggiungi materiale</button>
      `;

      openModal({
        title: 'Aggiungi Materiale al Cartellino',
        contentHtml: modalHtml,
        footerButtonsHtml: footerHtml,
        onOpen: (overlay) => {
          const typeSelect = overlay.querySelector('#mat-select-type');
          const qtyInput = overlay.querySelector('#mat-input-qty');
          const xInput = overlay.querySelector('#mat-input-x');
          const yInput = overlay.querySelector('#mat-input-y');
          const zInput = overlay.querySelector('#mat-input-z');
          const previewEl = overlay.querySelector('#preview-peso-calc');

          function updatePreview() {
            const matName = typeSelect.value;
            const density = MATERIAL_DENSITIES[matName] || 2700;
            const qty = parseFloat(qtyInput.value) || 1;
            const x = parseFloat(xInput.value) || 0;
            const y = parseFloat(yInput.value) || 0;
            const z = parseFloat(zInput.value) || 0;

            const totalKg = calculateTotalWeightKg(qty, x, y, z, density);
            previewEl.textContent = `${totalKg.toFixed(2)} kg`;
          }

          [typeSelect, qtyInput, xInput, yInput, zInput].forEach((el) => {
            el.addEventListener('input', updatePreview);
            el.addEventListener('change', updatePreview);
          });
          updatePreview();

          const cancelBtn = overlay.querySelector('#modal-cancel-mat');
          const saveBtn = overlay.querySelector('#modal-save-mat');

          cancelBtn.addEventListener('click', closeModal);

          saveBtn.addEventListener('click', async () => {
            const matName = typeSelect.value;
            const qty = parseFloat(qtyInput.value) || 1;
            const x = parseFloat(xInput.value) || 0;
            const y = parseFloat(yInput.value) || 0;
            const z = parseFloat(zInput.value) || 0;

            if (x <= 0 || y <= 0 || z <= 0) {
              alert('Le dimensioni X, Y, Z devono essere maggiori di 0.');
              return;
            }

            try {
              await api.addMaterialeCartellino({
                cartellino_id: cartellinoId,
                materiale_nome: matName,
                qty,
                x_mm: x,
                y_mm: y,
                z_mm: z,
              });

              closeModal();
              showToast('Materiale aggiunto al cartellino', 'success');
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
