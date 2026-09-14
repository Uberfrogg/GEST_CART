/**
 * Cartellino Detail Page for Gestionale Ore
 * Full operative history, OPER/MACCH row distinction, materials calculation, soft-state status.
 */

import { api } from '../api.js';
import { state } from '../state.js';
import { router } from '../router.js';
import { openModal, closeModal } from '../components/modal.js';
import { showToast } from '../components/toast.js';
import {
  MATERIAL_DENSITIES,
  calculateTotalWeightKg,
} from '../utils/materials.js';
import { formatDate } from '../utils/date.js';
import { fileToThumbnail } from '../utils/image.js';
import {
  generateCartellinoPrintHtml,
  openInNewTabAndPrint,
  downloadCartellinoHtml,
} from '../utils/print.js';

let currentCartellinoData = null;
let currentDipendentiMap = new Map();
let currentMacchineMap = new Map();

export async function renderCartellinoPage(cartellinoId) {
  if (!cartellinoId) {
    return `
      <div class="page-container">
        <div class="alert alert-danger">Nessun cartellino selezionato. <a href="#dashboard">Torna alla Dashboard</a></div>
      </div>
    `;
  }

  let cartellino;
  try {
    cartellino = await api.getCartellinoById(cartellinoId);
  } catch (err) {
    return `
      <div class="page-container">
        <div class="alert alert-danger">Errore: ${escapeHtml(err.message)} <a href="#dashboard">Torna alla Dashboard</a></div>
      </div>
    `;
  }

  const [dipendenti, macchine] = await Promise.all([
    api.getDipendenti({ includeDeleted: true }),
    api.getMacchine({ includeDeleted: true }),
  ]);

  const dipendentiMap = new Map(dipendenti.map((d) => [d.id, d.nickname || d.username || d.nome]));
  const macchineMap = new Map(macchine.map((m) => [m.id, m.nome]));
  const canManageHours = state.canManageHours();

  // Cache for instant synchronous access in print handler
  currentCartellinoData = cartellino;
  currentDipendentiMap = dipendentiMap;
  currentMacchineMap = macchineMap;

  const statoBadgeClass = {
    'in-lavorazione': 'badge-in-lavorazione',
    completato: 'badge-completato',
    archiviato: 'badge-archiviato',
  }[cartellino.stato] || 'badge-in-lavorazione';

  const statoLabel = {
    'in-lavorazione': 'In Lavorazione',
    completato: 'Completato',
    archiviato: 'Archiviato',
  }[cartellino.stato] || cartellino.stato;

  return `
    <header class="app-topbar">
      <div style="display: flex; align-items: center; gap: 12px;">
        <button type="button" class="btn btn-secondary btn-sm" id="btn-back-dashboard">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="19" y1="12" x2="5" y2="12"></line>
            <polyline points="12 19 5 12 12 5"></polyline>
          </svg>
          <span>Torna alla lista</span>
        </button>
        <span style="font-size: 15px; font-weight: 700; color: var(--text-primary);">
          Cartellino ${escapeHtml(cartellino.numero)}
        </span>
      </div>

      <div style="display: flex; align-items: center; gap: 8px;">
        <button
          type="button"
          class="btn btn-secondary btn-sm"
          id="btn-print-cartellino"
          title="Stampa scheda cartellino"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="6 9 6 2 18 2 18 9"></polyline>
            <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
            <rect x="6" y="14" width="12" height="8"></rect>
          </svg>
          <span>Stampa</span>
        </button>

        <button
          type="button"
          class="btn-action-completato ${cartellino.stato === 'completato' ? 'is-active' : ''}"
          id="btn-cartellino-completato"
          title="${cartellino.stato === 'completato' ? 'Completato (clicca per rimettere in lavorazione)' : 'Segna come completato'}"
          aria-label="Completato"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
            <polyline points="22 4 12 14.01 9 11.01"></polyline>
          </svg>
        </button>

        <button
          type="button"
          class="btn-action-archivia ${cartellino.stato === 'archiviato' ? 'is-active' : ''}"
          id="btn-cartellino-archivia"
          title="${cartellino.stato === 'archiviato' ? 'Archiviato (clicca per ripristinare in lavorazione)' : 'Archivia cartellino'}"
          aria-label="Archivia"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="21 8 21 21 3 21 3 8"></polyline>
            <rect x="1" y="3" width="22" height="5"></rect>
            <line x1="10" y1="12" x2="14" y2="12"></line>
          </svg>
        </button>
      </div>
    </header>

    <div class="page-container">
      <!-- Intestazione solo per stampa cartacea -->
      <div class="print-only" style="margin-bottom: 20px; border-bottom: 2.5px solid #0f172a; padding-bottom: 12px;">
        <div style="display: flex; justify-content: space-between; align-items: flex-start;">
          <div>
            <div style="font-size: 20pt; font-weight: 800; color: #0f172a; letter-spacing: -0.02em;">G.R. snc</div>
            <div style="font-size: 9.5pt; color: #475569; margin-top: 2px;">Lavorazioni Meccaniche di Precisione &amp; Carpenteria</div>
          </div>
          <div style="text-align: right;">
            <div style="font-size: 16pt; font-weight: 800; color: #0284c7;">CARTELLINO N° ${escapeHtml(cartellino.numero)}</div>
            <div style="font-size: 9pt; color: #64748b; margin-top: 2px;">Stampa del ${new Date().toLocaleDateString('it-IT')}</div>
          </div>
        </div>
      </div>

      <!-- Info Header Card -->
      <div class="data-table-card" style="padding: 20px; margin-bottom: 24px;">
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 20px;">
          <!-- Cartellino Details -->
          <div style="flex: 1; min-width: 240px;">
            <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 6px;">
              <h1 style="font-size: 22px; font-weight: 700; color: var(--text-primary); margin: 0;">
                ${escapeHtml(cartellino.commessa)}
              </h1>
              <span class="badge ${statoBadgeClass}">${statoLabel}</span>
            </div>
            <div style="font-size: 14px; color: var(--text-secondary); margin-bottom: 4px; display: flex; gap: 16px; flex-wrap: wrap;">
              <span>Cliente: <strong>${escapeHtml(cartellino.cliente ? cartellino.cliente.nome : 'N/D')}</strong></span>
              <span>Quantità: <strong>${cartellino.quantita || 1} pz</strong></span>
            </div>
            <div style="font-size: 13.5px; color: var(--text-muted);">
              ${escapeHtml(cartellino.descrizione || 'Nessuna descrizione specificata')}
            </div>
            ${
              cartellino.note
                ? `<div style="font-size: 12.5px; color: var(--text-muted); margin-top: 6px; font-style: italic;">
                    Note: ${escapeHtml(cartellino.note)}
                  </div>`
                : ''
            }
          </div>

          <!-- Miniatura Foto Pezzo (Tra il nome del cartellino e il riepilogo ore: 16:9 - 356x200) -->
          <div class="cartellino-photo-section" style="display: flex; flex-direction: column; align-items: center; gap: 8px; flex-shrink: 0;">
            <div style="font-size: 11px; text-transform: uppercase; color: var(--text-muted); font-weight: 600; letter-spacing: 0.04em;">
              Foto Pezzo (16:9)
            </div>
            ${
              cartellino.foto_pezzo
                ? `
                  <div style="position: relative; display: inline-block; width: 356px; height: 200px; max-width: 100%; aspect-ratio: 16 / 9;">
                    <img
                      id="cartellino-piece-photo"
                      src="${escapeHtml(cartellino.foto_pezzo)}"
                      alt="Miniatura pezzo ${escapeHtml(cartellino.commessa)}"
                      title="Clicca per visualizzare o cambiare la foto (16:9)"
                      style="width: 356px; height: 200px; max-width: 100%; aspect-ratio: 16 / 9; object-fit: cover; border-radius: 8px; border: 1.5px solid var(--border-color); background: #ffffff; cursor: pointer; box-shadow: 0 2px 5px rgba(0,0,0,0.08); transition: transform 0.15s, border-color 0.15s; display: block;"
                    />
                    <button
                      type="button"
                      id="btn-edit-piece-photo"
                      title="Modifica foto pezzo"
                      style="position: absolute; bottom: 8px; right: 8px; background: var(--primary); color: #fff; border: 2px solid #fff; border-radius: 50%; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; cursor: pointer; box-shadow: 0 2px 4px rgba(0,0,0,0.25);"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                        <path d="M12 20h9"></path>
                        <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
                      </svg>
                    </button>
                  </div>
                `
                : `
                  <button
                    type="button"
                    id="btn-upload-piece-photo"
                    class="btn btn-secondary"
                    style="display: flex; flex-direction: column; align-items: center; justify-content: center; width: 356px; height: 200px; max-width: 100%; aspect-ratio: 16 / 9; padding: 16px; border-radius: 8px; border: 2px dashed var(--border-color); background: #f8fafc; cursor: pointer; gap: 8px;"
                    title="Carica foto del pezzo"
                  >
                    <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" style="color: var(--text-muted);">
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                      <circle cx="8.5" cy="8.5" r="1.5"></circle>
                      <polyline points="21 15 16 10 5 21"></polyline>
                    </svg>
                    <span style="font-size: 13px; font-weight: 600; color: var(--text-secondary); text-align: center;">Carica foto</span>
                    <span style="font-size: 11px; color: var(--text-muted); text-align: center;">Trascina o clicca</span>
                  </button>
                `
            }
          </div>

          <!-- Quick Summary Stats (Riepilogo ore e peso sulla destra della miniatura) -->
          <div style="display: flex; flex-direction: column; justify-content: center; gap: 14px; background-color: #f8fafc; padding: 18px 24px; border-radius: var(--radius-md); border: 1px solid var(--border-color); min-width: 280px; flex-shrink: 0;">
            <!-- Ore Operatore e Ore Macchina sulla stessa riga -->
            <div style="display: flex; align-items: center; justify-content: space-between; gap: 24px;">
              <div style="text-align: center; flex: 1;">
                <div style="font-size: 11px; text-transform: uppercase; color: var(--text-muted); font-weight: 600; letter-spacing: 0.03em;">Ore Operatore</div>
                <div style="font-size: 20px; font-weight: 700; color: var(--primary); margin-top: 2px;" class="tabular-nums">
                  ${cartellino.ore_totali_operatore.toFixed(1)} h
                </div>
              </div>
              <div style="width: 1px; height: 38px; background-color: var(--border-color);"></div>
              <div style="text-align: center; flex: 1;">
                <div style="font-size: 11px; text-transform: uppercase; color: var(--text-muted); font-weight: 600; letter-spacing: 0.03em;">Ore Macchina</div>
                <div style="font-size: 20px; font-weight: 700; color: #7c3aed; margin-top: 2px;" class="tabular-nums">
                  ${cartellino.ore_totali_macchina.toFixed(1)} h
                </div>
              </div>
            </div>

            <!-- Separatore sottile -->
            <div style="width: 100%; height: 1px; background-color: var(--border-color);"></div>

            <!-- Peso Totale Pezzi appena sotto e centrato rispetto alle ore operatore e macchina -->
            <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center;">
              <div style="font-size: 11px; text-transform: uppercase; color: var(--text-muted); font-weight: 600; letter-spacing: 0.03em;">Peso Totale Pezzi</div>
              <div style="font-size: 20px; font-weight: 700; color: #059669; margin-top: 2px;" class="tabular-nums">
                ${cartellino.peso_totale.toFixed(2)} kg
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Righe Operative Table -->
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

      <!-- Materiali Section -->
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
    </div>
  `;
}

