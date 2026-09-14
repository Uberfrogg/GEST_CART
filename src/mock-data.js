/**
 * Mock Data for Gestionale Ore Frontend.
 * Clearly separated from application UI logic.
 * Structured to match the future Go backend SQLite schema.
 */

import { SAMPLE_PART_THUMBNAILS } from './utils/image.js';

export const INITIAL_USERS = [
  { id: 'user-andrea', nickname: 'ANDREA', username: 'ANDREA', password: 'password123', ruolo: 'DIPENDENTE', attivo: true, eliminato: false },
  { id: 'user-gabriele', nickname: 'GABRIELE', username: 'GABRIELE', password: 'password123', ruolo: 'DIPENDENTE', attivo: true, eliminato: false },
  { id: 'user-marina', nickname: 'MARINA', username: 'MARINA', password: 'password123', ruolo: 'SEGRETERIA', attivo: true, eliminato: false },
  { id: 'user-admin', nickname: 'ADMIN', username: 'ADMIN', password: 'adminpassword', ruolo: 'ADMIN', attivo: true, eliminato: false },
];

export const INITIAL_CLIENTS = [
  { id: 'cli-1', nome: 'CLIENTE A', via: 'Via Roma 1', cap: '20121', citta: 'Milano', piva: '01234567890', attivo: true, eliminato: false },
  { id: 'cli-2', nome: 'CLIENTE B', via: 'Piazza Duomo 2', cap: '20122', citta: 'Milano', piva: '8765432109', attivo: true, eliminato: false },
  { id: 'cli-3', nome: 'CLIENTE C', via: 'Corso Vittorio Emanuele 3', cap: '00186', citta: 'Roma', piva: '11223344556', attivo: true, eliminato: false },
  { id: 'cli-4', nome: 'CLIENTE D', via: 'Via Torino 4', cap: '10121', citta: 'Torino', piva: '66778899001', attivo: true, eliminato: false },
  { id: 'cli-5', nome: 'CLIENTE E', via: 'Lungomare 5', cap: '80100', citta: 'Napoli', piva: '99887766554', attivo: true, eliminato: false },
];

export const INITIAL_MACHINES = [
  { id: 'mac-1', codice: 'CNC-1', nome: 'FRESATRICE CNC 1', attiva: true, eliminata: false, eliminato: false },
  { id: 'mac-2', codice: 'CNC-2', nome: 'FRESATRICE CNC 2', attiva: true, eliminata: false, eliminato: false },
  { id: 'mac-3', codice: 'SEL-2', nome: 'SELCA 2', attiva: true, eliminata: false, eliminato: false },
  { id: 'mac-4', codice: 'TER-1', nome: 'TERMOFORMATRICE 1', attiva: true, eliminata: false, eliminato: false },
];

export const INITIAL_MATERIALS = [
  { id: 'mat-alluminio', codice: 'ALU', nome: 'ALLUMINIO', densita: 2700, unita: 'kg/m³' },
  { id: 'mat-ferro', codice: 'FE', nome: 'FERRO', densita: 7850, unita: 'kg/m³' },
  { id: 'mat-delrin', codice: 'POM', nome: 'DELRIN', densita: 1410, unita: 'kg/m³' },
  { id: 'mat-resina', codice: 'RES', nome: 'RESINA/UREOL', densita: 700, unita: 'kg/m³' },
  { id: 'mat-legno', codice: 'LEG', nome: 'LEGNO/MULTISTRATO BETULLA', densita: 700, unita: 'kg/m³' },
];

export const INITIAL_CARTELLINI = [
  {
    id: 'cart-001',
    numero: '#001',
    cliente_id: 'cli-1',
    commessa: 'Commessa A',
    descrizione: 'Fresatura Coperchio Superiore',
    stato: 'in-lavorazione',
    data_creazione: '2026-09-07',
    peso_totale: 4.86,
    note: 'Materiale fornito dal cliente, finitura Ra 1.6',
    foto_pezzo: SAMPLE_PART_THUMBNAILS.flangia,
  },
  {
    id: 'cart-002',
    numero: '#002',
    cliente_id: 'cli-2',
    commessa: 'Commessa B',
    descrizione: 'Lavorazione Piastra Base',
    stato: 'in-lavorazione',
    data_creazione: '2026-09-08',
    peso_totale: 15.70,
    note: 'Tolleranza dimensionale ±0.05 mm',
    foto_pezzo: SAMPLE_PART_THUMBNAILS.piastra,
  },
  {
    id: 'cart-003',
    numero: '#003',
    cliente_id: 'cli-1',
    commessa: 'Commessa C',
    descrizione: 'Supporto Alluminio CNC',
    stato: 'in-lavorazione',
    data_creazione: '2026-09-08',
    peso_totale: 2.15,
    note: 'Trattamento anodizzazione naturale'
  },
  {
    id: 'cart-004',
    numero: '#004',
    cliente_id: 'cli-1',
    commessa: 'Commessa D',
    descrizione: 'Flangia Accoppiamento Macchina',
    stato: 'in-lavorazione',
    data_creazione: '2026-09-09',
    peso_totale: 3.42,
    note: 'Controllo fori filettati M8'
  },
  {
    id: 'cart-005',
    numero: '#005',
    cliente_id: 'cli-3',
    commessa: 'Progetto X',
    descrizione: 'Stampo Termoformatura Ureol',
    stato: 'in-lavorazione',
    data_creazione: '2026-09-09',
    peso_totale: 18.50,
    note: 'Verifica tiraggi e sformi'
  },
  {
    id: 'cart-006',
    numero: '#006',
    cliente_id: 'cli-3',
    commessa: 'Commessa Y',
    descrizione: 'Perno di Giunzione Delrin',
    stato: 'in-lavorazione',
    data_creazione: '2026-09-09',
    peso_totale: 0.85,
    note: 'Tornitura di precisione'
  },
  {
    id: 'cart-007',
    numero: '#007',
    cliente_id: 'cli-2',
    commessa: 'Commessa Collaudo',
    descrizione: 'Assemblaggio e Collaudo Finale',
    stato: 'completato',
    data_creazione: '2026-09-05',
    peso_totale: 7.20,
    note: 'Collaudato e pronto per consegna'
  },
  {
    id: 'cart-008',
    numero: '#008',
    cliente_id: 'cli-4',
    commessa: 'Progetto Pilota',
    descrizione: 'Componente Prototipo Resina',
    stato: 'archiviato',
    data_creazione: '2026-09-02',
    peso_totale: 1.40,
    note: 'Archiviazione storica della commessa'
  },
];

