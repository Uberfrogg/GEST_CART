# Gestionale Ore — Brief per Google AI Studio (nuovo frontend)

**Lettura esclusiva di:** `GESTIONALE_ORE_SPEC_RICOSTRUZIONE_READONLY.md`, `directives/ACTIVE.md`, `design-reference/*`. Nessuna modifica al progetto.

---

## 1. Scopo

Gestionale aziendale portatile Windows per gestire dipendenti, ore lavorate, clienti, cartellini di lavorazione, macchine, archivio, materiali, assenze e backup. Deve essere semplice, veloce, affidabile, portabile, funzionante in LAN. Priorità: correttezza dati > semplicità d'uso > manutenibilità > stabilità LAN > portabilità. [VERIFICATO — ACTIVE.md §1]

## 2. Architettura target

- Frontend separato dal backend; successivamente servito tramite API Go.
- Backend: Go + SQLite (WAL); unico accesso diretto al DB è il backend.
- Funzionamento locale/LAN: un PC è server (`Gestionale.exe`); client via browser.
- Nessun cloud, nessun Internet: Firebase/Supabase/Firestore/DB-remoto sono PROIBITI.
- Frontend attuale NON è fonte di verità se contraddice ACTIVE.md.
- Non riutilizzare il vecchio frontend: ricostruire da zero. [VERIFICATO — ACTIVE.md §3, §5]

## 3. Utenti e ruoli

- **ADMIN** — visualizza tutto (anche cartellini archiviati), crea cartellini, gestisce clienti/macchine/materiali/backup/calendario/log.
- **DIPENDENTE** — visualizza propri dati, cartellini assegnati, calendario personale.
- Utenti iniziali: `ADMIN`, `ANDREA`, `GABRIELE`. Sistema predisposto ad aggiungerne altri. [VERIFICATO — ACTIVE.md §14]
- Login con credenziali reali; NO lista/autocomplete/selettore utente. Password hashing sicuro. [VERIFICATO — ACTIVE.md §15]
- **ADMIN NON modifica righe operative** (né operatore né macchina) — regola backend, non solo UI. [VERIFICATO — ACTIVE.md §16]

## 4. Funzionalità principali

1. Login autenticato (ruoli ADMIN/DIPENDENTE).
2. Dashboard: **UNA** ricerca globale (per cliente/n° cartellino/commessa/testo libero) + pulsante **"+ Nuovo cartellino"** (presente solo qui). [VERIFICATO — ACTIVE.md §17-20]
3. Cartellino digitale (storico completo, righe OPER/MACCH, materiali, immagini).
4. Clienti (elenco, ricerca propria, nuovo, modifica).
5. Macchine (elenco, ricerca, nuovo, modifica).
6. Archivio (cartellini completati/archiviati: ricerca, filtro, apertura; soft-state).
7. Calendario dipendente (vista mensile, navigazione mesi, giorno corrente, click → dettaglio giornata).
8. Backup (manuale, elenco, ripristino, eliminazione — procedura sicura SQLite).
9. Log eventi (avvio/errori/login/DB; NO password in chiaro).

## 5. Schermate

| Schermata | Scopo | Dati mostrati | Azioni | Navigazione |
|---|---|---|---|---|
| Login | Autenticazione | Campi utente/password | Invio; errore se credenziali errate | → Dashboard |
| Dashboard | Centro operativo | Ricerca globale; lista cartellini attivi (numero, cliente, commessa, stato, peso) | Ricerca; click card → cartellino; "+ Nuovo cartellino" | → tutte le schermate |
| Cartellino | Dettaglio lavorazione | Storico completo (no limite mese); righe OPER/MACCH (data, ore, nota); materiali (qty, dim mm, peso); immagini | Aggiungi/modifica righe (se permesso); archivia; gestisci materiali/immagini | ← Dashboard o Archivio |
| Clienti | Gestione clienti | Elenco (codice, nome, indirizzo, piva, attivo) | Ricerca propria; nuovo; modifica | Indipendente |
| Macchine | Gestione macchine | Elenco (codice, nome, attiva) | Ricerca; nuovo; modifica | Indipendente |
| Archivio | Cartellini archiviati | Elenco filtrabile (stato completato/archiviato) | Ricerca; filtro; apertura | Indipendente |
| Calendario | Ore dipendente/mese | Griglia mensile; ore/ giorno; giorno corrente; dettaglio giornata | Navigazione mesi; click giorno → dettaglio | Indipendente |
| Backup | Sicurezza dati | Elenco file backup | Backup; ripristino; eliminazione | Indipendente |

