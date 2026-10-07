// Funzioni di sola lettura sullo stato: usate da UI, IA e motore.
import { RACKET_LIST } from '../data/rackets';
import { ZONES as TERRITORIES, ZONE_LIST as TERRITORY_LIST } from '../data/zones';
import { BALANCE, CONTROL_LEVELS } from './balance';
import { areaTributeBonus, organizationHeat, skimmed } from './organization';
import { bonuses, racketHeat, racketIncome } from './rackets';
import type { FamilyId, GameState, TerritoryId, TerritoryState } from './types';

export function ownedTerritories(state: GameState, familyId: FamilyId): TerritoryState[] {
  return Object.values(state.territories).filter((t) => t.owner === familyId);
}

export function control(state: GameState, territoryId: TerritoryId, familyId: FamilyId): number {
  return state.territories[territoryId].influence[familyId] ?? 0;
}

/** Un territorio è raggiungibile se confina con uno controllato o se vi si ha già influenza. */
export function canReach(state: GameState, familyId: FamilyId, territoryId: TerritoryId): boolean {
  if (control(state, territoryId, familyId) > 0) return true;
  return TERRITORIES[territoryId].neighbors.some((n) => state.territories[n].owner === familyId);
}

export function expandCost(state: GameState, familyId: FamilyId, territoryId: TerritoryId): number {
  const def = TERRITORIES[territoryId];
  const base = BALANCE.expandBaseCost + def.wealth * BALANCE.expandWealthCost + def.lawPresence;
  return Math.round(base * (1 - bonuses(state, familyId).expandDiscount / 100));
}

export function expandGain(state: GameState, familyId: FamilyId): number {
  const f = state.families[familyId];
  return Math.round(10 + f.members / 3 + f.reputation / 20) + bonuses(state, familyId).expandGain;
}

export function recruitCost(state: GameState, familyId: FamilyId): number {
  const discount = Math.min(75, bonuses(state, familyId).recruitDiscount);
  return Math.round(BALANCE.recruitCost * (1 - discount / 100));
}

export function actionsPerTurn(state: GameState, familyId: FamilyId): number {
  return BALANCE.actionsPerTurn + bonuses(state, familyId).actions;
}

export function tribute(state: GameState, familyId: FamilyId, territoryId: TerritoryId): number {
  const def = TERRITORIES[territoryId];
  const extra = 1 + bonuses(state, familyId).tribute / 100 + areaTributeBonus(state, familyId, territoryId);
  return (def.wealth * control(state, territoryId, familyId) * BALANCE.tributeFactor * extra) / 100;
}

export interface Forecast {
  /** Entrate totali: tributi + rami d'affari. */
  income: number;
  tributes: number;
  rackets: number;
  /** Stipendi: soldati e vice capi. */
  upkeep: number;
  /** Trattenuto dai vice poco leali. */
  skimmed: number;
  net: number;
  heat: number;
}

/** Previsione delle entrate/uscite della prossima chiusura di settimana. */
export function forecast(state: GameState, familyId: FamilyId): Forecast {
  const family = state.families[familyId];
  const all = bonuses(state, familyId);
  const tributes = ownedTerritories(state, familyId).reduce((s, t) => s + tribute(state, familyId, t.id), 0);
  let rackets = 0;
  let heat = -BALANCE.heatDecay + Math.max(0, family.money) / BALANCE.cashPerHeat + organizationHeat(family);
  for (const r of RACKET_LIST) {
    rackets += racketIncome(state, familyId, r.id, all);
    heat += racketHeat(state, familyId, r.id);
  }
  const income = tributes + rackets;
  const upkeep = family.members * BALANCE.memberUpkeep + family.lieutenants.length * BALANCE.lieutenantUpkeep;
  const lost = skimmed(family);
  return { income, tributes, rackets, upkeep, skimmed: lost, net: income - upkeep - lost, heat };
}

/** Influenza complessiva: media del controllo su tutte le zone (0-100). */
export function totalInfluence(state: GameState, familyId: FamilyId): number {
  return Math.round(
    TERRITORY_LIST.reduce((s, t) => s + control(state, t.id, familyId), 0) / TERRITORY_LIST.length,
  );
}

export function controlLevel(value: number): string {
  return CONTROL_LEVELS.find((l) => value >= l.min)!.label;
}

/** Rischio di un quartiere (0-100): presenza della polizia più l'esposizione di chi lo domina. */
export function zoneRisk(state: GameState, territoryId: TerritoryId): number {
  const owner = state.territories[territoryId].owner;
  const ownerHeat = owner ? state.families[owner].heat : 0;
  return Math.min(100, Math.round(TERRITORIES[territoryId].lawPresence * 6 + ownerHeat / 4));
}

/** Attenzione delle forze dell'ordine: esposizione pesata dalla loro presenza nei tuoi territori. */
export function policeAttention(state: GameState, familyId: FamilyId): number {
  const family = state.families[familyId];
  const owned = ownedTerritories(state, familyId);
  if (owned.length === 0) return Math.round(family.heat / 2);
  const avgLaw = owned.reduce((s, t) => s + TERRITORIES[t.id].lawPresence, 0) / owned.length;
  return Math.min(100, Math.round(family.heat * (avgLaw / 8) + owned.length));
}

/** Potenza sintetica, usata per confronti e classifica. */
export function power(state: GameState, familyId: FamilyId): number {
  const f = state.families[familyId];
  if (!f.alive) return 0;
  return Math.round(
    totalInfluence(state, familyId) * 3 + f.members * 2 + f.lieutenants.length * 4 + f.money / 20 + f.reputation,
  );
}

export function weekLabel(week: number): string {
  const d = new Date(Date.UTC(2026, 0, 5 + (week - 1) * 7));
  const month = d.toLocaleDateString('it-IT', { month: 'long', timeZone: 'UTC' });
  return `${month} ${d.getUTCFullYear()}`;
}

export function heatLabel(value: number): string {
  if (value < 25) return 'Bassa';
  if (value < 50) return 'Moderata';
  if (value < 75) return 'Alta';
  return 'Critica';
}

export function relationLabel(value: number): string {
  if (value <= -60) return 'Ostilità aperta';
  if (value <= -20) return 'Tensione';
  if (value < 20) return 'Neutrale';
  if (value < 60) return 'Rispetto';
  return 'Intesa';
}