export const INITIAL_RIGHE_OPERATIVE = [
  // Cartellino #001
  { id: 'row-1', cartellino_id: 'cart-001', kind: 'OPER', ref_id: 'user-andrea', data_lavoro: '2026-09-07', ore: 4.0, nota: 'Fresatura sgrossatura coperchio' },
  { id: 'row-2', cartellino_id: 'cart-001', kind: 'MACCH', ref_id: 'mac-1', data_lavoro: '2026-09-07', ore: 4.0, nota: 'Ciclo sgrossatura CNC 1' },
  { id: 'row-3', cartellino_id: 'cart-001', kind: 'OPER', ref_id: 'user-gabriele', data_lavoro: '2026-09-08', ore: 3.5, nota: 'Rifinitura manuale e sbavatura' },
  { id: 'row-4', cartellino_id: 'cart-001', kind: 'MACCH', ref_id: 'mac-1', data_lavoro: '2026-09-08', ore: 3.0, nota: 'Finitura CNC 1' },
  { id: 'row-5', cartellino_id: 'cart-001', kind: 'OPER', ref_id: 'user-andrea', data_lavoro: '2026-09-09', ore: 4.0, nota: 'Assemblaggio inserti e foratura' },

  // Cartellino #002
  { id: 'row-6', cartellino_id: 'cart-002', kind: 'OPER', ref_id: 'user-gabriele', data_lavoro: '2026-09-08', ore: 4.5, nota: 'Piazzamento piastra e azzeramenti' },
  { id: 'row-7', cartellino_id: 'cart-002', kind: 'MACCH', ref_id: 'mac-2', data_lavoro: '2026-09-08', ore: 5.0, nota: 'Lavorazione asportazione pesante' },
  { id: 'row-8', cartellino_id: 'cart-002', kind: 'OPER', ref_id: 'user-gabriele', data_lavoro: '2026-09-09', ore: 4.0, nota: 'Filettatura e pulizia' },

  // Cartellino #005
  { id: 'row-9', cartellino_id: 'cart-005', kind: 'OPER', ref_id: 'user-andrea', data_lavoro: '2026-09-09', ore: 3.5, nota: 'Modellazione stampo su Ureol' },
  { id: 'row-10', cartellino_id: 'cart-005', kind: 'MACCH', ref_id: 'mac-3', data_lavoro: '2026-09-09', ore: 6.0, nota: 'Esecuzione percorso Selca' },
];

export const INITIAL_MATERIALI_CARTELLINO = [
  // Cartellino #001: Alluminio 200x150x60mm
  { id: 'cmat-1', cartellino_id: 'cart-001', materiale_id: 'mat-alluminio', nome: 'ALLUMINIO', qty: 1, x_mm: 200, y_mm: 150, z_mm: 60, densita: 2700, peso_kg: 4.86 },
  // Cartellino #002: Ferro 250x200x40mm
  { id: 'cmat-2', cartellino_id: 'cart-002', materiale_id: 'mat-ferro', nome: 'FERRO', qty: 1, x_mm: 250, y_mm: 200, z_mm: 40, densita: 7850, peso_kg: 15.70 },
  // Cartellino #005: Resina 400x300x220mm
  { id: 'cmat-3', cartellino_id: 'cart-005', materiale_id: 'mat-resina', nome: 'RESINA/UREOL', qty: 1, x_mm: 400, y_mm: 300, z_mm: 220, densita: 700, peso_kg: 18.48 },
];

export const INITIAL_BACKUPS = [
  { id: 'bak-1', file_name: 'backup_gestionale_20260907_0842.sqlite', data_ora: '2026-09-07 08:42', dimensione_mb: 2.45, stato: 'Completato' },
  { id: 'bak-2', file_name: 'backup_gestionale_20260901_1800.sqlite', data_ora: '2026-09-01 18:00', dimensione_mb: 2.38, stato: 'Completato' },
  { id: 'bak-3', file_name: 'backup_gestionale_20260825_1215.sqlite', data_ora: '2026-08-25 12:15', dimensione_mb: 2.15, stato: 'Completato' },
];
