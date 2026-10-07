// Rami d'affari: livelli globali dell'organizzazione, sostenuti dai quartieri che domina.
// Regole:
// - un ramo rende solo se domini quartieri "adatti" (la sua rete);
// - il livello utile è limitato dalla rete: 1 + 2 per quartiere adatto (fino al massimo);
//   i livelli oltre il limite restano acquisiti ma non rendono e non sbloccano vantaggi;
// - ogni livello impegna un membro.
import { RACKETS, RACKET_LIST } from '../data/rackets';
import { ZONES } from '../data/zones';
import { BALANCE } from './balance';
import type { Bonuses, FamilyId, GameState, Perk, RacketId, TerritoryId } from './types';

export const NO_BONUSES: Bonuses = {
  income: 0,
  tribute: 0,
  expandGain: 0,
  expandDiscount: 0,
  recruitDiscount: 0,
  influencePerWeek: 0,
  reputationPerWeek: 0,
  policeShield: 0,
  defense: 0,
  actions: 0,
};

export function racketLevel(state: GameState, familyId: FamilyId, id: RacketId): number {
  return state.families[familyId].rackets[id] ?? 0;
}

/** Quartieri dominati che sostengono il ramo. */
export function racketNetwork(state: GameState, familyId: FamilyId, id: RacketId): TerritoryId[] {
  return Object.values(state.territories)
    .filter((t) => t.owner === familyId && ZONES[t.id].rackets.includes(id))
    .map((t) => t.id);
}

/** Livello massimo utilizzabile con la rete attuale. */
export function racketCap(state: GameState, familyId: FamilyId, id: RacketId): number {
  const network = racketNetwork(state, familyId, id).length;
  if (network === 0) return 0;
  return Math.min(RACKETS[id].maxLevel, 1 + BALANCE.racketLevelsPerZone * network);
}

/** Livelli che lavorano davvero: quelli acquisiti, entro il limite della rete. */
export function effectiveLevel(state: GameState, familyId: FamilyId, id: RacketId): number {
  return Math.min(racketLevel(state, familyId, id), racketCap(state, familyId, id));
}

export function upgradeCost(state: GameState, familyId: FamilyId, id: RacketId): number {
  const def = RACKETS[id];
  return Math.round(def.baseCost * def.costGrowth ** racketLevel(state, familyId, id));
}

/** Membri impegnati nei rami: uno per livello acquisito. */
export function membersBusy(state: GameState, familyId: FamilyId): number {
  const f = state.families[familyId];
  return RACKET_LIST.reduce((n, r) => n + (f.rackets[r.id] ?? 0), 0);
}

/** Vantaggi sbloccati da un ramo con i livelli effettivi. */
export function activePerks(state: GameState, familyId: FamilyId, id: RacketId): Perk[] {
  const level = effectiveLevel(state, familyId, id);
  return RACKETS[id].perks.filter((p) => p.level <= level);
}

/** Somma dei vantaggi di tutti i rami. */
export function bonuses(state: GameState, familyId: FamilyId): Bonuses {
  const out = { ...NO_BONUSES };
  for (const r of RACKET_LIST)
    for (const p of activePerks(state, familyId, r.id))
      for (const [k, v] of Object.entries(p.bonus ?? {})) out[k as keyof Bonuses] += v;
  return out;
}

/** Entrate settimanali di un ramo (k€). */
export function racketIncome(state: GameState, familyId: FamilyId, id: RacketId, all = bonuses(state, familyId)): number {
  const level = effectiveLevel(state, familyId, id);
  if (level === 0) return 0;
  const def = RACKETS[id];
  const f = state.families[familyId];
  const network = racketNetwork(state, familyId, id).length;
  const own = activePerks(state, familyId, id).reduce((s, p) => s + (p.selfIncome ?? 0), 0);
  const spec = f.specialization === id ? BALANCE.specializationBonus : 0;
  const reach = 1 + BALANCE.racketNetworkBonus * (network - 1);
  return def.income * level * reach * (1 + (own + spec + all.income) / 100);
}

/**
 * Rischio settimanale di un ramo. Quello positivo cresce con la presenza della polizia
 * nei quartieri della rete (media 6 = neutro); quello negativo no.
 */
export function racketHeat(state: GameState, familyId: FamilyId, id: RacketId): number {
  const level = effectiveLevel(state, familyId, id);
  const def = RACKETS[id];
  if (level === 0) return 0;
  if (def.heat < 0) return def.heat * level;
  const network = racketNetwork(state, familyId, id);
  const law = network.reduce((s, z) => s + ZONES[z].lawPresence, 0) / network.length;
  return def.heat * level * (law / 6);
}
