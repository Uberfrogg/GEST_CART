/**
 * Backup Page for Gestionale Ore
 * Lists backups, allows triggering a new backup, restoring, or deleting.
 * Includes automated backup scheduling section (Giornaliero / Settimanale / Mensile and Time).
 * Matches backup.jpg
 */

import { api } from '../api.js';
import { showToast } from '../components/toast.js';
import { formatDateTime } from '../utils/date.js';

const WEEKDAYS = {
  lun: 'Lunedì',
  mar: 'Martedì',
  mer: 'Mercoledì',
  gio: 'Giovedì',
  ven: 'Venerdì',
  sab: 'Sabato',
  dom: 'Domenica',
};

function formatScheduleSummary(config) {
  if (!config.attivo) {
    return 'I backup automatici sono attualmente disattivati.';
  }
  const time = config.orario || '22:00';
  if (config.frequenza === 'giornaliero') {
    return `Backup programmato: ogni giorno alle ore ${time}`;
  }
  if (config.frequenza === 'settimanale') {
    const dayName = WEEKDAYS[config.giorno_settimana] || 'Lunedì';
    return `Backup programmato: ogni settimana (${dayName}) alle ore ${time}`;
  }
  if (config.frequenza === 'mensile') {
    const mDay = config.giorno_mese === 'ultimo' ? 'ultimo giorno del mese' : `giorno ${config.giorno_mese}`;
    return `Backup programmato: ogni mese (${mDay}) alle ore ${time}`;
  }
  return `Backup programmato alle ore ${time}`;
}

