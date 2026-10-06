// Funzioni di sola lettura sullo stato: usate da UI, IA e motore.
import { ACTIVITIES } from '../data/activities';
import { ZONES as TERRITORIES, ZONE_LIST as TERRITORY_LIST } from '../data/zones';
import { BALANCE, CONTROL_LEVELS } from './balance';
import type { ActivityId, Family, FamilyId, GameState, TerritoryId, TerritoryState } from './types';

export function ownedTerritories(state: GameState, familyId: FamilyId): TerritoryState[] {
  return Object.values(state.territories).filter((t) => t.owner === familyId);
}

export function control(state: GameState, territoryId: TerritoryId, familyId: FamilyId): number {
  return state.territories[territoryId].influence[familyId] ?? 0;
}

export function activeActivityCount(state: GameState, familyId: FamilyId): number {
  return ownedTerritories(state, familyId).reduce((n, t) => n + t.activities.length, 0);
}

export function activitySlots(family: Family): number {
  return Math.floor(family.members / BALANCE.membersPerActivity);
}

/** Un territorio è raggiungibile se confina con uno controllato o se vi si ha già influenza. */
export function canReach(state: GameState, familyId: FamilyId, territoryId: TerritoryId): boolean {
  if (control(state, territoryId, familyId) > 0) return true;
  return TERRITORIES[territoryId].neighbors.some((n) => state.territories[n].owner === familyId);
}

export function expandCost(territoryId: TerritoryId): number {
  const def = TERRITORIES[territoryId];
  return BALANCE.expandBaseCost + def.wealth * BALANCE.expandWealthCost + def.lawPresence;
}

export function expandGain(family: Family): number {
  return Math.round(10 + family.members / 3 + family.reputation / 20);
}

/** Rendimento settimanale di un'attività in un territorio per una famiglia. */
export function activityYield(
  state: GameState,
  familyId: FamilyId,
  territoryId: TerritoryId,
  activityId: ActivityId,
): number {
  const def = TERRITORIES[territoryId];
  const act = ACTIVITIES[activityId];
  const family = state.families[familyId];
  const ctrl = control(state, territoryId, familyId) / 100;
  const spec = family.specialization === activityId ? 1.3 : 1;
  return act.income * (0.5 + def.wealth / 10) * (0.3 + ctrl) * spec;
}

export function activityHeat(territoryId: TerritoryId, activityId: ActivityId): number {
  const act = ACTIVITIES[activityId];
  if (act.heat < 0) return act.heat;
  return act.heat * (TERRITORIES[territoryId].lawPresence / 6);
}

export function tribute(state: GameState, familyId: FamilyId, territoryId: TerritoryId): number {
  const def = TERRITORIES[territoryId];
  return (def.wealth * control(state, territoryId, familyId) * BALANCE.tributeFactor) / 100;
}

export interface Forecast {
  income: number;
  upkeep: number;
  net: number;
  heat: number;
}

/** Previsione delle entrate/uscite della prossima chiusura di settimana. */
export function forecast(state: GameState, familyId: FamilyId): Forecast {
  const family = state.families[familyId];
  let income = 0;
  let heat = -BALANCE.heatDecay;
  for (const t of ownedTerritories(state, familyId)) {
    income += tribute(state, familyId, t.id);
    for (const a of t.activities) {
      income += activityYield(state, familyId, t.id, a);
      heat += activityHeat(t.id, a);
    }
  }
  const upkeep = family.members * BALANCE.memberUpkeep;
  return { income, upkeep, net: income - upkeep, heat };
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

/** Rischio di una zona (0-100): presenza della polizia più la pressione delle attività in corso. */
export function zoneRisk(state: GameState, territoryId: TerritoryId): number {
  const t = state.territories[territoryId];
  const fromActivities = t.activities.reduce((s, a) => s + Math.max(0, activityHeat(territoryId, a)), 0);
  return Math.min(100, Math.round(TERRITORIES[territoryId].lawPresence * 6 + fromActivities * 4));
}

/** Attenzione delle forze dell'ordine: esposizione pesata dalla loro presenza nei tuoi territori. */
export function policeAttention(state: GameState, familyId: FamilyId): number {
  const family = state.families[familyId];
  const owned = ownedTerritories(state, familyId);
  if (owned.length === 0) return Math.round(family.heat / 2);
  const avgLaw = owned.reduce((s, t) => s + TERRITORIES[t.id].lawPresence, 0) / owned.length;
  return Math.min(100, Math.round(family.heat * (avgLaw / 8) + owned.length * 2));
}

/** Potenza sintetica, usata per confronti e classifica. */
export function power(state: GameState, familyId: FamilyId): number {
  const f = state.families[familyId];
  if (!f.alive) return 0;
  return Math.round(
    totalInfluence(state, familyId) * 3 + f.members * 2 + f.money / 20 + f.reputation,
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
