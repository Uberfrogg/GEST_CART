/**
 * Clients API Module
 */

import {
  getClientsList,
  setClientsList,
  getCartelliniList,
} from './storage.js';

/**
 * Simulates GET /api/clienti
 */
export async function getClienti({ search = '', includeDeleted = false, onlyActive = false } = {}) {
  let result = [...getClientsList()];
  const cartellini = getCartelliniList();

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
}

/**
 * Simulates GET /api/clienti/:id
 */
export async function getClienteById(id) {
  const clients = getClientsList();
  const cli = clients.find((c) => c.id === id);
  if (!cli) return null;
  return JSON.parse(JSON.stringify(cli));
}

/**
 * Simulates POST /api/clienti
 */
export async function createCliente(data) {
  if (!data.nome || !data.nome.trim()) {
    throw new Error('Il nome del cliente è obbligatorio');
  }

  const clients = [...getClientsList()];
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
  setClientsList(clients);
  return JSON.parse(JSON.stringify(newCliente));
}

/**
 * Simulates PUT /api/clienti/:id
 */
export async function updateCliente(id, data) {
  const clients = [...getClientsList()];
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

  setClientsList(clients);
  return JSON.parse(JSON.stringify(clients[idx]));
}

/**
 * Simulates DELETE /api/clienti/:id
 * Soft deletion: preserves all cartellini and historical entries up to today!
 */
export async function deleteCliente(id) {
  const clients = [...getClientsList()];
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

  setClientsList(clients);
  return { success: true, removed: clients[idx] };
}
