/**
 * Cartellino Detail Page for Gestionale Ore
 * Full operative history, OPER/MACCH row distinction, materials calculation, soft-state status.
 * Coordinated via specialized sub-components in /src/components/cartellino/
 */

import { api } from '../api.js';
import { state } from '../state.js';
import { escapeHtml } from '../utils/dom.js';
import {
  renderCartellinoHeader,
  renderCartellinoInfo,
  initCartellinoInfo,
} from '../components/cartellino/cartellinoInfo.js';
import {
  renderCartellinoRighe,
  initCartellinoRighe,
} from '../components/cartellino/cartellinoRighe.js';
import {
  renderCartellinoMateriali,
  initCartellinoMateriali,
} from '../components/cartellino/cartellinoMateriali.js';

let currentCartellinoData = null;
let currentDipendentiMap = new Map();
let currentMacchineMap = new Map();

export async function renderCartellinoPage(cartellinoId) {
  if (!cartellinoId) {
    return `
      <div class="page-container">
        <div class="alert alert-danger">Nessun cartellino selezionato. <a href="#dashboard">Torna alla Dashboard</a></div>
      </div>
    `;
  }

  let cartellino;
  try {
    cartellino = await api.getCartellinoById(cartellinoId);
  } catch (err) {
    return `
      <div class="page-container">
        <div class="alert alert-danger">Errore: ${escapeHtml(err.message)} <a href="#dashboard">Torna alla Dashboard</a></div>
      </div>
    `;
  }

  const [dipendenti, macchine] = await Promise.all([
    api.getDipendenti({ includeDeleted: true }),
    api.getMacchine({ includeDeleted: true }),
  ]);

  const dipendentiMap = new Map(dipendenti.map((d) => [d.id, d.nickname || d.username || d.nome]));
  const macchineMap = new Map(macchine.map((m) => [m.id, m.nome]));
  const canManageHours = state.canManageHours();

  // Cache for instant synchronous access
  currentCartellinoData = cartellino;
  currentDipendentiMap = dipendentiMap;
  currentMacchineMap = macchineMap;

  return `
    ${renderCartellinoHeader(cartellino)}

    <div class="page-container">
      ${renderCartellinoInfo(cartellino)}
      ${renderCartellinoRighe(cartellino, dipendentiMap, macchineMap, canManageHours)}
      ${renderCartellinoMateriali(cartellino)}
    </div>
  `;
}

export function initCartellinoPage(container, cartellinoId, rerender) {
  initCartellinoInfo(
    container,
    cartellinoId,
    rerender,
    currentCartellinoData,
    currentDipendentiMap,
    currentMacchineMap
  );
  initCartellinoRighe(container, cartellinoId, rerender);
  initCartellinoMateriali(container, cartellinoId, rerender);
}
