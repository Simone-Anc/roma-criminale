# Roma Criminale — vertical slice 0.4

Gestionale/strategico a turni in una Roma contemporanea di finzione. Organizzazioni,
persone ed eventi sono inventati; le attività sono astratte (solo numeri di gameplay).

## Avvio

```bash
npm install
npm run dev            # http://localhost:5173
npm run simulate       # partite automatiche per il bilanciamento
npm run build:single   # un unico index.html autonomo in dist-single/
```

## Tecnologia

TypeScript + React + Vite. Il gioco è soprattutto UI e regole a turni; la mappa è un SVG
disegnato a mano. Porting: PWA subito, Tauri/Electron per desktop, Capacitor per mobile.

## Struttura

```
src/
  engine/   regole pure, senza React (types, setup, actions, turn, ai, territory, queries, balance, news, rng)
  data/     zone di Roma, organizzazioni, attività
  ui/       schermata iniziale, mappa (romeMap.ts), pannelli, giornale settimanale
scripts/simulate.ts
```

Stato unico serializzabile (`GameState`), azioni come dati (`GameAction`), stesse regole per
giocatore e IA.

## Contenuto attuale (0.1 → 0.4)

- 8 zone con controllo condiviso (0-100% per organizzazione + gruppi locali) e fasce
  marginale / influenza / parziale / forte / dominio.
- Il giocatore sceglie nome e zona di partenza; 2 rivali IA: I Lupi (aggressivi), I Corvi (ricchi).
- Denaro, influenza, potere, reputazione, membri, rischio, attenzione.
- Azioni: aumentare influenza, rafforzare zona, reclutare, attività astratte per zona.
- Turno settimanale con pulsante "Fine settimana" e resoconto in forma di giornale.
- Vittoria: 5 zone su 8, 1 milione, oppure i più potenti dopo 2 anni.

## Prossime versioni

0.5 eventi con scelte · 0.6 personaggi · 0.7 polizia · 0.8 diplomazia · 0.9 faide ·
1.0 UI, bilanciamento, salvataggio.
