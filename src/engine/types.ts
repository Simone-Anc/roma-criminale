// Modello dati. Tutto lo stato è serializzabile in JSON (pronto per il SaveSystem).
// Nel codice "territory" = zona della città, "family" = organizzazione.

export type FamilyId = string;
export type TerritoryId = string;

/** Chiave usata nelle mappe di influenza per i gruppi locali non organizzati. */
export const LOCALS = 'locali';

export type ActivityId =
  | 'traffico'
  | 'estorsioni'
  | 'rapine'
  | 'contrabbando'
  | 'scommesse'
  | 'riciclaggio'
  | 'affari'
  | 'mercatonero';

/** Attività astratta: solo numeri di gameplay, nessun dettaglio operativo. */
export interface ActivityDef {
  id: ActivityId;
  name: string;
  /** Profitto base settimanale, in migliaia di euro. */
  income: number;
  /** Pressione generata ogni settimana (può essere negativa). */
  heat: number;
  /** Costo di avvio, una tantum. */
  cost: number;
  /** Controllo minimo della zona richiesto (0-100). */
  minControl: number;
  /** Influenza guadagnata ogni settimana nella zona. */
  influence: number;
  description: string;
}

/** Dati statici di una zona. */
export interface TerritoryDef {
  id: TerritoryId;
  name: string;
  /** Descrizione d'ambiente, volutamente non legata a quartieri reali. */
  flavor: string;
  /** Migliaia di abitanti. */
  population: number;
  /** 1-10: ricchezza e valore economico. */
  wealth: number;
  /** 1-10: presenza delle forze dell'ordine. */
  lawPresence: number;
  neighbors: TerritoryId[];
  activities: ActivityId[];
}

export interface TerritoryState {
  id: TerritoryId;
  /** Influenza per organizzazione (e LOCALS). La somma è sempre 100. */
  influence: Record<string, number>;
  /** Organizzazione dominante. */
  owner: FamilyId | null;
  /** Attività gestite dall'organizzazione dominante. */
  activities: ActivityId[];
}

export interface FamilyDef {
  id: FamilyId;
  /** Nome completo, con articolo ("I Lupi", "Il Gruppo"). */
  name: string;
  /** Per l'accordo del verbo nelle notizie. */
  plural: boolean;
  color: string;
  home: TerritoryId;
  specialization: ActivityId;
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
  /** Rischio 0-100: quanto l'organizzazione è esposta. */
  heat: number;
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
}

export type GameAction =
  | { type: 'expand'; territoryId: TerritoryId }
  | { type: 'consolidate'; territoryId: TerritoryId }
  | { type: 'toggleActivity'; territoryId: TerritoryId; activityId: ActivityId }
  | { type: 'recruit' }
  | { type: 'lowProfile' }
  | { type: 'respect'; targetId: FamilyId };

export interface ActionResult {
  ok: boolean;
  reason?: string;
}
