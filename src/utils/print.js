/**
 * Utility for Printing Scheda Cartellino di Lavorazione
 * Handles standalone printable documents, new tab auto-print, download fallback, and iframe constraints.
 */

import { formatDate } from './date.js';

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function generateCartellinoPrintHtml(cartellino, dipendentiMap = new Map(), macchineMap = new Map()) {
  const dataStampa = new Date().toLocaleDateString('it-IT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const statoLabel = {
    'in-lavorazione': 'IN LAVORAZIONE',
    completato: 'COMPLETATO',
    archiviato: 'ARCHIVIATO',
  }[cartellino.stato] || (cartellino.stato || '').toUpperCase();

  const totaleOre = (cartellino.ore_totali_operatore || 0) + (cartellino.ore_totali_macchina || 0);

  return `<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Scheda Cartellino N° ${escapeHtml(cartellino.numero)} — G.R. snc</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 12mm 14mm;
    }
    *, *::before, *::after {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: #0f172a;
      background: #ffffff;
      font-size: 11.5pt;
      line-height: 1.4;
      padding: 16px;
    }

    /* Top actions toolbar (only on screen) */
    .print-actions-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: #0f172a;
      color: #ffffff;
      padding: 10px 18px;
      border-radius: 6px;
      margin-bottom: 24px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.15);
    }
    .print-actions-bar h1 {
      font-size: 14px;
      font-weight: 600;
      margin: 0;
    }
    .btn-print-action {
      background: #0284c7;
      color: #ffffff;
      border: none;
      padding: 7px 14px;
      font-size: 13px;
      font-weight: 600;
      border-radius: 4px;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      transition: background 0.15s;
    }
    .btn-print-action:hover {
      background: #0369a1;
    }
    .btn-print-secondary {
      background: #334155;
      color: #ffffff;
      border: none;
      padding: 7px 12px;
      font-size: 13px;
      font-weight: 600;
      border-radius: 4px;
      cursor: pointer;
      margin-left: 8px;
      transition: background 0.15s;
    }
    .btn-print-secondary:hover {
      background: #475569;
    }

    /* Sheet Layout */
    .sheet-container {
      max-width: 800px;
      margin: 0 auto;
    }

    .sheet-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 2.5px solid #0f172a;
      padding-bottom: 12px;
      margin-bottom: 16px;
    }
    .company-name {
      font-size: 22pt;
      font-weight: 800;
      letter-spacing: -0.02em;
      color: #0f172a;
    }
    .company-sub {
      font-size: 9.5pt;
      color: #475569;
      margin-top: 2px;
    }
    .header-right {
      text-align: right;
    }
    .doc-type {
      font-size: 16pt;
      font-weight: 800;
      color: #0284c7;
      text-transform: uppercase;
    }
    .doc-meta {
      font-size: 9pt;
      color: #64748b;
      margin-top: 3px;
    }

    /* General Info Box */
    .info-card {
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      padding: 12px 16px;
      margin-bottom: 14px;
      background: #f8fafc;
      page-break-inside: avoid;
    }
    .info-grid {
      display: grid;
      grid-template-columns: 2fr 1fr 1fr;
      gap: 12px 18px;
    }
    .info-item {
      display: flex;
      flex-direction: column;
    }
    .info-label {
      font-size: 8.5pt;
      text-transform: uppercase;
      font-weight: 700;
      color: #64748b;
      letter-spacing: 0.03em;
    }
    .info-value {
      font-size: 11pt;
      font-weight: 600;
      color: #0f172a;
      margin-top: 2px;
    }
    .info-desc {
      grid-column: 1 / -1;
      margin-top: 4px;
      padding-top: 8px;
      border-top: 1px dashed #cbd5e1;
      font-size: 10pt;
      color: #334155;
    }

    /* Photo section */
    .photo-card {
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      padding: 10px;
      margin-bottom: 14px;
      display: flex;
      align-items: center;
      gap: 16px;
      background: #ffffff;
      page-break-inside: avoid;
    }
    .photo-img {
      width: 220px;
      height: 124px;
      object-fit: cover;
      border-radius: 4px;
      border: 1px solid #cbd5e1;
    }
    .photo-meta {
      flex: 1;
      font-size: 9.5pt;
      color: #475569;
    }

    /* Summary Stats Bar */
    .stats-bar {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      border: 1.5px solid #0f172a;
      border-radius: 6px;
      background: #f1f5f9;
      margin-bottom: 16px;
      text-align: center;
      page-break-inside: avoid;
    }
    .stat-box {
      padding: 8px 10px;
    }
    .stat-box:not(:last-child) {
      border-right: 1px solid #cbd5e1;
    }
    .stat-label {
      font-size: 8pt;
      text-transform: uppercase;
      font-weight: 700;
      color: #475569;
      letter-spacing: 0.03em;
    }
    .stat-num {
      font-size: 14pt;
      font-weight: 800;
      color: #0f172a;
      margin-top: 2px;
    }

    /* Tables */
    .section-heading {
      font-size: 11pt;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.03em;
      color: #0f172a;
      margin: 16px 0 6px 0;
      display: flex;
      justify-content: space-between;
      align-items: baseline;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 14px;
      font-size: 10pt;
    }
    th {
      background: #e2e8f0;
      color: #0f172a;
      font-weight: 700;
      text-align: left;
      padding: 6px 8px;
      border: 1px solid #94a3b8;
      font-size: 8.5pt;
      text-transform: uppercase;
    }
    td {
      padding: 5px 8px;
      border: 1px solid #cbd5e1;
      color: #1e293b;
    }
    tr:nth-child(even) td {
      background: #f8fafc;
    }

    /* Signatures */
    .signatures-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 36px;
      margin-top: 32px;
      page-break-inside: avoid;
    }
    .signature-slot {
      border-top: 1.5px solid #0f172a;
      padding-top: 6px;
      text-align: center;
      font-size: 9.5pt;
      font-weight: 600;
      color: #334155;
    }

    @media print {
      body {
        padding: 0;
      }
      .no-print {
        display: none !important;
      }
      .sheet-container {
        max-width: 100%;
      }
    }
  </style>
  <script>
    window.addEventListener('load', function() {
      // Auto-trigger print when opened in a dedicated tab
      setTimeout(function() {
        try {
          window.print();
        } catch (e) {}
      }, 350);
    });
  </script>
</head>
<body>
  <div class="sheet-container">
    <!-- Screen Actions Toolbar -->
    <div class="print-actions-bar no-print">
      <h1>Scheda Cartellino N° ${escapeHtml(cartellino.numero)} — Anteprima Stampa</h1>
      <div>
        <button type="button" class="btn-print-action" onclick="window.print()">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="display:inline-block; vertical-align:middle; margin-right:4px;">
            <polyline points="6 9 6 2 18 2 18 9"></polyline>
            <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
            <rect x="6" y="14" width="12" height="8"></rect>
          </svg>
          Stampa Scheda
        </button>
        <button type="button" class="btn-print-secondary" onclick="window.close()">Chiudi</button>
      </div>
    </div>

    <!-- Header -->
    <header class="sheet-header">
      <div>
        <div class="company-name">G.R. snc</div>
        <div class="company-sub">Lavorazioni Meccaniche di Precisione &amp; Carpenteria</div>
      </div>
      <div class="header-right">
        <div class="doc-type">Cartellino N° ${escapeHtml(cartellino.numero)}</div>
        <div class="doc-meta">Stampa del ${dataStampa}</div>
      </div>
    </header>

    <!-- General Info Card -->
    <section class="info-card">
      <div class="info-grid">
        <div class="info-item">
          <span class="info-label">Commessa</span>
          <span class="info-value" style="font-size: 13pt; color: #0284c7;">${escapeHtml(cartellino.commessa)}</span>
        </div>
        <div class="info-item">
          <span class="info-label">Cliente</span>
          <span class="info-value">${escapeHtml(cartellino.cliente ? cartellino.cliente.nome : 'N/D')}</span>
        </div>
        <div class="info-item">
          <span class="info-label">Quantità</span>
          <span class="info-value">${cartellino.quantita || 1} pz</span>
        </div>
        <div class="info-item">
          <span class="info-label">Stato Lavorazione</span>
          <span class="info-value">${statoLabel}</span>
        </div>
        <div class="info-item">
          <span class="info-label">Data Creazione</span>
          <span class="info-value">${escapeHtml(formatDate(cartellino.data_creazione || cartellino.created_at || new Date().toISOString()))}</span>
        </div>
        <div class="info-item">
          <span class="info-label">Peso Totale</span>
          <span class="info-value" style="color: #059669;">${(cartellino.peso_totale || 0).toFixed(2)} kg</span>
        </div>
        <div class="info-desc">
          <strong>Descrizione / Note:</strong> ${escapeHtml(cartellino.descrizione || cartellino.note || 'Nessuna specifica aggiuntiva inserita.')}
        </div>
      </div>
    </section>

    ${
      cartellino.foto_pezzo
        ? `
          <section class="photo-card">
            <img src="${escapeHtml(cartellino.foto_pezzo)}" alt="Foto pezzo" class="photo-img" />
            <div class="photo-meta">
              <strong>Foto Pezzo / Disegno di Riferimento</strong><br />
              Allegato al cartellino ${escapeHtml(cartellino.numero)} — Commessa: ${escapeHtml(cartellino.commessa)}.
            </div>
          </section>
        `
        : ''
    }

    <!-- Summary Stats -->
    <section class="stats-bar">
      <div class="stat-box">
        <div class="stat-label">Ore Operatore</div>
        <div class="stat-num" style="color: #0284c7;">${(cartellino.ore_totali_operatore || 0).toFixed(1)} h</div>
      </div>
      <div class="stat-box">
        <div class="stat-label">Ore Macchina</div>
        <div class="stat-num" style="color: #7c3aed;">${(cartellino.ore_totali_macchina || 0).toFixed(1)} h</div>
      </div>
      <div class="stat-box">
        <div class="stat-label">Totale Ore Lavoro</div>
        <div class="stat-num">${totaleOre.toFixed(1)} h</div>
      </div>
      <div class="stat-box">
        <div class="stat-label">Peso Complessivo</div>
        <div class="stat-num" style="color: #059669;">${(cartellino.peso_totale || 0).toFixed(2)} kg</div>
      </div>
    </section>

    <!-- Righe Operative Table -->
    <section>
      <div class="section-heading">
        <span>Storico Lavorazioni Operative</span>
        <span style="font-size: 8.5pt; font-weight: 500; color: #64748b;">${cartellino.righe ? cartellino.righe.length : 0} registrazioni</span>
      </div>
      <table>
        <thead>
          <tr>
            <th style="width: 75px;">Tipo</th>
            <th style="width: 85px;">Data</th>
            <th>Operatore / Macchina</th>
            <th style="width: 75px; text-align: right;">Ore</th>
            <th>Descrizione / Note</th>
            <th style="width: 65px; text-align: center;">Visto</th>
          </tr>
        </thead>
        <tbody>
          ${
            !cartellino.righe || cartellino.righe.length === 0
              ? `<tr><td colspan="6" style="text-align: center; color: #64748b; padding: 12px;">Nessuna riga operativa registrata.</td></tr>`
              : cartellino.righe
                  .map((r) => {
                    const isOper = r.kind === 'OPER';
                    const refName = isOper
                      ? dipendentiMap.get(r.ref_id) || 'Dipendente'
                      : macchineMap.get(r.ref_id) || 'Macchina';
                    return `
                      <tr>
                        <td style="font-weight: 700; color: ${isOper ? '#0284c7' : '#7c3aed'}; font-size: 8.5pt;">${r.kind}</td>
                        <td style="white-space: nowrap;">${escapeHtml(formatDate(r.data_lavoro))}</td>
                        <td style="font-weight: 600;">${escapeHtml(refName)}</td>
                        <td style="text-align: right; font-weight: 700;">${parseFloat(r.ore).toFixed(1)} h</td>
                        <td style="color: #475569;">${escapeHtml(r.nota || '-')}</td>
                        <td style="border: 1px solid #cbd5e1;"></td>
                      </tr>
                    `;
                  })
                  .join('')
          }
        </tbody>
      </table>
    </section>

    <!-- Materiali Table -->
    <section>
      <div class="section-heading">
        <span>Distinta Materiali e Pesi</span>
        <span style="font-size: 8.5pt; font-weight: 500; color: #64748b;">${cartellino.materiali ? cartellino.materiali.length : 0} voci</span>
      </div>
      <table>
        <thead>
          <tr>
            <th>Materiale</th>
            <th style="width: 60px; text-align: right;">Q.tà</th>
            <th style="width: 150px; text-align: right;">Dimensioni (X × Y × Z mm)</th>
            <th style="width: 110px; text-align: right;">Densità (kg/m³)</th>
            <th style="width: 100px; text-align: right;">Peso Totale</th>
          </tr>
        </thead>
        <tbody>
          ${
            !cartellino.materiali || cartellino.materiali.length === 0
              ? `<tr><td colspan="5" style="text-align: center; color: #64748b; padding: 12px;">Nessun materiale specificato.</td></tr>`
              : cartellino.materiali
                  .map((m) => {
                    return `
                      <tr>
                        <td style="font-weight: 600;">${escapeHtml(m.nome)}</td>
                        <td style="text-align: right;">${m.qty}</td>
                        <td style="text-align: right;">${m.x_mm} × ${m.y_mm} × ${m.z_mm} mm</td>
                        <td style="text-align: right; color: #64748b;">${m.densita} kg/m³</td>
                        <td style="text-align: right; font-weight: 700; color: #059669;">${parseFloat(m.peso_kg || 0).toFixed(2)} kg</td>
                      </tr>
                    `;
                  })
                  .join('')
          }
        </tbody>
      </table>
    </section>

    <!-- Signatures -->
    <section class="signatures-grid">
      <div class="signature-slot">
        Firma Operatore / Esecutore
      </div>
      <div class="signature-slot">
        Firma Controllo Qualità / Responsabile
      </div>
    </section>
  </div>
</body>
</html>`;
}

/**
 * Downloads the standalone HTML file
 */
export function downloadCartellinoHtml(cartellino, dipendentiMap, macchineMap) {
  const html = generateCartellinoPrintHtml(cartellino, dipendentiMap, macchineMap);
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `Scheda_Cartellino_${cartellino.numero || 'print'}.html`;
  document.body.appendChild(link);
  link.click();
  setTimeout(() => {
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, 1000);
}

/**
 * Opens a dedicated print window/tab with auto-print
 */
export function openInNewTabAndPrint(cartellino, dipendentiMap, macchineMap) {
  const html = generateCartellinoPrintHtml(cartellino, dipendentiMap, macchineMap);
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  
  // Try direct open
  const win = window.open(url, '_blank');
  if (!win || win.closed || typeof win.closed === 'undefined') {
    // If popup blocked, use anchor click
    const a = document.createElement('a');
    a.href = url;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 2000);
  }
}
