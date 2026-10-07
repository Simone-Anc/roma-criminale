import { RIVAL_DEFS } from '../data/organizations';
import { ZONE_LIST } from '../data/zones';
import { BALANCE } from './balance';
import { news } from './news';
import { generateLieutenant } from './organization';
import { Rng } from './rng';
import { LOCALS, type Family, type FamilyDef, type FamilyId, type GameState, type TerritoryState } from './types';

export function newGame(player: FamilyDef, seed = Date.now()): GameState {
  const defs = [player, ...RIVAL_DEFS];
  const families: Record<FamilyId, Family> = {};
  for (const def of defs) {
    const relations: Record<FamilyId, number> = {};
    for (const other of defs) if (other.id !== def.id) relations[other.id] = 0;
    const isPlayer = def.id === player.id;
    families[def.id] = {
      ...def,
      money: def.startMoney,
      members: def.startMembers,
      reputation: isPlayer ? BALANCE.playerStartReputation : BALANCE.startReputation,
      rackets: { ...def.startRackets, [def.specialization]: BALANCE.specializationStartLevel },
      heat: isPlayer ? 5 : 15,
      lieutenants: [],
      relations,
      isPlayer,
      alive: true,
      brokeWeeks: 0,
    };
  }

  const territories: Record<string, TerritoryState> = {};
  for (const z of ZONE_LIST) territories[z.id] = { id: z.id, influence: { [LOCALS]: 100 }, owner: null };
  // Base dell'organizzazione e quartieri già sotto il suo controllo.
  for (const def of defs) {
    const zones = [def.home, ...def.startZones];
    zones.forEach((zid, i) => {
      const value = i === 0 ? def.startInfluence : def.startInfluence - BALANCE.startZoneGap;
      territories[zid] = { id: zid, influence: { [def.id]: value, [LOCALS]: 100 - value }, owner: def.id };
    });
  }

  const state: GameState = {
    version: 1,
    week: 1,
    rngState: seed >>> 0,
    playerId: player.id,
    families,
    familyOrder: defs.map((f) => f.id),
    territories,
    actionsLeft: BALANCE.actionsPerTurn,
    news: [],
    lastReport: null,
    status: 'playing',
    endReason: null,
    pendingSetup: 0,
    candidates: [],
    nextId: 1,
  };

  // Il braccio destro: già fedele, responsabile dell'area di casa, con due soldati.
  const rng = new Rng(state.rngState);
  const right = generateLieutenant(state, rng);
  right.loyalty = 72;
  right.soldiers = 2;
  right.assignment = { type: 'area', area: ZONE_LIST.find((z) => z.id === player.home)!.area };
  families[player.id].lieutenants.push(right);
  state.candidates = Array.from({ length: BALANCE.candidateCount }, () => generateLieutenant(state, rng));
  state.rngState = rng.state;

  news(state, 'organizzazione', `Roma, prima settimana: ${player.name} ${player.plural ? 'muovono' : 'muove'} i primi passi`, player.id,
    'Pochi soldi, pochi uomini, un solo quartiere. Le grandi organizzazioni non si sono ancora accorte di voi.');
  return state;
}