**Regola navigazione:** ricerca globale + "+ Nuovo cartellino" sono ESCLUSIVAMENTE nella Dashboard. NON appaiono in Clienti, Macchine, Archivio, Backup, Calendario. Ogni pagina ha solo controlli pertinenti. [VERIFICATO — ACTIVE.md §20, §35]

## 6. Regole di business (necessarie al frontend)

- **Cartellino NON ha tipo globale** operatore/macchina. La distinzione è per singola riga. [VERIFICATO — ACTIVE.md §9, §39-1]
- **Riga operativa:** `kind` = `OPER` (operatore) oppure `MACCH` (macchina); mai entrambi. `ref_id` = id dipendente (OPER) o macchina (MACCH). [VERIFICATO — ACTIVE.md §11]
- **Calendario dipendente conta SOLO righe OPER assegnate a quel dipendente.** Ore macchina NON contano per nessun dipendente. [VERIFICATO — ACTIVE.md §10, §39-3]
- Ore registrabili solo in incrementi di **0,5h**. Validazione frontend + backend. [VERIFICATO — ACTIVE.md §12]
- **Una sola fonte del dato:** righe operative = unica fonte ore; calendario/cartellino/statistiche condividono la stessa riga. [VERIFICATO — ACTIVE.md §36]
- Regole importanti (validazione 0,5h, permessi, associazione operatore/macchina, conteggio ore, stato archivio) applicate dal **backend**, non duplicabili in frontend. [VERIFICATO — ACTIVE.md §37]
- Stati cartellino: `in-lavorazione`, `completato`, `archiviato`. Archiviazione = soft-state (NO cancellazione fisica). [VERIFICATO — ACTIVE.md §24-25]
- Materiali con densità configurabile; valori iniziali: ALLUMINIO 2700, FERRO 7850, DELRIN 1410, RESINA/UREOL 700, LEGNO/MULTISTRATO BETULLA 700 kg/m³. [VERIFICATO — ACTIVE.md §26]
- Dimensioni in mm (X/Y/Z con decimali). Volume = `(X×Y×Z)/1.000.000.000 m³`; Peso = `volume × densità kg/m³`. Centralizzare, NON duplicare. [VERIFICATO — ACTIVE.md §27]
- Immagini/thumbnail associabili a pezzi (carica/sostituisci/elimina/visualizza). [VERIFICATO — ACTIVE.md §29]
- Assenze (PERMESSO/FERIE/EX FESTIVITÀ) gestite SEPARATAMENTE dalle ore lavorate. [VERIFICATO — ACTIVE.md §28]
- UI pulita, moderna, semplice, professionale; nessun elemento duplicato, menu inutile, filtro ripetuto. [VERIFICATO — ACTIVE.md §34]

## 7. Dati (entità e campi percepibili dal frontend)

- **Dipendenti:** id, codice, nome, cognome, ruolo (ADMIN/DIPENDENTE/OPERATORE), attivo.
- **Clienti:** id, codice, nome, via, cap, città, piva, attivo.
- **Macchine:** id, codice, nome, attiva.
- **Materiali:** id, codice, nome, densità_kg/m³, unità_misura.
- **Cartellini:** id, numero (es. "#001"), cliente_id, commessa, stato, peso_totale, note.
- **Righe operative:** id, cartellino_id, kind (OPER/MACCH), ref_id (dipendente o macchina), data_lavoro, ore, nota.
- **Materiali_cartellino:** id, cartellino_id, materiale_id, qty, x_mm, y_mm, z_mm, peso_kg.
- **Log:** timestamp, evento, utente, dettagli (NO password).

**Note:** tabella assenze NON esiste nello schema; tabella immagini NON esiste (gestione in memoria/file). [DA CONFERMARE — vedi §12]

## 8. Cartellino (sezione centrale)

