/**
 * Cartellini, Righe Operative, and Materiali Cartellino API Module
 */

import {
  getCartelliniList,
  setCartelliniList,
  getClientsList,
  getMachinesList,
  getUsersList,
  getRigheOperativeList,
  setRigheOperativeList,
  getCartellinoMaterialiList,
  setCartellinoMaterialiList,
} from './storage.js';

import {
  calculateTotalWeightKg,
  calculateCartellinoTotalWeight,
  MATERIAL_DENSITIES,
} from '../utils/materials.js';

/**
 * Simulates GET /api/cartellini
 */
export async function getCartellini({ search = '', stato = '', cliente_id = '' } = {}) {
  let result = [...getCartelliniList()];
  const clients = getClientsList();

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
}

/**
 * Simulates GET /api/cartellini?cliente_id=:id
 */
export async function getCartelliniByCliente(clienteId) {
  const list = getCartelliniList().filter((c) => c.cliente_id === clienteId);
  return JSON.parse(JSON.stringify(list));
}

/**
 * Simulates GET /api/cartellini/:id
 */
export async function getCartellinoById(id) {
  const cartellini = getCartelliniList();
  const c = cartellini.find((item) => item.id === id);
  if (!c) {
    throw new Error(`Cartellino non trovato: ${id}`);
  }

  const clients = getClientsList();
  const righeOperative = getRigheOperativeList();
  const cartellinoMateriali = getCartellinoMaterialiList();

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
}

/**
 * Simulates POST /api/cartellini
 */
export async function createCartellino({ cliente_id, commessa, quantita = 1, descrizione = '', note = '', foto_pezzo = null }) {
  if (!cliente_id) {
    throw new Error('Il cliente è obbligatorio');
  }
  const clients = getClientsList();
  const targetCli = clients.find((c) => c.id === cliente_id);
  if (!targetCli || targetCli.eliminato || targetCli.attivo === false) {
    throw new Error('Impossibile creare un cartellino per un cliente eliminato o disattivato');
  }
  if (!commessa || !commessa.trim()) {
    throw new Error('La commessa è obbligatoria');
  }

  const cartellini = [...getCartelliniList()];

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
    descrizione: (descrizione || '').trim(),
    quantita: parseInt(quantita, 10) || 1,
    stato: 'in-lavorazione',
    data_creazione: new Date().toISOString().slice(0, 10),
    peso_totale: 0,
    note: (note || '').trim(),
    foto_pezzo: foto_pezzo || null,
  };

  cartellini.unshift(newCart);
  setCartelliniList(cartellini);

  return JSON.parse(JSON.stringify(newCart));
}

/**
 * Simulates PATCH /api/cartellini/:id/foto
 */
export async function updateCartellinoFoto(id, foto_pezzo) {
  const cartellini = [...getCartelliniList()];
  const c = cartellini.find((item) => item.id === id);
  if (!c) {
    throw new Error(`Cartellino non trovato: ${id}`);
  }
  c.foto_pezzo = foto_pezzo || null;
  setCartelliniList(cartellini);
  return JSON.parse(JSON.stringify(c));
}

/**
 * Simulates PATCH /api/cartellini/:id/stato
 */
export async function updateCartellinoStato(id, nuovoStato) {
  const validStates = ['in-lavorazione', 'completato', 'archiviato'];
  if (!validStates.includes(nuovoStato)) {
    throw new Error(`Stato non valido: ${nuovoStato}`);
  }

  const cartellini = [...getCartelliniList()];
  const c = cartellini.find((item) => item.id === id);
  if (!c) {
    throw new Error(`Cartellino non trovato: ${id}`);
  }

  c.stato = nuovoStato;
  setCartelliniList(cartellini);
  return JSON.parse(JSON.stringify(c));
}

/**
 * Simulates POST /api/cartellini/:id/righe
 * Validates hours in 0.5 steps (ACTIVE.md §12)
 */
export async function addRigaOperativa({ cartellino_id = null, kind, ref_id, data_lavoro, ore, nota = '', tipo_assenza = '' }) {
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
    const machines = getMachinesList();
    const mach = machines.find((m) => m.id === ref_id);
    if (!mach || mach.eliminata || mach.eliminato || mach.attiva === false) {
      throw new Error('Impossibile inserire registrazioni su una macchina eliminata o disattivata');
    }
  }
  if (kind === 'OPER') {
    const users = getUsersList();
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

  const righeOperative = [...getRigheOperativeList()];
  righeOperative.push(newRow);
  setRigheOperativeList(righeOperative);
  return JSON.parse(JSON.stringify(newRow));
}

/**
 * Simulates DELETE /api/righe/:id
 */
export async function deleteRigaOperativa(id) {
  let righeOperative = getRigheOperativeList().filter((r) => r.id !== id);
  setRigheOperativeList(righeOperative);
  return { success: true };
}

/**
 * Simulates PUT /api/righe/:id
 */
export async function updateRigaOperativa(id, { ore, nota, tipo_assenza, cartellino_id, data_lavoro }) {
  const righeOperative = [...getRigheOperativeList()];
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

  setRigheOperativeList(righeOperative);
  return JSON.parse(JSON.stringify(riga));
}

/**
 * Simulates POST /api/cartellini/:id/materiali
 */
export async function addMaterialeCartellino({ cartellino_id, materiale_nome, qty, x_mm, y_mm, z_mm }) {
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

  const cartellinoMateriali = [...getCartellinoMaterialiList()];
  cartellinoMateriali.push(newMat);
  setCartellinoMaterialiList(cartellinoMateriali);

  // Update cartellino total weight
  const cartellini = [...getCartelliniList()];
  const mats = cartellinoMateriali.filter((m) => m.cartellino_id === cartellino_id);
  const c = cartellini.find((item) => item.id === cartellino_id);
  if (c) {
    c.peso_totale = Math.round(calculateCartellinoTotalWeight(mats) * 100) / 100;
    setCartelliniList(cartellini);
  }

  return JSON.parse(JSON.stringify(newMat));
}

/**
 * Simulates DELETE /api/materiali_cartellino/:id
 */
export async function deleteMaterialeCartellino(id) {
  let cartellinoMateriali = [...getCartellinoMaterialiList()];
  const mat = cartellinoMateriali.find((m) => m.id === id);
  cartellinoMateriali = cartellinoMateriali.filter((m) => m.id !== id);
  setCartellinoMaterialiList(cartellinoMateriali);

  if (mat) {
    const cartellini = [...getCartelliniList()];
    const mats = cartellinoMateriali.filter((m) => m.cartellino_id === mat.cartellino_id);
    const c = cartellini.find((item) => item.id === mat.cartellino_id);
    if (c) {
      c.peso_totale = Math.round(calculateCartellinoTotalWeight(mats) * 100) / 100;
      setCartelliniList(cartellini);
    }
  }

  return { success: true };
}
