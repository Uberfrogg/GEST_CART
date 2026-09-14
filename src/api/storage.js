/**
 * LocalStorage management and in-memory storage state for Gestionale Ore mock API.
 * Future Go backend will replace this layer with real HTTP API calls.
 */

import {
  INITIAL_USERS,
  INITIAL_CLIENTS,
  INITIAL_MACHINES,
  INITIAL_MATERIALS,
  INITIAL_CARTELLINI,
  INITIAL_RIGHE_OPERATIVE,
  INITIAL_MATERIALI_CARTELLINO,
  INITIAL_BACKUPS,
} from '../mock-data.js';

export const STORAGE_KEYS = {
  USERS: 'gestionale_ore_users',
  CLIENTS: 'gestionale_ore_clients',
  MACHINES: 'gestionale_ore_machines',
  MATERIALS: 'gestionale_ore_materials',
  CARTELLINI: 'gestionale_ore_cartellini',
  RIGHE: 'gestionale_ore_righe',
  CARTELLINO_MATERIALS: 'gestionale_ore_cmat',
  BACKUPS: 'gestionale_ore_backups',
  AUTO_BACKUP: 'gestionale_ore_auto_backup',
};

export const DEFAULT_AUTO_BACKUP = {
  attivo: true,
  frequenza: 'giornaliero', // 'giornaliero', 'settimanale', 'mensile'
  giorno_settimana: 'lun',
  giorno_mese: 1,
  orario: '22:00',
  ultimo_backup: null,
};

export function loadStorage(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.warn(`Could not read ${key} from storage:`, e);
  }
  return JSON.parse(JSON.stringify(fallback));
}

export function saveStorage(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.warn(`Could not write ${key} to storage:`, e);
  }
}

// In-memory users initialized and migrated
let users = loadStorage(STORAGE_KEYS.USERS, INITIAL_USERS);
const initialUserMap = new Map(INITIAL_USERS.map((u) => [u.username.toUpperCase(), u]));
users = users.map((u) => {
  const nick = (u.nickname || u.username || '').toUpperCase();
  const base = initialUserMap.get(nick);
  return {
    id: u.id || (base ? base.id : `user-${Date.now()}`),
    nickname: nick,
    username: nick,
    ruolo: (u.ruolo || (base ? base.ruolo : 'DIPENDENTE')).toUpperCase(),
    attivo: u.attivo !== false,
  };
});

// Ensure any missing initial users are present
INITIAL_USERS.forEach((initU) => {
  if (!users.some((u) => u.nickname.toUpperCase() === initU.nickname.toUpperCase())) {
    users.push({ ...initU });
  }
});
saveStorage(STORAGE_KEYS.USERS, users);

// In-memory clients initialized
let clients = loadStorage(STORAGE_KEYS.CLIENTS, INITIAL_CLIENTS).map((c) => {
  const { codice, ...rest } = c;
  return {
    ...rest,
    eliminato: !!rest.eliminato,
  };
});
saveStorage(STORAGE_KEYS.CLIENTS, clients);

// In-memory machines initialized
let machines = loadStorage(STORAGE_KEYS.MACHINES, INITIAL_MACHINES).map((m) => ({
  ...m,
  eliminata: !!(m.eliminata || m.eliminato),
  eliminato: !!(m.eliminata || m.eliminato),
}));
saveStorage(STORAGE_KEYS.MACHINES, machines);

// In-memory materials initialized
let materials = loadStorage(STORAGE_KEYS.MATERIALS, INITIAL_MATERIALS);

// In-memory cartellini initialized
let cartellini = loadStorage(STORAGE_KEYS.CARTELLINI, INITIAL_CARTELLINI);
INITIAL_CARTELLINI.forEach((initC) => {
  if (initC.foto_pezzo) {
    const existing = cartellini.find((c) => c.id === initC.id);
    if (existing) {
      if (!existing.foto_pezzo || existing.foto_pezzo.includes('viewBox="0 0 200 200"')) {
        existing.foto_pezzo = initC.foto_pezzo;
      }
    }
  }
});
saveStorage(STORAGE_KEYS.CARTELLINI, cartellini);

// In-memory righe operative initialized
let righeOperative = loadStorage(STORAGE_KEYS.RIGHE, INITIAL_RIGHE_OPERATIVE);

// In-memory cartellino materiali initialized
let cartellinoMateriali = loadStorage(STORAGE_KEYS.CARTELLINO_MATERIALS, INITIAL_MATERIALI_CARTELLINO);

// In-memory backups initialized
let backups = loadStorage(STORAGE_KEYS.BACKUPS, INITIAL_BACKUPS);

// In-memory auto backup configuration initialized
let autoBackupConfig = loadStorage(STORAGE_KEYS.AUTO_BACKUP, DEFAULT_AUTO_BACKUP);

// State accessors
export function getUsersList() {
  return users;
}
export function setUsersList(newList) {
  users = newList;
  saveStorage(STORAGE_KEYS.USERS, users);
}

export function getClientsList() {
  return clients;
}
export function setClientsList(newList) {
  clients = newList;
  saveStorage(STORAGE_KEYS.CLIENTS, clients);
}

export function getMachinesList() {
  return machines;
}
export function setMachinesList(newList) {
  machines = newList;
  saveStorage(STORAGE_KEYS.MACHINES, machines);
}

export function getMaterialsList() {
  return materials;
}
export function setMaterialsList(newList) {
  materials = newList;
  saveStorage(STORAGE_KEYS.MATERIALS, materials);
}

export function getCartelliniList() {
  return cartellini;
}
export function setCartelliniList(newList) {
  cartellini = newList;
  saveStorage(STORAGE_KEYS.CARTELLINI, cartellini);
}

export function getRigheOperativeList() {
  return righeOperative;
}
export function setRigheOperativeList(newList) {
  righeOperative = newList;
  saveStorage(STORAGE_KEYS.RIGHE, righeOperative);
}

export function getCartellinoMaterialiList() {
  return cartellinoMateriali;
}
export function setCartellinoMaterialiList(newList) {
  cartellinoMateriali = newList;
  saveStorage(STORAGE_KEYS.CARTELLINO_MATERIALS, cartellinoMateriali);
}

export function getBackupsList() {
  return backups;
}
export function setBackupsList(newList) {
  backups = newList;
  saveStorage(STORAGE_KEYS.BACKUPS, backups);
}

export function getAutoBackupConfigState() {
  return autoBackupConfig;
}
export function setAutoBackupConfigState(newConfig) {
  autoBackupConfig = newConfig;
  saveStorage(STORAGE_KEYS.AUTO_BACKUP, autoBackupConfig);
}
