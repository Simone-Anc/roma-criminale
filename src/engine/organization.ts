// Gerarchia dell'organizzazione: capo → vice capi → soldati.
// I soldati sono i `members`: una parte è assegnata ai vice, il resto agli ordini del capo.
// Solo funzioni di lettura e generazione; l'evoluzione settimanale è in loyalty.ts.
import { FEMALE_NAMES, LAST_NAMES, MALE_NAMES, NICKNAMES } from '../data/people';
import { ZONES } from '../data/zones';
import { BALANCE } from './balance';
import type { Rng } from './rng';
import type { AreaId, Family, FamilyId, GameState, Lieutenant, TerritoryId } from './types';

/**
 * Genera un personaggio con abilità e carattere casuali. I più ambiziosi sono anche i
 * più capaci: rendono di più, ma la loro lealtà va coltivata.
 */
export function generateLieutenant(state: GameState, rng: Rng): Lieutenant {
  const female = rng.chance(0.35);
  const nicknames = NICKNAMES.filter((n) => (female ? n.f : n.m));
  const ambition = rng.int(10, 90);
  const skill = () => Math.min(100, rng.int(15, 65) + Math.round(ambition / 4));
  return {
    id: `p${state.nextId++}`,
    firstName: rng.pick(female ? FEMALE_NAMES : MALE_NAMES),
    lastName: rng.pick(LAST_NAMES),
    nickname: rng.pick(nicknames).text,
    age: rng.int(24, 58),
    loyalty: rng.int(45, 70),
    ambition,
    skills: { affari: skill(), forza: skill(), discrezione: skill() },
    soldiers: 0,
    assignment: null,
    joinedWeek: state.week,
  };
}

export function fullName(l: Lieutenant): string {
  return `${l.firstName} ${l.lastName}`;
}

/** Slot da vice capo: uno all'inizio, poi uno per ogni soglia di reputazione. */
export function lieutenantSlots(f: Family): number {
  return 1 + BALANCE.slotReputation.filter((r) => f.reputation >= r).length;
}

/** Soldati che un vice può comandare. */
export function squadCapacity(l: Lieutenant): number {
  return BALANCE.squadBase + Math.floor(l.skills.forza / 25);
}

/** Soldati assegnati ai vice. */
export function assignedSoldiers(f: Family): number {
  return f.lieutenants.reduce((n, l) => n + l.soldiers, 0);
}

/** Soldati agli ordini diretti del capo. */
export function directSoldiers(f: Family): number {
  return Math.max(0, f.members - assignedSoldiers(f));
}

/** Soldati senza guida: oltre quelli che il capo riesce a seguire di persona. */
export function unledSoldiers(f: Family): number {
  return Math.max(0, directSoldiers(f) - BALANCE.bossDirectSoldiers);
}

/** Quanti soldati vorrebbe comandare un vice, in base all'ambizione. */
export function wantedSoldiers(l: Lieutenant): number {
  return Math.round(l.ambition / 20);
}

/** Vice responsabile dell'area del quartiere, se c'è. */
export function areaChief(state: GameState, familyId: FamilyId, territoryId: TerritoryId): Lieutenant | null {
  const area = ZONES[territoryId].area;
  return state.families[familyId].lieutenants.find((l) => l.assignment?.area === area) ?? null;
}

export function chiefOfArea(f: Family, area: AreaId): Lieutenant | null {
  return f.lieutenants.find((l) => l.assignment?.area === area) ?? null;
}

/** Tributi in più nei quartieri dell'incarico (fino a +25%). */
export function areaTributeBonus(state: GameState, familyId: FamilyId, territoryId: TerritoryId): number {
  const chief = areaChief(state, familyId, territoryId);
  return chief ? chief.skills.affari / 400 : 0;
}

/** Difesa in più (in punti %) nei quartieri dell'incarico. */
export function areaDefense(state: GameState, familyId: FamilyId, territoryId: TerritoryId): number {
  const chief = areaChief(state, familyId, territoryId);
  return chief ? chief.skills.forza / 2 : 0;
}

/** Influenza settimanale portata dal presidio dei soldati del vice. */
export function areaPresidio(state: GameState, familyId: FamilyId, territoryId: TerritoryId): number {
  const chief = areaChief(state, familyId, territoryId);
  return chief ? Math.min(BALANCE.presidioMax, Math.floor(chief.soldiers / BALANCE.soldiersPerPresidio)) : 0;
}

/** Rischio settimanale dovuto alla struttura: soldati senza guida meno la discrezione dei vice. */
export function organizationHeat(f: Family): number {
  const discretion = f.lieutenants
    .filter((l) => l.assignment)
    .reduce((s, l) => s + l.skills.discrezione / 50, 0);
  return unledSoldiers(f) * BALANCE.unledHeat - discretion;
}

/** Denaro trattenuto ogni settimana dai vice poco leali. */
export function skimmed(f: Family): number {
  return f.lieutenants
    .filter((l) => l.loyalty < BALANCE.loyaltySkim)
    .reduce((s, l) => s + l.ambition / 10, 0);
}

/** Dopo una perdita di membri, le squadre non possono superare il totale. */
export function fitSquads(f: Family): void {
  let excess = assignedSoldiers(f) - f.members;
  while (excess > 0) {
    const biggest = [...f.lieutenants].sort((a, b) => b.soldiers - a.soldiers)[0];
    biggest.soldiers -= 1;
    excess -= 1;
  }
}
