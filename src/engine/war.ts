// Guerra: assalti ai quartieri dominati da altre organizzazioni.
// Chi attacca sceglie il quartiere e quanti soldati mandare; chi difende schiera subito una
// parte dei suoi soldati liberi. Ogni settimana i due schieramenti si scontrano: ognuno perde
// uomini in proporzione alla forza dell'altro e il fronte (0-100, si parte da 50) si sposta
// verso chi è più forte. Vince chi lo porta in fondo, o chi resta l'unico in campo.
// La forza è: soldati × (1 + modificatori), con modificatori leggibili nella UI.
import { ZONES } from '../data/zones';
import { BALANCE } from './balance';
import { di, mid, news, v } from './news';
import { freeSoldiers, spaccioDefense } from './organization';
import { control, zoneDistance } from './queries';
import { bonuses, racketSlots } from './rackets';
import type { Rng } from './rng';
import { shiftInfluence, updateOwner } from './territory';
import type { Battle, FamilyId, GameState, TerritoryId } from './types';

export interface Modifier {
  label: string;
  /** Punti %: +25 = forza ×1,25. */
  pct: number;
}

export interface Force {
  soldiers: number;
  mods: Modifier[];
  power: number;
}

function force(soldiers: number, mods: Modifier[]): Force {
  const kept = mods.filter((m) => m.pct !== 0);
  const pct = kept.reduce((s, m) => s + m.pct, 0);
  return { soldiers, mods: kept, power: Math.max(0, soldiers * (1 + pct / 100)) };
}

function armsBonus(state: GameState, familyId: FamilyId): number {
  return Math.min(BALANCE.armsMax, racketSlots(state, familyId, 'armi') * BALANCE.armsPerSlot);
}

/** Forza di chi attacca il quartiere con `soldiers` uomini. */
export function attackForce(state: GameState, familyId: FamilyId, territoryId: TerritoryId, soldiers: number): Force {
  const f = state.families[familyId];
  const far = Math.max(0, zoneDistance(state, familyId, territoryId) - 1);
  return force(soldiers, [
    { label: 'Armi', pct: armsBonus(state, familyId) },
    { label: 'Reputazione', pct: Math.floor(f.reputation / 4) },
    { label: 'Lontano dalle basi', pct: -far * BALANCE.distancePenalty },
  ]);
}

/** Forza di chi difende il quartiere con `soldiers` uomini. */
export function defenseForce(state: GameState, familyId: FamilyId, territoryId: TerritoryId, soldiers: number): Force {
  const f = state.families[familyId];
  return force(soldiers, [
    { label: 'Difesa in casa', pct: BALANCE.homeDefense },
    { label: 'Radicamento', pct: Math.round(control(state, territoryId, familyId) / 2) },
    { label: 'Armi', pct: armsBonus(state, familyId) },
    { label: 'Arsenale', pct: Math.round(bonuses(state, familyId).defense / 2) },
    { label: 'Vice allo spaccio', pct: Math.round(spaccioDefense(state, familyId, territoryId)) },
    { label: 'Base dell’organizzazione', pct: f.home === territoryId ? BALANCE.baseDefense : 0 },
  ]);
}

/** Soldati che chi difende schiererebbe subito. */
export function garrison(state: GameState, familyId: FamilyId): number {
  const free = freeSoldiers(state, familyId);
  return free === 0 ? 0 : Math.max(1, Math.round(free * BALANCE.defenderGarrison));
}

export function battleAt(state: GameState, territoryId: TerritoryId): Battle | null {
  return state.battles.find((b) => b.territoryId === territoryId) ?? null;
}

/** Forze in campo in un assalto in corso. */
export function battleForces(state: GameState, b: Battle): { attack: Force; defense: Force } {
  return {
    attack: attackForce(state, b.attacker, b.territoryId, b.attackers),
    defense: defenseForce(state, b.defender, b.territoryId, b.defenders),
  };
}

/** Quota di forza di chi attacca (0-1): sopra 0,5 il fronte avanza. */
export function attackShare(attack: Force, defense: Force): number {
  const total = attack.power + defense.power;
  return total === 0 ? 0.5 : attack.power / total;
}

/** Apre l'assalto (le verifiche sono in validateAction). */
export function startBattle(state: GameState, attacker: FamilyId, territoryId: TerritoryId, soldiers: number): Battle {
  const defender = state.territories[territoryId].owner!;
  const b: Battle = {
    id: `b${state.nextId++}`,
    territoryId,
    attacker,
    defender,
    attackers: soldiers,
    defenders: garrison(state, defender),
    front: 50,
    startWeek: state.week,
    rounds: 0,
    last: null,
  };
  state.battles.push(b);
  const a = state.families[attacker];
  const d = state.families[defender];
  if (a.isPlayer || d.isPlayer)
    news(state, 'territorio', `${ZONES[territoryId].name}, scoppia la guerra: ${a.name} ${v(a, 'attacca', 'attaccano')} ${mid(d)}`, attacker,
      `${soldiers} uomini contro ${b.defenders}. Gli scontri andranno avanti per settimane.`);
  return b;
}

