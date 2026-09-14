/**
 * Calendar Grid Component
 * Computes calendar cells, weekday offsets, overtime calculation, and grid HTML markup.
 */

export const MONTH_NAMES = [
  'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
  'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'
];

export const WEEKDAY_NAMES = ['LUN', 'MAR', 'MER', 'GIO', 'VEN', 'SAB', 'DOM'];

export function generateCalendarGridData({ currentYear, currentMonth, totali_giornalieri = {}, permessi_giornalieri = {}, ferie_giornaliere = {} }) {
  let totalHoursMonth = 0;
  let totalOvertimeMonth = 0;
  let totalPermessiMonth = 0;
  let totalFerieMonth = 0;

  Object.values(totali_giornalieri).forEach((h) => (totalHoursMonth += h));
  Object.values(permessi_giornalieri).forEach((h) => (totalPermessiMonth += h));
  Object.values(ferie_giornaliere).forEach((h) => (totalFerieMonth += h));

  const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();
  const firstDayWeekday = new Date(currentYear, currentMonth - 1, 1).getDay(); // 0 is Sun
  const startOffset = firstDayWeekday === 0 ? 6 : firstDayWeekday - 1; // 0 for Mon, 6 for Sun

  const daysCells = [];

  // Empty cells before start of month
  for (let i = 0; i < startOffset; i++) {
    const isSaturday = i === 5;
    const isSunday = i === 6;
    daysCells.push({ empty: true, isSaturday, isSunday });
  }

  const pad = (n) => String(n).padStart(2, '0');
  const now = new Date();
  const todayStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;

  for (let d = 1; d <= daysInMonth; d++) {
    const dateObj = new Date(currentYear, currentMonth - 1, d);
    const dayOfWeek = dateObj.getDay();
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

  return {
    daysCells,
    totalHoursMonth,
    totalOvertimeMonth,
    totalPermessiMonth,
    totalFerieMonth,
  };
}

export function renderCalendarGridHtml(daysCells) {
  return `
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
