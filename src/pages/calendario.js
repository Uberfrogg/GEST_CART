/**
 * Calendario Page for Gestionale Ore
 * Monthly grid showing employee hours.
 * CRITICAL RULE: Count ONLY 'OPER' rows for the employee. MACCH hours never count for employee.
 * Matches calendario.jpg and dettaglio giornata.jpg
 */

import { api } from '../api.js';
import { state } from '../state.js';
import { openModal, closeModal } from '../components/modal.js';
import { showToast } from '../components/toast.js';
import { formatDate } from '../utils/date.js';

let currentYear = 2026;
let currentMonth = 9; // September (1-indexed)
let selectedDipendenteId = null;

const MONTH_NAMES = [
  'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
  'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'
];

const WEEKDAY_NAMES = ['LUN', 'MAR', 'MER', 'GIO', 'VEN', 'SAB', 'DOM'];

export async function renderCalendarioPage() {
  const currentUser = state.getCurrentUser();
  let dipendenti = await api.getDipendenti();

  // L'utente SEGRETERIA (MARINA) non deve visualizzare l'utente ADMIN nel selettore dipendenti
  if (state.isSegreteria()) {
    dipendenti = dipendenti.filter((d) => (d.ruolo || '').toUpperCase() !== 'ADMIN');
  }

  // If user is a DIPENDENTE, strictly force to their own id
  if (state.isDipendente() && currentUser) {
    selectedDipendenteId = currentUser.id;
  } else if (!selectedDipendenteId || !dipendenti.some((d) => d.id === selectedDipendenteId)) {
    // If Admin or Segreteria, default to first dipendente in the filtered list
    const found = currentUser && dipendenti.some((d) => d.id === currentUser.id);
    selectedDipendenteId = found ? currentUser.id : (dipendenti.length > 0 ? dipendenti[0].id : null);
  }

  const { totali_giornalieri, permessi_giornalieri = {}, ferie_giornaliere = {} } = await api.getCalendarioOre(
    selectedDipendenteId,
    currentYear,
    currentMonth
  );

  // Month stats
  let totalHoursMonth = 0;
  let totalOvertimeMonth = 0;
  let totalPermessiMonth = 0;
  let totalFerieMonth = 0;

  Object.values(totali_giornalieri).forEach((h) => (totalHoursMonth += h));
  Object.values(permessi_giornalieri).forEach((h) => (totalPermessiMonth += h));
  Object.values(ferie_giornaliere).forEach((h) => (totalFerieMonth += h));

  // Build days grid
  // Days in current month
  const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();
  // First day weekday (1 = Mon, ... 7 = Sun)
  const firstDayWeekday = new Date(currentYear, currentMonth - 1, 1).getDay(); // 0 is Sun
  const startOffset = firstDayWeekday === 0 ? 6 : firstDayWeekday - 1; // 0 for Mon, 6 for Sun

  const daysCells = [];

  // Empty cells before start of month
  for (let i = 0; i < startOffset; i++) {
    const isSaturday = i === 5;
    const isSunday = i === 6;
    daysCells.push({ empty: true, isSaturday, isSunday });
  }

  // Days
  const pad = (n) => String(n).padStart(2, '0');
  const now = new Date();
  const todayStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;

  for (let d = 1; d <= daysInMonth; d++) {
    const dateObj = new Date(currentYear, currentMonth - 1, d);
    const dayOfWeek = dateObj.getDay(); // 0 is Sun, 6 is Sat
    const isSaturday = dayOfWeek === 6;
    const isSunday = dayOfWeek === 0;
    const dateStr = `${currentYear}-${pad(currentMonth)}-${pad(d)}`;
    const hours = totali_giornalieri[dateStr] || 0;
    const permessi = permessi_giornalieri[dateStr] || 0;
    const ferie = ferie_giornaliere[dateStr] || 0;
    const isToday = dateStr === todayStr;

    if (hours > 0) {
      if (isSaturday) {
        totalOvertimeMonth += hours;
      } else if (hours > 8) {
        totalOvertimeMonth += hours - 8;
      }
    }

    daysCells.push({
      empty: false,
      dayNumber: d,
      dateStr,
      hours,
      permessi,
      ferie,
      isToday,
      isSaturday,
      isSunday,
    });
  }

  const selectedDip = dipendenti.find((d) => d.id === selectedDipendenteId);
  const canViewAll = state.canViewAllEmployees();
  const canManage = state.canManageHours();

  return `
    <header class="app-topbar">
      <div style="display: flex; align-items: center; gap: 16px;">
        <span style="font-size: 16px; font-weight: 700; color: var(--text-primary);">
          Calendario Ore Lavorate
        </span>

        ${
          canViewAll
            ? `
              <div style="display: flex; align-items: center; gap: 8px;">
                <label for="select-cal-dipendente" style="font-size: 12.5px; font-weight: 600; color: var(--text-muted);">Dipendente:</label>
                <select id="select-cal-dipendente" class="form-select" style="width: auto; padding: 4px 10px; font-size: 13px;">
                  ${dipendenti
                    .map((d) => `<option value="${d.id}" ${d.id === selectedDipendenteId ? 'selected' : ''}>${escapeHtml(d.nickname || d.username || d.nome)}</option>`)
                    .join('')}
                </select>
              </div>
            `
            : `<span class="badge badge-in-lavorazione" style="font-size: 13px; font-weight: 700;">${escapeHtml(selectedDip ? (selectedDip.nickname || selectedDip.username || selectedDip.nome) : '')}</span>`
        }
      </div>

      <div style="display: flex; align-items: center; gap: 16px;">
        <span class="badge badge-counter tabular-nums" style="font-size: 13px; padding: 6px 14px;">
          Totale Mese: <strong style="color: var(--primary); font-weight: 700;">${totalHoursMonth.toFixed(1)} h</strong>
          ${
            totalOvertimeMonth > 0
              ? `<span style="margin-left: 8px; color: #854d0e; font-weight: 700;">(Straordinari: <span style="background: transparent; color: #854d0e; font-weight: 700;">${totalOvertimeMonth.toFixed(1)} h</span>)</span>`
              : ''
          }
          ${
            totalPermessiMonth > 0
              ? `<span style="margin-left: 8px; color: #15803d; font-weight: 700;">(Permessi: <span style="background: transparent; color: #15803d; font-weight: 700;">${totalPermessiMonth.toFixed(1)} h</span>)</span>`
              : ''
          }
          ${
            totalFerieMonth > 0
              ? `<span style="margin-left: 8px; color: #b91c1c; font-weight: 700;">(Ferie: <span style="background: transparent; color: #b91c1c; font-weight: 700;">${totalFerieMonth.toFixed(1)} h</span>)</span>`
              : ''
          }
        </span>

        ${
          canManage
            ? `
              <button type="button" class="btn btn-primary" id="btn-nuova-attivita">
                Nuova attività
              </button>
            `
            : ''
        }
      </div>
    </header>

    <div class="page-container">
      <div class="data-table-card" style="padding: 20px;">
        <!-- Calendar Navigation Header -->
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px;">
          <h2 style="font-size: 18px; font-weight: 700; color: var(--text-primary); margin: 0;">
            ${MONTH_NAMES[currentMonth - 1]} ${currentYear}
          </h2>

          <div style="display: flex; align-items: center; gap: 8px;">
            <button type="button" class="btn btn-secondary btn-sm" id="btn-cal-prev" title="Mese precedente">
              &lt; Mese Prec.
            </button>
            <button type="button" class="btn btn-secondary btn-sm" id="btn-cal-today">
              Oggi
            </button>
            <button type="button" class="btn btn-secondary btn-sm" id="btn-cal-next" title="Mese successivo">
              Mese Succ. &gt;
            </button>
          </div>
        </div>

        <!-- Month Grid -->
        <div class="calendar-grid">
          <div class="cal-header-row">
            ${WEEKDAY_NAMES.map((name, idx) => {
              const weekendHeaderClass = idx === 5 ? 'cal-saturday' : idx === 6 ? 'cal-sunday' : '';
              return `<div class="cal-header-cell ${weekendHeaderClass}">${name}</div>`;
            }).join('')}
          </div>

          <div class="cal-body-grid">
            ${daysCells
              .map((cell) => {
                const weekendClass = cell.isSaturday ? 'cal-saturday' : cell.isSunday ? 'cal-sunday' : '';
                if (cell.empty) {
                  return `<div class="cal-day-cell empty ${weekendClass}"></div>`;
                }

                const totalHours = cell.hours || 0;
                const permessi = cell.permessi || 0;
                const ferie = cell.ferie || 0;
                let overtime = 0;
                if (totalHours > 0) {
                  if (cell.isSaturday) {
                    overtime = totalHours;
                  } else if (totalHours > 8) {
                    overtime = +(totalHours - 8).toFixed(1);
                  }
                }

                const hasAnyActivity = totalHours > 0 || permessi > 0 || ferie > 0;

                return `
                  <div
                    class="cal-day-cell ${cell.isToday ? 'today' : ''} ${hasAnyActivity ? 'has-hours' : ''} ${weekendClass}"
                    data-action="view-day-detail"
                    data-date="${cell.dateStr}"
                    title="Click per visualizzare dettaglio giornata"
                  >
                    <div class="cal-day-number">${cell.dayNumber}</div>
                    ${
                      hasAnyActivity
                        ? `
                          <div class="cal-day-badges-container">
                            ${
                              totalHours > 0 && !cell.isSaturday
                                ? `
                                  <div class="cal-day-badge tabular-nums" title="Totale ore ordinarie: ${totalHours.toFixed(1)} h">
                                    ${totalHours.toFixed(1)} h
                                  </div>
                                `
                                : ''
                            }
                            ${
                              overtime > 0
                                ? `
                                  <div class="cal-day-overtime-badge tabular-nums" title="${cell.isSaturday ? 'Straordinario sabato: ' : 'Straordinario: '}${overtime.toFixed(1)} h">
                                    ${overtime.toFixed(1)} h
                                  </div>
                                `
                                : ''
                            }
                            ${
                              permessi > 0
                                ? `
                                  <div class="cal-day-permesso-badge tabular-nums" title="Permesso: ${permessi.toFixed(1)} h">
                                    ${permessi.toFixed(1)} h
                                  </div>
                                `
                                : ''
                            }
                            ${
                              ferie > 0
                                ? `
                                  <div class="cal-day-ferie-badge tabular-nums" title="Ferie: ${ferie.toFixed(1)} h">
                                    ${ferie.toFixed(1)} h
                                  </div>
                                `
                                : ''
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
        </div>
      </div>
    </div>

    <style>
      .calendar-grid {
        border: 1px solid var(--border-color);
        border-radius: var(--radius-md);
        overflow: hidden;
      }
      .cal-header-row {
        display: grid;
        grid-template-columns: repeat(7, 1fr);
        background-color: #f8fafc;
        border-bottom: 1px solid var(--border-color);
      }
      .cal-header-cell {
        padding: 10px;
        font-size: 12px;
        font-weight: 700;
        color: var(--text-muted);
        text-align: center;
      }
      .cal-header-cell.cal-saturday {
        background-color: #fefce8;
        color: #854d0e;
      }
      .cal-header-cell.cal-sunday {
        background-color: #fef2f2;
        color: #991b1b;
      }
      .cal-body-grid {
        display: grid;
        grid-template-columns: repeat(7, 1fr);
      }
      .cal-day-cell {
        height: 130px;
        box-sizing: border-box;
        border-right: 1px solid var(--border-color);
        border-bottom: 1px solid var(--border-color);
        padding: 8px;
        cursor: pointer;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        background-color: #ffffff;
        transition: background-color 0.15s, box-shadow 0.15s;
        overflow: hidden;
      }
      .cal-day-cell:nth-child(7n) {
        border-right: none;
      }
      .cal-day-cell.empty {
        background-color: #f8fafc;
        cursor: default;
      }
      .cal-day-cell.cal-saturday {
        background-color: #fefce8;
      }
      .cal-day-cell.cal-saturday.empty {
        background-color: #fffde7;
        opacity: 0.85;
      }
      .cal-day-cell.cal-saturday:not(.empty):hover {
        background-color: #fef9c3;
      }
      .cal-day-cell.cal-sunday {
        background-color: #fef2f2;
      }
      .cal-day-cell.cal-sunday.empty {
        background-color: #fff5f5;
        opacity: 0.85;
      }
      .cal-day-cell.cal-sunday:not(.empty):hover {
        background-color: #fee2e2;
      }
      .cal-day-cell:not(.empty):not(.cal-saturday):not(.cal-sunday):hover {
        background-color: #eff6ff;
      }
      .cal-day-cell.today {
        box-shadow: inset 0 0 0 2px var(--success, #16a34a);
      }
      .cal-day-cell.today:not(.cal-saturday):not(.cal-sunday) {
        background-color: #f0fdf4;
      }
      .cal-day-cell.today .cal-day-number {
        font-weight: 800;
        color: var(--success, #15803d);
      }
      .cal-day-number {
        font-size: 13.5px;
        font-weight: 600;
        color: var(--text-secondary);
      }
      .cal-day-badges-container {
        display: flex;
        align-items: center;
        gap: 4px;
        align-self: flex-end;
        justify-content: flex-end;
        flex-wrap: wrap;
      }
      .cal-day-badge {
        background-color: var(--primary-light, #e0f2fe);
        color: var(--primary, #0284c7);
        font-weight: 700;
        font-size: 11.5px;
        padding: 3px 6px;
        border-radius: 4px;
        border: 1px solid var(--primary-border, #bae6fd);
        white-space: nowrap;
      }
      .cal-day-overtime-badge {
        background-color: #fef9c3;
        color: #854d0e;
        font-weight: 700;
        font-size: 11.5px;
        padding: 3px 6px;
        border-radius: 4px;
        border: 1px solid #fde047;
        white-space: nowrap;
      }
      .cal-day-permesso-badge {
        background-color: #dcfce7;
        color: #15803d;
        font-weight: 700;
        font-size: 11.5px;
        padding: 3px 6px;
        border-radius: 4px;
        border: 1px solid #86efac;
        white-space: nowrap;
      }
      .cal-day-ferie-badge {
        background-color: #fee2e2;
        color: #b91c1c;
        font-weight: 700;
        font-size: 11.5px;
        padding: 3px 6px;
        border-radius: 4px;
        border: 1px solid #fca5a5;
        white-space: nowrap;
      }
    </style>
  `;
}

export function initCalendarioPage(container, rerender) {
  const prevBtn = container.querySelector('#btn-cal-prev');
  const nextBtn = container.querySelector('#btn-cal-next');
  const todayBtn = container.querySelector('#btn-cal-today');
  const dipSelect = container.querySelector('#select-cal-dipendente');
  const nuovaAttivitaBtn = container.querySelector('#btn-nuova-attivita');

  if (nuovaAttivitaBtn) {
    nuovaAttivitaBtn.addEventListener('click', () => {
      openNuovaAttivitaModal({
        defaultDate: null,
        defaultDipendenteId: selectedDipendenteId,
        onSaved: () => rerender(),
      });
    });
  }

  if (prevBtn) {
    prevBtn.addEventListener('click', () => {
      currentMonth--;
      if (currentMonth < 1) {
        currentMonth = 12;
        currentYear--;
      }
      rerender();
    });
  }

  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
      currentMonth++;
      if (currentMonth > 12) {
        currentMonth = 1;
        currentYear++;
      }
      rerender();
    });
  }

  if (todayBtn) {
    todayBtn.addEventListener('click', () => {
      const now = new Date();
      currentYear = now.getFullYear();
      currentMonth = now.getMonth() + 1;
      rerender();
    });
  }

  if (dipSelect) {
    dipSelect.addEventListener('change', (e) => {
      selectedDipendenteId = e.target.value;
      rerender();
    });
  }

  // Click on a day -> opens Dettaglio Giornata modal (matches dettaglio giornata.jpg)
  async function showDayDetail(dateStr) {
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
                rerender();
                showDayDetail(dateStr);
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
                    rerender();
                    showDayDetail(dateStr);
                  },
                  onCancel: () => {
                    showDayDetail(dateStr);
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
                  rerender();
                  closeModal();
                  showDayDetail(dateStr);
                } catch (err) {
                  alert(err.message || 'Errore durante l’eliminazione');
                }
              }
              return;
            }
          });
        }
      },
    });
  }

  container.addEventListener('click', async (e) => {
    const dayCell = e.target.closest('[data-action="view-day-detail"]');
    if (dayCell) {
      const dateStr = dayCell.getAttribute('data-date');
      showDayDetail(dateStr);
    }
  });
}

