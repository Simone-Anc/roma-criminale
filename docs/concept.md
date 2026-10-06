# PROGETTO VIDEOGIOCO — "ROMA CRIMINALE"

## CONCEPT

Voglio creare un videogioco gestionale/strategico a turni ambientato in una **Roma contemporanea completamente fittizia**, in cui il giocatore guida un'organizzazione criminale immaginaria e cerca di trasformarla da piccolo gruppo locale a organizzazione dominante della città.

Il gioco deve essere ispirato **in modo astratto e cinematografico alle dinamiche della criminalità organizzata**, senza utilizzare persone reali, organizzazioni criminali reali o rappresentazioni dirette di fatti di cronaca.

Roma deve essere rappresentata come una città divisa in **zone/quartieri**, ognuna con caratteristiche differenti.

Il giocatore dovrà gestire:

* denaro
* influenza
* controllo territoriale
* membri dell'organizzazione
* attività criminali astratte
* rapporti con altre organizzazioni
* alleanze
* rivalità
* faide
* corruzione
* imprenditori e figure influenti
* pressione delle forze dell'ordine
* informatori
* reputazione
* rischio
* eventi casuali

L'obiettivo è creare un gioco principalmente **strategico e gestionale**, non un simulatore realistico di attività criminali.

---

# 1. AMBIENTAZIONE

La città è una versione **fittizia di Roma**.

La mappa deve ricordare la struttura generale della città, ma le organizzazioni, i personaggi, i luoghi specifici e gli eventi devono essere inventati.

Possiamo utilizzare nomi di quartieri reali come riferimento geografico, oppure creare una Roma alternativa con zone fittizie.

Per il primo prototipo consiglio una soluzione ibrida:

**Roma → macro-zone fittizie ispirate alla geografia reale.**

Esempio:

* Centro
* Nord
* Nord-Est
* Est
* Sud-Est
* Sud
* Sud-Ovest
* Ovest
* Periferia Est
* Periferia Ovest

Successivamente ogni macro-zona potrà essere divisa in quartieri più piccoli.

---

# 2. OBIETTIVO DEL GIOCATORE

Il giocatore parte con:

* pochi soldi
* pochi membri
* una piccola zona sotto controllo
* bassa influenza
* reputazione limitata
* rapporti quasi inesistenti con le altre organizzazioni

L'obiettivo è trasformare il gruppo in una delle organizzazioni più potenti di Roma.

Possibili condizioni di vittoria:

### Dominio territoriale

Controllare una determinata percentuale della città.

### Dominio economico

Raggiungere una determinata ricchezza.

### Dominio politico/sociale

Raggiungere un livello molto alto di influenza.

### Dominio criminale

Diventare l'organizzazione con il maggior livello di potere complessivo.

### Sopravvivenza

Rimanere attivi per un determinato numero di anni senza essere distrutti.

Il gioco deve permettere anche vittorie "ibride".

---

# 3. MAPPA DI ROMA

La mappa è il cuore del gioco.

Ogni zona deve avere statistiche proprie.

Esempio:

```text
┌───────────────────────────────────┐
│           NORD                    │
│       [Zona A] [Zona B]           │
│                                   │
│ [Zona C]    CENTRO    [Zona D]    │
│                                   │
│       [Zona E] [Zona F]           │
│                                   │
│       SUD       [Zona G]          │
└───────────────────────────────────┘
```

Ogni zona possiede:

* popolazione
* ricchezza
* valore economico
* influenza criminale
* presenza delle forze dell'ordine
* livello di controllo
* stabilità
* rischio
* attività disponibili
* reputazione dell'organizzazione dominante

Esempio:

```text
ZONA: CENTRO

Controllo: 65%
Influenza nostra: 42
Influenza rivale: 31
Presenza polizia: Alta
Ricchezza: Molto alta
Rischio: Alto
Valore economico: Molto alto
```

---

# 4. ORGANIZZAZIONI

Devono esistere diverse organizzazioni completamente fittizie.

Per esempio:

### Il Gruppo

Organizzazione del giocatore.

### I Lupi

Gruppo aggressivo, specializzato nel controllo territoriale.

### I Corvi

Organizzazione ricca e molto influente.

### La Compagnia

Gruppo più orientato agli affari e alle relazioni economiche.

### I Ragazzi del Sud

Organizzazione numerosa ma meno ricca.

I nomi sono provvisori e potranno essere modificati.

Ogni organizzazione possiede:

* denaro
* influenza
* reputazione
* numero di membri
* territori
* forza
* stabilità interna
* aggressività
* capacità diplomatica
* capacità economica
* livello di attenzione della polizia

