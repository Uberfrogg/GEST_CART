/**
 * Main Application Entry Point for Gestionale Ore
 */

import { router } from './router.js';

function start() {
  const appElement = document.getElementById('app');
  if (appElement) {
    router.init(appElement);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', start);
} else {
  start();
}
