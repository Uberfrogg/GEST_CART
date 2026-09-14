/**
 * Materiali API Module
 */

import { getMaterialsList } from './storage.js';

/**
 * Simulates GET /api/materials
 */
export async function getMaterialiAnagrafica() {
  return JSON.parse(JSON.stringify(getMaterialsList()));
}