---

# 5. TERRITORIO

Il territorio non deve essere semplicemente:

```text
controllato = sì/no
```

Voglio un sistema più interessante.

Ogni organizzazione ha un livello di controllo:

```text
0-20%   → presenza marginale
20-40%  → influenza
40-60%  → controllo parziale
60-80%  → controllo forte
80-100% → dominio
```

Questo permette a più organizzazioni di avere influenza sulla stessa zona.

Esempio:

```text
Zona Est

Gruppo giocatore: 55%
Lupi: 30%
Corvi: 10%
Altri: 5%
```

Il giocatore può quindi cercare di aumentare progressivamente la propria influenza invece di conquistare immediatamente una zona.

---

# 6. ATTIVITÀ ECONOMICHE

Il gioco deve rappresentare attività criminali in forma **astratta**, senza fornire istruzioni operative reali.

Esempi:

* Traffico
* Estorsioni
* Rapine
* Contrabbando
* Scommesse clandestine
* Riciclaggio
* Affari illegali
* Mercato nero

Ogni attività possiede:

```text
Profitto
Rischio
Costo
Influenza richiesta
Tempo
Pressione generata
```

Esempio:

```text
ESTORSIONI

Profitto: medio
Rischio: alto
Influenza richiesta: media
Pressione polizia: +8
Influenza territoriale: +5
```

Il giocatore non deve decidere "come" compiere concretamente il crimine.

Deve semplicemente scegliere **se investire risorse in quella categoria di attività**.

---

# 7. ECONOMIA

Il sistema economico deve essere semplice ma interessante.

Ogni turno:

```text
ENTRATE
+ attività
+ territori
+ investimenti

USCITE
- mantenimento membri
- gestione territori
- costi diplomatici
- conseguenze degli eventi
```

Il giocatore deve scegliere se:

* accumulare denaro
* espandersi
* reclutare
* migliorare i territori
* investire nell'influenza
* rafforzare la propria organizzazione

---

# 8. MEMBRI

Il giocatore può reclutare personaggi generati proceduralmente.

Ogni personaggio possiede:

```text
Nome
Età
Lealtà
Influenza
Intelligenza
Coraggio
Ambizione
Abilità
Reputazione
```

Possibili ruoli:

* Capo
* Consigliere
* Responsabile di zona
* Uomo d'affari
* Diplomatico
* Operativo
* Informatori/contatti
* Traditore

I ruoli sono principalmente meccaniche strategiche.

---

# 9. POLIZIA

Le forze dell'ordine devono essere una **fazione IA autonoma**.

Non devono semplicemente attaccare casualmente il giocatore.

Devono possedere:

```text
Attenzione generale
Livello investigativo
Pressione
Presenza territoriale
Risorse investigative
```

Le attività del giocatore possono aumentare l'attenzione.

Eventi possibili:

* apertura di un'indagine
* arresto di un membro
* sequestro di risorse
* processo
* collaborazione di un informatore
* operazione contro un'organizzazione
* aumento della presenza in una zona

Il giocatore deve reagire tramite **decisioni strategiche astratte**, non tramite simulazione di tecniche reali per eludere le forze dell'ordine.

---

# 10. ALTRE FAZIONI

Roma non deve essere composta solamente da organizzazioni criminali e polizia.

In futuro voglio poter introdurre:

* imprenditori
* politici fittizi
* giornalisti
* associazioni
* istituzioni
* gruppi economici
* personaggi influenti

Queste fazioni possono creare eventi e modificare:

* reputazione
* influenza
* denaro
* pressione
* controllo territoriale

---

# 11. DIPLOMAZIA

Le organizzazioni possono avere relazioni dinamiche.

Possibili stati:

```text
Ostilità
Tensione
Neutrale
Collaborazione
Alleanza
```

Azioni:

* proposta di alleanza
* accordo economico
* richiesta di territorio
* intimidazione astratta
* dichiarazione di guerra
* pace
* tradimento

Le relazioni devono essere gestite dall'IA.

---

# 12. FAIDE

Le faide sono uno dei sistemi principali.

Una guerra può iniziare per:

* territorio
* denaro
* tradimento
* vendetta
* influenza
* alleanze

Non voglio necessariamente combattimenti in tempo reale.

La guerra può essere simulata attraverso:

```text
Potenza organizzativa
Controllo territoriale
Influenza
Fedeltà
Risorse
Reputazione
Pressione della polizia
```

Ogni turno della guerra produce conseguenze.

Esempio:

