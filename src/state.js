/**
 * State Management for Gestionale Ore.
 * Provides a minimal, reactive, and centralized state store.
 */

const SESSION_STORAGE_KEY = 'gestionale_ore_current_user';
const DASHBOARD_EXPANDED_CLIENTS_KEY = 'gestionale_ore_expanded_clients';

class AppState {
  constructor() {
    this.currentUser = this._loadInitialUser();
    this.currentRoute = '#login';
    this.expandedClientIds = this._loadInitialExpandedClients();
    this.listeners = new Set();
  }

  _loadInitialExpandedClients() {
    try {
      const stored = sessionStorage.getItem(DASHBOARD_EXPANDED_CLIENTS_KEY);
      if (stored) {
        return new Set(JSON.parse(stored));
      }
    } catch (e) {
      console.warn('Could not read expanded clients from storage', e);
    }
    return new Set();
  }

  getExpandedClientIds() {
    return new Set(this.expandedClientIds);
  }

  setExpandedClientIds(idsSet) {
    this.expandedClientIds = new Set(idsSet);
    try {
      sessionStorage.setItem(
        DASHBOARD_EXPANDED_CLIENTS_KEY,
        JSON.stringify(Array.from(this.expandedClientIds))
      );
    } catch (e) {
      console.warn('Could not persist expanded clients', e);
    }
  }

  toggleExpandedClient(clientId) {
    if (this.expandedClientIds.has(clientId)) {
      this.expandedClientIds.delete(clientId);
    } else {
      this.expandedClientIds.add(clientId);
    }
    this.setExpandedClientIds(this.expandedClientIds);
  }

  clearExpandedClients() {
    this.expandedClientIds = new Set();
    try {
      sessionStorage.removeItem(DASHBOARD_EXPANDED_CLIENTS_KEY);
    } catch (e) {
      console.warn('Could not clear expanded clients storage', e);
    }
  }

  _loadInitialUser() {
    try {
      const stored = localStorage.getItem(SESSION_STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.warn('Could not read user from storage', e);
    }
    return null;
  }

  getCurrentUser() {
    return this.currentUser;
  }

  setCurrentUser(user) {
    this.currentUser = user;
    try {
      if (user) {
        localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(user));
      } else {
        localStorage.removeItem(SESSION_STORAGE_KEY);
      }
    } catch (e) {
      console.warn('Could not persist user session', e);
    }
    this.notify('user', user);
  }

  isAdmin() {
    return !!(this.currentUser && (this.currentUser.ruolo || '').toUpperCase() === 'ADMIN');
  }

  isSegreteria() {
    return !!(this.currentUser && (this.currentUser.ruolo || '').toUpperCase() === 'SEGRETERIA');
  }

  isDipendente() {
    return !!(this.currentUser && (this.currentUser.ruolo || '').toUpperCase() === 'DIPENDENTE');
  }

  canManageHours() {
    return this.isAdmin() || this.isDipendente();
  }

  canViewAllEmployees() {
    return this.isAdmin() || this.isSegreteria();
  }

  canManageDipendenti() {
    return this.isAdmin();
  }

  canAccessBackup() {
    return this.isAdmin();
  }

  getUserNickname() {
    return this.currentUser ? (this.currentUser.nickname || this.currentUser.username || '') : '';
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  notify(event, data) {
    for (const listener of this.listeners) {
      try {
        listener(event, data, this);
      } catch (err) {
        console.error('Error in state listener:', err);
      }
    }
  }

  logout() {
    this.clearExpandedClients();
    this.setCurrentUser(null);
  }
}

export const state = new AppState();
