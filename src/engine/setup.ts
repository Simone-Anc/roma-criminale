import { RIVAL_DEFS } from '../data/organizations';
import { ZONE_LIST } from '../data/zones';
import { BALANCE } from './balance';
import { news } from './news';
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
      heat: isPlayer ? 5 : 15,
      relations,
      isPlayer,
      alive: true,
      brokeWeeks: 0,
    };
  }

  const territories: Record<string, TerritoryState> = {};
  for (const z of ZONE_LIST) {
    const homeOf = defs.find((f) => f.home === z.id);
    territories[z.id] = homeOf
      ? {
          id: z.id,
          influence: { [homeOf.id]: homeOf.startInfluence, [LOCALS]: 100 - homeOf.startInfluence },
          owner: homeOf.id,
          activities: [],
        }
      : { id: z.id, influence: { [LOCALS]: 100 }, owner: null, activities: [] };
  }

  // Le rivali partono con la loro specialità già avviata; il giocatore sceglie da sé.
  for (const def of RIVAL_DEFS) {
    const zone = ZONE_LIST.find((z) => z.id === def.home)!;
    territories[zone.id].activities.push(
      zone.activities.includes(def.specialization) ? def.specialization : zone.activities[0],
    );
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
  };

  news(state, 'organizzazione', `Roma, prima settimana: ${player.name} ${player.plural ? 'muovono' : 'muove'} i primi passi`, player.id,
    'Pochi soldi, pochi uomini, una sola zona. Le grandi organizzazioni non si sono ancora accorte di voi.');
  return state;
}