/** Una settimana di scontri per ogni assalto in corso. */
export function battleStep(state: GameState, rng: Rng): void {
  for (const b of [...state.battles]) {
    const a = state.families[b.attacker];
    const d = state.families[b.defender];
    // Gli assalti lanciati dall'IA in questa chiusura di settimana partono la prossima:
    // chi difende ha il tempo di vederli e di mandare rinforzi.
    if (b.startWeek === state.week && !a.isPlayer) continue;
    if (!a.alive || !d.alive || state.territories[b.territoryId].owner !== b.defender) {
      endBattle(state, b, d.alive && state.territories[b.territoryId].owner === b.defender ? 'defender' : 'attacker', rng);
      continue;
    }
    const { attack, defense } = battleForces(state, b);
    const share = attackShare(attack, defense);
    const losses = (own: number, enemyShare: number) =>
      Math.min(own, Math.round(own * BALANCE.battleLosses * enemyShare * 2 * (0.7 + rng.next() * 0.6)));
    const attackerLosses = losses(b.attackers, 1 - share);
    const defenderLosses = losses(b.defenders, share);
    const shift = Math.round((share - 0.5) * BALANCE.frontSpeed + (rng.next() * 2 - 1) * BALANCE.frontNoise);

    b.attackers -= attackerLosses;
    b.defenders -= defenderLosses;
    a.members = Math.max(0, a.members - attackerLosses);
    d.members = Math.max(0, d.members - defenderLosses);
    b.front = Math.max(0, Math.min(100, b.front + shift));
    b.rounds += 1;
    b.last = { attackerLosses, defenderLosses, shift };
    a.heat = Math.min(100, a.heat + BALANCE.battleHeat);
    d.heat = Math.min(100, d.heat + BALANCE.battleHeat);

    if (b.front >= 100 || (b.defenders <= 0 && b.attackers > 0)) endBattle(state, b, 'attacker', rng);
    else if (b.front <= 0 || b.attackers <= 0 || b.rounds >= BALANCE.battleMaxRounds) endBattle(state, b, 'defender', rng);
    else if (a.isPlayer || d.isPlayer)
      news(state, 'territorio', `${ZONES[b.territoryId].name}: settimana ${b.rounds} di scontri`, b.attacker,
        `Perdite: ${attackerLosses} per ${di(a)}, ${defenderLosses} per ${di(d)}. Il fronte si sposta verso ${shift >= 0 ? mid(a) : mid(d)}.`);
  }
}

/** Fine dell'assalto: i superstiti tornano in strada, il quartiere cambia (o no) padrone. */
export function endBattle(state: GameState, b: Battle, winner: 'attacker' | 'defender', rng: Rng): void {
  state.battles = state.battles.filter((x) => x.id !== b.id);
  const a = state.families[b.attacker];
  const d = state.families[b.defender];
  const zone = ZONES[b.territoryId];
  const inf = state.territories[b.territoryId].influence;
  if (winner === 'attacker') {
    // Chi attacca si prende gran parte della presa di chi difendeva.
    const take = Math.round((inf[b.defender] ?? 0) * BALANCE.conquestShare);
    inf[b.defender] = (inf[b.defender] ?? 0) - take;
    if (inf[b.defender] <= 0) delete inf[b.defender];
    inf[b.attacker] = (inf[b.attacker] ?? 0) + take;
    // Il vuoto lasciato dai gruppi locali si riempie: almeno la soglia di dominio.
    const missing = BALANCE.ownershipThreshold - inf[b.attacker];
    if (missing > 0) shiftInfluence(state, b.territoryId, b.attacker, missing);
    a.reputation = Math.min(100, a.reputation + BALANCE.battleReputation);
    d.reputation = Math.max(0, d.reputation - BALANCE.battleReputation);
  } else {
    // Chi difende tiene il quartiere; chi attaccava ci perde metà della sua influenza.
    const lost = Math.round((inf[b.attacker] ?? 0) / 2);
    if (lost > 0) {
      inf[b.attacker] -= lost;
      if (inf[b.attacker] <= 0) delete inf[b.attacker];
      inf[b.defender] = (inf[b.defender] ?? 0) + lost;
    }
    d.reputation = Math.min(100, d.reputation + BALANCE.battleReputation);
    a.reputation = Math.max(0, a.reputation - BALANCE.battleReputation);
  }
  updateOwner(state, b.territoryId, rng);
  if (a.isPlayer || d.isPlayer) {
    const won = winner === 'attacker' ? a : d;
    news(state, 'territorio', `${zone.name}, finita la guerra: ${v(won, 'vince', 'vincono')} ${mid(won)}`, won.id,
      winner === 'attacker'
        ? `${a.name} ${v(a, 'prende', 'prendono')} il controllo del quartiere.`
        : `${d.name} ${v(d, 'respinge', 'respingono')} l'assalto ${di(a)}.`);
  }
}
