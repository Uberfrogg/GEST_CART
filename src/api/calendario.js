/**
 * Calendario API Module
 */

import {
  getRigheOperativeList,
  getCartelliniList,
  getClientsList,
} from './storage.js';

/**
 * Simulates GET /api/calendario
 * CRITICAL RULE: Count ONLY 'OPER' rows matching the specified dipendente.
 * MACCH rows are NEVER counted for employee calendar (ACTIVE.md §10, §39-3).
 */
export async function getCalendarioOre(dipendenteId, anno, mese) {
  // Month is 1-indexed (1..12)
  const monthStr = String(mese).padStart(2, '0');
  const prefix = `${anno}-${monthStr}`;

  const righeOperative = getRigheOperativeList();
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
}

/**
 * Simulates GET /api/calendario/dettaglio-giornata
 */
export async function getDettaglioGiornata(dipendenteId, dataStr) {
  const righeOperative = getRigheOperativeList();
  const cartellini = getCartelliniList();
  const clients = getClientsList();

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
}
