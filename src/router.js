/**
 * Lightweight Client-Side Router for Gestionale Ore
 * Hash-based routing (#login, #dashboard, #cartellino/:id, etc.)
 */

import { state } from './state.js';
import { renderSidebar, attachSidebarEvents } from './components/sidebar.js';

import { renderLoginPage, initLoginPage } from './pages/login.js';
import { renderDashboardPage, initDashboardPage } from './pages/dashboard.js';
import { renderCartellinoPage, initCartellinoPage } from './pages/cartellino.js';
import { renderClientiPage, initClientiPage } from './pages/clienti.js';
import { renderMacchinePage, initMacchinePage } from './pages/macchine.js';
import { renderArchivioPage, initArchivioPage } from './pages/archivio.js';
import { renderCalendarioPage, initCalendarioPage } from './pages/calendario.js';
import { renderBackupPage, initBackupPage } from './pages/backup.js';
import { renderDipendentiPage, initDipendentiPage } from './pages/dipendenti.js';

class Router {
  constructor() {
    this.appContainer = null;
    this.currentHash = '';
    this.lastListPage = 'dashboard';
  }

  getLastListPage() {
    try {
      return sessionStorage.getItem('gestionale_last_list_page') || this.lastListPage || 'dashboard';
    } catch {
      return this.lastListPage || 'dashboard';
    }
  }

  init(appElement) {
    this.appContainer = appElement;

    window.addEventListener('hashchange', () => {
      this.resolveRoute();
    });

    state.subscribe((event) => {
      if (event === 'user') {
        this.resolveRoute();
      }
    });

    if (!window.location.hash) {
      window.location.hash = state.getCurrentUser() ? '#dashboard' : '#login';
    } else {
      this.resolveRoute();
    }
  }

  navigate(hash) {
    if (window.location.hash === hash) {
      this.resolveRoute();
    } else {
      window.location.hash = hash;
    }
  }

  async resolveRoute() {
    const rawHash = window.location.hash || '#login';
    this.currentHash = rawHash;
    const user = state.getCurrentUser();

    // Authentication Guard
    if (!user && rawHash !== '#login') {
      window.location.hash = '#login';
      return;
    }

    if (user && rawHash === '#login') {
      window.location.hash = '#dashboard';
      return;
    }

    // Parse route and params
    const [path, param] = rawHash.slice(1).split('/');

    // Render flow
    if (rawHash === '#login') {
      this.appContainer.innerHTML = renderLoginPage();
      initLoginPage(this.appContainer);
      return;
    }

    // Role-based Access Guards
    const role = (user.ruolo || '').toUpperCase();
    if (role === 'DIPENDENTE') {
      // Allowed: dashboard, cartellino, calendario, archivio
      const allowedPaths = ['dashboard', 'cartellino', 'calendario', 'archivio'];
      if (!allowedPaths.includes(path)) {
        window.location.hash = '#dashboard';
        return;
      }
    } else if (role === 'SEGRETERIA') {
      // Allowed: dashboard, cartellino, clienti, macchine, archivio, calendario
      const allowedPaths = ['dashboard', 'cartellino', 'clienti', 'macchine', 'archivio', 'calendario'];
      if (!allowedPaths.includes(path)) {
        window.location.hash = '#dashboard';
        return;
      }
    }

    // Track list page for "Torna alla lista" in cartellino view
    if (['dashboard', 'archivio', 'clienti', 'macchine', 'calendario', 'dipendenti', 'backup'].includes(path)) {
      this.lastListPage = path;
      try {
        sessionStorage.setItem('gestionale_last_list_page', path);
      } catch (e) {
        // ignore
      }
    }

    // App shell layout with sidebar
    let pageHtml = '';
    let pageInitFn = null;

    const rerender = () => this.resolveRoute();

    switch (path) {
      case 'dashboard':
        pageHtml = await renderDashboardPage();
        pageInitFn = (mainEl) => initDashboardPage(mainEl, rerender);
        break;

      case 'cartellino':
        pageHtml = await renderCartellinoPage(param);
        pageInitFn = (mainEl) => initCartellinoPage(mainEl, param, rerender);
        break;

      case 'clienti':
        pageHtml = await renderClientiPage();
        pageInitFn = (mainEl) => initClientiPage(mainEl, rerender);
        break;

      case 'macchine':
        pageHtml = await renderMacchinePage();
        pageInitFn = (mainEl) => initMacchinePage(mainEl, rerender);
        break;

      case 'archivio':
        pageHtml = await renderArchivioPage();
        pageInitFn = (mainEl) => initArchivioPage(mainEl, rerender);
        break;

      case 'calendario':
        pageHtml = await renderCalendarioPage();
        pageInitFn = (mainEl) => initCalendarioPage(mainEl, rerender);
        break;

      case 'dipendenti':
        if (!state.isAdmin()) {
          window.location.hash = '#dashboard';
          return;
        }
        pageHtml = await renderDipendentiPage();
        pageInitFn = (mainEl) => initDipendentiPage(mainEl, rerender);
        break;

      case 'backup':
        if (!state.isAdmin()) {
          window.location.hash = '#dashboard';
          return;
        }
        pageHtml = await renderBackupPage();
        pageInitFn = (mainEl) => initBackupPage(mainEl, rerender);
        break;

      default:
        window.location.hash = '#dashboard';
        return;
    }

    this.appContainer.innerHTML = `
      <div class="app-shell">
        ${renderSidebar(rawHash)}
        <main class="app-main" id="app-main">
          ${pageHtml}
        </main>
      </div>
    `;

    attachSidebarEvents(this.appContainer);

    const mainEl = this.appContainer.querySelector('#app-main');
    if (pageInitFn && mainEl) {
      pageInitFn(mainEl);
    }
  }
}

export const router = new Router();
