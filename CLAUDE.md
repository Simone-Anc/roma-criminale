# Roma Criminale — contesto per Claude

Questo file riassume la chat in cui è nato il progetto: leggilo prima di lavorare.
Il documento di design completo dell'autore è in `docs/concept.md` (fonte di verità per
le meccaniche future).

## Cos'è

Gestionale/strategico a turni (1 turno = 1 settimana) in una Roma contemporanea **di
finzione**. Il giocatore guida un piccolo gruppo e cerca di diventare l'organizzazione
dominante della città. Autore: Simone (sviluppatore backend Java). Si lavora in italiano:
codice commentato in italiano, testi di gioco in italiano.

## Vincoli di contenuto (non negoziabili)

- Organizzazioni, persone ed eventi inventati. Nessun riferimento a clan, persone o fatti di
  cronaca reali; le zone di Roma sono macro-aree con descrizioni d'ambiente generiche.
- Attività criminali **astratte**: esistono solo come numeri (profitto, rischio, costo,
  controllo minimo). Mai istruzioni operative, mai tecniche reali per eludere la polizia.
- Tono serio e cinematografico, senza glorificare: le conseguenze negative fanno parte
  del gioco.

## Stack e comandi

TypeScript + React 18 + Vite 5. Nessun backend.

```bash
npm install
npm run dev            # sviluppo
npm run simulate       # partite automatiche (tsx scripts/simulate.ts) per il bilanciamento
npm run build          # tsc --noEmit + build
npm run build:single   # unico index.html autonomo in dist-single/
```

Dopo ogni modifica: `npx tsc --noEmit -p .` deve passare e il gioco deve restare
avviabile e giocabile (regola dell'autore: COMPILABILE → AVVIABILE → GIOCABILE).

## Architettura

- `src/engine/` — regole pure, **nessuna dipendenza da React**.
  - `types.ts` modello dati. Nota: per motivi storici i tipi si chiamano ancora
    `Family`/`FamilyId` (organizzazione) e `Territory*` (zona), e `LOCALS = 'locali'`
    sono i gruppi non organizzati. Rinominare è accettabile ma va fatto ovunque.
  - `balance.ts` tutti i numeri di bilanciamento (denaro in migliaia di €) +
    `CONTROL_LEVELS` (fasce 0-20 marginale, 20-40 influenza, 40-60 parziale,
    60-80 forte, 80-100 dominio).
  - `setup.ts` `newGame()`; `actions.ts` `validateAction`/`applyAction`/`perform`;
    `turn.ts` `endTurn()`; `ai.ts` IA rivali; `territory.ts` influenza e cambio di
    dominante; `queries.ts` funzioni di sola lettura; `news.ts`; `rng.ts` RNG
    deterministico salvato nello stato.
- `src/data/` — `zones.ts` (8 zone), `organizations.ts` (rivali + opzioni di partenza
  del giocatore), `activities.ts`.
- `src/ui/` — `StartScreen`, `GameScreen`, `MapView` + `romeMap.ts` (geometria SVG
  disegnata a mano: zone, Tevere, mare), `panels.tsx`, `Newspaper.tsx` (resoconto
  settimanale come prima pagina di giornale).

Principi da rispettare:
- Un solo stato serializzabile (`GameState`): il salvataggio sarà `JSON.stringify`.
- Le azioni sono dati (`GameAction`); giocatore e IA passano dalle stesse regole.
- `perform(state, action)` ed `endTurn(state)` restituiscono un nuovo stato (structuredClone).
- La UI non contiene regole di gioco. Niente GameManager monolitico.
- Non introdurre sistemi prima della loro versione in roadmap.

## Regole attuali (vertical slice, versioni 0.1-0.4)

- 8 zone: Centro, Nord, Nord-Est, Est, Sud-Est, Sud, Sud-Ovest, Ovest. Il Centro confina
  con tutte; le altre con le due vicine e il Centro.
- Ogni zona ha 100 punti di influenza ripartiti tra organizzazioni e gruppi locali.
  Domina chi ha almeno il 35% e più di chiunque altro. Si assorbono prima i gruppi
  locali; erodere un'altra organizzazione costa il doppio (vantaggio di chi difende) e
  peggiora i rapporti.
- Giocatore: sceglie nome e zona di partenza (Sud-Ovest, Sud, Ovest), parte con 90k,
  5 membri, 40% di influenza. Rivali IA: I Lupi (Est, aggressivi, numerosi) e I Corvi
  (Nord, ricchi e prudenti).
- 3 azioni a settimana: aumentare influenza, rafforzare zona, reclutare, basso profilo,
  gesto di rispetto. Avviare o chiudere attività non consuma azioni; ogni attività
  impegna 2 membri.
- Rischio (esposizione): cresce con attività (pesate dalla presenza della polizia nella
  zona) ed espansioni, cala da solo e col basso profilo. Sopra 60 sequestri, sopra 85
  arresti. L'"attenzione" è ancora un indicatore derivato: diventerà lo stato della
  polizia nella 0.7.
- Tregua: nessuno può erodere zone dominate da altri nelle prime 6 settimane.
- Vittoria: 5 zone su 8, 1 milione, oppure i più potenti dopo 104 settimane.
  Sconfitta: nessuna zona, oppure 4 settimane consecutive con cassa negativa.

## Stato del bilanciamento (ultima simulazione)

- Giocatore passivo: perde in circa 20 settimane (atteso, ma forse troppo in fretta).
- Giocatore guidato dall'IA: perde spesso partendo da Sud-Ovest e Ovest, vince più
  spesso partendo da Sud. **L'inizio è probabilmente troppo duro**: prima della 0.5
  valutare più denaro iniziale o stipendi più bassi, verificando con `npm run simulate`.

## Roadmap

- [x] 0.1 mappa + zone · 0.2 giocatore + 2 IA · 0.3 economia + influenza · 0.4 turni
- [ ] 0.5 eventi: situazione + 2-4 scelte + conseguenze (nuovo modulo `engine/events.ts`,
      mostrati nel resoconto di fine settimana)
- [ ] 0.6 personaggi generati (lealtà, ambizione, ruoli, tradimenti)
- [ ] 0.7 polizia come fazione IA: attenzione per zona, indagini visibili che avanzano
      per settimane (perquisizione, sequestro, arresti, processo), reazioni strategiche
- [ ] 0.8 diplomazia (alleanze, accordi, tradimenti) · 0.9 faide
- [ ] 1.0 UI curata, bilanciamento, salvataggio

## Progetto collegato

Esiste un prototipo precedente, "Ombre d'Italia" (stessa architettura, mappa dell'Italia
con 10 territori e 4 famiglie). Roma Criminale ne deriva e lo sostituisce come progetto
principale.
