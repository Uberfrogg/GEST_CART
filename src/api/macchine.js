/**
 * Macchine API Module
 */

import {
  getMachinesList,
  setMachinesList,
} from './storage.js';

/**
 * Simulates GET /api/macchine
 */
export async function getMacchine({ search = '', includeDeleted = false, onlyActive = false } = {}) {
  let result = [...getMachinesList()];

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
}

/**
 * Simulates GET /api/macchine/:id
 */
export async function getMacchinaById(id) {
  const machines = getMachinesList();
  const m = machines.find((item) => item.id === id);
  if (!m) return null;
  return JSON.parse(JSON.stringify(m));
}

/**
 * Simulates POST /api/macchine
 */
export async function createMacchina(data) {
  if (!data.nome || !data.nome.trim()) {
    throw new Error('Il nome della macchina è obbligatorio');
  }

  const machines = [...getMachinesList()];
  const newMacchina = {
    id: `mac-${Date.now()}`,
    codice: data.codice ? data.codice.trim().toUpperCase() : `MAC${machines.length + 1}`,
    nome: data.nome.trim().toUpperCase(),
    attiva: true,
    eliminata: false,
    eliminato: false,
  };

  machines.push(newMacchina);
  setMachinesList(machines);
  return JSON.parse(JSON.stringify(newMacchina));
}

/**
 * Simulates PUT /api/macchine/:id
 */
export async function updateMacchina(id, data) {
  const machines = [...getMachinesList()];
  const idx = machines.findIndex((m) => m.id === id);
  if (idx === -1) {
    throw new Error(`Macchina non trovata: ${id}`);
  }

  machines[idx] = {
    ...machines[idx],
    ...data,
  };

  setMachinesList(machines);
  return JSON.parse(JSON.stringify(machines[idx]));
}

/**
 * Simulates DELETE /api/macchine/:id
 * Soft deletion: preserves all historical work records and cartellini!
 */
export async function deleteMacchina(id) {
  const machines = [...getMachinesList()];
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

  setMachinesList(machines);
  return { success: true, removed: machines[idx] };
}
