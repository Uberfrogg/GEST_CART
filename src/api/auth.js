/**
 * Authentication and Users/Employees API Module
 */

import {
  getUsersList,
  setUsersList,
  STORAGE_KEYS,
  saveStorage,
} from './storage.js';

/**
 * Simulates POST /api/auth/login
 * Validates nickname/username against registered users.
 */
export async function login(username, password) {
  await new Promise((r) => setTimeout(r, 100)); // Simulates network tick

  const users = getUsersList();
  const trimmedUser = (username || '').trim().toUpperCase();
  const todayStr = new Date().toISOString().slice(0, 10);
  const user = users.find(
    (u) =>
      (u.nickname.toUpperCase() === trimmedUser || u.username.toUpperCase() === trimmedUser)
  );

  if (!user) {
    const err = new Error('Credenziali non valide o utente non autorizzato');
    err.code = 'INVALID_CREDENTIALS';
    throw err;
  }

  // Check if user is disabled or deleted effective as of today
  if (!user.attivo || (user.eliminato && user.eliminato_dal && todayStr >= user.eliminato_dal)) {
    const err = new Error('Account utente disattivato o eliminato');
    err.code = 'USER_INACTIVE';
    throw err;
  }

  if (!password || password.trim().length === 0) {
    const err = new Error('Inserisci la password');
    err.code = 'EMPTY_PASSWORD';
    throw err;
  }

  if (!user.password || user.password.trim() === '') {
    const err = new Error('Utente privo di password configurata. Impossibile autenticare.');
    err.code = 'USER_NO_PASSWORD';
    throw err;
  }

  if (user.password !== password.trim()) {
    const err = new Error('Password errata');
    err.code = 'INVALID_PASSWORD';
    throw err;
  }

  return {
    success: true,
    user: {
      id: user.id,
      nickname: user.nickname,
      username: user.nickname,
      ruolo: user.ruolo,
      attivo: user.attivo,
    },
  };
}

/**
 * Simulates GET /api/users
 * Returns all users/dipendenti with optional filtering
 */
export async function getUsers({ search = '', role = '', includeInactive = true, includeDeleted = false } = {}) {
  let result = [...getUsersList()];

  if (!includeDeleted) {
    result = result.filter((u) => !u.eliminato);
  }

  if (!includeInactive) {
    result = result.filter((u) => u.attivo && !u.eliminato);
  }

  if (role) {
    result = result.filter((u) => u.ruolo.toUpperCase() === role.toUpperCase());
  }

  if (search && search.trim()) {
    const s = search.trim().toLowerCase();
    result = result.filter(
      (u) =>
        (u.nickname || '').toLowerCase().includes(s) ||
        (u.ruolo || '').toLowerCase().includes(s)
    );
  }

  return JSON.parse(JSON.stringify(result));
}

/**
 * Simulates GET /api/dipendenti
 * Returns list of employees.
 * If onlyActive is true, returns only currently active non-deleted users.
 */
export async function getDipendenti({ onlyActive = false, includeDeleted = false } = {}) {
  const users = getUsersList();
  let result = [...users];
  if (onlyActive) {
    result = result.filter((u) => u.attivo && !u.eliminato);
  } else if (!includeDeleted) {
    result = result.filter((u) => !u.eliminato);
  }
  return JSON.parse(JSON.stringify(result));
}

/**
 * Simulates GET /api/users/:id
 */
export async function getUser(id) {
  const users = getUsersList();
  const user = users.find((u) => u.id === id);
  if (!user) {
    throw new Error(`Utente #${id} non trovato`);
  }
  return JSON.parse(JSON.stringify(user));
}

/**
 * Simulates POST /api/users (Create Dipendente / Utente)
 */
export async function createDipendente({ nickname, ruolo = 'DIPENDENTE', attivo = true, password = '' }) {
  const users = [...getUsersList()];
  const trimmedNick = (nickname || '').trim().toUpperCase();
  if (!trimmedNick) {
    throw new Error('Il nickname del dipendente è obbligatorio.');
  }

  const trimmedPassword = (password || '').trim();
  if (!trimmedPassword) {
    throw new Error('La password provvisoria è obbligatoria.');
  }

  const existing = users.find((u) => u.nickname.toUpperCase() === trimmedNick);
  if (existing) {
    throw new Error(`Esiste già un utente registrato con il nickname "${trimmedNick}".`);
  }

  const validRoles = ['DIPENDENTE', 'SEGRETERIA', 'ADMIN'];
  const normalizedRole = (ruolo || 'DIPENDENTE').toUpperCase();
  if (!validRoles.includes(normalizedRole)) {
    throw new Error('Ruolo non valido (consentiti: DIPENDENTE, SEGRETERIA, ADMIN).');
  }

  const newUser = {
    id: `user-${trimmedNick.toLowerCase().replace(/[^a-z0-9]/g, '') || Date.now()}-${Date.now().toString().slice(-4)}`,
    nickname: trimmedNick,
    username: trimmedNick,
    password: trimmedPassword,
    ruolo: normalizedRole,
    attivo: Boolean(attivo),
    eliminato: false,
    creato_il: new Date().toISOString(),
  };

  users.push(newUser);
  setUsersList(users);
  return JSON.parse(JSON.stringify(newUser));
}

