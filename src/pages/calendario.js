/**
 * Calendario Page for Gestionale Ore
 * Monthly grid showing employee hours.
 * CRITICAL RULE: Count ONLY 'OPER' rows for the employee. MACCH hours never count for employee.
 * Coordinated with modular sub-components in /src/components/calendario/
 */

import { api } from '../api.js';
import { state } from '../state.js';
import { escapeHtml } from '../utils/dom.js';
import {
  MONTH_NAMES,
  generateCalendarGridData,
  renderCalendarGridHtml,
} from '../components/calendario/calendarGrid.js';
import { showDayDetailModal } from '../components/calendario/dayDetailModal.js';
import { openNuovaAttivitaModal } from '../components/calendario/nuovaAttivitaModal.js';

let currentYear = 2026;
let currentMonth = 9; // September (1-indexed)
let selectedDipendenteId = null;

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

  const {
    daysCells,
    totalHoursMonth,
    totalOvertimeMonth,
    totalPermessiMonth,
    totalFerieMonth,
  } = generateCalendarGridData({
    currentYear,
    currentMonth,
    totali_giornalieri,
    permessi_giornalieri,
    ferie_giornaliere,
  });

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
        ${renderCalendarGridHtml(daysCells)}
      </div>
    </div>
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

  container.addEventListener('click', async (e) => {
    const dayCell = e.target.closest('[data-action="view-day-detail"]');
    if (dayCell) {
      const dateStr = dayCell.getAttribute('data-date');
      showDayDetailModal({
        dateStr,
        selectedDipendenteId,
        onUpdated: () => rerender(),
      });
    }
  });
}
