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
  - `organization.ts` gerarchia (slot dei vice, effetti degli incarichi, generazione dei
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
  CSS `--map-top/right/bottom/left`), `RacketsPanel.tsx`, `OrganizationPanel.tsx` (organigramma
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
  alternativa a "Controllo". Le aree sono solo geografia: nessuna regola le usa.
- Ogni quartiere ha 100 punti di influenza ripartiti tra organizzazioni e gruppi locali.
  Domina chi ha almeno il 35% e più di chiunque altro. Si assorbono prima i gruppi
  locali; erodere un'altra organizzazione costa il doppio (vantaggio di chi difende) e
  peggiora i rapporti.
- Giocatore: sceglie nome e quartiere di partenza (Acilia, Garbatella, Primavalle), parte
  con 120k, 5 membri, 40% di influenza in un solo quartiere.
- Rivali IA, **tutti con un solo quartiere** (base 40-60%): due organizzazioni più grandi,
  I Lupi (Centocelle; aggressivi, numerosi) e I Corvi (Parioli; ricchi e prudenti), e
  **8 bande piccole** sparse per la città (Le Vipere a Trastevere, Gli Sciacalli
  all'Esquilino, Le Volpi a Prati, I Mastini a Prima Porta, Gli Scorpioni a Settecamini,
  I Ramarri al Pigneto, I Gabbiani a Marconi, Le Faine a Ponte di Nona): 40-110k, 4-6
  soldati, 1 slot nella specialità (`startSpecSlots`). Le basi non confinano con le
  partenze del giocatore e stanno lontane dai luoghi associati a gruppi reali. L'IA fa
  1 azione a settimana finché ha meno di 8 soldati, poi 2. Nella barra in basso si vedono
  i 3 rivali più potenti + "+N".
- **Nessun limite di azioni**: finché hai i soldi puoi fare quello che vuoi, poi chiudi tu
  la settimana con "Fine turno". Azioni: aumentare influenza (**solo nei quartieri
  neutrali**, cioè senza un'organizzazione dominante, per tutti, IA compresa: prima i
  locali, poi a metà resa le organizzazioni presenti, +3 rischio; +30% di costo per ogni
  quartiere di distanza dai tuoi oltre il primo; i quartieri controllati si prendono
  **solo con un assalto**), rafforzare quartiere (solo nei tuoi: +8,
  8k, nessun rischio), reclutare, basso profilo (−12 rischio; costa il doppio a ogni uso
  nella stessa settimana: 15k, 30k, 60k…), gesto di rispetto, prendere/strappare/lasciare
  uno slot d'affari, assumere/ricompensare/congedare un vice, incarichi. Stesse regole per
  l'IA: agisce finché ha buone mosse e più di 4 settimane di stipendi in cassa (massimo 6
  azioni a settimana, tetto di sicurezza).
- **Rami d'affari** = **mercato condiviso** (tab/colonna "Affari"): 6 rami con ruoli
  distinti (furti per iniziare, estorsioni influenza e reputazione, stupefacenti massimo
  guadagno e rischio, armi difesa, riciclaggio meno rischio, corruzione scudo dalla polizia
  e influenza meno cara). Ogni ramo ha un numero fisso di **slot in città** (4-8) contesi da tutte le
  organizzazioni, IA comprese. Ogni slot rende k€/sett. e aggiunge rischio; chi ha più slot
  di tutti (almeno 2, a pari merito nessuno) incassa il **premio di maggioranza**. I
  vantaggi si sbloccano col numero di slot posseduti. Prezzo: cresce ×1,45 per slot già
  posseduto (×1,6 la corruzione). Slot liberi: li prende chiunque. Mercato pieno: chi
  domina un quartiere adatto (`rackets` in zones.ts) può **strappare** uno slot a un
  rivale (prezzo ×2, rapporti −20, non in tregua). Per il resto i quartieri non contano
  per gli affari, e gli slot **non impegnano soldati**. Specializzazione: si parte con 2
  slot nel ramo, che rende +30%. Chi esce di scena libera i suoi slot.
- Entrate: tributi dei quartieri + rami d'affari + **spaccio di strada**; uscite: solo i
  vice capi (3k/sett.). **I soldati non hanno stipendio**: costa solo reclutarli.
- **Spaccio di strada** (prima voce della colonna Affari): tutti i soldati non impegnati in
  un assalto sono in strada e rendono 1k/sett. l'uno. Ogni settimana possono finire in
  galera in base all'attenzione della polizia (`policeAttention`): 10-20% → 10% di
  perderne 1; 21-30% → 15%, 1; 31-40% → 20%, 2; 41-60% → 25%, 2; 61-100% → 30%, 3
  (`BALANCE.jailRisk`; ridotto dallo scudo di riciclaggio/corruzione). Ha sostituito i
  vecchi arresti sopra 85 di rischio; i sequestri sopra 60 restano.
- **Guerra** (`engine/war.ts`, stato `GameState.battles`): sul cartiglio di un quartiere
  dominato da un'altra organizzazione, "Assalto" → scegli quanti soldati liberi mandare
  (2k a soldato, +5 rischio, rapporti −40, non in tregua). Chi difende schiera subito il
  70% dei suoi soldati liberi. Forza = soldati × (1 + modificatori): chi attacca ha armi
  (+10%/slot, max 50), reputazione/4, −10% per quartiere di distanza oltre il primo; chi
  difende ha difesa in casa +25, radicamento (influenza/2), armi, Arsenale, vice allo
  spaccio (forza/2), base dell'organizzazione +50. Ogni settimana (a fine turno) ognuno
  perde uomini in proporzione alla forza dell'altro, il fronte (0-100, parte da 50) si
  sposta verso il più forte, +2 rischio a entrambi. Vince chi attacca a 100 o se chi
  difende resta senza uomini (prende il 70% dell'influenza di chi difendeva, almeno il
  35%); vince chi difende a 0, se chi attacca resta senza uomini, dopo 6 settimane o se
  chi attacca si ritira (chi attaccava perde metà della sua influenza lì). ±6 reputazione.
  Durante gli scontri entrambi possono mandare rinforzi. Gli assalti lanciati dall'IA
  partono la settimana dopo, così chi difende li vede. Sulla mappa: contorno rosso che
  scorre, spade, uomini in campo e barra del fronte. L'IA attacca un quartiere confinante
  solo con almeno il 65% della forza, rinforza se perde in difesa, si ritira se perde in
  attacco. Ogni assalto che conduci aggiunge +12 all'attenzione della polizia (+8 rischio).
