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
  cronaca reali. I quartieri hanno nomi reali (San Giovanni, Magliana, ...) usati **solo come
  riferimento geografico**: descrizioni d'ambiente generiche, e le basi delle organizzazioni
  fittizie non vanno messe dove ricalcherebbero gruppi reali.
- Attività criminali **astratte**: esistono solo come numeri (profitto, rischio, costo,
  livello). Mai istruzioni operative, mai tecniche reali per eludere la polizia.
- Niente rami d'affari in cui la "merce" sono persone (traffico di organi, sfruttamento
  della prostituzione, tratta): farne una linea di profitto da potenziare li glorificherebbe.
  Esclusi su richiesta dell'autore di inserirli, con questa motivazione.
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
    `Family`/`FamilyId` (organizzazione) e `Territory*` (quartiere), e `LOCALS = 'locali'`
    sono i gruppi non organizzati. Rinominare è accettabile ma va fatto ovunque.
  - `balance.ts` tutti i numeri di bilanciamento (denaro in migliaia di €) +
    `CONTROL_LEVELS` (fasce 0-20 marginale, 20-40 influenza, 40-60 parziale,
    60-80 forte, 80-100 dominio).
  - `rackets.ts` rami d'affari: rete di quartieri adatti, livello utile, entrate,
    rischio, somma dei vantaggi (`bonuses()`: ogni campo di `Bonuses` è letto da una
    sola regola del motore).
  - `news.ts` ha anche `di(f)` per le preposizioni articolate ("dei Lupi", "del Gruppo").
  - `organization.ts` gerarchia (slot, squadre, effetti dell'incarico, generazione dei
    personaggi); `loyalty.ts` passo settimanale della lealtà e scissioni.
  - `setup.ts` `newGame()`; `actions.ts` `validateAction`/`applyAction`/`perform`;
    `turn.ts` `endTurn()`; `ai.ts` IA rivali; `territory.ts` influenza e cambio di
    dominante; `queries.ts` funzioni di sola lettura; `news.ts`; `rng.ts` RNG
    deterministico salvato nello stato.