export async function renderBackupPage() {
  const [backups, autoBackupConfig] = await Promise.all([
    api.getBackups(),
    api.getAutoBackupConfig(),
  ]);

  return `
    <header class="app-topbar">
      <div style="font-size: 16px; font-weight: 700; color: var(--text-primary);">
        Backup e Sicurezza Database SQLite
      </div>
      <div style="display: flex; gap: 10px; align-items: center;">
        <button type="button" class="btn btn-secondary" id="btn-export-json">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="7 10 12 15 17 10"></polyline>
            <line x1="12" y1="15" x2="12" y2="3"></line>
          </svg>
          <span>Esporta JSON</span>
        </button>
        <label class="btn btn-secondary" style="cursor: pointer; margin-bottom: 0;">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="17 8 12 3 7 8"></polyline>
            <line x1="12" y1="3" x2="12" y2="15"></line>
          </svg>
          <span>Ripristina JSON</span>
          <input type="file" id="input-import-json" accept=".json,application/json" style="display: none;" />
        </label>
        <button type="button" class="btn btn-primary" id="btn-create-backup">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
          <span>Esegui nuovo backup</span>
        </button>
      </div>
    </header>

    <div class="page-container">
      <div class="alert alert-info" style="margin-bottom: 20px;">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="16" x2="12" y2="12"></line>
          <line x1="12" y1="8" x2="12.01" y2="8"></line>
        </svg>
        <span>
          <strong>Nota di sicurezza:</strong> I file di backup contengono l'intero archivio aziendale in formato SQLite (WAL). Il ripristino sostituisce i dati correnti con la versione salvata.
        </span>
      </div>

      <!-- Sezione Configurazione Backup Automatico -->
      <div class="data-table-card" id="auto-backup-card" style="margin-bottom: 24px; padding: 20px 24px;">
        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border-color); padding-bottom: 14px; margin-bottom: 20px;">
          <div>
            <div style="font-size: 15px; font-weight: 700; color: var(--text-primary); display: flex; align-items: center; gap: 8px;">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"></circle>
                <polyline points="12 6 12 12 16 14"></polyline>
              </svg>
              <span>Pianificazione Backup Automatico</span>
            </div>
            <div style="font-size: 12.5px; color: var(--text-muted); margin-top: 2px;">
              Configura la ricorrenza e l'orario di esecuzione automatica per mettere al sicuro il database periodicamente.
            </div>
          </div>
          <div style="display: flex; align-items: center; gap: 12px;">
            <span class="badge ${autoBackupConfig.attivo ? 'badge-completato' : 'badge-archiviato'}" id="auto-backup-status-badge">
              ${autoBackupConfig.attivo ? 'Attivo' : 'Disattivato'}
            </span>
            <label style="display: flex; align-items: center; gap: 6px; font-size: 13px; font-weight: 600; cursor: pointer;">
              <input type="checkbox" id="auto-backup-active" ${autoBackupConfig.attivo ? 'checked' : ''} />
              <span>Abilita</span>
            </label>
          </div>
        </div>

        <form id="form-auto-backup">
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 18px; align-items: start;">
            <!-- Frequenza -->
            <div class="form-group" style="margin-bottom: 0;">
              <label class="form-label" for="auto-backup-frequency">Frequenza di esecuzione *</label>
              <select id="auto-backup-frequency" class="form-select">
                <option value="giornaliero" ${autoBackupConfig.frequenza === 'giornaliero' ? 'selected' : ''}>Giornaliero</option>
                <option value="settimanale" ${autoBackupConfig.frequenza === 'settimanale' ? 'selected' : ''}>Settimanale</option>
                <option value="mensile" ${autoBackupConfig.frequenza === 'mensile' ? 'selected' : ''}>Mensile</option>
              </select>
            </div>

            <!-- Giorno Settimana (se settimanale) -->
            <div class="form-group" id="group-weekday" style="margin-bottom: 0; display: ${autoBackupConfig.frequenza === 'settimanale' ? 'flex' : 'none'};">
              <label class="form-label" for="auto-backup-weekday">Giorno della settimana</label>
              <select id="auto-backup-weekday" class="form-select">
                <option value="lun" ${autoBackupConfig.giorno_settimana === 'lun' ? 'selected' : ''}>Lunedì</option>
                <option value="mar" ${autoBackupConfig.giorno_settimana === 'mar' ? 'selected' : ''}>Martedì</option>
                <option value="mer" ${autoBackupConfig.giorno_settimana === 'mer' ? 'selected' : ''}>Mercoledì</option>
                <option value="gio" ${autoBackupConfig.giorno_settimana === 'gio' ? 'selected' : ''}>Giovedì</option>
                <option value="ven" ${autoBackupConfig.giorno_settimana === 'ven' ? 'selected' : ''}>Venerdì</option>
                <option value="sab" ${autoBackupConfig.giorno_settimana === 'sab' ? 'selected' : ''}>Sabato</option>
                <option value="dom" ${autoBackupConfig.giorno_settimana === 'dom' ? 'selected' : ''}>Domenica</option>
              </select>
            </div>

            <!-- Giorno del Mese (se mensile) -->
            <div class="form-group" id="group-monthday" style="margin-bottom: 0; display: ${autoBackupConfig.frequenza === 'mensile' ? 'flex' : 'none'};">
              <label class="form-label" for="auto-backup-monthday">Giorno del mese</label>
              <select id="auto-backup-monthday" class="form-select">
                <option value="1" ${String(autoBackupConfig.giorno_mese) === '1' ? 'selected' : ''}>1° del mese</option>
                <option value="5" ${String(autoBackupConfig.giorno_mese) === '5' ? 'selected' : ''}>5 del mese</option>
                <option value="10" ${String(autoBackupConfig.giorno_mese) === '10' ? 'selected' : ''}>10 del mese</option>
                <option value="15" ${String(autoBackupConfig.giorno_mese) === '15' ? 'selected' : ''}>15 del mese</option>
                <option value="20" ${String(autoBackupConfig.giorno_mese) === '20' ? 'selected' : ''}>20 del mese</option>
                <option value="28" ${String(autoBackupConfig.giorno_mese) === '28' ? 'selected' : ''}>28 del mese</option>
                <option value="ultimo" ${String(autoBackupConfig.giorno_mese) === 'ultimo' ? 'selected' : ''}>Ultimo giorno del mese</option>
              </select>
            </div>

            <!-- Orario di esecuzione -->
            <div class="form-group" style="margin-bottom: 0;">
              <label class="form-label" for="auto-backup-time">Orario di esecuzione *</label>
              <input
                type="time"
                id="auto-backup-time"
                class="form-input tabular-nums"
                value="${escapeHtml(autoBackupConfig.orario || '22:00')}"
                required
              />
            </div>
          </div>

          <!-- Barra di riepilogo e azioni -->
          <div style="display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 14px; margin-top: 20px; padding-top: 16px; border-top: 1px solid var(--border-color);">
            <div style="display: flex; align-items: center; gap: 8px; font-size: 13px; color: var(--text-secondary);" id="auto-backup-summary">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"></circle>
                <polyline points="12 6 12 12 15 15"></polyline>
              </svg>
              <span id="auto-backup-summary-text">${formatScheduleSummary(autoBackupConfig)}</span>
            </div>

            <div style="display: flex; gap: 10px;">
              <button type="button" class="btn btn-primary btn-sm" id="btn-save-auto-backup">
                <span>Salva impostazioni</span>
              </button>
            </div>
          </div>
        </form>
      </div>

      <div class="data-table-card">
        <div class="table-toolbar">
          <div style="font-size: 14px; font-weight: 600; color: var(--text-primary);">
            File di backup salvati
          </div>
          <span class="badge badge-counter tabular-nums">${backups.length} file</span>
        </div>

        ${
          backups.length === 0
            ? `
              <div class="empty-state">
                <p>Nessun backup trovato. Clicca su "Esegui nuovo backup" per creare il primo salvataggio.</p>
              </div>
            `
            : `
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Data e Ora</th>
                    <th>Nome File Archivio</th>
                    <th style="width: 140px; text-align: right;">Dimensione</th>
                    <th style="width: 130px; text-align: center;">Stato</th>
                    <th style="width: 100px; text-align: center;">Azioni</th>
                  </tr>
                </thead>
                <tbody>
                  ${backups
                    .map((b) => {
                      return `
                        <tr>
                          <td style="font-weight: 600;" class="tabular-nums">
                            ${escapeHtml(formatDateTime(b.data_ora))}
                          </td>
                          <td style="font-family: var(--font-mono); font-size: 12.5px; color: var(--text-secondary);">
                            ${escapeHtml(b.file_name)}
                          </td>
                          <td style="text-align: right; font-weight: 600;" class="tabular-nums">
                            ${b.dimensione_mb.toFixed(2)} MB
                          </td>
                          <td style="text-align: center;">
                            <span class="badge badge-completato">
                              ${escapeHtml(b.stato)}
                            </span>
                          </td>
                          <td style="text-align: center;">
                            <div style="display: flex; gap: 6px; justify-content: center;">
                              <button
                                type="button"
                                class="btn-icon btn-icon-primary"
                                data-action="restore-backup"
                                data-backup-id="${b.id}"
                                data-backup-name="${escapeHtml(b.file_name)}"
                                title="Ripristina backup"
                              >
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                  <polyline points="1 4 1 10 7 10"></polyline>
                                  <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path>
                                </svg>
                              </button>
                              <button
                                type="button"
                                class="btn-icon btn-icon-danger"
                                data-action="delete-backup"
                                data-backup-id="${b.id}"
                                title="Elimina backup"
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

export function initBackupPage(container, rerender) {
    // Manual backup trigger from topbar
  const createBtn = container.querySelector('#btn-create-backup');
  if (createBtn) {
    createBtn.addEventListener('click', async () => {
      createBtn.disabled = true;
      try {
        const newB = await api.createBackup();
        showToast(`Backup ${newB.file_name} completato!`, 'success');
        rerender();
      } catch (err) {
        alert(err.message || 'Errore durante creazione backup');
      } finally {
        createBtn.disabled = false;
      }
    });
  }

  // Export JSON handler
  const exportJsonBtn = container.querySelector('#btn-export-json');
  if (exportJsonBtn) {
    exportJsonBtn.addEventListener('click', async () => {
      try {
        const data = await api.exportDatabaseJson();
        const jsonString = JSON.stringify(data, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        const nowStr = new Date().toISOString().replace(/[-:T.]/g, '').slice(0, 14);
        a.href = url;
        a.download = `gestionale_ore_backup_${nowStr}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showToast('Database esportato in formato JSON con successo!', 'success');
      } catch (err) {
        showToast('Errore durante esportazione JSON', 'error');
      }
    });
  }

  // Import JSON handler
  const importJsonInput = container.querySelector('#input-import-json');
  if (importJsonInput) {
    importJsonInput.addEventListener('change', async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;

      if (!confirm(`ATTENZIONE: Il ripristino del file "${file.name}" sostituirà tutti i dati correnti del database locale con quelli contenuti nel file. Continuare?`)) {
        importJsonInput.value = '';
        return;
      }

      const reader = new FileReader();
      reader.onload = async (evt) => {
        try {
          const parsed = JSON.parse(evt.target.result);
          const res = await api.importDatabaseJson(parsed);
          showToast(`Database ripristinato con successo! (${res.stats.cartellini} cartellini, ${res.stats.clients} clienti)`, 'success');
          rerender();
        } catch (err) {
          alert('Errore ripristino JSON: ' + (err.message || 'File non conforme.'));
        } finally {
          importJsonInput.value = '';
        }
      };
      reader.onerror = () => {
        alert('Impossibile leggere il file selezionato.');
        importJsonInput.value = '';
      };
      reader.readAsText(file);
    });
  }

  // Frequency change handler to show/hide day selectors
  const freqSelect = container.querySelector('#auto-backup-frequency');
  const groupWeekday = container.querySelector('#group-weekday');
  const groupMonthday = container.querySelector('#group-monthday');
  const activeCheckbox = container.querySelector('#auto-backup-active');
  const statusBadge = container.querySelector('#auto-backup-status-badge');
  const timeInput = container.querySelector('#auto-backup-time');
  const weekdaySelect = container.querySelector('#auto-backup-weekday');
  const monthdaySelect = container.querySelector('#auto-backup-monthday');
  const summaryText = container.querySelector('#auto-backup-summary-text');

  function updateFormState() {
    if (!freqSelect) return;
    const freq = freqSelect.value;
    if (groupWeekday) {
      groupWeekday.style.display = freq === 'settimanale' ? 'flex' : 'none';
    }
    if (groupMonthday) {
      groupMonthday.style.display = freq === 'mensile' ? 'flex' : 'none';
    }
    if (statusBadge && activeCheckbox) {
      statusBadge.textContent = activeCheckbox.checked ? 'Attivo' : 'Disattivato';
      statusBadge.className = `badge ${activeCheckbox.checked ? 'badge-completato' : 'badge-archiviato'}`;
    }
    if (summaryText) {
      summaryText.textContent = formatScheduleSummary({
        attivo: activeCheckbox ? activeCheckbox.checked : false,
        frequenza: freq,
        giorno_settimana: weekdaySelect ? weekdaySelect.value : 'lun',
        giorno_mese: monthdaySelect ? monthdaySelect.value : '1',
        orario: timeInput ? timeInput.value : '22:00',
      });
    }
  }

  if (freqSelect) {
    freqSelect.addEventListener('change', updateFormState);
  }
  if (activeCheckbox) {
    activeCheckbox.addEventListener('change', updateFormState);
  }
  if (weekdaySelect) {
    weekdaySelect.addEventListener('change', updateFormState);
  }
  if (monthdaySelect) {
    monthdaySelect.addEventListener('change', updateFormState);
  }
  if (timeInput) {
    timeInput.addEventListener('input', updateFormState);
  }

  // Save auto backup settings
  const saveBtn = container.querySelector('#btn-save-auto-backup');
  if (saveBtn) {
    saveBtn.addEventListener('click', async () => {
      const timeVal = timeInput ? timeInput.value.trim() : '';
      if (!timeVal) {
        showToast('Inserisci un orario valido (es. 22:00)', 'error');
        return;
      }

      saveBtn.disabled = true;
      try {
        const payload = {
          attivo: activeCheckbox ? activeCheckbox.checked : false,
          frequenza: freqSelect ? freqSelect.value : 'giornaliero',
          giorno_settimana: weekdaySelect ? weekdaySelect.value : 'lun',
          giorno_mese: monthdaySelect ? monthdaySelect.value : '1',
          orario: timeVal,
        };
        await api.updateAutoBackupConfig(payload);
        showToast('Configurazione backup automatico salvata con successo!', 'success');
        updateFormState();
      } catch (err) {
        alert(err.message || 'Errore durante il salvataggio della configurazione');
      } finally {
        saveBtn.disabled = false;
      }
    });
  }

  // Table actions: restore & delete
  container.addEventListener('click', async (e) => {
    const restoreBtn = e.target.closest('[data-action="restore-backup"]');
    if (restoreBtn) {
      const bId = restoreBtn.getAttribute('data-backup-id');
      const bName = restoreBtn.getAttribute('data-backup-name');
      if (
        confirm(
          `ATTENZIONE: Il ripristino di "${bName}" sostituirà i dati correnti del database. Continuare?`
        )
      ) {
        try {
          const res = await api.restoreBackup(bId);
          showToast(res.message, 'success');
        } catch (err) {
          alert(err.message || 'Errore durante ripristino');
        }
      }
      return;
    }

    const deleteBtn = e.target.closest('[data-action="delete-backup"]');
    if (deleteBtn) {
      const bId = deleteBtn.getAttribute('data-backup-id');
      if (confirm('Eliminare definitivamente questo file di backup?')) {
        try {
          await api.deleteBackup(bId);
          showToast('Backup rimosso', 'info');
          rerender();
        } catch (err) {
          alert(err.message || 'Errore');
        }
      }
      return;
    }
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

