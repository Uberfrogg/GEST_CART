/**
 * Central API Layer for Gestionale Ore.
 *
 * All data operations pass through this file.
 * In this initial phase, it uses structured mock data with local persistence.
 * All functions return Promises to seamlessly match future Go backend `/api/*` endpoints.
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
} from './mock-data.js';

import {
  calculateTotalWeightKg,
  calculateCartellinoTotalWeight,
  MATERIAL_DENSITIES,
} from './utils/materials.js';

const STORAGE_KEYS = {
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

const DEFAULT_AUTO_BACKUP = {
  attivo: true,
  frequenza: 'giornaliero', // 'giornaliero', 'settimanale', 'mensile'
  giorno_settimana: 'lun',
  giorno_mese: 1,
  orario: '22:00',
  ultimo_backup: null,
};

function loadStorage(key, fallback) {
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

function saveStorage(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.warn(`Could not write ${key} to storage:`, e);
  }
}

// In-memory users initialized and migrated to ensure the required 4 nicknames exist
let users = loadStorage(STORAGE_KEYS.USERS, INITIAL_USERS);
// Ensure all initial users exist and clean up any legacy nome/cognome fields
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

// Ensure any missing initial users (ANDREA, GABRIELE, MARINA, ADMIN) are present
INITIAL_USERS.forEach((initU) => {
  if (!users.some((u) => u.nickname.toUpperCase() === initU.nickname.toUpperCase())) {
    users.push({ ...initU });
  }
});
saveStorage(STORAGE_KEYS.USERS, users);

// In-memory data initialized from localStorage or initial mock data
let clients = loadStorage(STORAGE_KEYS.CLIENTS, INITIAL_CLIENTS).map((c) => {
  const { codice, ...rest } = c;
  return {
    ...rest,
    eliminato: !!rest.eliminato,
  };
});
saveStorage(STORAGE_KEYS.CLIENTS, clients);
let machines = loadStorage(STORAGE_KEYS.MACHINES, INITIAL_MACHINES).map((m) => ({
  ...m,
  eliminata: !!(m.eliminata || m.eliminato),
  eliminato: !!(m.eliminata || m.eliminato),
}));
saveStorage(STORAGE_KEYS.MACHINES, machines);
let materials = loadStorage(STORAGE_KEYS.MATERIALS, INITIAL_MATERIALS);
let cartellini = loadStorage(STORAGE_KEYS.CARTELLINI, INITIAL_CARTELLINI);
// Ensure sample photos for initial mock items if present
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
let righeOperative = loadStorage(STORAGE_KEYS.RIGHE, INITIAL_RIGHE_OPERATIVE);
let cartellinoMateriali = loadStorage(STORAGE_KEYS.CARTELLINO_MATERIALS, INITIAL_MATERIALI_CARTELLINO);
let backups = loadStorage(STORAGE_KEYS.BACKUPS, INITIAL_BACKUPS);
let autoBackupConfig = loadStorage(STORAGE_KEYS.AUTO_BACKUP, DEFAULT_AUTO_BACKUP);

export const api = {
  /**
   * Simulates POST /api/auth/login
   * Validates nickname/username against registered users.
   */
  async login(username, password) {
    await new Promise((r) => setTimeout(r, 100)); // Simulates network tick

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

    if (user.password && user.password !== password.trim()) {
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
  },

  /**
   * Simulates GET /api/users
   * Returns all users/dipendenti with optional filtering
   */
  async getUsers({ search = '', role = '', includeInactive = true, includeDeleted = false } = {}) {
    let result = [...users];

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
  },

  /**
   * Simulates GET /api/dipendenti
   * Returns list of employees.
   * If onlyActive is true, returns only currently active non-deleted users.
   */
  async getDipendenti({ onlyActive = false, includeDeleted = false } = {}) {
    let result = [...users];
    if (onlyActive) {
      result = result.filter((u) => u.attivo && !u.eliminato);
    } else if (!includeDeleted) {
      result = result.filter((u) => !u.eliminato);
    }
    return JSON.parse(JSON.stringify(result));
  },

  /**
   * Simulates GET /api/users/:id
   */
  async getUser(id) {
    const user = users.find((u) => u.id === id);
    if (!user) {
      throw new Error(`Utente #${id} non trovato`);
    }
    return JSON.parse(JSON.stringify(user));
  },

  /**
   * Simulates POST /api/users (Create Dipendente / Utente)
   */
  async createDipendente({ nickname, ruolo = 'DIPENDENTE', attivo = true, password = '' }) {
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
    saveStorage(STORAGE_KEYS.USERS, users);
    return JSON.parse(JSON.stringify(newUser));
  },

  /**
   * Simulates PUT /api/users/:id (Update Dipendente / Utente)
   */
  async updateDipendente(id, { nickname, password, ruolo, attivo }) {
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

    saveStorage(STORAGE_KEYS.USERS, users);
    return JSON.parse(JSON.stringify(users[userIndex]));
  },

  /**
   * Simulates DELETE /api/users/:id (Delete Dipendente / Utente)
   * With effect from tomorrow: preserves all historical data in cartellini and calendar!
   */
  async deleteDipendente(id, currentUserId = null) {
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

    saveStorage(STORAGE_KEYS.USERS, users);
    return { success: true, eliminato_dal: tomorrowStr };
  },

  /**
   * Simulates POST /api/auth/change-password
   */
  async changePassword(userId, currentPassword, newPassword) {
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

    saveStorage(STORAGE_KEYS.USERS, users);
    return { success: true };
  },

  /**
   * Simulates GET /api/cartellini
   */
  async getCartellini({ search = '', stato = '', cliente_id = '' } = {}) {
    let result = [...cartellini];

    if (stato) {
      result = result.filter((c) => c.stato === stato);
    }

    if (cliente_id) {
      result = result.filter((c) => c.cliente_id === cliente_id);
    }

    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter((c) => {
        const client = clients.find((cli) => cli.id === c.cliente_id);
        const clientName = client ? client.nome.toLowerCase() : '';
        const num = (c.numero || '').toLowerCase();
        const commessa = (c.commessa || '').toLowerCase();
        const desc = (c.descrizione || '').toLowerCase();
        const note = (c.note || '').toLowerCase();

        return (
          num.includes(q) ||
          commessa.includes(q) ||
          clientName.includes(q) ||
          desc.includes(q) ||
          note.includes(q)
        );
      });
    }

    return JSON.parse(
      JSON.stringify(
        result.map((cart) => ({
          ...cart,
          cliente: clients.find((cli) => cli.id === cart.cliente_id) || null,
        }))
      )
    );
  },

  /**
   * Simulates GET /api/cartellini?cliente_id=:id
   */
  async getCartelliniByCliente(clienteId) {
    const list = cartellini.filter((c) => c.cliente_id === clienteId);
    return JSON.parse(JSON.stringify(list));
  },

  /**
   * Simulates GET /api/cartellini/:id
   */
  async getCartellinoById(id) {
    const c = cartellini.find((item) => item.id === id);
    if (!c) {
      throw new Error(`Cartellino non trovato: ${id}`);
    }

    const cliente = clients.find((cli) => cli.id === c.cliente_id) || null;
    const righe = righeOperative.filter((r) => r.cartellino_id === id);
    const mats = cartellinoMateriali.filter((m) => m.cartellino_id === id);

    // Calculate aggregated totals
    const oreOperatore = righe
      .filter((r) => r.kind === 'OPER')
      .reduce((acc, r) => acc + (parseFloat(r.ore) || 0), 0);

    const oreMacchina = righe
      .filter((r) => r.kind === 'MACCH')
      .reduce((acc, r) => acc + (parseFloat(r.ore) || 0), 0);

    const pesoTotale = calculateCartellinoTotalWeight(mats);

    return {
      ...JSON.parse(JSON.stringify(c)),
      cliente,
      righe: JSON.parse(JSON.stringify(righe)),
      materiali: JSON.parse(JSON.stringify(mats)),
      ore_totali_operatore: oreOperatore,
      ore_totali_macchina: oreMacchina,
      peso_totale: Math.round(pesoTotale * 100) / 100,
    };
  },

  /**
   * Simulates POST /api/cartellini
   */
  async createCartellino({ cliente_id, commessa, descrizione = '', note = '', foto_pezzo = null }) {
    if (!cliente_id) {
      throw new Error('Il cliente è obbligatorio');
    }
    const targetCli = clients.find((c) => c.id === cliente_id);
    if (!targetCli || targetCli.eliminato || targetCli.attivo === false) {
      throw new Error('Impossibile creare un cartellino per un cliente eliminato o disattivato');
    }
    if (!commessa || !commessa.trim()) {
      throw new Error('La commessa è obbligatoria');
    }

    // Auto-generate number
    const maxNum = cartellini.reduce((max, c) => {
      const match = (c.numero || '').match(/#(\d+)/);
      if (match) {
        const val = parseInt(match[1], 10);
        return val > max ? val : max;
      }
      return max;
    }, 0);

    const nextNum = maxNum + 1;
    const formattedNum = `#${String(nextNum).padStart(3, '0')}`;

    const newCart = {
      id: `cart-${Date.now()}`,
      numero: formattedNum,
      cliente_id,
      commessa: commessa.trim(),
      descrizione: descrizione.trim(),
      quantita: parseInt(arguments[0].quantita, 10) || 1,
      stato: 'in-lavorazione',
      data_creazione: new Date().toISOString().slice(0, 10),
      peso_totale: 0,
      note: note.trim(),
      foto_pezzo: foto_pezzo || null,
    };

    cartellini.unshift(newCart);
    saveStorage(STORAGE_KEYS.CARTELLINI, cartellini);

    return JSON.parse(JSON.stringify(newCart));
  },

  /**
   * Simulates PATCH /api/cartellini/:id/foto
   */
  async updateCartellinoFoto(id, foto_pezzo) {
    const c = cartellini.find((item) => item.id === id);
    if (!c) {
      throw new Error(`Cartellino non trovato: ${id}`);
    }
    c.foto_pezzo = foto_pezzo || null;
    saveStorage(STORAGE_KEYS.CARTELLINI, cartellini);
    return JSON.parse(JSON.stringify(c));
  },

  /**
   * Simulates PATCH /api/cartellini/:id/stato
   */
  async updateCartellinoStato(id, nuovoStato) {
    const validStates = ['in-lavorazione', 'completato', 'archiviato'];
    if (!validStates.includes(nuovoStato)) {
      throw new Error(`Stato non valido: ${nuovoStato}`);
    }

    const c = cartellini.find((item) => item.id === id);
    if (!c) {
      throw new Error(`Cartellino non trovato: ${id}`);
    }

    c.stato = nuovoStato;
    saveStorage(STORAGE_KEYS.CARTELLINI, cartellini);
    return JSON.parse(JSON.stringify(c));
  },

  /**
   * Simulates GET /api/clienti
   */
  async getClienti({ search = '', includeDeleted = false, onlyActive = false } = {}) {
    let result = [...clients];

    if (!includeDeleted) {
      result = result.filter((c) => !c.eliminato);
    }
    if (onlyActive) {
      result = result.filter((c) => c.attivo !== false && !c.eliminato);
    }

    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter(
        (c) =>
          c.nome.toLowerCase().includes(q) ||
          (c.piva && c.piva.includes(q)) ||
          (c.citta && c.citta.toLowerCase().includes(q))
      );
    }

    // Attach active cartellini count
    return result.map((cli) => {
      const activeCount = cartellini.filter(
        (cart) => cart.cliente_id === cli.id && cart.stato !== 'archiviato'
      ).length;
      return {
        ...JSON.parse(JSON.stringify(cli)),
        cartellini_attivi_count: activeCount,
      };
    });
  },

  /**
   * Simulates GET /api/clienti/:id
   */
  async getClienteById(id) {
    const cli = clients.find((c) => c.id === id);
    if (!cli) return null;
    return JSON.parse(JSON.stringify(cli));
  },

  /**
   * Simulates POST /api/clienti
   */
  async createCliente(data) {
    if (!data.nome || !data.nome.trim()) {
      throw new Error('Il nome del cliente è obbligatorio');
    }

    const newCliente = {
      id: `cli-${Date.now()}`,
      nome: data.nome.trim().toUpperCase(),
      via: (data.via || '').trim(),
      cap: (data.cap || '').trim(),
      citta: (data.citta || '').trim(),
      piva: (data.piva || '').trim(),
      attivo: true,
      eliminato: false,
    };

    clients.push(newCliente);
    saveStorage(STORAGE_KEYS.CLIENTS, clients);
    return JSON.parse(JSON.stringify(newCliente));
  },

  /**
   * Simulates PUT /api/clienti/:id
   */
  async updateCliente(id, data) {
    const idx = clients.findIndex((c) => c.id === id);
    if (idx === -1) {
      throw new Error(`Cliente non trovato: ${id}`);
    }

    const { codice, ...safeData } = data;
    const updated = {
      ...clients[idx],
      ...safeData,
      nome: (safeData.nome || clients[idx].nome).trim().toUpperCase(),
    };
    delete updated.codice;
    clients[idx] = updated;

    saveStorage(STORAGE_KEYS.CLIENTS, clients);
    return JSON.parse(JSON.stringify(clients[idx]));
  },

  /**
   * Simulates DELETE /api/clienti/:id
   * Soft deletion: preserves all cartellini and historical entries up to today!
   */
  async deleteCliente(id) {
    const idx = clients.findIndex((c) => c.id === id);
    if (idx === -1) {
      throw new Error(`Cliente non trovato: ${id}`);
    }

    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);

    // Soft deletion: historical data and cartellini are preserved
    clients[idx] = {
      ...clients[idx],
      attivo: false,
      eliminato: true,
      data_eliminazione: todayStr,
      eliminato_il: todayStr,
    };

    saveStorage(STORAGE_KEYS.CLIENTS, clients);
    return { success: true, removed: clients[idx] };
  },

  /**
   * Simulates GET /api/macchine
   */
  async getMacchine({ search = '', includeDeleted = false, onlyActive = false } = {}) {
    let result = [...machines];

    if (!includeDeleted) {
      result = result.filter((m) => !m.eliminata && !m.eliminato);
    }
    if (onlyActive) {
      result = result.filter((m) => m.attiva !== false && !m.eliminata && !m.eliminato);
    }

    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter(
        (m) =>
          m.nome.toLowerCase().includes(q) ||
          (m.codice && m.codice.toLowerCase().includes(q))
      );
    }
    return JSON.parse(JSON.stringify(result));
  },

  /**
   * Simulates GET /api/macchine/:id
   */
  async getMacchinaById(id) {
    const m = machines.find((item) => item.id === id);
    if (!m) return null;
    return JSON.parse(JSON.stringify(m));
  },

  /**
   * Simulates POST /api/macchine
   */
  async createMacchina(data) {
    if (!data.nome || !data.nome.trim()) {
      throw new Error('Il nome della macchina è obbligatorio');
    }

    const newMacchina = {
      id: `mac-${Date.now()}`,
      codice: data.codice ? data.codice.trim().toUpperCase() : `MAC${machines.length + 1}`,
      nome: data.nome.trim().toUpperCase(),
      attiva: true,
      eliminata: false,
      eliminato: false,
    };

    machines.push(newMacchina);
    saveStorage(STORAGE_KEYS.MACHINES, machines);
    return JSON.parse(JSON.stringify(newMacchina));
  },

  /**
   * Simulates PUT /api/macchine/:id
   */
  async updateMacchina(id, data) {
    const idx = machines.findIndex((m) => m.id === id);
    if (idx === -1) {
      throw new Error(`Macchina non trovata: ${id}`);
    }

    machines[idx] = {
      ...machines[idx],
      ...data,
    };

    saveStorage(STORAGE_KEYS.MACHINES, machines);
    return JSON.parse(JSON.stringify(machines[idx]));
  },

  /**
   * Simulates DELETE /api/macchine/:id
   * Soft deletion: preserves all historical work records and cartellini!
   */
  async deleteMacchina(id) {
    const idx = machines.findIndex((m) => m.id === id);
    if (idx === -1) {
      throw new Error(`Macchina non trovata: ${id}`);
    }

    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);

    // Soft deletion: historical data and righe operative are preserved
    machines[idx] = {
      ...machines[idx],
      attiva: false,
      eliminata: true,
      eliminato: true,
      data_eliminazione: todayStr,
      eliminato_il: todayStr,
    };

    saveStorage(STORAGE_KEYS.MACHINES, machines);
    return { success: true, removed: machines[idx] };
  },

  /**
   * Simulates GET /api/materials
   */
  async getMaterialiAnagrafica() {
    return JSON.parse(JSON.stringify(materials));
  },

  /**
   * Simulates POST /api/cartellini/:id/righe
   * Validates hours in 0.5 steps (ACTIVE.md §12)
   */
  async addRigaOperativa({ cartellino_id = null, kind, ref_id, data_lavoro, ore, nota = '', tipo_assenza = '' }) {
    if (!['OPER', 'MACCH'].includes(kind)) {
      throw new Error('Tipo riga non valido (deve essere OPER o MACCH)');
    }
    if (!ref_id) {
      throw new Error('Riferimento operatore o macchina obbligatorio');
    }
    if (!data_lavoro) {
      throw new Error('La data di lavoro è obbligatoria');
    }

    if (kind === 'MACCH') {
      const mach = machines.find((m) => m.id === ref_id);
      if (!mach || mach.eliminata || mach.eliminato || mach.attiva === false) {
        throw new Error('Impossibile inserire registrazioni su una macchina eliminata o disattivata');
      }
    }
    if (kind === 'OPER') {
      const dip = users.find((u) => u.id === ref_id);
      if (!dip || dip.eliminato || dip.attivo === false) {
        throw new Error('Impossibile inserire registrazioni per un dipendente eliminato o disattivato');
      }
    }

    const oreVal = parseFloat(ore);
    if (isNaN(oreVal) || oreVal <= 0) {
      throw new Error('Le ore devono essere maggiori di 0');
    }

    // Must be in increments of 0.5h
    if ((oreVal * 2) % 1 !== 0) {
      throw new Error('Le ore devono essere in incrementi di 0,5 (es. 0.5, 1.0, 1.5)');
    }

    const newRow = {
      id: `row-${Date.now()}`,
      cartellino_id: cartellino_id || null,
      kind,
      ref_id,
      data_lavoro,
      ore: oreVal,
      nota: (nota || '').trim(),
      tipo_assenza: tipo_assenza || '',
    };

    righeOperative.push(newRow);
    saveStorage(STORAGE_KEYS.RIGHE, righeOperative);
    return JSON.parse(JSON.stringify(newRow));
  },

  /**
   * Simulates DELETE /api/righe/:id
   */
  async deleteRigaOperativa(id) {
    righeOperative = righeOperative.filter((r) => r.id !== id);
    saveStorage(STORAGE_KEYS.RIGHE, righeOperative);
    return { success: true };
  },

  /**
   * Simulates PUT /api/righe/:id
   */
  async updateRigaOperativa(id, { ore, nota, tipo_assenza, cartellino_id, data_lavoro }) {
    const riga = righeOperative.find((r) => r.id === id);
    if (!riga) {
      throw new Error('Riga non trovata');
    }

    if (ore !== undefined) {
      const oreVal = parseFloat(ore);
      if (isNaN(oreVal) || oreVal <= 0) {
        throw new Error('Le ore devono essere maggiori di 0');
      }
      if ((oreVal * 2) % 1 !== 0) {
        throw new Error('Le ore devono essere in incrementi di 0,5 (es. 0.5, 1.0, 1.5)');
      }
      riga.ore = oreVal;
    }

    if (nota !== undefined) {
      riga.nota = (nota || '').trim();
    }

    if (tipo_assenza !== undefined) {
      riga.tipo_assenza = tipo_assenza || '';
    }

    if (cartellino_id !== undefined) {
      riga.cartellino_id = cartellino_id || null;
    }

    if (data_lavoro !== undefined) {
      riga.data_lavoro = data_lavoro;
    }

    saveStorage(STORAGE_KEYS.RIGHE, righeOperative);
    return JSON.parse(JSON.stringify(riga));
  },

  /**
   * Simulates POST /api/cartellini/:id/materiali
   */
  async addMaterialeCartellino({ cartellino_id, materiale_nome, qty, x_mm, y_mm, z_mm }) {
    const q = parseFloat(qty) || 1;
    const x = parseFloat(x_mm) || 0;
    const y = parseFloat(y_mm) || 0;
    const z = parseFloat(z_mm) || 0;

    const densita = MATERIAL_DENSITIES[materiale_nome] || 2700;
    const pesoKg = calculateTotalWeightKg(q, x, y, z, densita);

    const newMat = {
      id: `cmat-${Date.now()}`,
      cartellino_id,
      materiale_id: `mat-${materiale_nome.toLowerCase().slice(0, 3)}`,
      nome: materiale_nome,
      qty: q,
      x_mm: x,
      y_mm: y,
      z_mm: z,
      densita,
      peso_kg: Math.round(pesoKg * 100) / 100,
    };

    cartellinoMateriali.push(newMat);
    saveStorage(STORAGE_KEYS.CARTELLINO_MATERIALS, cartellinoMateriali);

    // Update cartellino total weight
    const mats = cartellinoMateriali.filter((m) => m.cartellino_id === cartellino_id);
    const c = cartellini.find((item) => item.id === cartellino_id);
    if (c) {
      c.peso_totale = Math.round(calculateCartellinoTotalWeight(mats) * 100) / 100;
      saveStorage(STORAGE_KEYS.CARTELLINI, cartellini);
    }

    return JSON.parse(JSON.stringify(newMat));
  },

  /**
   * Simulates DELETE /api/materiali_cartellino/:id
   */
  async deleteMaterialeCartellino(id) {
    const mat = cartellinoMateriali.find((m) => m.id === id);
    cartellinoMateriali = cartellinoMateriali.filter((m) => m.id !== id);
    saveStorage(STORAGE_KEYS.CARTELLINO_MATERIALS, cartellinoMateriali);

    if (mat) {
      const mats = cartellinoMateriali.filter((m) => m.cartellino_id === mat.cartellino_id);
      const c = cartellini.find((item) => item.id === mat.cartellino_id);
      if (c) {
        c.peso_totale = Math.round(calculateCartellinoTotalWeight(mats) * 100) / 100;
        saveStorage(STORAGE_KEYS.CARTELLINI, cartellini);
      }
    }

    return { success: true };
  },

  /**
   * Simulates GET /api/calendario
   * CRITICAL RULE: Count ONLY 'OPER' rows matching the specified dipendente.
   * MACCH rows are NEVER counted for employee calendar (ACTIVE.md §10, §39-3).
   */
  async getCalendarioOre(dipendenteId, anno, mese) {
    // Month is 1-indexed (1..12)
    const monthStr = String(mese).padStart(2, '0');
    const prefix = `${anno}-${monthStr}`;

    const dipendenteRows = righeOperative.filter((r) => {
      return (
        r.kind === 'OPER' &&
        r.ref_id === dipendenteId &&
        r.data_lavoro &&
        r.data_lavoro.startsWith(prefix)
      );
    });

    // Group hours by day: separate standard work hours, permessi, and ferie
    const dayTotals = {};
    const dayPermessi = {};
    const dayFerie = {};

    for (const r of dipendenteRows) {
      const day = r.data_lavoro; // YYYY-MM-DD
      const ore = parseFloat(r.ore) || 0;
      if (r.tipo_assenza === 'PERMESSO') {
        dayPermessi[day] = (dayPermessi[day] || 0) + ore;
      } else if (r.tipo_assenza === 'FERIE') {
        dayFerie[day] = (dayFerie[day] || 0) + ore;
      } else {
        dayTotals[day] = (dayTotals[day] || 0) + ore;
      }
    }

    return {
      dipendente_id: dipendenteId,
      anno,
      mese,
      totali_giornalieri: dayTotals,
      permessi_giornalieri: dayPermessi,
      ferie_giornaliere: dayFerie,
    };
  },

  /**
   * Simulates GET /api/calendario/dettaglio-giornata
   */
  async getDettaglioGiornata(dipendenteId, dataStr) {
    const dipendenteRows = righeOperative.filter((r) => {
      return (
        r.kind === 'OPER' &&
        r.ref_id === dipendenteId &&
        r.data_lavoro === dataStr
      );
    });

    const dettagli = dipendenteRows.map((r) => {
      const c = r.cartellino_id ? cartellini.find((cart) => cart.id === r.cartellino_id) : null;
      const client = c ? clients.find((cli) => cli.id === c.cliente_id) : null;
      return {
        riga_id: r.id,
        cartellino_id: r.cartellino_id || null,
        cartellino_numero: c ? c.numero : '-',
        commessa: c ? c.commessa : '-',
        cliente_nome: client ? client.nome : '(Nessun cartellino)',
        ore: r.ore,
        nota: r.nota,
        tipo_assenza: r.tipo_assenza || '',
      };
    });

    let totaleOre = 0;
    let totalePermessi = 0;
    let totaleFerie = 0;

    for (const d of dettagli) {
      const ore = parseFloat(d.ore) || 0;
      if (d.tipo_assenza === 'PERMESSO') {
        totalePermessi += ore;
      } else if (d.tipo_assenza === 'FERIE') {
        totaleFerie += ore;
      } else {
        totaleOre += ore;
      }
    }

    return {
      data: dataStr,
      dipendente_id: dipendenteId,
      totale_ore: totaleOre,
      totale_permessi: totalePermessi,
      totale_ferie: totaleFerie,
      righe: dettagli,
    };
  },

  /**
   * Simulates GET /api/backups
   */
  async getBackups() {
    return JSON.parse(JSON.stringify(backups));
  },

  /**
   * Simulates POST /api/backups
   */
  async createBackup() {
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
    saveStorage(STORAGE_KEYS.BACKUPS, backups);
    return JSON.parse(JSON.stringify(newBackup));
  },

  /**
   * Simulates POST /api/backups/:id/restore
   */
  async restoreBackup(id) {
    const b = backups.find((item) => item.id === id);
    if (!b) {
      throw new Error(`Backup non trovato: ${id}`);
    }
    return { success: true, message: `Backup ripristinato con successo: ${b.file_name}` };
  },

  /**
   * Simulates DELETE /api/backups/:id
   */
  async deleteBackup(id) {
    backups = backups.filter((b) => b.id !== id);
    saveStorage(STORAGE_KEYS.BACKUPS, backups);
    return { success: true };
  },

  /**
   * Simulates GET /api/backup-schedule
   */
  async getAutoBackupConfig() {
    return JSON.parse(JSON.stringify(autoBackupConfig));
  },

  /**
   * Simulates PUT /api/backup-schedule
   */
  async updateAutoBackupConfig(newConfig) {
    autoBackupConfig = {
      ...autoBackupConfig,
      ...newConfig,
    };
    saveStorage(STORAGE_KEYS.AUTO_BACKUP, autoBackupConfig);
    return JSON.parse(JSON.stringify(autoBackupConfig));
  },

  /**
   * Exports full application database in structured JSON format.
   */
  async exportDatabaseJson() {
    const exportData = {
      app: 'Gestionale Ore & Cartellini di Lavorazione',
      version: '1.0.0',
      exported_at: new Date().toISOString(),
      data: {
        clients,
        machines,
        materials,
        cartellini,
        righeOperative,
        cartellinoMateriali,
        backups,
        autoBackupConfig,
      },
    };
    return exportData;
  },

  /**
   * Restores application database from structured JSON payload.
   */
  async importDatabaseJson(jsonPayload) {
    if (!jsonPayload || typeof jsonPayload !== 'object') {
      throw new Error('File JSON non valido o corrotto.');
    }

    const payloadData = jsonPayload.data || jsonPayload;

    if (!Array.isArray(payloadData.clients) || !Array.isArray(payloadData.cartellini)) {
      throw new Error('Struttura dati non valida: mancano le collezioni principali (clienti o cartellini).');
    }

    clients = payloadData.clients.map((c) => {
      const { codice, ...rest } = c;
      return rest;
    });
    saveStorage(STORAGE_KEYS.CLIENTS, clients);

    if (Array.isArray(payloadData.machines)) {
      machines = payloadData.machines;
      saveStorage(STORAGE_KEYS.MACHINES, machines);
    }

    if (Array.isArray(payloadData.materials)) {
      materials = payloadData.materials;
      saveStorage(STORAGE_KEYS.MATERIALS, materials);
    }

    cartellini = payloadData.cartellini;
    saveStorage(STORAGE_KEYS.CARTELLINI, cartellini);

    if (Array.isArray(payloadData.righeOperative || payloadData.righe)) {
      righeOperative = payloadData.righeOperative || payloadData.righe;
      saveStorage(STORAGE_KEYS.RIGHE, righeOperative);
    }

    if (Array.isArray(payloadData.cartellinoMateriali || payloadData.materiali)) {
      cartellinoMateriali = payloadData.cartellinoMateriali || payloadData.materiali;
      saveStorage(STORAGE_KEYS.CARTELLINO_MATERIALS, cartellinoMateriali);
    }

    if (Array.isArray(payloadData.backups)) {
      backups = payloadData.backups;
      saveStorage(STORAGE_KEYS.BACKUPS, backups);
    }

    if (payloadData.autoBackupConfig) {
      autoBackupConfig = {
        ...DEFAULT_AUTO_BACKUP,
        ...payloadData.autoBackupConfig,
      };
      saveStorage(STORAGE_KEYS.AUTO_BACKUP, autoBackupConfig);
    }

    return {
      success: true,
      stats: {
        clients: clients.length,
        machines: machines.length,
        cartellini: cartellini.length,
        righe: righeOperative.length,
      },
    };
  },
};
