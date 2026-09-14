/**
 * Centralized materials calculations and constants.
 * As defined in GESTIONALE_ORE_BRIEF_AI_STUDIO.md §6 & §7
 */

export const MATERIAL_DENSITIES = {
  ALLUMINIO: 2700,
  FERRO: 7850,
  DELRIN: 1410,
  'RESINA/UREOL': 700,
  'LEGNO/MULTISTRATO BETULLA': 700,
};

export const DEFAULT_MATERIALS = [
  { id: 'mat-alluminio', codice: 'ALU', nome: 'ALLUMINIO', densita: 2700, unita: 'kg/m³' },
  { id: 'mat-ferro', codice: 'FE', nome: 'FERRO', densita: 7850, unita: 'kg/m³' },
  { id: 'mat-delrin', codice: 'POM', nome: 'DELRIN', densita: 1410, unita: 'kg/m³' },
  { id: 'mat-resina', codice: 'RES', nome: 'RESINA/UREOL', densita: 700, unita: 'kg/m³' },
  { id: 'mat-legno', codice: 'LEG', nome: 'LEGNO/MULTISTRATO BETULLA', densita: 700, unita: 'kg/m³' },
];

/**
 * Calculates volume in m³ from dimensions in mm.
 * Formula: (X * Y * Z) / 1,000,000,000
 */
export function calculateVolumeM3(xMm, yMm, zMm) {
  const x = parseFloat(xMm) || 0;
  const y = parseFloat(yMm) || 0;
  const z = parseFloat(zMm) || 0;
  return (x * y * z) / 1_000_000_000;
}

/**
 * Calculates weight in kg for a single piece.
 * Formula: Volume (m³) * Density (kg/m³)
 */
export function calculatePieceWeightKg(xMm, yMm, zMm, densityKgM3) {
  const volume = calculateVolumeM3(xMm, yMm, zMm);
  const density = parseFloat(densityKgM3) || 0;
  return volume * density;
}

/**
 * Calculates total weight in kg considering quantity.
 */
export function calculateTotalWeightKg(qty, xMm, yMm, zMm, densityKgM3) {
  const q = parseFloat(qty) || 1;
  const pieceWeight = calculatePieceWeightKg(xMm, yMm, zMm, densityKgM3);
  return q * pieceWeight;
}

/**
 * Calculates the total weight of a list of cartellino materials.
 */
export function calculateCartellinoTotalWeight(materialiList = []) {
  return materialiList.reduce((acc, m) => {
    return acc + (parseFloat(m.peso_kg) || calculateTotalWeightKg(m.qty, m.x_mm, m.y_mm, m.z_mm, m.densita || MATERIAL_DENSITIES[m.nome] || 0));
  }, 0);
}