export function initCartellinoPage(container, cartellinoId, rerender) {
  const backBtn = container.querySelector('#btn-back-dashboard');
  if (backBtn) {
    backBtn.addEventListener('click', () => {
      const targetList = router.getLastListPage ? router.getLastListPage() : 'dashboard';
      router.navigate(`#${targetList}`);
    });
  }

  // Print button
  const printBtn = container.querySelector('#btn-print-cartellino');
  if (printBtn) {
    printBtn.addEventListener('click', async () => {
      // Use cached cartellino or fetch fresh
      let cart = currentCartellinoData;
      let dipsMap = currentDipendentiMap;
      let macchsMap = currentMacchineMap;

      if (!cart || cart.id !== cartellinoId) {
        try {
          const [freshCart, dips, macchs] = await Promise.all([
            api.getCartellinoById(cartellinoId),
            api.getDipendenti({ includeDeleted: true }),
            api.getMacchine({ includeDeleted: true }),
          ]);
          cart = freshCart;
          dipsMap = new Map(dips.map((d) => [d.id, d.nickname || d.username || d.nome]));
          macchsMap = new Map(macchs.map((m) => [m.id, m.nome]));
          currentCartellinoData = cart;
          currentDipendentiMap = dipsMap;
          currentMacchineMap = macchsMap;
        } catch (e) {
          showToast('Errore durante il recupero dei dati del cartellino: ' + e.message, 'danger');
          return;
        }
      }

      // Synchronously open print tab (ensures browser popup permissions are satisfied)
      openInNewTabAndPrint(cart, dipsMap, macchsMap);

      // Open print preview and options modal
      showCartellinoPrintModal(cart, dipsMap, macchsMap);
    });
  }

  // Update Cartellino Stato (Completato e Archivia)
  const btnCompletato = container.querySelector('#btn-cartellino-completato');
  if (btnCompletato) {
    btnCompletato.addEventListener('click', async () => {
      try {
        const cart = await api.getCartellinoById(cartellinoId);
        const nuovoStato = cart.stato === 'completato' ? 'in-lavorazione' : 'completato';
        await api.updateCartellinoStato(cartellinoId, nuovoStato);
        if (nuovoStato === 'completato') {
          showToast('Cartellino contrassegnato come completato!', 'success');
        } else {
          showToast('Cartellino riportato in lavorazione.', 'info');
        }
        rerender();
      } catch (err) {
        showToast(err.message || 'Errore durante aggiornamento stato', 'danger');
      }
    });
  }

  const btnArchivia = container.querySelector('#btn-cartellino-archivia');
  if (btnArchivia) {
    btnArchivia.addEventListener('click', async () => {
      try {
        const cart = await api.getCartellinoById(cartellinoId);
        const nuovoStato = cart.stato === 'archiviato' ? 'in-lavorazione' : 'archiviato';
        await api.updateCartellinoStato(cartellinoId, nuovoStato);
        if (nuovoStato === 'archiviato') {
          showToast('Cartellino archiviato e spostato in archivio!', 'info');
        } else {
          showToast('Cartellino ripristinato in lavorazione.', 'info');
        }
        rerender();
      } catch (err) {
        showToast(err.message || 'Errore durante archiviazione', 'danger');
      }
    });
  }

  // Interactive Photo Management
  const photoTriggers = container.querySelectorAll('#cartellino-piece-photo, #btn-edit-piece-photo, #btn-upload-piece-photo');
  if (photoTriggers.length > 0) {
    const handleOpenPhotoModal = async () => {
      let currentCart;
      try {
        currentCart = await api.getCartellinoById(cartellinoId);
      } catch (e) {
        return;
      }
      const hasPhoto = !!currentCart.foto_pezzo;

      const modalContent = `
        <div style="display: flex; flex-direction: column; gap: 16px;">
          ${
            hasPhoto
              ? `
                <div style="text-align: center; background: #0f172a; padding: 12px; border-radius: var(--radius-md);">
                  <img
                    id="modal-zoom-photo"
                    src="${escapeHtml(currentCart.foto_pezzo)}"
                    alt="Foto pezzo ${escapeHtml(currentCart.commessa)}"
                    style="max-width: 100%; max-height: 280px; object-fit: contain; border-radius: 4px;"
                  />
                </div>
              `
              : ''
          }

          <div class="form-group" style="margin-bottom: 0;">
            <label class="form-label" style="font-weight: 600;">
              ${hasPhoto ? 'Sostituisci foto del pezzo' : 'Carica foto del pezzo'}
            </label>
            <div
              id="cartellino-photo-dropzone"
              style="border: 2px dashed var(--border-color); border-radius: var(--radius-md); padding: 16px; background-color: #f8fafc; cursor: pointer; text-align: center; transition: all 0.2s ease;"
            >
              <input type="file" id="cartellino-photo-file-input" accept="image/*" style="display: none;" />
              <div id="modal-photo-empty-view">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color: var(--text-muted); margin: 0 auto 6px auto; display: block;">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                  <circle cx="8.5" cy="8.5" r="1.5"></circle>
                  <polyline points="21 15 16 10 5 21"></polyline>
                </svg>
                <div style="font-size: 13px; font-weight: 600; color: var(--text-primary);">
                  Trascina qui la nuova foto o clicca per cercarla
                </div>
                <div style="font-size: 11.5px; color: var(--text-muted);">
                  PNG, JPG, WEBP — genera automaticamente una miniatura ottimizzata
                </div>
              </div>

              <div id="modal-photo-new-view" style="display: none; align-items: center; justify-content: space-between; gap: 12px; text-align: left;">
                <div style="display: flex; align-items: center; gap: 12px;">
                  <img id="modal-new-preview-img" src="" alt="Nuova foto" style="width: 80px; height: 45px; aspect-ratio: 16 / 9; object-fit: cover; border-radius: 6px; border: 1px solid var(--border-color); background: #fff;" />
                  <div>
                    <div id="modal-new-filename" style="font-size: 13px; font-weight: 600; color: var(--text-primary);">nuova_foto.jpg</div>
                    <div style="font-size: 11.5px; color: #16a34a; font-weight: 500;">Pronta per essere salvata</div>
                  </div>
                </div>
                <button type="button" class="btn btn-secondary btn-sm" id="btn-cancel-new-photo" style="font-size: 11px; padding: 4px 8px;">Annulla</button>
              </div>
            </div>
          </div>
        </div>
      `;

      const footerButtons = `
        ${hasPhoto ? `<button type="button" class="btn btn-secondary" id="modal-delete-photo-btn" style="color: #dc2626; margin-right: auto;">Rimuovi foto</button>` : ''}
        <button type="button" class="btn btn-secondary" id="modal-close-photo-btn">Chiudi</button>
        <button type="button" class="btn btn-primary" id="modal-save-photo-btn" disabled>Salva foto</button>
      `;

      openModal({
        title: `Foto Pezzo — ${escapeHtml(currentCart.commessa)}`,
        contentHtml: modalContent,
        footerButtonsHtml: footerButtons,
        onOpen: (overlay) => {
          const closeBtn = overlay.querySelector('#modal-close-photo-btn');
          const saveBtn = overlay.querySelector('#modal-save-photo-btn');
          const deleteBtn = overlay.querySelector('#modal-delete-photo-btn');
          const dropzone = overlay.querySelector('#cartellino-photo-dropzone');
          const fileInput = overlay.querySelector('#cartellino-photo-file-input');
          const emptyView = overlay.querySelector('#modal-photo-empty-view');
          const newView = overlay.querySelector('#modal-photo-new-view');
          const previewImg = overlay.querySelector('#modal-new-preview-img');
          const previewName = overlay.querySelector('#modal-new-filename');
          const cancelNewBtn = overlay.querySelector('#btn-cancel-new-photo');

          let selectedNewFoto = null;

          const processFile = async (file) => {
            if (!file) return;
            if (!file.type.startsWith('image/')) {
              alert('Seleziona un formato immagine valido.');
              return;
            }
            try {
              selectedNewFoto = await fileToThumbnail(file, 400, 400);
              previewImg.src = selectedNewFoto;
              previewName.textContent = file.name || 'foto_pezzo.jpg';
              emptyView.style.display = 'none';
              newView.style.display = 'flex';
              saveBtn.disabled = false;
            } catch (err) {
              alert(err.message || 'Errore');
            }
          };

          dropzone.addEventListener('click', (e) => {
            if (e.target.closest('#btn-cancel-new-photo')) return;
            fileInput.click();
          });

          fileInput.addEventListener('change', (e) => {
            const f = e.target.files && e.target.files[0];
            if (f) processFile(f);
          });

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
            const f = e.dataTransfer.files && e.dataTransfer.files[0];
            if (f) processFile(f);
          });

          cancelNewBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            selectedNewFoto = null;
            fileInput.value = '';
            previewImg.src = '';
            emptyView.style.display = 'block';
            newView.style.display = 'none';
            saveBtn.disabled = true;
          });

          closeBtn.addEventListener('click', closeModal);

          if (deleteBtn) {
            deleteBtn.addEventListener('click', async () => {
              if (confirm('Rimuovere la foto del pezzo da questo cartellino?')) {
                try {
                  await api.updateCartellinoFoto(cartellinoId, null);
                  closeModal();
                  showToast('Foto del pezzo rimossa', 'info');
                  rerender();
                } catch (err) {
                  alert(err.message || 'Errore');
                }
              }
            });
          }

          saveBtn.addEventListener('click', async () => {
            if (!selectedNewFoto) return;
            try {
              await api.updateCartellinoFoto(cartellinoId, selectedNewFoto);
              closeModal();
              showToast('Foto del pezzo aggiornata con successo', 'success');
              rerender();
            } catch (err) {
              alert(err.message || 'Errore');
            }
          });
        },
      });
    };

    photoTriggers.forEach((btn) => {
      btn.addEventListener('click', handleOpenPhotoModal);
    });
  }

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
      return;
    }

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
      return;
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

