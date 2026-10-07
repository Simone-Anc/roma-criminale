// Gerarchia dell'organizzazione: capo → vice capi → soldati.
// I soldati sono i `members`: solo un numero (stipendi, potenza, influenza). I vice hanno
// un incarico (reclutare, spaccio) e una lealtà.
// Solo funzioni di lettura e generazione; l'evoluzione settimanale è in loyalty.ts.
import { FEMALE_NAMES, LAST_NAMES, MALE_NAMES, NICKNAMES } from '../data/people';
import { BALANCE } from './balance';
import type { Rng } from './rng';
import type { Family, FamilyId, GameState, Lieutenant, TerritoryId } from './types';

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

/** Soldati impegnati negli assalti in corso, in attacco o in difesa. */
export function soldiersAtWar(state: GameState, familyId: FamilyId): number {
  return state.battles.reduce(
    (n, b) => n + (b.attacker === familyId ? b.attackers : 0) + (b.defender === familyId ? b.defenders : 0),
    0,
  );
}

/** Soldati liberi: in strada a spacciare, pronti per un assalto. */
export function freeSoldiers(state: GameState, familyId: FamilyId): number {
  return Math.max(0, state.families[familyId].members - soldiersAtWar(state, familyId));
}

/** Vice messo allo spaccio nel quartiere, se c'è. */
export function spaccioAt(f: Family, territoryId: TerritoryId): Lieutenant | null {
  return f.lieutenants.find((l) => l.assignment?.type === 'spaccio' && l.assignment.territoryId === territoryId) ?? null;
}

/** Influenza settimanale portata dallo spaccio nel suo quartiere: cresce con gli affari del vice. */
export function spaccioGain(l: Lieutenant): number {
  return BALANCE.spaccioZoneGain + Math.floor(l.skills.affari / 50);
}

/** Difesa in più (in punti %) nel quartiere dello spaccio, se è ancora dell'organizzazione. */
export function spaccioDefense(state: GameState, familyId: FamilyId, territoryId: TerritoryId): number {
  if (state.territories[territoryId].owner !== familyId) return 0;
  const l = spaccioAt(state.families[familyId], territoryId);
  return l ? l.skills.forza / 2 : 0;
}

/** Rischio settimanale dovuto ai vice: lo spaccio espone, la discrezione di chi ha un incarico copre. */
export function organizationHeat(f: Family): number {
  const discretion = f.lieutenants
    .filter((l) => l.assignment)
    .reduce((s, l) => s + l.skills.discrezione / 50, 0);
  const spaccio = f.lieutenants.filter((l) => l.assignment?.type === 'spaccio').length * BALANCE.spaccioHeat;
  return spaccio - discretion;
}

/** Denaro trattenuto ogni settimana dai vice poco leali. */
export function skimmed(f: Family): number {
  return f.lieutenants
    .filter((l) => l.loyalty < BALANCE.loyaltySkim)
    .reduce((s, l) => s + l.ambition / 10, 0);
}
