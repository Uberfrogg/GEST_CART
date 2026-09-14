/**
 * Nuovo Cartellino Modal Component
 * Handles creating new cartellini with client selection, commessa, and thumbnail upload.
 */

import { api } from '../../api.js';
import { state } from '../../state.js';
import { openModal, closeModal } from '../modal.js';
import { showToast } from '../toast.js';
import { fileToThumbnail } from '../../utils/image.js';
import { escapeHtml } from '../../utils/dom.js';

export async function openNuovoCartellinoModal({ onCreated = () => {} } = {}) {
  const clientsList = await api.getClienti({ onlyActive: true });

  const modalContent = `
    <form id="new-cartellino-form">
      <div class="form-group">
        <label class="form-label" for="nc-cliente">Cliente *</label>
        <select id="nc-cliente" class="form-select" required>
          <option value="">-- Seleziona un cliente --</option>
          ${clientsList
            .filter((c) => c.attivo)
            .map((c) => `<option value="${c.id}">${escapeHtml(c.nome)}</option>`)
            .join('')}
        </select>
      </div>

      <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 14px;">
        <div class="form-group">
          <label class="form-label" for="nc-commessa">Commessa / Riferimento *</label>
          <input
            type="text"
            id="nc-commessa"
            class="form-input"
            placeholder="es. Commessa A, Progetto X, Flangia 02"
            required
          />
        </div>
        <div class="form-group">
          <label class="form-label" for="nc-quantita">Quantità Pezzi *</label>
          <input
            type="number"
            id="nc-quantita"
            class="form-input tabular-nums"
            min="1"
            step="1"
            value="1"
            required
          />
        </div>
      </div>

      <div class="form-group">
        <label class="form-label" for="nc-descrizione">Descrizione Lavorazione</label>
        <textarea
          id="nc-descrizione"
          class="form-textarea"
          rows="3"
          placeholder="Dettaglio della lavorazione richiesta..."
        ></textarea>
      </div>

      <div class="form-group">
        <label class="form-label" for="nc-note">Note Aggiuntive</label>
        <input
          type="text"
          id="nc-note"
          class="form-input"
          placeholder="Note tecniche, tolleranze, finiture..."
        />
      </div>

      <div class="form-group">
        <label class="form-label" id="nc-foto-label">Foto del Pezzo (miniatura)</label>
        <div
          id="nc-dropzone"
          style="border: 2px dashed var(--border-color); border-radius: var(--radius-md); padding: 16px; background-color: #f8fafc; cursor: pointer; transition: all 0.2s ease;"
        >
          <input
            type="file"
            id="nc-foto-input"
            accept="image/*"
            style="display: none;"
          />
          <div id="nc-foto-empty-view" style="display: flex; flex-direction: column; align-items: center; text-align: center; gap: 6px;">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" style="color: var(--text-muted);">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
              <circle cx="8.5" cy="8.5" r="1.5"></circle>
              <polyline points="21 15 16 10 5 21"></polyline>
            </svg>
            <div style="font-size: 13px; font-weight: 600; color: var(--text-primary);">
              Carica miniatura foto pezzo
            </div>
            <div style="font-size: 11.5px; color: var(--text-muted);">
              Trascina qui l'immagine o clicca per selezionarla (PNG, JPG, WEBP)
            </div>
          </div>

          <div id="nc-foto-preview-view" style="display: none; align-items: center; justify-content: space-between; gap: 12px;">
            <div style="display: flex; align-items: center; gap: 12px;">
              <img
                id="nc-preview-img"
                src=""
                alt="Anteprima pezzo"
                style="width: 80px; height: 45px; aspect-ratio: 16 / 9; object-fit: cover; border-radius: 6px; border: 1px solid var(--border-color); background: #ffffff; box-shadow: 0 1px 2px rgba(0,0,0,0.05);"
              />
              <div>
                <div id="nc-preview-filename" style="font-size: 13px; font-weight: 600; color: var(--text-primary);">foto_pezzo.jpg</div>
                <div style="font-size: 11.5px; color: #16a34a; font-weight: 500;">Miniatura pronta per il cartellino</div>
              </div>
            </div>
            <button
              type="button"
              id="btn-remove-nc-foto"
              class="btn btn-secondary btn-sm"
              style="font-size: 11px; padding: 4px 8px; color: #dc2626;"
            >
              Rimuovi
            </button>
          </div>
        </div>
      </div>
    </form>
  `;

  const footerButtons = `
    <button type="button" class="btn btn-secondary" id="modal-cancel-btn">Annulla</button>
    <button type="button" class="btn btn-primary" id="modal-save-btn">Crea cartellino</button>
  `;

  openModal({
    title: 'Nuovo Cartellino di Lavorazione',
    contentHtml: modalContent,
    footerButtonsHtml: footerButtons,
    onOpen: (overlay) => {
      const cancelBtn = overlay.querySelector('#modal-cancel-btn');
      const saveBtn = overlay.querySelector('#modal-save-btn');
      const dropzone = overlay.querySelector('#nc-dropzone');
      const fileInput = overlay.querySelector('#nc-foto-input');
      const emptyView = overlay.querySelector('#nc-foto-empty-view');
      const previewView = overlay.querySelector('#nc-foto-preview-view');
      const previewImg = overlay.querySelector('#nc-preview-img');
      const previewName = overlay.querySelector('#nc-preview-filename');
      const removeFotoBtn = overlay.querySelector('#btn-remove-nc-foto');

      let uploadedFoto = null;

      const handleFileSelect = async (file) => {
        if (!file) return;
        if (!file.type.startsWith('image/')) {
          alert('Seleziona un file immagine valido (PNG, JPG, WEBP).');
          return;
        }
        try {
          const thumbnailDataUrl = await fileToThumbnail(file, 400, 400);
          uploadedFoto = thumbnailDataUrl;
          previewImg.src = thumbnailDataUrl;
          previewName.textContent = file.name || 'foto_pezzo.jpg';
          emptyView.style.display = 'none';
          previewView.style.display = 'flex';
        } catch (err) {
          alert(err.message || 'Errore durante la creazione della miniatura.');
        }
      };

      dropzone.addEventListener('click', (e) => {
        if (e.target.closest('#btn-remove-nc-foto')) return;
        fileInput.click();
      });

      fileInput.addEventListener('change', (e) => {
        const file = e.target.files && e.target.files[0];
        if (file) {
          handleFileSelect(file);
        }
      });

      dropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropzone.style.borderColor = 'var(--primary)';
        dropzone.style.backgroundColor = '#eff6ff';
      });

      dropzone.addEventListener('dragleave', (e) => {
        e.preventDefault();
        dropzone.style.borderColor = 'var(--border-color)';
        dropzone.style.backgroundColor = '#f8fafc';
      });

      dropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropzone.style.borderColor = 'var(--border-color)';
        dropzone.style.backgroundColor = '#f8fafc';
        const file = e.dataTransfer.files && e.dataTransfer.files[0];
        if (file) {
          handleFileSelect(file);
        }
      });

      removeFotoBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        uploadedFoto = null;
        fileInput.value = '';
        previewImg.src = '';
        emptyView.style.display = 'flex';
        previewView.style.display = 'none';
      });

      cancelBtn.addEventListener('click', closeModal);

      saveBtn.addEventListener('click', async () => {
        const clienteId = overlay.querySelector('#nc-cliente').value;
        const commessa = overlay.querySelector('#nc-commessa').value.trim();
        const quantita = overlay.querySelector('#nc-quantita').value;
        const descrizione = overlay.querySelector('#nc-descrizione').value.trim();
        const note = overlay.querySelector('#nc-note').value.trim();

        if (!clienteId) {
          alert('Seleziona un cliente.');
          return;
        }
        if (!commessa) {
          alert('Inserisci la commessa.');
          return;
        }

        try {
          const newCart = await api.createCartellino({
            cliente_id: clienteId,
            commessa,
            quantita,
            descrizione,
            note,
            foto_pezzo: uploadedFoto,
          });

          closeModal();
          showToast(`Cartellino ${newCart.numero} creato con successo!`, 'success');
          const currentIds = state.getExpandedClientIds();
          currentIds.add(clienteId);
          state.setExpandedClientIds(currentIds);
          onCreated(newCart);
        } catch (err) {
          alert(err.message || 'Errore durante la creazione del cartellino');
        }
      });
    },
  });
}
