/**
 * Backup and Database JSON Export/Import API Module
 */

import {
  getBackupsList,
  setBackupsList,
  getAutoBackupConfigState,
  setAutoBackupConfigState,
  DEFAULT_AUTO_BACKUP,
  getUsersList,
  setUsersList,
  getClientsList,
  setClientsList,
  getMachinesList,
  setMachinesList,
  getMaterialsList,
  setMaterialsList,
  getCartelliniList,
  setCartelliniList,
  getRigheOperativeList,
  setRigheOperativeList,
  getCartellinoMaterialiList,
  setCartellinoMaterialiList,
} from './storage.js';

/**
 * Simulates GET /api/backups
 */
export async function getBackups() {
  return JSON.parse(JSON.stringify(getBackupsList()));
}

/**
 * Simulates POST /api/backups
 */
export async function createBackup() {
  const backups = [...getBackupsList()];
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const ts = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}`;
  const dateFormatted = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`;

  const newBackup = {
    id: `bak-${Date.now()}`,
    file_name: `backup_gestionale_${ts}.sqlite`,
    data_ora: dateFormatted,
    dimensione_mb: 2.50,
    stato: 'Completato',
  };

  backups.unshift(newBackup);
  setBackupsList(backups);
  return JSON.parse(JSON.stringify(newBackup));
}

/**
 * Simulates POST /api/backups/:id/restore
 */
export async function restoreBackup(id) {
  const backups = getBackupsList();
  const b = backups.find((item) => item.id === id);
  if (!b) {
    throw new Error(`Backup non trovato: ${id}`);
  }
  return { success: true, message: `Backup ripristinato con successo: ${b.file_name}` };
}

/**
 * Simulates DELETE /api/backups/:id
 */
export async function deleteBackup(id) {
  let backups = getBackupsList().filter((b) => b.id !== id);
  setBackupsList(backups);
  return { success: true };
}

/**
 * Simulates GET /api/backup-schedule
 */
export async function getAutoBackupConfig() {
  return JSON.parse(JSON.stringify(getAutoBackupConfigState()));
}

/**
 * Simulates PUT /api/backup-schedule
 */
export async function updateAutoBackupConfig(newConfig) {
  const current = getAutoBackupConfigState();
  const updated = {
    ...current,
    ...newConfig,
  };
  setAutoBackupConfigState(updated);
  return JSON.parse(JSON.stringify(updated));
}

/**
 * Exports full application database in structured JSON format.
 */
export async function exportDatabaseJson() {
  const exportData = {
    app: 'Gestionale Ore & Cartellini di Lavorazione',
    version: '1.0.0',
    exported_at: new Date().toISOString(),
    data: {
      users: getUsersList(),
      clients: getClientsList(),
      machines: getMachinesList(),
      materials: getMaterialsList(),
      cartellini: getCartelliniList(),
      righeOperative: getRigheOperativeList(),
      cartellinoMateriali: getCartellinoMaterialiList(),
      backups: getBackupsList(),
      autoBackupConfig: getAutoBackupConfigState(),
    },
  };
  return exportData;
}

/**
 * Restores application database from structured JSON payload.
 */
export async function importDatabaseJson(jsonPayload) {
  if (!jsonPayload || typeof jsonPayload !== 'object') {
    throw new Error('File JSON non valido o corrotto.');
  }

  const payloadData = jsonPayload.data || jsonPayload;

  if (!Array.isArray(payloadData.clients) || !Array.isArray(payloadData.cartellini)) {
    throw new Error('Struttura dati non valida: mancano le collezioni principali (clienti o cartellini).');
  }

  if (Array.isArray(payloadData.users || payloadData.dipendenti)) {
    const rawUsers = payloadData.users || payloadData.dipendenti;
    const importedUsers = rawUsers.map((u) => {
      const nick = (u.nickname || u.username || '').toUpperCase();
      return {
        id: u.id || `user-${nick.toLowerCase().replace(/[^a-z0-9]/g, '') || Date.now()}-${Date.now().toString().slice(-4)}`,
        nickname: nick,
        username: nick,
        password: u.password !== undefined && u.password !== null ? String(u.password) : '',
        ruolo: (u.ruolo || 'DIPENDENTE').toUpperCase(),
        attivo: u.attivo !== false,
        eliminato: u.eliminato === true,
        eliminato_dal: u.eliminato_dal || null,
        data_eliminazione: u.data_eliminazione || null,
        creato_il: u.creato_il || null,
      };
    });
    setUsersList(importedUsers);
  }

  const newClients = payloadData.clients.map((c) => {
    const { codice, ...rest } = c;
    return rest;
  });
  setClientsList(newClients);

  if (Array.isArray(payloadData.machines)) {
    setMachinesList(payloadData.machines);
  }

  if (Array.isArray(payloadData.materials)) {
    setMaterialsList(payloadData.materials);
  }

  setCartelliniList(payloadData.cartellini);

  if (Array.isArray(payloadData.righeOperative || payloadData.righe)) {
    setRigheOperativeList(payloadData.righeOperative || payloadData.righe);
  }

  if (Array.isArray(payloadData.cartellinoMateriali || payloadData.materiali)) {
    setCartellinoMaterialiList(payloadData.cartellinoMateriali || payloadData.materiali);
  }

  if (Array.isArray(payloadData.backups)) {
    setBackupsList(payloadData.backups);
  }

  if (payloadData.autoBackupConfig) {
    setAutoBackupConfigState({
      ...DEFAULT_AUTO_BACKUP,
      ...payloadData.autoBackupConfig,
    });
  }

  return {
    success: true,
    stats: {
      users: getUsersList().length,
      clients: getClientsList().length,
      machines: getMachinesList().length,
      cartellini: getCartelliniList().length,
      righe: getRigheOperativeList().length,
    },
  };
}
