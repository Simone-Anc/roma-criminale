// Modello dati. Tutto lo stato è serializzabile in JSON (pronto per il SaveSystem).
// Nel codice "territory" = zona della città, "family" = organizzazione.

export type FamilyId = string;
export type TerritoryId = string;

/** Macro-area della città che raggruppa più quartieri. */
export type AreaId = 'centro' | 'nord' | 'nordest' | 'est' | 'sudest' | 'sud' | 'sudovest' | 'ovest';

/** Chiave usata nelle mappe di influenza per i gruppi locali non organizzati. */
export const LOCALS = 'locali';

/** Rami d'affari dell'organizzazione. */
export type RacketId = 'furti' | 'estorsioni' | 'stupefacenti' | 'armi' | 'riciclaggio' | 'corruzione';

/**
 * Vantaggi permanenti, sommati da tutti i rami. Le percentuali sono in punti
 * (25 = +25%). Ogni campo è letto da una sola regola del motore.
 */
export interface Bonuses {
  /** % in più sulle entrate di tutti i rami. */
  income: number;
  /** % in più sui tributi dei quartieri. */
  tribute: number;
  /** Punti di influenza in più con "Aumenta influenza". */
  expandGain: number;
  /** % di sconto su "Aumenta influenza". */
  expandDiscount: number;
  /** % di sconto sul reclutamento. */
  recruitDiscount: number;
  /** Influenza guadagnata ogni settimana in ogni quartiere dominato. */
  influencePerWeek: number;
  /** Reputazione guadagnata ogni settimana. */
  reputationPerWeek: number;
  /** % in meno sulla probabilità di sequestri e arresti. */
  policeShield: number;
  /** % in più che paga chi prova a sottrarti influenza. */
  defense: number;
  /** Azioni in più ogni settimana. */
  actions: number;
}

/** Vantaggio sbloccato quando un ramo raggiunge un certo livello. */
export interface Perk {
  level: number;
  name: string;
  description: string;
  bonus?: Partial<Bonuses>;
  /** % in più sulle entrate del solo ramo che lo sblocca. */
  selfIncome?: number;
}

/** Ramo d'affari: astratto, fatto solo di numeri di gameplay. */
export interface RacketDef {
  id: RacketId;
  name: string;
  description: string;
  maxLevel: number;
  /** Costo del primo livello (k€); ogni livello successivo costa `costGrowth` volte tanto. */
  baseCost: number;
  costGrowth: number;
  /** Entrate settimanali per livello (k€). */
  income: number;
  /** Rischio settimanale per livello (negativo = lo riduce). */
  heat: number;
  perks: Perk[];
}

/** Dati statici di una zona (un quartiere). */
export interface TerritoryDef {
  id: TerritoryId;
  /** Nome del quartiere: solo un riferimento geografico. */
  name: string;
  area: AreaId;
  /** Centro approssimativo del quartiere: [latitudine, longitudine]. */
  coords: [number, number];
  /** Descrizione d'ambiente, generica: nessun riferimento a persone o fatti reali. */
  flavor: string;
  /** Migliaia di abitanti. */
  population: number;
  /** 1-10: ricchezza e valore economico. */
  wealth: number;
  /** 1-10: presenza delle forze dell'ordine. */
  lawPresence: number;
  /** Quartieri confinanti, ricavati dalla geometria della mappa. */
  neighbors: TerritoryId[];
  /** Rami d'affari che il quartiere può sostenere, se lo domini. */
  rackets: RacketId[];
}

export interface TerritoryState {
  id: TerritoryId;
  /** Influenza per organizzazione (e LOCALS). La somma è sempre 100. */
  influence: Record<string, number>;
  /** Organizzazione dominante. */
  owner: FamilyId | null;
}

/**
 * Incarico di un vice capo. Per ora esiste solo la responsabilità di una macro-area;
 * i prossimi (ramo d'affari, consigliere...) si aggiungono come nuove varianti.
 */
export type Assignment = { type: 'area'; area: AreaId };

/** Abilità di un vice capo, 0-100. */
export interface Skills {
  /** Più tributi dai quartieri dell'incarico. */
  affari: number;
  /** Più difesa nei quartieri dell'incarico e più soldati comandabili. */
  forza: number;
  /** Meno rischio per l'organizzazione. */
  discrezione: number;
}