function openModificaRigaModal({ riga, onSaved = () => {}, onCancel = () => {} }) {
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

async function openNuovaAttivitaModal({ defaultDate = null, defaultDipendenteId = null, onSaved = () => {} } = {}) {
  const [cartellini, clienti, dipendenti, macchine] = await Promise.all([
    api.getCartellini(),
    api.getClienti({ includeDeleted: true }),
    api.getDipendenti({ onlyActive: true }),
    api.getMacchine({ onlyActive: true }),
  ]);

  const clientMap = new Map(clienti.map((c) => [c.id, c.nome]));
  const todayStr = defaultDate || new Date().toISOString().slice(0, 10);
  const targetDipId =
    defaultDipendenteId ||
    selectedDipendenteId ||
    (state.getCurrentUser() ? state.getCurrentUser().id : (dipendenti[0] ? dipendenti[0].id : null));

  // Filter ONLY active (in_lavorazione) or completato cartellini
  const eligibleCartellini = cartellini
    .filter((c) => c.stato === 'in_lavorazione' || c.stato === 'in-lavorazione' || c.stato === 'completato')
    .sort((a, b) => {
      if (a.stato === 'in_lavorazione' && b.stato !== 'in_lavorazione') return -1;
      if (a.stato !== 'in_lavorazione' && b.stato === 'in_lavorazione') return 1;
      return (b.numero || '').localeCompare(a.numero || '');
    });

  const modalHtml = `
    <form id="form-cal-nuova-attivita">
      <div class="form-group" style="position: relative;">
        <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 4px;">
          <label class="form-label" for="cal-modal-cartellino-input" style="margin-bottom: 0;">
            Cartellino / Commessa <span style="font-weight: 400; color: var(--text-muted); font-size: 12px;">(opzionale)</span>
          </label>
          <button
            type="button"
            id="cal-btn-clear-cartellino"
            style="display: none; background: none; border: none; font-size: 12px; color: var(--primary); cursor: pointer; text-decoration: underline; padding: 0;"
          >
            Rimuovi cartellino
          </button>
        </div>

        <div style="position: relative;">
          <input
            type="text"
            id="cal-modal-cartellino-input"
            class="form-input"
            placeholder="Digita per cercare cartellino, cliente o commessa..."
            autocomplete="off"
          />
          <input type="hidden" id="cal-modal-cartellino-id" value="" />
          <div
            id="cal-cartellino-autocomplete-list"
            style="display: none; position: absolute; left: 0; right: 0; top: 100%; z-index: 100; max-height: 220px; overflow-y: auto; background: #ffffff; border: 1px solid var(--border-color); border-radius: var(--radius-md); box-shadow: 0 10px 25px rgba(0,0,0,0.15); margin-top: 4px;"
          ></div>
        </div>
        <div style="font-size: 11.5px; color: var(--text-muted); margin-top: 4px;">
          Se non viene associato ad alcun cartellino, compila il campo <strong>Nota</strong> per giustificare le ore.
        </div>
      </div>

      <div class="form-group">
        <label class="form-label">Tipo di Attività *</label>
        <div style="display: flex; gap: 18px; margin-top: 4px;">
          <label style="display: flex; align-items: center; gap: 6px; font-weight: 600; cursor: pointer; font-size: 13.5px;">
            <input type="radio" name="cal-riga-kind" value="OPER" checked />
            <span>OPER (Dipendente / Operatore)</span>
          </label>
          <label style="display: flex; align-items: center; gap: 6px; font-weight: 600; cursor: pointer; font-size: 13.5px;">
            <input type="radio" name="cal-riga-kind" value="MACCH" />
            <span>MACCH (Macchina)</span>
          </label>
        </div>
        <div style="font-size: 11.5px; color: var(--text-muted); margin-top: 3px;">
          Le ore OPER confluiscono nel calendario personale del dipendente selezionato; le ore MACCH tracciano l'uso del macchinario.
        </div>
      </div>

      <div class="form-group" id="cal-group-ref-oper">
        <label class="form-label" for="cal-select-ref-oper">Dipendente *</label>
        ${
          state.isAdmin()
            ? `
              <select id="cal-select-ref-oper" class="form-select">
                ${dipendenti
                  .filter((d) => d.attivo && !d.eliminato)
                  .map((d) => `<option value="${d.id}" ${d.id === targetDipId ? 'selected' : ''}>${escapeHtml(d.nickname || d.username || d.nome)}</option>`)
                  .join('')}
              </select>
            `
            : `
              <div style="font-weight: 700; color: var(--text-primary); padding: 8px 12px; background: #f8fafc; border-radius: var(--radius-md); border: 1px solid var(--border-color); font-size: 13.5px;">
                ${escapeHtml(state.getCurrentUser() ? state.getCurrentUser().nickname || state.getCurrentUser().username : 'Utente Corrente')}
              </div>
              <input type="hidden" id="cal-select-ref-oper" value="${state.getCurrentUser() ? state.getCurrentUser().id : ''}" />
            `
        }
      </div>

      <div class="form-group" id="cal-group-ref-macch" style="display: none;">
        <label class="form-label" for="cal-select-ref-macch">Macchina *</label>
        <select id="cal-select-ref-macch" class="form-select">
          ${macchine
            .filter((m) => m.attiva && !m.eliminata && !m.eliminato)
            .map((m) => `<option value="${m.id}">${escapeHtml(m.nome)} (${escapeHtml(m.codice)})</option>`)
            .join('')}
        </select>
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px;">
        <div class="form-group">
          <label class="form-label" for="cal-input-riga-data">Data Lavoro *</label>
          <input type="date" id="cal-input-riga-data" class="form-input" value="${todayStr}" required />
        </div>

        <div class="form-group">
          <label class="form-label" for="cal-input-riga-ore">Ore (passo 0,5h) *</label>
          <input
            type="number"
            id="cal-input-riga-ore"
            class="form-input"
            value="4.0"
            step="0.5"
            min="0.5"
            max="24"
            required
          />
        </div>
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px;">
        <div class="form-group">
          <label class="form-label" for="cal-input-riga-nota">Nota / Descrizione Attività</label>
          <input
            type="text"
            id="cal-input-riga-nota"
            class="form-input"
            placeholder="es. Manutenzione, formazione, pulizia..."
          />
        </div>

        <div class="form-group">
          <label class="form-label" for="cal-select-riga-tipo">Tipologia</label>
          <select id="cal-select-riga-tipo" class="form-select">
            <option value="">Lavoro Ordinario</option>
            <option value="PERMESSO">PERMESSO</option>
            <option value="FERIE">FERIE</option>
          </select>
        </div>
      </div>
    </form>
  `;

  const footerHtml = `
    <button type="button" class="btn btn-secondary" id="cal-modal-cancel">Annulla</button>
    <button type="button" class="btn btn-primary" id="cal-modal-save">Salva attività</button>
  `;

  openModal({
    title: 'Nuova Attività',
    contentHtml: modalHtml,
    footerButtonsHtml: footerHtml,
    onOpen: (overlay) => {
      const kindRadios = overlay.querySelectorAll('input[name="cal-riga-kind"]');
      const groupOper = overlay.querySelector('#cal-group-ref-oper');
      const groupMacch = overlay.querySelector('#cal-group-ref-macch');
      const cancelBtn = overlay.querySelector('#cal-modal-cancel');
      const saveBtn = overlay.querySelector('#cal-modal-save');

      const cartInput = overlay.querySelector('#cal-modal-cartellino-input');
      const cartHidden = overlay.querySelector('#cal-modal-cartellino-id');
      const cartList = overlay.querySelector('#cal-cartellino-autocomplete-list');
      const clearCartBtn = overlay.querySelector('#cal-btn-clear-cartellino');

      // Autocomplete Search Logic
      const filterSuggestions = () => {
        const query = (cartInput.value || '').trim().toLowerCase();
        if (!query) {
          cartList.style.display = 'none';
          cartList.innerHTML = '';
          return;
        }

        const matches = eligibleCartellini.filter((c) => {
          const num = (c.numero || '').toLowerCase();
          const com = (c.commessa || '').toLowerCase();
          const cli = (clientMap.get(c.cliente_id) || '').toLowerCase();

          return (
            num.startsWith(query) ||
            com.startsWith(query) ||
            cli.startsWith(query) ||
            num.replace(/[^a-z0-9]/g, '').startsWith(query.replace(/[^a-z0-9]/g, '')) ||
            com.split(/\s+/).some((part) => part.startsWith(query)) ||
            cli.split(/\s+/).some((part) => part.startsWith(query))
          );
        });

        if (matches.length === 0) {
          cartList.innerHTML = `
            <div style="padding: 10px 14px; font-size: 12.5px; color: var(--text-muted); font-style: italic;">
              Nessun cartellino attivo o completato che inizia con "${escapeHtml(query)}"
            </div>
          `;
          cartList.style.display = 'block';
          return;
        }

        cartList.innerHTML = matches
          .map((c) => {
            const cliName = clientMap.get(c.cliente_id) || 'Cliente';
            const isComp = c.stato === 'completato';
            const statoBadge = isComp
              ? '<span class="badge badge-completato" style="font-size: 10.5px; padding: 2px 6px;">Completato</span>'
              : '<span class="badge badge-in-lavorazione" style="font-size: 10.5px; padding: 2px 6px;">In corso</span>';

            return `
              <div
                class="cal-autocomplete-item"
                data-id="${c.id}"
                data-label="[${escapeHtml(c.numero)}] ${escapeHtml(cliName)} — ${escapeHtml(c.commessa)}"
                style="padding: 9px 12px; cursor: pointer; border-bottom: 1px solid #f1f5f9; display: flex; align-items: center; justify-content: space-between; gap: 8px; transition: background 0.12s;"
              >
                <div>
                  <div style="font-weight: 700; font-size: 13px; color: var(--primary); font-family: var(--font-mono);">
                    ${escapeHtml(c.numero)}
                    <span style="font-weight: 600; color: var(--text-primary); font-family: var(--font-sans); margin-left: 6px;">
                      ${escapeHtml(cliName)}
                    </span>
                  </div>
                  <div style="font-size: 12px; color: var(--text-secondary); margin-top: 2px;">
                    Commessa: <strong>${escapeHtml(c.commessa)}</strong> ${c.descrizione ? `— ${escapeHtml(c.descrizione)}` : ''}
                  </div>
                </div>
                <div>${statoBadge}</div>
              </div>
            `;
          })
          .join('');

        cartList.style.display = 'block';
      };

      cartInput.addEventListener('input', () => {
        cartHidden.value = '';
        clearCartBtn.style.display = cartInput.value.trim() ? 'inline' : 'none';
        filterSuggestions();
      });

      cartInput.addEventListener('focus', () => {
        if (cartInput.value.trim()) {
          filterSuggestions();
        }
      });

      cartList.addEventListener('click', (e) => {
        const item = e.target.closest('.cal-autocomplete-item');
        if (item) {
          const id = item.getAttribute('data-id');
          const label = item.getAttribute('data-label');
          cartHidden.value = id;
          cartInput.value = label;
          cartList.style.display = 'none';
          clearCartBtn.style.display = 'inline';
        }
      });

      cartList.addEventListener('mouseover', (e) => {
        const item = e.target.closest('.cal-autocomplete-item');
        if (item) {
          item.style.backgroundColor = '#f0fdf4';
        }
      });

      cartList.addEventListener('mouseout', (e) => {
        const item = e.target.closest('.cal-autocomplete-item');
        if (item) {
          item.style.backgroundColor = '';
        }
      });

      clearCartBtn.addEventListener('click', () => {
        cartHidden.value = '';
        cartInput.value = '';
        clearCartBtn.style.display = 'none';
        cartList.style.display = 'none';
        cartInput.focus();
      });

      overlay.addEventListener('click', (e) => {
        if (!cartInput.contains(e.target) && !cartList.contains(e.target)) {
          cartList.style.display = 'none';
        }
      });

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
        const cartellinoId = cartHidden.value || null;
        const kind = overlay.querySelector('input[name="cal-riga-kind"]:checked').value;
        const refId =
          kind === 'OPER'
            ? overlay.querySelector('#cal-select-ref-oper').value
            : overlay.querySelector('#cal-select-ref-macch').value;
        const dataLavoro = overlay.querySelector('#cal-input-riga-data').value;
        const ore = parseFloat(overlay.querySelector('#cal-input-riga-ore').value);
        const nota = overlay.querySelector('#cal-input-riga-nota').value.trim();
        const tipoAssenza = (overlay.querySelector('#cal-select-riga-tipo')?.value || '').trim();

        if (!refId) {
          alert(kind === 'OPER' ? 'Seleziona un dipendente.' : 'Seleziona una macchina.');
          return;
        }
        if (!dataLavoro) {
          alert('Inserisci la data.');
          return;
        }
        if (isNaN(ore) || ore <= 0 || (ore * 2) % 1 !== 0) {
          alert('Le ore devono essere in incrementi di 0,5 (es. 0.5, 1.0, 1.5).');
          return;
        }
        if (!cartellinoId && !nota && !tipoAssenza) {
          alert('Se non selezioni un cartellino, inserisci una Nota o seleziona una tipologia (PERMESSO / FERIE).');
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
            tipo_assenza: tipoAssenza,
          });

          closeModal();
          showToast('Attività registrata con successo!', 'success');
          onSaved();
        } catch (err) {
          alert(err.message || 'Errore durante il salvataggio dell’attività');
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