- `src/data/` — `zones.ts` (41 quartieri in 8 macro-aree, con coordinate lat/lon reali),
  `geography.ts` (confine comunale, costa, Tevere, Aniene, GRA; proiezione "a lente" che
  ingrandisce il centro; Voronoi dei quartieri), `organizations.ts` (rivali + opzioni di
  partenza del giocatore), `rackets.ts` (9 rami d'affari con livelli e vantaggi).
  **Le adiacenze non si scrivono a mano**: si ricavano dalle celle di Voronoi (lato in
  comune ≥ 6 px). Per spostare un confine si sposta il centro del quartiere (`coords`).
- `src/ui/` — `StartScreen`, `GameScreen` (mappa a schermo intero con comandi sovrapposti,
  stile "gioco da tavolo" ispirato agli screenshot in `example/`, cartella locale non versionata), `hud.tsx` (nastro del turno
  con "Fine turno", cartiglio in alto del quartiere o del ramo d'affari, colonna di icone dei
  rami, pulsanti tondi Affari/Banda/Rivali, medaglione del capo in basso a destra con
  Quartieri/Cassa, chip dei rivali, schermata Profilo = ritratto + banda + vantaggi/problemi,
  fascicoli laterali `Drawer`), `MapView` + `romeMap.ts` (dalle celle ai tracciati SVG; i
  quartieri sono grigi con bordo spesso, quello scelto o in evidenza diventa bianco "in
  rilievo"; badge = valore del quartiere) + `useZoomPan.ts` (zoom con rotella/pizzico e
  trascinamento, solo sul viewBox; a zoom 1 inquadra lo spazio lasciato libero dai margini
  CSS `--map-top/right/bottom/left`), `RacketsPanel.tsx`, `OrganizationPanel.tsx` (gerarchia
  ad albero), `panels.tsx`, `Newspaper.tsx`. Ritratto del capo: `src/assets/boss.jpg`
  (ridotto da `example/`). In `styles.css` `--s` scala i comandi: 1 su monitor, ~0,6 su
  telefono (orizzontale e verticale).

Principi da rispettare:
- Un solo stato serializzabile (`GameState`): il salvataggio sarà `JSON.stringify`.
- Le azioni sono dati (`GameAction`); giocatore e IA passano dalle stesse regole.
- `perform(state, action)` ed `endTurn(state)` restituiscono un nuovo stato (structuredClone).
- La UI non contiene regole di gioco. Niente GameManager monolitico.
- Non introdurre sistemi prima della loro versione in roadmap.

## Regole attuali (vertical slice, versioni 0.1-0.4)

- 41 quartieri (da Prima Porta a Ostia) raggruppati in 8 macro-aree: Centro, Nord,
  Nord-Est, Est, Sud-Est, Sud, Sud-Ovest, Ovest. Sulla mappa: confini d'area marcati,
  nomi delle aree (posizionati per non coprire i quartieri, sfumano con lo zoom),
  contorno dell'area del quartiere selezionato, vista "Aree" (un colore per area) in
  alternativa a "Controllo". Unica regola legata alle aree: l'incarico dei vice capi.
- Ogni quartiere ha 100 punti di influenza ripartiti tra organizzazioni e gruppi locali.
  Domina chi ha almeno il 35% e più di chiunque altro. Si assorbono prima i gruppi
  locali; erodere un'altra organizzazione costa il doppio (vantaggio di chi difende) e
  peggiora i rapporti.
- Giocatore: sceglie nome e quartiere di partenza (Acilia, Garbatella, Primavalle), parte
  con 90k, 5 membri, 40% di influenza in un solo quartiere. Rivali IA, 3 quartieri
  ciascuno (base 60/55%, gli altri 10 punti in meno): I Lupi (Centocelle, Tor Sapienza,
  Torre Angela; aggressivi, numerosi) e I Corvi (Parioli, Trieste, Flaminio; ricchi e
  prudenti).
- 3 azioni a settimana: aumentare influenza (solo in quartieri non tuoi: prima i locali,
  poi i rivali a metà resa, +3 rischio), rafforzare quartiere (solo nei tuoi: +8, 8k,
  nessun rischio), reclutare, basso profilo, gesto di rispetto, potenziare un ramo
  d'affari, assumere/ricompensare/congedare un vice. Gratis: ridurre un ramo, incarichi
  e spostamento dei soldati.
- **Rami d'affari** (tab "Affari", stile President Simulator): 6 rami con ruoli distinti —
  furti (per iniziare), estorsioni (influenza e reputazione), stupefacenti (massimo
  guadagno e rischio), armi (difesa), riciclaggio (meno rischio), corruzione (scudo dalla
  polizia, +1 azione). Scommesse, banconote false e opere d'arte tolte perché doppioni.
  Livello globale per organizzazione; ogni livello rende k€/sett., aggiunge rischio e
  impegna un membro; il costo cresce ×1,6 (×1,7 la corruzione) a livello. Un ramo
  funziona solo con quartieri dominati adatti (`rackets` in zones.ts): livello utile =
  1 + 2 per quartiere adatto, +10% di entrate per ogni quartiere adatto oltre il primo;
  i livelli oltre il limite restano ma si fermano. A certe soglie sbloccano vantaggi
  (difesa, influenza settimanale, sconti, scudo dalla polizia, +1 azione...). La
  specializzazione parte dal livello 2 e rende +30%.
- Entrate: tributi dei quartieri + rami d'affari; uscite: 1k a soldato, 3k a vice capo.
- **Gerarchia** (tab "Organizzazione", solo per il giocatore; i rivali restano astratti):
  capo (medaglione "TU") → vice capi (personaggi generati, ritratto = iniziali per ora,
  campo `portrait` pronto per le immagini) → soldati (= `members`, numeri anonimi).
  1 slot da vice + 1 a reputazione 25/50/75. Il capo segue di persona 4 soldati: quelli
  in più "senza guida" danno +0,5 rischio/sett. Ogni vice comanda 3 + forza/25 soldati.
  Un solo tipo di incarico per ora: **responsabile di una macro-area** (`Assignment` è
  un'unione estendibile) → tributi +affari/4 %, difesa +forza/2 %, presidio +1
  influenza/sett. ogni 3 soldati (max 3) nei quartieri dominati dell'area, rischio
  −discrezione/50. Si parte con un braccio destro (lealtà 72) sull'area di casa.
- **Lealtà**: cala ogni settimana di ambizione/60 (i più ambiziosi sono anche i più
  capaci), sale se ha i soldati che vuole (ambizione/20); cala senza incarico, senza
  paga, con rischio alto, quartieri persi nell'area, arresti, congedi di altri vice.
  Ricompensa: +15 per 15k e un'azione. Sotto 40 notizia di malumore, sotto 25 trattiene
  ambizione/10 k€ a settimana, sotto 15 ogni settimana 35% di **scissione**: diventa
  un'organizzazione rivale con i suoi soldati, il 10% della cassa e i quartieri della
  sua area (mai la base del capo). Altri esiti del tradimento: non ancora.
- Rischio (esposizione): cresce con i rami (pesati dalla polizia nei quartieri della
  rete), con le espansioni e con la cassa (+1/sett. ogni 250k: la ricchezza attira
  attenzione); cala da solo, col basso profilo, riciclaggio e corruzione. Sopra 60
  sequestri, sopra 85 arresti. L'"attenzione" è ancora un indicatore derivato: diventerà lo stato della
  polizia nella 0.7.
- Tregua: nessuno può erodere zone dominate da altri nelle prime 6 settimane.
- Vittoria: un terzo dei quartieri (14 su 41), 1 milione, oppure i più potenti dopo 104
  settimane. Sconfitta: nessun quartiere, oppure 4 settimane consecutive con cassa negativa.

## Stato del bilanciamento (ultima simulazione, 41 quartieri + rami d'affari)

- Giocatore passivo: non va più in rosso, ma perde sempre (rivali più potenti a fine
  partita, o quartieri persi).
- Giocatore guidato dall'IA (che gestisce anche i vice): vince ~85% (100% da Acilia),
  per denaro o per territorio (~30%). Con i vice capi il gioco è diventato più facile:
  presidio e difesa d'area pesano molto. Da ritoccare (es. presidio ogni 4 soldati).
- Scissioni: mai se i vice sono gestiti (lealtà media ~55); vice trascurati → scissione
  intorno alla settimana 34 nel 70% delle partite.
- I Corvi non accumulano più milioni (la cassa genera rischio); Lupi e Corvi si
  contendono il primo posto.
- Ancora aperto: la vittoria economica resta la più frequente.

## Roadmap

- [x] 0.1 mappa + zone · 0.2 giocatore + 2 IA · 0.3 economia + influenza · 0.4 turni
- [x] 0.4.1 mappa a quartieri reali con zoom · rami d'affari a livelli con vantaggi
- [~] 0.6 (anticipata) gerarchia capo → vice capi → soldati, lealtà, scissioni.
      Da fare: altri incarichi, ritratti, eventi legati ai personaggi (con la 0.5)
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
