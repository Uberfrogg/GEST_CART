/**
 * Login Page for Gestionale Ore
 * Strictly adheres to specifications:
 * - Username & Password inputs
 * - NO user list, NO autocomplete, NO user selector dropdown
 * - Show/hide password toggle (as seen in login-password-shown.png)
 * - Clear error alerts (as seen in login-error.png)
 * - Transitions to #dashboard upon success
 */

import { api } from '../api.js';
import { state } from '../state.js';
import { router } from '../router.js';

export function renderLoginPage() {
  return `
    <div class="login-page" id="login-page">
      <div class="login-card" id="login-card">
        <div class="login-brand" id="login-brand">
          <div class="login-brand-header">
            <svg class="login-brand-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M 10.5 4.2 A 8 8 0 1 0 19.5 14.7"></path>
              <line x1="17" y1="8" x2="12" y2="13"></line>
            </svg>
            <h1 class="login-title">Gestionale Ore</h1>
          </div>
          <p class="login-subtitle">Accedi al tuo gestionale ore aziendale</p>
        </div>

        <div id="login-error-container"></div>

        <form id="login-form" novalidate autocomplete="off">
          <div class="form-group">
            <label class="form-label" for="login-username">Username</label>
            <input
              type="text"
              id="login-username"
              class="form-input"
              placeholder="Username"
              autocomplete="off"
              spellcheck="false"
              required
            />
          </div>

          <div class="form-group">
            <label class="form-label" for="login-password">Password</label>
            <div class="input-password-wrapper">
              <input
                type="password"
                id="login-password"
                class="form-input"
                placeholder="••••••••"
                autocomplete="new-password"
                required
              />
              <button
                type="button"
                id="btn-toggle-password"
                class="btn-toggle-pwd"
                aria-label="Mostra o nascondi password"
                title="Mostra password"
              >
                <svg id="eye-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                  <circle cx="12" cy="12" r="3"></circle>
                </svg>
              </button>
            </div>
          </div>

          <div style="margin-top: 24px;">
            <button type="submit" class="btn btn-primary" id="btn-login" style="width: 100%; height: 40px; font-weight: 600;">
              Accedi
            </button>
          </div>
        </form>
      </div>
    </div>
  `;
}

export function initLoginPage(container) {
  const form = container.querySelector('#login-form');
  const usernameInput = container.querySelector('#login-username');
  const passwordInput = container.querySelector('#login-password');
  const togglePwdBtn = container.querySelector('#btn-toggle-password');
  const errorContainer = container.querySelector('#login-error-container');
  const submitBtn = container.querySelector('#btn-login');

  if (!form) return;

  // Toggle show/hide password
  let isPasswordVisible = false;
  if (togglePwdBtn && passwordInput) {
    togglePwdBtn.addEventListener('click', () => {
      isPasswordVisible = !isPasswordVisible;
      passwordInput.type = isPasswordVisible ? 'text' : 'password';
      togglePwdBtn.title = isPasswordVisible ? 'Nascondi password' : 'Mostra password';
      const eyeIcon = container.querySelector('#eye-icon');
      if (eyeIcon) {
        if (isPasswordVisible) {
          eyeIcon.innerHTML = `
            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
            <line x1="1" y1="1" x2="23" y2="23"></line>
          `;
        } else {
          eyeIcon.innerHTML = `
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
            <circle cx="12" cy="12" r="3"></circle>
          `;
        }
      }
    });
  }

  // Focus username on load
  setTimeout(() => usernameInput?.focus(), 50);

  // Form submission
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorContainer.innerHTML = '';

    const username = (usernameInput.value || '').trim();
    const password = (passwordInput.value || '').trim();

    if (!username) {
      showError('Inserisci il nome utente.');
      usernameInput.focus();
      return;
    }

    if (!password) {
      showError('Inserisci la password.');
      passwordInput.focus();
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Verifica in corso...';

    try {
      const res = await api.login(username, password);
      if (res.success && res.user) {
        state.clearExpandedClients();
        state.setCurrentUser(res.user);
        router.navigate('#dashboard');
      }
    } catch (err) {
      showError(err.message || 'Credenziali non valide o utente non autorizzato');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Accedi';
    }
  });

  function showError(msg) {
    errorContainer.innerHTML = `
      <div class="alert alert-danger" id="login-error-alert">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="8" x2="12" y2="12"></line>
          <line x1="12" y1="16" x2="12.01" y2="16"></line>
        </svg>
        <span>${msg}</span>
      </div>
    `;
  }
}