/** Vice capo: personaggio generato, sotto il capo nella gerarchia. */
export interface Lieutenant {
  id: string;
  firstName: string;
  lastName: string;
  /** Soprannome con l'articolo ("il Biondo", "er Secco"). */
  nickname: string;
  age: number;
  /** Immagine del ritratto (futuro); senza, la UI mostra le iniziali. */
  portrait?: string;
  /** 0-100: lealtà verso il capo. Sotto la soglia di scissione può andarsene. */
  loyalty: number;
  /** 0-100: quanto vuole contare. Più è alta, più soldati pretende. */
  ambition: number;
  skills: Skills;
  /** Soldati sotto il suo comando (fanno parte dei membri dell'organizzazione). */
  soldiers: number;
  assignment: Assignment | null;
  joinedWeek: number;
}

export interface FamilyDef {
  id: FamilyId;
  /** Nome completo, con articolo ("I Lupi", "Il Gruppo"). */
  name: string;
  /** Per l'accordo del verbo nelle notizie. */
  plural: boolean;
  color: string;
  /** Quartiere base, con influenza `startInfluence`. */
  home: TerritoryId;
  /** Altri quartieri controllati all'inizio, con influenza un po' più bassa. */
  startZones: TerritoryId[];
  /** Ramo in cui l'organizzazione è più brava: parte dal livello 1 e rende di più. */
  specialization: RacketId;
  /** Livelli iniziali degli altri rami. */
  startRackets?: Partial<Record<RacketId, number>>;
  /** 0-1: propensione a espandersi e a scontrarsi. */
  aggression: number;
  trait: string;
  startMoney: number;
  startMembers: number;
  startInfluence: number;
}

export interface Family extends FamilyDef {
  money: number;
  members: number;
  reputation: number;
  /** Livello raggiunto in ogni ramo d'affari (assente = 0). */
  rackets: Partial<Record<RacketId, number>>;
  /** Rischio 0-100: quanto l'organizzazione è esposta. */
  heat: number;
  /**
   * Vice capi. Solo il giocatore li gestisce; `members` resta il totale dei soldati,
   * di cui una parte è assegnata ai vice e il resto è agli ordini diretti del capo.
   */
  lieutenants: Lieutenant[];
  /** -100..100 */
  relations: Record<FamilyId, number>;
  isPlayer: boolean;
  alive: boolean;
  brokeWeeks: number;
}

export type NewsKind = 'territorio' | 'economia' | 'diplomazia' | 'polizia' | 'organizzazione';

export interface NewsItem {
  week: number;
  kind: NewsKind;
  headline: string;
  body?: string;
  familyId?: FamilyId;
}

export interface TurnReport {
  week: number;
  income: number;
  upkeep: number;
  setup: number;
  heatBefore: number;
  heatAfter: number;
  /** Variazione del controllo del giocatore per zona. */
  controlDelta: Record<TerritoryId, number>;
  news: NewsItem[];
}

export type GameStatus = 'playing' | 'won' | 'lost';

export interface GameState {
  version: 1;
  week: number;
  rngState: number;
  playerId: FamilyId;
  families: Record<FamilyId, Family>;
  familyOrder: FamilyId[];
  territories: Record<TerritoryId, TerritoryState>;
  actionsLeft: number;
  news: NewsItem[];
  lastReport: TurnReport | null;
  status: GameStatus;
  endReason: string | null;
  pendingSetup: number;
  /** Candidati vice capo che il giocatore può assumere; si rinnovano ogni tanto. */
  candidates: Lieutenant[];
  /** Contatore per id univoci (personaggi, organizzazioni nate da scissioni). */
  nextId: number;
}

export type GameAction =
  | { type: 'expand'; territoryId: TerritoryId }
  | { type: 'consolidate'; territoryId: TerritoryId }
  | { type: 'upgradeRacket'; racketId: RacketId }
  | { type: 'downgradeRacket'; racketId: RacketId }
  | { type: 'recruit' }
  | { type: 'hireLieutenant'; candidateId: string }
  | { type: 'dismissLieutenant'; lieutenantId: string }
  | { type: 'rewardLieutenant'; lieutenantId: string }
  | { type: 'assignLieutenant'; lieutenantId: string; assignment: Assignment | null }
  | { type: 'moveSoldiers'; lieutenantId: string; delta: number }
  | { type: 'lowProfile' }
  | { type: 'respect'; targetId: FamilyId };

export interface ActionResult {
  ok: boolean;
  reason?: string;
}
