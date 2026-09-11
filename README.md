# Gestionale Ore — Nuovo Frontend

Questa è la **nuova area pulita** del progetto Gestionale Ore.
## Obiettivo

Ricostruire il frontend **da zero**, come specificato in `GESTIONALE_ORE_BRIEF_AI_STUDIO.md`. Non è un refactoring del vecchio frontend: è un nuovo frontend indipendente.

## Stack previsto

- **Frontend:** Vite + Vanilla JavaScript + HTML + CSS
- **Backend futuro:** Go + SQLite (HTTP server locale/LAN)
- **Produzione:** `Gestionale.exe` con frontend Vite compilato in `dist/` e incorporato nel server Go (`go:embed`)

## Regole

- Il frontend verrà sviluppato in questa cartella; non toccare il progetto esistente.
- Il backend Go non è ancora inizializzato in questa area.
- I dati e le regole di business sono definiti nel brief `GESTIONALE_ORE_BRIEF_AI_STUDIO.md`.
- `design-reference/` contiene le immagini di riferimento per il layout visivo (copiate dal progetto originale senza modifiche).
