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
generato da coordinate reali di Roma (Voronoi dei quartieri, Tevere, Aniene, GRA, costa). Porting: PWA subito, Tauri/Electron per desktop, Capacitor per mobile.

## Struttura

```
src/
  engine/   regole pure, senza React (types, setup, actions, turn, ai, territory, queries, balance, news, rng)
  data/     quartieri di Roma, geografia (proiezione + Voronoi), organizzazioni, attività
  ui/       schermata iniziale, mappa (romeMap.ts), pannelli, giornale settimanale
scripts/simulate.ts
```

Stato unico serializzabile (`GameState`), azioni come dati (`GameAction`), stesse regole per
giocatore e IA.

## Contenuto attuale (0.1 → 0.4)

- 41 quartieri reali (nomi solo geografici) in 8 macro-aree, con controllo condiviso
  (0-100% per organizzazione + gruppi locali) e fasce marginale / influenza / parziale /
  forte / dominio. Le adiacenze derivano dalla mappa.
- Il giocatore sceglie nome e zona di partenza; 2 rivali IA: I Lupi (aggressivi), I Corvi (ricchi).
- Denaro, influenza, potere, reputazione, membri, rischio, attenzione.
- Azioni: aumentare influenza, rafforzare quartiere, reclutare, basso profilo, rispetto.
- Rami d'affari a livelli (tab "Affari"): ogni livello rende e impegna un membro, a certe
  soglie sblocca vantaggi permanenti; crescono solo dominando quartieri adatti.
- Mappa con zoom (rotella, pizzico) e trascinamento.
- Gerarchia ad albero: capo, vice capi con lealtà/ambizione/abilità e un incarico d'area,
  soldati assegnati alle squadre. Un vice troppo scontento si mette in proprio e diventa
  un'organizzazione rivale.
- Turno settimanale con pulsante "Fine settimana" e resoconto in forma di giornale.
- Vittoria: 14 quartieri su 41, 1 milione, oppure i più potenti dopo 2 anni.

## Prossime versioni

0.5 eventi con scelte · 0.6 personaggi · 0.7 polizia · 0.8 diplomazia · 0.9 faide ·
1.0 UI, bilanciamento, salvataggio.