- **Struttura:** sequenza di righe operative; NON ha tipo globale operatore/macchina. Ogni riga è OPER o MACCH.
- **Operatori (righe OPER):** riferimento a dipendente; le loro ore compaiono nel calendario personale.
- **Macchine (righe MACCH):** riferimento a macchina; ore visibili nel cartellino ma NON conteggiate nel calendario di nessun dipendente.
- **Materiali:** qty + dimensioni X/Y/Z (mm) + densità → peso calcolato (formula §27).
- **Ore:** solo incrementi 0,5h; validazione frontend + backend.
- **Costi/totali:** `peso_totale` è il totale presente nel cartellino (da materiali). Nessun costo/price/fatturazione definito. [NON TROVATO]
- **Stato:** in-lavorazione / completato / archiviato.
- **Comportamento:** visualizza l'intero storico operativo (più mesi); distingue OPER/MACCH per riga; associabile immagine/thumbnail al pezzo.
- **Fonte:** `CARTELLINO.png` (cartellino cartaceo reale) è riferimento funzionale/strutturale principale per il cartellino digitale. [VERIFICATO — ACTIVE.md §8]

## 9. Design

**Asset disponibili** (per riferimento visivo del nuovo frontend):

- `design-reference/CARTELLINO.png` — riferimento funzionale del cartellino cartaceo (logica dati).
- `design-reference/login.jpg`, `dashboard principale.jpg`, `dashboard con ricerca.jpg`, `dashboard cliente espanso.jpg` — layout Dashboard.
- `design-reference/clienti.jpg`, `macchine.jpg`, `archivio.jpg`, `backup.jpg`, `calendario.jpg` — layout pagine dedicate.
- `design-reference/caretllino digitale.jpg`, `nuovo cartellino.jpg`, `nuova attività.jpg`, `dettaglio giornata.jpg` — layout cartellino/calendario.
- `frontend/screenshots/login-*.png` (4) — screenshot login (desktop/mobile/errore/password).

**Indicazione UI:** pulita, moderna, semplice, professionale, leggibile, rapido da usare. [VERIFICATO — ACTIVE.md §34]

## 10. Vincoli frontend

- Frontend separato; servito poi tramite API Go.
- HTML/CSS/JavaScript vanilla (no React/Vue/Angular/Svelte/Electron). [VERIFICATO — ACTIVE.md §2]
- Nessuna dipendenza cloud, nessun Internet.
- Deve gestire route `/api/*` per dati (auth, cartellini, clienti, macchine, materiali, righe, calendario, backup, log).
- Autenticazione tramite backend (token/cookie JWT da definire). [DA CONFERMARE]
- Vulnerabilità: frontend NON è sistema di sicurezza; permessi sempre verificati backend. [VERIFICATO — ACTIVE.md §33]

## 11. Cosa NON fare

- NON riutilizzare il vecchio frontend (codice, layout, componenti).
- NON trasformare il progetto in app cloud; NON usare Firebase/Supabase/Firestore.
- NON inventare funzionalità non presenti in ACTIVE.md §1-39.
- NON inventare regole di business (es. straordinario >8h NON è definito; NON assumere).
- NON modificare il backend Go, il database, le configurazioni, ACTIVE.md.
- NON assumere che una funzione implementata nel vecchio frontend sia un requisito (verificare sempre contro ACTIVE.md).
- NON duplicare logica di validazione in frontend e backend in modo divergente.

## 12. Elementi da confermare (bloccanti)

Questi aspetti impediscono una corretta implementazione se lasciati ambigui; devono essere definiti prima dello sviluppo:

1. **Auth endpoint backend** (`/api/login`, sessione/token tipo) — NON verificato esistente; necessario per integrazione.
2. **Tabella assenze** — campi, stati, relazione dipendente (ACTIVE.md §28 lo prevede ma schema NON lo include).
3. **Storage immagini** — struttura (tabella? percorso file? FK cartellino? thumbnail?) — prevede ACTIVE.md §29 ma schema NON lo include.
4. **Conteggio ore calendario** — calcolo lato client (da righe) o endpoint aggregato backend? (`ore_dipendente` è vuoto).
5. **Endpoint API per righe/materiali/ricerca globale** — attualmente NON verificati oltre `/api/cartellini` (anagrafica). Da definire con backend.
6. **Costi/straordinari/prezzi** — non definiti; se richiesti nel nuovo progetto, specificare regole esplicite (NON inventare).
7. **Criterio archiviazione** — manuale (utente) o automatico (nessun criterio definito in ACTIVE.md).

---

**Autosufficienza verificata:** il brief include scope, architettura, utenti/ruoli, funzionalità, schermate, regole, dati, cartellino, design, vincoli, proibizioni e ambiguità bloccanti. Tutte le informazioni sono [VERIFICATO] (da ACTIVE.md + schema + report) o esplicitamente [DA CONFERMARE]; nessuna regola inventata. Il documento è autosufficiente per ricostruire il frontend da zero senza il vecchio codice.