- **Regole solo per l'IA** (non è un giocatore, serve a bilanciare): ogni settimana riceve
  2k + 0,1k × settimana e ha 15% + 0,8% × settimana di probabilità di un soldato in più;
  lancia assalti con probabilità 15% + 30% × aggressività + 0,4% × settimana, con almeno
  il 55% della forza, uno alla volta (due con 12+ soldati), solo contro quartieri
  confinanti; in difesa rinforza appena il fronte non è più a favore. Più la partita va
  avanti, più i rivali sono forti e aggressivi. Le basi hanno +50% in difesa.
- **Tracciato della polizia** in alto a sinistra (accanto a "Esci"): attenzione 0-100 con
  le fasce di rischio galera; lampeggia quando sale. Toccandolo si apre lo Spaccio.
- **Gerarchia** (Profilo → "La banda", solo per il giocatore; i rivali restano astratti):
  organigramma a quadrati capo → vice capi → soldati. I soldati (`members`) sono solo un
  numero: i vice **non** comandano squadre (niente più capienza, soldati senza guida o
  presidio). 1 slot da vice + 1 a reputazione 25/50/75. Di ogni vice la UI mostra solo
  lealtà e incarico; ricompensa e congedo sono nel menu dell'incarico.
  Incarichi (`Assignment`, unione estendibile; l'autore ne inventerà altri; niente più
  "responsabile d'area": le macro-aree sono solo geografia):
  **recluta** → +1 soldato/sett.; **spaccio** in un quartiere dominato (uno per quartiere),
  scelto **sulla mappa** (i quartieri possibili diventano bianchi, poi conferma) → +3
  influenza/sett. lì (+1 ogni 50 di affari), +1 in ogni confinante neutrale, difesa +forza/2 % nel
  quartiere, +1 rischio/sett.; fermo se il quartiere viene perso. Il medaglione del vice
  (iniziali, bordo colorato per lealtà) resta disegnato nel quartiere. Ogni vice con un
  incarico toglie discrezione/50 di rischio. Si parte con un braccio destro (lealtà 72)
  allo spaccio nel quartiere di casa.
- **Lealtà**: cala ogni settimana di ambizione/60 (i più ambiziosi sono anche i più
  capaci), +0,4 con un incarico e −0,5 senza; cala senza paga, con rischio alto, se perde
  il quartiere dello spaccio, con arresti e congedi di altri vice.
  Ricompensa: +15 per 15k e un'azione. Sotto 40 notizia di malumore, sotto 25 trattiene
  ambizione/10 k€ a settimana, sotto 15 ogni settimana 35% di **scissione**: diventa
  un'organizzazione rivale con 2 soldati, il 10% della cassa e il quartiere dello
  spaccio (mai la base del capo). Altri esiti del tradimento: non ancora.
- Rischio (esposizione): cresce con gli slot d'affari, le espansioni, gli assalti, lo
  spaccio dei vice e la cassa (+1/sett. ogni 250k: la ricchezza attira attenzione); cala
  da solo, col basso profilo, riciclaggio e corruzione. Sopra 60 sequestri. L'"attenzione"
  della polizia (rischio pesato dalla polizia nei tuoi quartieri) decide la galera dei
  soldati in strada; diventerà lo stato della polizia nella 0.7.
- Tregua: nessuno può erodere zone dominate da altri nelle prime 6 settimane.
- Vittoria: un terzo dei quartieri (14 su 41), 1 milione, oppure i più potenti dopo 104
  settimane. Sconfitta: nessun quartiere, oppure 4 settimane consecutive con cassa negativa.

## Stato del bilanciamento (ultima simulazione: influenza solo sui neutrali, IA che cresce e attacca)

- Mappa molto viva: decine di assalti a partita, bande piccole che spariscono e altre che
  crescono.
- Giocatore passivo: perde sempre tutti i quartieri (in 30-60 settimane).
- Giocatore guidato dall'IA: vince ~22% (Acilia ~35%, Primavalle ~22%, Garbatella ~10%),
  quasi sempre per territorio; di solito perde la base negli assalti. Un umano che manda
  rinforzi e recluta fa meglio, ma le partenze vanno riequilibrate (Garbatella è troppo
  esposta) e la crescita dell'IA va tarata giocando.
- Polizia/reputazione: proposta di ridisegno in discussione con l'autore.

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
- [~] 0.9 faide anticipata: assalti ai quartieri a più settimane (guerra). Da fare:
      dichiarazioni di guerra, paci, alleanze (0.8 diplomazia)
- [ ] 0.8 diplomazia (alleanze, accordi, tradimenti)
- [ ] 1.0 UI curata, bilanciamento, salvataggio

## Progetto collegato

Esiste un prototipo precedente, "Ombre d'Italia" (stessa architettura, mappa dell'Italia
con 10 territori e 4 famiglie). Roma Criminale ne deriva e lo sostituisce come progetto
principale.