```text
La tua organizzazione ha aumentato il controllo
della Zona Est del 7%.

Hai perso 2 membri.

La pressione delle forze dell'ordine è aumentata.
```

---

# 13. EVENTI DINAMICI

Il gioco deve possedere un sistema di eventi.

Ogni evento presenta:

**situazione + 2/4 decisioni + conseguenze.**

Esempio:

> "Un responsabile di zona ritiene che la tua organizzazione stia trascurando il suo territorio."

Decisioni:

1. Aumentare le risorse della zona
2. Ignorare la richiesta
3. Promuovere il responsabile
4. Sostituirlo

Ogni scelta modifica:

* lealtà
* influenza
* denaro
* controllo
* rischio
* relazioni

Gli eventi devono essere uno dei principali strumenti narrativi del gioco.

---

# 14. SISTEMA DI TRADIMENTI

I membri non devono essere semplici numeri.

Ogni personaggio deve avere una propria personalità.

Un membro con:

```text
Lealtà: 25
Ambizione: 90
Influenza: 80
```

potrebbe diventare problematico.

Possibili eventi:

* richiesta di promozione
* conflitto con un altro membro
* tentativo di creare una fazione interna
* fuga
* tradimento
* collaborazione con le autorità
* richiesta di maggiore autonomia

Questo introduce una seconda "guerra":

**la guerra interna all'organizzazione.**

---

# 15. STRUTTURA DEL TURNO

Ogni turno rappresenta una settimana.

## FASE 1 — Situazione

Il giocatore controlla:

```text
Denaro
Influenza
Territori
Membri
Rischio
Pressione
Relazioni
```

## FASE 2 — Decisioni

Il giocatore può:

* investire
* reclutare
* assegnare membri
* modificare attività
* gestire territori
* interagire con altre organizzazioni

## FASE 3 — Diplomazia

Le organizzazioni IA effettuano le proprie azioni.

## FASE 4 — Eventi

Il gioco genera eventi.

## FASE 5 — Forze dell'ordine

La pressione investigativa viene aggiornata.

## FASE 6 — Economia

Vengono calcolati:

* entrate
* spese
* influenza
* controllo territoriale
* rischio

## FASE 7 — Fine turno

Il gioco passa alla settimana successiva.

---

# 16. INTERFACCIA

La schermata principale deve essere una mappa.

In alto:

```text
€ 125.000
INFLUENZA 34
TERRITORI 2/10
MEMBRI 14
RISCHIO 21%
ATTENZIONE 17%
```

Al centro:

```text
              ROMA

       ┌───────┐ ┌───────┐
       │ NORD  │ │ N-EST │
       └───────┘ └───────┘

    ┌───────┐ ┌───────┐ ┌───────┐
    │ OVEST │ │CENTRO │ │  EST  │
    └───────┘ └───────┘ └───────┘

       ┌───────┐ ┌───────┐
       │ SUD   │ │S-EST  │
       └───────┘ └───────┘
```

Cliccando su una zona:

```text
ZONA EST

Controllo
Influenza
Ricchezza
Rischio
Presenza polizia

Organizzazione dominante

ATTIVITÀ

[Gestisci]
[Investi]
[Assegna membro]
```

---

# 17. SCHERMATA ORGANIZZAZIONE

```text
LA TUA ORGANIZZAZIONE

Potere: 42
Denaro: €125.000
Influenza: 34
Reputazione: 51

Membri: 14

CAPO
├── Consigliere
├── Responsabile Zona Est
├── Responsabile Zona Sud
└── Membri
```

---

# 18. SCHERMATA ORGANIZZAZIONI RIVALI

Tabella:

| Organizzazione | Potere |     Denaro | Territori | Relazione  |
| -------------- | -----: | ---------: | --------: | ---------- |
| Lupi           |     72 |       Alto |         3 | Ostile     |
| Corvi          |     61 | Molto alto |         2 | Neutrale   |
| Compagnia      |     48 |       Alto |         2 | Amichevole |

---

# 19. CONDIZIONI DI SCONFITTA

Il giocatore perde se:

* perde tutti i territori
* l'organizzazione collassa
* il capo viene arrestato definitivamente
* la stabilità interna raggiunge zero
* l'organizzazione rimane senza risorse
* una fazione interna prende il controllo

---

# 20. ARCHITETTURA TECNICA

Prima di sviluppare il gioco, analizza le tecnologie disponibili:

* Godot
* Unity
* React/Web
* eventualmente altre tecnologie adatte

Scegli **una sola tecnologia** per il prototipo.

La scelta deve privilegiare:

1. velocità di sviluppo
2. semplicità
3. gestione della mappa
4. UI
5. sistemi a turni
6. gestione dello stato
7. facilità di debugging
8. possibilità futura di porting su PC/mobile

Non scegliere una tecnologia perché è "più professionale".

Scegli quella che permette di realizzare più velocemente un prototipo divertente.

---

# 21. ARCHITETTURA DEL CODICE

Il progetto deve essere modulare.

Separare almeno:

```text
Game
├── Map
├── Territory
├── Organization
├── Character
├── Economy
├── Diplomacy
├── Events
├── Police
├── War
├── TurnSystem
├── UI
└── SaveSystem
```

Ogni sistema deve essere il più indipendente possibile.

Evitare di creare un unico enorme GameManager contenente tutta la logica.

---

# 22. MVP

NON implementare immediatamente tutto.

Il primo obiettivo è creare una versione realmente giocabile.

## MVP 1

Implementare esclusivamente:

### MAPPA

Roma semplificata con:

* 8 zone
* controllo territoriale
* clic sulle zone

### GIOCATORE

Una organizzazione controllata dal giocatore.

Statistiche:

```text
Denaro
Influenza
Potere
Reputazione
```

### IA

Due organizzazioni rivali.

Ogni IA deve poter:

* guadagnare denaro
* aumentare influenza
* tentare di espandersi
* modificare le relazioni

### TURNI

Pulsante:

**FINE SETTIMANA**

Quando viene premuto:

1. economia aggiornata
2. IA agiscono
3. territori aggiornati
4. eventi possibili
5. statistiche aggiornate

### TERRITORI

Ogni zona deve avere:

```text
controllo
influenza
valore economico
rischio
```

### ECONOMIA

Il giocatore riceve denaro ogni turno.

Può spenderlo per:

* aumentare influenza
* rafforzare una zona
* reclutare membri

---

# 23. SVILUPPO ITERATIVO

Dopo ogni fase il gioco deve essere:

**COMPILABILE → AVVIABILE → GIOCABILE**

Non implementare 20 sistemi contemporaneamente.

Procedere così:

### VERSIONE 0.1

Mappa + territori.

### VERSIONE 0.2

Giocatore + 2 IA.

### VERSIONE 0.3

Economia + influenza.

### VERSIONE 0.4

Sistema turni.

### VERSIONE 0.5

Eventi.

### VERSIONE 0.6

Personaggi.

### VERSIONE 0.7

Polizia.

### VERSIONE 0.8

Diplomazia.

### VERSIONE 0.9

Faide.

### VERSIONE 1.0

UI, bilanciamento e salvataggio.

---

# 24. REGOLE IMPORTANTI PER LO SVILUPPO

Non voglio ricevere solamente spiegazioni teoriche.

Voglio che tu agisca come **game designer + software architect + sviluppatore**.

Prima di scrivere codice:

1. analizza il concept
2. evidenzia problemi e semplificazioni necessarie
3. scegli la tecnologia
4. definisci l'architettura
5. definisci la struttura delle cartelle
6. definisci i dati principali
7. definisci il primo MVP

Dopodiché:

**inizia effettivamente a creare il progetto e il codice.**

Quando implementi una funzionalità:

* spiega brevemente cosa stai facendo
* crea il codice necessario
* mantienilo semplice
* non introdurre sistemi non ancora necessari
* assicurati che il gioco rimanga eseguibile

---

# 25. FILOSOFIA DEL PROGETTO

Il gioco deve essere divertente perché il giocatore deve continuamente prendere decisioni.

Non deve essere:

> "clicco e guadagno soldi".

Deve essere:

> "Se investo in questa zona guadagno di più, ma aumento il rischio. Se non lo faccio, la famiglia rivale potrebbe aumentare la propria influenza. Però ho già troppa attenzione da parte delle autorità. Inoltre il mio responsabile di zona sta diventando troppo ambizioso."

Quindi il cuore del gioco deve essere:

**RISORSE → DECISIONI → CONSEGUENZE → NUOVI PROBLEMI**

La complessità deve emergere gradualmente dalle interazioni tra i sistemi.

---

# OBIETTIVO IMMEDIATO

Non costruire ancora il gioco completo.

Costruisci per prima cosa una **vertical slice giocabile di Roma**:

* mappa
* 8 territori
* 1 organizzazione giocatore
* 2 organizzazioni IA
* denaro
* influenza
* controllo territoriale
* turni settimanali
* azioni basilari
* schermata territorio
* schermata organizzazione
* pulsante "Fine settimana"

Quando questa versione funziona, la useremo come base per aggiungere progressivamente tutti gli altri sistemi.
