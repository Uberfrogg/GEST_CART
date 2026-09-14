/**
 * Nuova Attivita Modal for Calendario
 * Allows creating a new operative row (OPER or MACCH) with autocomplete for cartellini.
 */

import { api } from '../../api.js';
import { state } from '../../state.js';
import { openModal, closeModal } from '../modal.js';
import { showToast } from '../toast.js';
import { escapeHtml } from '../../utils/dom.js';

export async function openNuovaAttivitaModal({ defaultDate = null, defaultDipendenteId = null, onSaved = () => {} } = {}) {
  const [cartellini, clienti, dipendenti, macchine] = await Promise.all([
    api.getCartellini(),
    api.getClienti({ includeDeleted: true }),
    api.getDipendenti({ onlyActive: true }),
    api.getMacchine({ onlyActive: true }),
  ]);

  const clientMap = new Map(clienti.map((c) => [c.id, c.nome]));
  const todayStr = defaultDate || new Date().toISOString().slice(0, 10);
  const targetDipId =
    defaultDipendenteId ||
    (state.getCurrentUser() ? state.getCurrentUser().id : (dipendenti[0] ? dipendenti[0].id : null));

  // Filter ONLY active (in_lavorazione) or completato cartellini
  const eligibleCartellini = cartellini
    .filter((c) => c.stato === 'in_lavorazione' || c.stato === 'in-lavorazione' || c.stato === 'completato')
    .sort((a, b) => {
      if (a.stato === 'in_lavorazione' && b.stato !== 'in_lavorazione') return -1;
      if (a.stato !== 'in_lavorazione' && b.stato === 'in_lavorazione') return 1;
      return (b.numero || '').localeCompare(a.numero || '');
    });

  const modalHtml = `
    <form id="form-cal-nuova-attivita">
      <div class="form-group" style="position: relative;">
        <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 4px;">
          <label class="form-label" for="cal-modal-cartellino-input" style="margin-bottom: 0;">
            Cartellino / Commessa <span style="font-weight: 400; color: var(--text-muted); font-size: 12px;">(opzionale)</span>
          </label>
          <button
            type="button"
            id="cal-btn-clear-cartellino"
            style="display: none; background: none; border: none; font-size: 12px; color: var(--primary); cursor: pointer; text-decoration: underline; padding: 0;"
          >
            Rimuovi cartellino
          </button>
        </div>

        <div style="position: relative;">
          <input
            type="text"
            id="cal-modal-cartellino-input"
            class="form-input"
            placeholder="Digita per cercare cartellino, cliente o commessa..."
            autocomplete="off"
          />
          <input type="hidden" id="cal-modal-cartellino-id" value="" />
          <div
            id="cal-cartellino-autocomplete-list"
            style="display: none; position: absolute; left: 0; right: 0; top: 100%; z-index: 100; max-height: 220px; overflow-y: auto; background: #ffffff; border: 1px solid var(--border-color); border-radius: var(--radius-md); box-shadow: 0 10px 25px rgba(0,0,0,0.15); margin-top: 4px;"
          ></div>
        </div>
        <div style="font-size: 11.5px; color: var(--text-muted); margin-top: 4px;">
          Se non viene associato ad alcun cartellino, compila il campo <strong>Nota</strong> per giustificare le ore.
        </div>
      </div>

      <div class="form-group">
        <label class="form-label">Tipo di Attività *</label>
        <div style="display: flex; gap: 18px; margin-top: 4px;">
          <label style="display: flex; align-items: center; gap: 6px; font-weight: 600; cursor: pointer; font-size: 13.5px;">
            <input type="radio" name="cal-riga-kind" value="OPER" checked />
            <span>OPER (Dipendente / Operatore)</span>
          </label>
          <label style="display: flex; align-items: center; gap: 6px; font-weight: 600; cursor: pointer; font-size: 13.5px;">
            <input type="radio" name="cal-riga-kind" value="MACCH" />
            <span>MACCH (Macchina)</span>
          </label>
        </div>
        <div style="font-size: 11.5px; color: var(--text-muted); margin-top: 3px;">
          Le ore OPER confluiscono nel calendario personale del dipendente selezionato; le ore MACCH tracciano l'uso del macchinario.
        </div>
      </div>

      <div class="form-group" id="cal-group-ref-oper">
        <label class="form-label" for="cal-select-ref-oper">Dipendente *</label>
        ${
          state.isAdmin()
            ? `
              <select id="cal-select-ref-oper" class="form-select">
                ${dipendenti
                  .filter((d) => d.attivo && !d.eliminato)
                  .map((d) => `<option value="${d.id}" ${d.id === targetDipId ? 'selected' : ''}>${escapeHtml(d.nickname || d.username || d.nome)}</option>`)
                  .join('')}
              </select>
            `
            : `
              <div style="font-weight: 700; color: var(--text-primary); padding: 8px 12px; background: #f8fafc; border-radius: var(--radius-md); border: 1px solid var(--border-color); font-size: 13.5px;">
                ${escapeHtml(state.getCurrentUser() ? state.getCurrentUser().nickname || state.getCurrentUser().username : 'Utente Corrente')}
              </div>
              <input type="hidden" id="cal-select-ref-oper" value="${state.getCurrentUser() ? state.getCurrentUser().id : ''}" />
            `
        }
      </div>

      <div class="form-group" id="cal-group-ref-macch" style="display: none;">
        <label class="form-label" for="cal-select-ref-macch">Macchina *</label>
        <select id="cal-select-ref-macch" class="form-select">
          ${macchine
            .filter((m) => m.attiva && !m.eliminata && !m.eliminato)
            .map((m) => `<option value="${m.id}">${escapeHtml(m.nome)} (${escapeHtml(m.codice)})</option>`)
            .join('')}
        </select>
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px;">
        <div class="form-group">
          <label class="form-label" for="cal-input-riga-data">Data Lavoro *</label>
          <input type="date" id="cal-input-riga-data" class="form-input" value="${todayStr}" required />
        </div>

        <div class="form-group">
          <label class="form-label" for="cal-input-riga-ore">Ore (passo 0,5h) *</label>
          <input
            type="number"
            id="cal-input-riga-ore"
            class="form-input"
            value="4.0"
            step="0.5"
            min="0.5"
            max="24"
            required
          />
        </div>
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px;">
        <div class="form-group">
          <label class="form-label" for="cal-input-riga-nota">Nota / Descrizione Attività</label>
          <input
            type="text"
            id="cal-input-riga-nota"
            class="form-input"
            placeholder="es. Manutenzione, formazione, pulizia..."
          />
        </div>

        <div class="form-group">
          <label class="form-label" for="cal-select-riga-tipo">Tipologia</label>
          <select id="cal-select-riga-tipo" class="form-select">
            <option value="">Lavoro Ordinario</option>
            <option value="PERMESSO">PERMESSO</option>
            <option value="FERIE">FERIE</option>
          </select>
        </div>
      </div>
    </form>
  `;

  const footerHtml = `
    <button type="button" class="btn btn-secondary" id="cal-modal-cancel">Annulla</button>
    <button type="button" class="btn btn-primary" id="cal-modal-save">Salva attività</button>
  `;

  openModal({
    title: 'Nuova Attività',
    contentHtml: modalHtml,
    footerButtonsHtml: footerHtml,
    onOpen: (overlay) => {
      const kindRadios = overlay.querySelectorAll('input[name="cal-riga-kind"]');
      const groupOper = overlay.querySelector('#cal-group-ref-oper');
      const groupMacch = overlay.querySelector('#cal-group-ref-macch');
      const cancelBtn = overlay.querySelector('#cal-modal-cancel');
      const saveBtn = overlay.querySelector('#cal-modal-save');

      const cartInput = overlay.querySelector('#cal-modal-cartellino-input');
      const cartHidden = overlay.querySelector('#cal-modal-cartellino-id');
      const cartList = overlay.querySelector('#cal-cartellino-autocomplete-list');
      const clearCartBtn = overlay.querySelector('#cal-btn-clear-cartellino');

      const filterSuggestions = () => {
        const query = (cartInput.value || '').trim().toLowerCase();
        if (!query) {
          cartList.style.display = 'none';
          cartList.innerHTML = '';
          return;
        }

        const matches = eligibleCartellini.filter((c) => {
          const num = (c.numero || '').toLowerCase();
          const com = (c.commessa || '').toLowerCase();
          const cli = (clientMap.get(c.cliente_id) || '').toLowerCase();

          return (
            num.startsWith(query) ||
            com.startsWith(query) ||
            cli.startsWith(query) ||
            num.replace(/[^a-z0-9]/g, '').startsWith(query.replace(/[^a-z0-9]/g, '')) ||
            com.split(/\s+/).some((part) => part.startsWith(query)) ||
            cli.split(/\s+/).some((part) => part.startsWith(query))
          );
        });

        if (matches.length === 0) {
          cartList.innerHTML = `
            <div style="padding: 10px 14px; font-size: 12.5px; color: var(--text-muted); font-style: italic;">
              Nessun cartellino attivo o completato che inizia con "${escapeHtml(query)}"
            </div>
          `;
          cartList.style.display = 'block';
          return;
        }

        cartList.innerHTML = matches
          .map((c) => {
            const cliName = clientMap.get(c.cliente_id) || 'Cliente';
            const isComp = c.stato === 'completato';
            const statoBadge = isComp
              ? '<span class="badge badge-completato" style="font-size: 10.5px; padding: 2px 6px;">Completato</span>'
              : '<span class="badge badge-in-lavorazione" style="font-size: 10.5px; padding: 2px 6px;">In corso</span>';

            return `
              <div
                class="cal-autocomplete-item"
                data-id="${c.id}"
                data-label="[${escapeHtml(c.numero)}] ${escapeHtml(cliName)} — ${escapeHtml(c.commessa)}"
                style="padding: 9px 12px; cursor: pointer; border-bottom: 1px solid #f1f5f9; display: flex; align-items: center; justify-content: space-between; gap: 8px; transition: background 0.12s;"
              >
                <div>
                  <div style="font-weight: 700; font-size: 13px; color: var(--primary); font-family: var(--font-mono);">
                    ${escapeHtml(c.numero)}
                    <span style="font-weight: 600; color: var(--text-primary); font-family: var(--font-sans); margin-left: 6px;">
                      ${escapeHtml(cliName)}
                    </span>
                  </div>
                  <div style="font-size: 12px; color: var(--text-secondary); margin-top: 2px;">
                    Commessa: <strong>${escapeHtml(c.commessa)}</strong> ${c.descrizione ? `— ${escapeHtml(c.descrizione)}` : ''}
                  </div>
                </div>
                <div>${statoBadge}</div>
              </div>
            `;
          })
          .join('');

        cartList.style.display = 'block';
      };

      cartInput.addEventListener('input', () => {
        cartHidden.value = '';
        clearCartBtn.style.display = cartInput.value.trim() ? 'inline' : 'none';
        filterSuggestions();
      });

      cartInput.addEventListener('focus', () => {
        if (cartInput.value.trim()) {
          filterSuggestions();
        }
      });

      cartList.addEventListener('click', (e) => {
        const item = e.target.closest('.cal-autocomplete-item');
        if (item) {
          const id = item.getAttribute('data-id');
          const label = item.getAttribute('data-label');
          cartHidden.value = id;
          cartInput.value = label;
          cartList.style.display = 'none';
          clearCartBtn.style.display = 'inline';
        }
      });

      cartList.addEventListener('mouseover', (e) => {
        const item = e.target.closest('.cal-autocomplete-item');
        if (item) {
          item.style.backgroundColor = '#f0fdf4';
        }
      });

      cartList.addEventListener('mouseout', (e) => {
        const item = e.target.closest('.cal-autocomplete-item');
        if (item) {
          item.style.backgroundColor = '';
        }
      });

      clearCartBtn.addEventListener('click', () => {
        cartHidden.value = '';
        cartInput.value = '';
        clearCartBtn.style.display = 'none';
        cartList.style.display = 'none';
        cartInput.focus();
      });

      overlay.addEventListener('click', (e) => {
        if (!cartInput.contains(e.target) && !cartList.contains(e.target)) {
          cartList.style.display = 'none';
        }
      });

      kindRadios.forEach((r) => {
        r.addEventListener('change', (e) => {
          if (e.target.value === 'OPER') {
            groupOper.style.display = 'block';
            groupMacch.style.display = 'none';
          } else {
            groupOper.style.display = 'none';
            groupMacch.style.display = 'block';
          }
        });
      });

      cancelBtn.addEventListener('click', closeModal);

      saveBtn.addEventListener('click', async () => {
        const cartellinoId = cartHidden.value || null;
        const kind = overlay.querySelector('input[name="cal-riga-kind"]:checked').value;
        const refId =
          kind === 'OPER'
            ? overlay.querySelector('#cal-select-ref-oper').value
            : overlay.querySelector('#cal-select-ref-macch').value;
        const dataLavoro = overlay.querySelector('#cal-input-riga-data').value;
        const ore = parseFloat(overlay.querySelector('#cal-input-riga-ore').value);
        const nota = overlay.querySelector('#cal-input-riga-nota').value.trim();
        const tipoAssenza = (overlay.querySelector('#cal-select-riga-tipo')?.value || '').trim();

        if (!refId) {
          alert(kind === 'OPER' ? 'Seleziona un dipendente.' : 'Seleziona una macchina.');
          return;
        }
        if (!dataLavoro) {
          alert('Inserisci la data.');
          return;
        }
        if (isNaN(ore) || ore <= 0 || (ore * 2) % 1 !== 0) {
          alert('Le ore devono essere in incrementi di 0,5 (es. 0.5, 1.0, 1.5).');
          return;
        }
        if (!cartellinoId && !nota && !tipoAssenza) {
          alert('Se non selezioni un cartellino, inserisci una Nota o seleziona una tipologia (PERMESSO / FERIE).');
          return;
        }

        try {
          await api.addRigaOperativa({
            cartellino_id: cartellinoId,
            kind,
            ref_id: refId,
            data_lavoro: dataLavoro,
            ore,
            nota,
            tipo_assenza: tipoAssenza,
          });

          closeModal();
          showToast('Attività registrata con successo!', 'success');
          onSaved();
        } catch (err) {
          alert(err.message || 'Errore durante il salvataggio dell’attività');
        }
      });
    },
  });
}
