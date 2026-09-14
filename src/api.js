/**
 * Central API Facade for Gestionale Ore.
 *
 * Provides a unified API object delegating to modular domain services:
 * - auth.js: Users, authentication, passwords
 * - clienti.js: Customer accounts
 * - macchine.js: Workshop machinery
 * - materiali.js: Materials registry
 * - cartellini.js: Work orders, operative rows, and bill of materials
 * - calendario.js: Work calendar and day details
 * - backup.js: SQLite backups and database JSON export/import
 *
 * All functions return Promises to seamlessly match future Go backend endpoints.
 */

import * as authApi from './api/auth.js';
import * as clientiApi from './api/clienti.js';
import * as macchineApi from './api/macchine.js';
import * as materialiApi from './api/materiali.js';
import * as cartelliniApi from './api/cartellini.js';
import * as calendarioApi from './api/calendario.js';
import * as backupApi from './api/backup.js';

export const api = {
  ...authApi,
  ...clientiApi,
  ...macchineApi,
  ...materialiApi,
  ...cartelliniApi,
  ...calendarioApi,
  ...backupApi,
};

export default api;
