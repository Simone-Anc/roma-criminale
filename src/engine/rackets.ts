// Rami d'affari come mercato condiviso della città.
// Regole:
// - ogni ramo ha un numero fisso di slot, contesi da tutte le organizzazioni;
// - ogni slot posseduto rende e aggiunge (o toglie) rischio ogni settimana;
// - chi ha più slot di chiunque altro (almeno 2; a pari merito nessuno) incassa il premio di maggioranza;
// - i vantaggi del ramo si sbloccano con il numero di slot posseduti;
// - finché ci sono slot liberi li prende chiunque; a mercato pieno, chi domina un
//   quartiere adatto al ramo può strapparne uno a un rivale (costa di più).
// I soldati non c'entrano: sono solo un numero (stipendi, potenza, influenza).
import { RACKETS, RACKET_LIST } from '../data/rackets';
import { ZONES } from '../data/zones';
import { BALANCE } from './balance';
import type { Bonuses, FamilyId, GameState, Perk, RacketId } from './types';

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
};

/** Slot del ramo posseduti dall'organizzazione. */
export function racketSlots(state: GameState, familyId: FamilyId, id: RacketId): number {
  return state.families[familyId].rackets[id] ?? 0;
}

/** Chi possiede slot del ramo, dal più forte al più debole. */
export function slotHolders(state: GameState, id: RacketId): { familyId: FamilyId; slots: number }[] {
  return state.familyOrder
    .map((fid) => ({ familyId: fid, slots: racketSlots(state, fid, id) }))
    .filter((h) => h.slots > 0 && state.families[h.familyId].alive)
    .sort((a, b) => b.slots - a.slots);
}

export function freeSlots(state: GameState, id: RacketId): number {
  return RACKETS[id].slots - slotHolders(state, id).reduce((n, h) => n + h.slots, 0);
}

/** Organizzazione con più slot di tutte (e almeno `majorityMinSlots`); a pari merito nessuna. */
export function racketMajority(state: GameState, id: RacketId): FamilyId | null {
  const [first, second] = slotHolders(state, id);
  if (!first || first.slots < BALANCE.majorityMinSlots || (second && second.slots === first.slots)) return null;
  return first.familyId;
}

/** Prezzo del prossimo slot: cresce con quelli che già possiedi; strapparlo costa di più. */
export function slotCost(state: GameState, familyId: FamilyId, id: RacketId, steal = false): number {
  const def = RACKETS[id];
  const base = def.slotCost * def.costGrowth ** racketSlots(state, familyId, id);
  return Math.round(base * (steal ? BALANCE.stealCostFactor : 1));
}

/** Per strappare slot di un ramo bisogna dominare almeno un quartiere adatto. */
export function canSteal(state: GameState, familyId: FamilyId, id: RacketId): boolean {
  return Object.values(state.territories).some((t) => t.owner === familyId && ZONES[t.id].rackets.includes(id));
}

/** Vantaggi sbloccati da un ramo con gli slot posseduti. */
export function activePerks(state: GameState, familyId: FamilyId, id: RacketId): Perk[] {
  const slots = racketSlots(state, familyId, id);
  return RACKETS[id].perks.filter((p) => p.slots <= slots);
}

/** Somma dei vantaggi di tutti i rami. */
export function bonuses(state: GameState, familyId: FamilyId): Bonuses {
  const out = { ...NO_BONUSES };
  for (const r of RACKET_LIST)
    for (const p of activePerks(state, familyId, r.id))
      for (const [k, v] of Object.entries(p.bonus ?? {})) out[k as keyof Bonuses] += v;
  return out;
}

/** Entrate settimanali di un ramo (k€): slot, vantaggi, specialità e premio di maggioranza. */
export function racketIncome(state: GameState, familyId: FamilyId, id: RacketId, all = bonuses(state, familyId)): number {
  const slots = racketSlots(state, familyId, id);
  if (slots === 0) return 0;
  const def = RACKETS[id];
  const f = state.families[familyId];
  const own = activePerks(state, familyId, id).reduce((s, p) => s + (p.selfIncome ?? 0), 0);
  const spec = f.specialization === id ? BALANCE.specializationBonus : 0;
  const majority = racketMajority(state, id) === familyId ? def.majorityBonus : 0;
  return def.income * slots * (1 + (own + spec + all.income) / 100) + majority;
}

/** Rischio settimanale di un ramo. */
export function racketHeat(state: GameState, familyId: FamilyId, id: RacketId): number {
  return RACKETS[id].heat * racketSlots(state, familyId, id);
}