function showCartellinoPrintModal(cartellino, dipendentiMap, macchineMap) {
  const previewHtml = generateCartellinoPrintHtml(cartellino, dipendentiMap, macchineMap);

  const modalHtml = `
    <div style="display: flex; flex-direction: column; gap: 14px;">
      <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px; background: #f1f5f9; border: 1px solid var(--border-color); padding: 12px 16px; border-radius: var(--radius-md);">
        <div style="font-size: 13px; color: var(--text-secondary); max-width: 440px; line-height: 1.4;">
          Scheda di lavorazione pronta. Clicca sui tasti per aprire la finestra di stampa di sistema o scaricare il documento.
        </div>
        <div style="display: flex; gap: 8px; flex-wrap: wrap;">
          <button type="button" class="btn btn-primary btn-sm" id="btn-modal-open-tab-print" title="Apri scheda e avvia dialogo stampante">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="6 9 6 2 18 2 18 9"></polyline>
              <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
              <rect x="6" y="14" width="12" height="8"></rect>
            </svg>
            <span>Apri Stampa (Nuova Scheda)</span>
          </button>
          <button type="button" class="btn btn-secondary btn-sm" id="btn-modal-download-print" title="Scarica scheda cartellino per visualizzarla o stamparla offline">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="7 10 12 15 17 10"></polyline>
              <line x1="12" y1="15" x2="12" y2="3"></line>
            </svg>
            <span>Scarica Scheda</span>
          </button>
          <button type="button" class="btn btn-secondary btn-sm" id="btn-modal-direct-print" title="Invia direttamente a stampa dal browser">
            <span>Stampa da Pagina</span>
          </button>
        </div>
      </div>

      <div style="border: 1px solid var(--border-color); border-radius: var(--radius-md); background: #334155; padding: 16px; max-height: 520px; overflow-y: auto;">
        <div style="background: #ffffff; color: #000000; box-shadow: 0 4px 16px rgba(0,0,0,0.3); border-radius: 4px; overflow: hidden; max-width: 820px; margin: 0 auto;">
          <iframe id="print-preview-iframe" style="width: 100%; height: 520px; border: none; display: block; background: #ffffff;"></iframe>
        </div>
      </div>
    </div>
  `;

  const footerHtml = `
    <div style="display: flex; justify-content: flex-end; gap: 8px; width: 100%;">
      <button type="button" class="btn btn-secondary" id="btn-modal-close-print">Chiudi</button>
    </div>
  `;

  openModal({
    title: `Stampa Scheda Cartellino N° ${escapeHtml(cartellino.numero)}`,
    contentHtml: modalHtml,
    footerButtonsHtml: footerHtml,
    onOpen: (overlay) => {
      const iframe = overlay.querySelector('#print-preview-iframe');
      if (iframe) {
        try {
          const doc = iframe.contentWindow.document;
          doc.open();
          // Remove auto-print script in preview iframe
          const previewClean = previewHtml.replace(/window\.print\(\);/g, '// preview mode');
          doc.write(previewClean);
          doc.close();
        } catch (e) {
          console.warn('Preview write error:', e);
        }
      }

      const btnOpenTab = overlay.querySelector('#btn-modal-open-tab-print');
      if (btnOpenTab) {
        btnOpenTab.addEventListener('click', () => {
          openInNewTabAndPrint(cartellino, dipendentiMap, macchineMap);
        });
      }

      const btnDownload = overlay.querySelector('#btn-modal-download-print');
      if (btnDownload) {
        btnDownload.addEventListener('click', () => {
          downloadCartellinoHtml(cartellino, dipendentiMap, macchineMap);
          showToast('Scheda cartellino scaricata con successo.', 'success');
        });
      }

      const btnDirect = overlay.querySelector('#btn-modal-direct-print');
      if (btnDirect) {
        btnDirect.addEventListener('click', () => {
          try {
            window.print();
          } catch (e) {
            showToast('Stampa diretta non permessa nell\'anteprima: usa "Apri Stampa (Nuova Scheda)".', 'warning');
          }
        });
      }

      const btnClose = overlay.querySelector('#btn-modal-close-print');
      if (btnClose) {
        btnClose.addEventListener('click', closeModal);
      }
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