/**
 * Simulates PUT /api/users/:id (Update Dipendente / Utente)
 */
export async function updateDipendente(id, { nickname, password, ruolo, attivo }) {
  const users = [...getUsersList()];
  const userIndex = users.findIndex((u) => u.id === id);
  if (userIndex === -1) {
    throw new Error(`Dipendente con ID "${id}" non trovato.`);
  }

  const trimmedNick = (nickname || users[userIndex].nickname).trim().toUpperCase();
  if (!trimmedNick) {
    throw new Error('Il nickname non può essere vuoto.');
  }

  const duplicate = users.find(
    (u) => u.id !== id && u.nickname.toUpperCase() === trimmedNick
  );
  if (duplicate) {
    throw new Error(`Esiste già un altro utente con il nickname "${trimmedNick}".`);
  }

  const validRoles = ['DIPENDENTE', 'SEGRETERIA', 'ADMIN'];
  const normalizedRole = ruolo ? ruolo.toUpperCase() : users[userIndex].ruolo;
  if (ruolo && !validRoles.includes(normalizedRole)) {
    throw new Error('Ruolo non valido (consentiti: DIPENDENTE, SEGRETERIA, ADMIN).');
  }

  users[userIndex] = {
    ...users[userIndex],
    nickname: trimmedNick,
    username: trimmedNick,
    password: password && password.trim() ? password.trim() : users[userIndex].password,
    ruolo: normalizedRole,
    attivo: attivo !== undefined ? Boolean(attivo) : users[userIndex].attivo,
  };

  setUsersList(users);
  return JSON.parse(JSON.stringify(users[userIndex]));
}

/**
 * Simulates DELETE /api/users/:id (Delete Dipendente / Utente)
 * With effect from tomorrow: preserves all historical data in cartellini and calendar!
 */
export async function deleteDipendente(id, currentUserId = null) {
  const users = [...getUsersList()];
  if (id === currentUserId) {
    throw new Error('Non puoi eliminare l’utente con cui sei attualmente connesso.');
  }

  const userToDelete = users.find((u) => u.id === id);
  if (!userToDelete) {
    throw new Error(`Dipendente con ID "${id}" non trovato.`);
  }

  // Protect against deleting the only admin
  if (userToDelete.ruolo === 'ADMIN') {
    const activeAdmins = users.filter((u) => u.ruolo === 'ADMIN' && !u.eliminato).length;
    if (activeAdmins <= 1) {
      throw new Error('Non è possibile eliminare l’unico amministratore di sistema rimasto.');
    }
  }

  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const tomorrowStr = tomorrow.toISOString().slice(0, 10);

  const userIndex = users.findIndex((u) => u.id === id);
  users[userIndex] = {
    ...users[userIndex],
    attivo: false,
    eliminato: true,
    data_eliminazione: todayStr,
    eliminato_dal: tomorrowStr,
  };

  setUsersList(users);
  return { success: true, eliminato_dal: tomorrowStr };
}

/**
 * Simulates POST /api/auth/change-password
 */
export async function changePassword(userId, currentPassword, newPassword) {
  const users = [...getUsersList()];
  const userIndex = users.findIndex((u) => u.id === userId);
  if (userIndex === -1) {
    throw new Error('Utente non trovato.');
  }

  const user = users[userIndex];
  const trimmedCurrent = (currentPassword || '').trim();
  const trimmedNew = (newPassword || '').trim();

  if (user.password && user.password !== trimmedCurrent) {
    const err = new Error('La password attuale non è corretta.');
    err.code = 'INVALID_CURRENT_PASSWORD';
    throw err;
  }

  if (!trimmedNew) {
    throw new Error('Inserisci la nuova password.');
  }

  if (trimmedNew.length < 3) {
    throw new Error('La nuova password deve contenere almeno 3 caratteri.');
  }

  users[userIndex] = {
    ...users[userIndex],
    password: trimmedNew,
  };

  setUsersList(users);
  return { success: true };
}
