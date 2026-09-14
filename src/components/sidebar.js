/**
 * Sidebar Component for Gestionale Ore
 */

import { state } from '../state.js';
import { router } from '../router.js';
import { api } from '../api.js';
import { openModal, closeModal } from './modal.js';
import { showToast } from './toast.js';

export function renderSidebar(currentRoute) {
  const user = state.getCurrentUser();
  if (!user) return '';

  const role = (user.ruolo || '').toUpperCase();
  const isAdmin = role === 'ADMIN';
  const isSegreteria = role === 'SEGRETERIA';
  const isDipendente = role === 'DIPENDENTE';

  const allNavItems = [
    {
      route: '#dashboard',
      label: 'Dashboard',
      icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>`,
      visible: true, // all users
    },
    {
      route: '#clienti',
      label: 'Clienti',
      icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>`,
      visible: isAdmin || isSegreteria,
    },
    {
      route: '#macchine',
      label: 'Macchine',
      icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="2" width="20" height="8" rx="2" ry="2"></rect><rect x="2" y="14" width="20" height="8" rx="2" ry="2"></rect><line x1="6" y1="6" x2="6.01" y2="6"></line><line x1="6" y1="18" x2="6.01" y2="18"></line></svg>`,
      visible: isAdmin || isSegreteria,
    },
    {
      route: '#archivio',
      label: 'Archivio',
      icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="21 8 21 21 3 21 3 8"></polyline><rect x="1" y="3" width="22" height="5"></rect><line x1="10" y1="12" x2="14" y2="12"></line></svg>`,
      visible: true, // all users
    },
    {
      route: '#backup',
      label: 'Backup',
      icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><ellipse cx="12" cy="5" rx="9" ry="3"></ellipse><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"></path><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"></path></svg>`,
      visible: isAdmin,
    },
    {
      route: '#calendario',
      label: 'Calendario',
      icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>`,
      visible: true, // all users
    },
    {
      route: '#dipendenti',
      label: 'Dipendenti',
      icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M22 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>`,
      visible: isAdmin, // only ADMIN can see Dipendenti
    },
  ];

  const navItems = allNavItems.filter((item) => item.visible);
  const userNickname = user.nickname || user.username || 'UTENTE';

  return `
    <aside class="app-sidebar" id="app-sidebar">
      <div class="sidebar-brand">
        <div class="brand-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" style="width: 20px; height: 20px;" aria-hidden="true">
            <path d="M 10.5 4.2 A 8 8 0 1 0 19.5 14.7"></path>
            <line x1="17" y1="8" x2="12" y2="13"></line>
          </svg>
        </div>
        <div class="brand-title">Gestionale Ore</div>
      </div>

      <nav class="sidebar-nav">
        ${navItems
          .map((item) => {
            const isActive = currentRoute.startsWith(item.route);
            return `
              <a href="${item.route}" class="nav-item ${isActive ? 'active' : ''}" id="nav-${item.label.toLowerCase()}">
                ${item.icon}
                <span>${item.label}</span>
              </a>
            `;
          })
          .join('')}
      </nav>

      <div class="sidebar-footer">
        <div class="user-info">
          <div class="user-name" title="${userNickname}">${userNickname}</div>
          <span class="user-role-badge">${user.ruolo}</span>
        </div>
        <div class="sidebar-actions">
          <button class="btn-settings" id="btn-change-password" title="Cambia password">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="3"></circle>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
            </svg>
          </button>
          <button class="btn-logout" id="btn-logout" title="Disconnetti (${userNickname})">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
              <polyline points="16 17 21 12 16 7"></polyline>
              <line x1="21" y1="12" x2="9" y2="12"></line>
            </svg>
          </button>
        </div>
      </div>
    </aside>
  `;
}

export function attachSidebarEvents(container) {
  const logoutBtn = container.querySelector('#btn-logout');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', (e) => {
      e.preventDefault();
      state.logout();
      router.navigate('#login');
    });
  }

  const changePwdBtn = container.querySelector('#btn-change-password');
  if (changePwdBtn) {
    changePwdBtn.addEventListener('click', (e) => {
      e.preventDefault();
      const currentUser = state.getCurrentUser();
      if (!currentUser) return;
      openChangePasswordModal(currentUser);
    });
  }
}

function openChangePasswordModal(user) {
  const userNickname = user.nickname || user.username || 'Utente';

  const modalHtml = `
    <form id="form-change-password">
      <div style="font-size: 13.5px; color: var(--text-secondary); margin-bottom: 16px;">
        Modifica la password di accesso per l'account <strong>${userNickname}</strong>.
      </div>

      <div class="form-group">
        <label class="form-label" for="input-current-pwd">Password Attuale *</label>
        <div style="position: relative; display: flex; align-items: center;">
          <input
            type="password"
            id="input-current-pwd"
            class="form-input"
            placeholder="Inserisci la password attuale..."
            required
            autocomplete="current-password"
            style="padding-right: 40px;"
            autofocus
          />
          <button
            type="button"
            class="btn-icon btn-toggle-pwd"
            data-target="input-current-pwd"
            style="position: absolute; right: 6px; top: 50%; transform: translateY(-50%); width: 28px; height: 28px; border: none; background: transparent; color: var(--text-muted);"
            title="Mostra/Nascondi password"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
              <circle cx="12" cy="12" r="3"></circle>
            </svg>
          </button>
        </div>
      </div>

      <div class="form-group">
        <label class="form-label" for="input-new-pwd">Nuova Password *</label>
        <div style="position: relative; display: flex; align-items: center;">
          <input
            type="password"
            id="input-new-pwd"
            class="form-input"
            placeholder="Inserisci la nuova password..."
            required
            autocomplete="new-password"
            style="padding-right: 40px;"
          />
          <button
            type="button"
            class="btn-icon btn-toggle-pwd"
            data-target="input-new-pwd"
            style="position: absolute; right: 6px; top: 50%; transform: translateY(-50%); width: 28px; height: 28px; border: none; background: transparent; color: var(--text-muted);"
            title="Mostra/Nascondi password"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
              <circle cx="12" cy="12" r="3"></circle>
            </svg>
          </button>
        </div>
        <div style="font-size: 11.5px; color: var(--text-muted); margin-top: 3px;">
          Minimo 3 caratteri.
        </div>
      </div>

      <div class="form-group">
        <label class="form-label" for="input-confirm-pwd">Conferma Nuova Password *</label>
        <div style="position: relative; display: flex; align-items: center;">
          <input
            type="password"
            id="input-confirm-pwd"
            class="form-input"
            placeholder="Ripeti la nuova password..."
            required
            autocomplete="new-password"
            style="padding-right: 40px;"
          />
          <button
            type="button"
            class="btn-icon btn-toggle-pwd"
            data-target="input-confirm-pwd"
            style="position: absolute; right: 6px; top: 50%; transform: translateY(-50%); width: 28px; height: 28px; border: none; background: transparent; color: var(--text-muted);"
            title="Mostra/Nascondi password"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
              <circle cx="12" cy="12" r="3"></circle>
            </svg>
          </button>
        </div>
      </div>
    </form>
  `;

  const footerHtml = `
    <button type="button" class="btn btn-secondary" id="btn-pwd-cancel">Annulla</button>
    <button type="button" class="btn btn-primary" id="btn-pwd-save">Aggiorna password</button>
  `;

  openModal({
    title: 'Cambia Password',
    contentHtml: modalHtml,
    footerButtonsHtml: footerHtml,
    onOpen: (overlay) => {
      const cancelBtn = overlay.querySelector('#btn-pwd-cancel');
      const saveBtn = overlay.querySelector('#btn-pwd-save');
      const form = overlay.querySelector('#form-change-password');
      const curInput = overlay.querySelector('#input-current-pwd');
      const newInput = overlay.querySelector('#input-new-pwd');
      const confInput = overlay.querySelector('#input-confirm-pwd');

      overlay.querySelectorAll('.btn-toggle-pwd').forEach((btn) => {
        btn.addEventListener('click', () => {
          const targetId = btn.getAttribute('data-target');
          const targetInput = overlay.querySelector(`#${targetId}`);
          if (targetInput) {
            const isPass = targetInput.getAttribute('type') === 'password';
            targetInput.setAttribute('type', isPass ? 'text' : 'password');
          }
        });
      });

      cancelBtn.addEventListener('click', closeModal);

      const handleSubmit = async () => {
        const curPwd = (curInput.value || '').trim();
        const newPwd = (newInput.value || '').trim();
        const confPwd = (confInput.value || '').trim();

        if (!curPwd) {
          showToast('Inserisci la password attuale.', 'warning');
          curInput.focus();
          return;
        }

        if (!newPwd) {
          showToast('Inserisci la nuova password.', 'warning');
          newInput.focus();
          return;
        }

        if (newPwd.length < 3) {
          showToast('La nuova password deve contenere almeno 3 caratteri.', 'warning');
          newInput.focus();
          return;
        }

        if (newPwd !== confPwd) {
          showToast('La nuova password e la conferma non coincidono.', 'warning');
          confInput.focus();
          return;
        }

        try {
          saveBtn.disabled = true;
          await api.changePassword(user.id, curPwd, newPwd);
          showToast('Password aggiornata con successo.', 'success');
          closeModal();
        } catch (err) {
          showToast(err.message || 'Errore durante l\'aggiornamento della password.', 'error');
          saveBtn.disabled = false;
        }
      };

      saveBtn.addEventListener('click', handleSubmit);
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        handleSubmit();
      });
    },
  });
}

