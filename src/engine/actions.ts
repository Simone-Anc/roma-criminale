// Azioni disponibili alle famiglie. Le stesse regole valgono per giocatore e IA.
import { RACKETS } from '../data/rackets';
import { ZONES } from '../data/zones';
import { shakeLoyalty } from './loyalty';
import { freeSoldiers, fullName, lieutenantSlots, spaccioAt } from './organization';
import { BALANCE } from './balance';
import { di, mid, news } from './news';
import { control, expandCost, expandGain, recruitCost } from './queries';
import { canSteal, freeSlots, racketSlots, slotCost } from './rackets';
import { battleAt, endBattle, startBattle } from './war';
import { Rng } from './rng';
import { shiftInfluence, updateOwner } from './territory';
import { LOCALS, type ActionResult, type FamilyId, type GameAction, type GameState } from './types';

export function actionCost(state: GameState, familyId: FamilyId, action: GameAction): number {
  switch (action.type) {
    case 'expand':
      return expandCost(state, familyId, action.territoryId);
    case 'consolidate':
      return BALANCE.consolidateCost;
    case 'recruit':
      return recruitCost(state, familyId);
    case 'lowProfile':
      return BALANCE.lowProfileCost * 2 ** state.families[familyId].lowProfileUses;
    case 'respect':
      return BALANCE.respectCost;
    case 'takeSlot':
      return slotCost(state, familyId, action.racketId, !!action.from);
    case 'hireLieutenant':
      return BALANCE.hireCost;
    case 'rewardLieutenant':
      return BALANCE.rewardCost;
    case 'attack':
    case 'reinforce':
      return action.soldiers * BALANCE.attackCostPerSoldier;
    case 'retreat':
    case 'releaseSlot':
    case 'dismissLieutenant':
    case 'assignLieutenant':
      return 0;
  }
}

export function validateAction(state: GameState, familyId: FamilyId, action: GameAction): ActionResult {
  const f = state.families[familyId];
  const cost = actionCost(state, familyId, action);
  if (state.status !== 'playing') return { ok: false, reason: 'La partita è conclusa.' };

  switch (action.type) {
    case 'expand': {
      const t = state.territories[action.territoryId];
      // Nei propri quartieri si usa "Rafforza"; quelli di altri si prendono solo con un assalto.
      if (t.owner === familyId) return { ok: false, reason: 'Il quartiere è già tuo: rafforzalo.' };
      if (t.owner) return { ok: false, reason: 'Il quartiere è già controllato: si prende solo con un assalto.' };
      if (f.money < cost) return { ok: false, reason: 'Denaro insufficiente.' };
      return { ok: true };
    }
    case 'consolidate': {
      const t = state.territories[action.territoryId];
      if (t.owner !== familyId) return { ok: false, reason: 'Non sei l\'organizzazione dominante qui.' };
      if (control(state, t.id, familyId) >= 100) return { ok: false, reason: 'Controllo già totale.' };
      if (f.money < cost) return { ok: false, reason: 'Denaro insufficiente.' };
      return { ok: true };
    }
    case 'takeSlot': {
      const def = RACKETS[action.racketId];
      if (!action.from) {
        if (freeSlots(state, action.racketId) <= 0)
          return { ok: false, reason: `Nessuno slot libero in ${def.name.toLowerCase()}: va strappato a un rivale.` };
      } else {
        const victim = state.families[action.from];
        if (!victim?.alive || action.from === familyId) return { ok: false, reason: 'Organizzazione non valida.' };
        if (freeSlots(state, action.racketId) > 0) return { ok: false, reason: 'Ci sono ancora slot liberi: prendi quelli.' };
        if (racketSlots(state, action.from, action.racketId) <= 0)
          return { ok: false, reason: `${victim.name} non ha slot in questo ramo.` };
        if (state.week <= BALANCE.truceWeeks)
          return { ok: false, reason: `Tregua iniziale: nessun attacco fino alla settimana ${BALANCE.truceWeeks + 1}.` };
        if (!canSteal(state, familyId, action.racketId))
          return { ok: false, reason: 'Per strappare uno slot devi dominare un quartiere adatto a questo ramo.' };
      }
      if (f.money < cost) return { ok: false, reason: 'Denaro insufficiente.' };
      return { ok: true };
    }
    case 'releaseSlot':
      if (racketSlots(state, familyId, action.racketId) <= 0) return { ok: false, reason: 'Nessuno slot in questo ramo.' };
      return { ok: true };
    case 'attack': {
      const t = state.territories[action.territoryId];
      if (!t.owner || t.owner === familyId) return { ok: false, reason: 'Si attaccano solo i quartieri dominati da un’altra organizzazione.' };
      if (state.week <= BALANCE.truceWeeks)
        return { ok: false, reason: `Tregua iniziale: nessun attacco fino alla settimana ${BALANCE.truceWeeks + 1}.` };
      if (battleAt(state, action.territoryId)) return { ok: false, reason: 'Nel quartiere si combatte già.' };
      if (action.soldiers < 1) return { ok: false, reason: 'Manda almeno un soldato.' };
      if (action.soldiers > freeSoldiers(state, familyId)) return { ok: false, reason: 'Non hai abbastanza soldati liberi.' };
      if (f.money < cost) return { ok: false, reason: 'Denaro insufficiente.' };
      return { ok: true };
    }
    case 'reinforce': {
      const b = state.battles.find((x) => x.id === action.battleId);
      if (!b || (b.attacker !== familyId && b.defender !== familyId)) return { ok: false, reason: 'Non sei coinvolto in questo scontro.' };
      if (action.soldiers < 1) return { ok: false, reason: 'Manda almeno un soldato.' };
      if (action.soldiers > freeSoldiers(state, familyId)) return { ok: false, reason: 'Non hai abbastanza soldati liberi.' };
      if (f.money < cost) return { ok: false, reason: 'Denaro insufficiente.' };
      return { ok: true };
    }
    case 'retreat': {
      const b = state.battles.find((x) => x.id === action.battleId);
      if (!b || b.attacker !== familyId) return { ok: false, reason: 'Solo chi attacca può ritirarsi.' };
      return { ok: true };
    }
    case 'hireLieutenant':
      if (!state.candidates.some((c) => c.id === action.candidateId)) return { ok: false, reason: 'Candidato non più disponibile.' };
      if (f.lieutenants.length >= lieutenantSlots(f))
        return { ok: false, reason: 'Nessuno slot libero: la reputazione ne sblocca altri.' };
      if (f.money < cost) return { ok: false, reason: 'Denaro insufficiente.' };
      return { ok: true };
    case 'dismissLieutenant':
    case 'rewardLieutenant':
    case 'assignLieutenant': {
      const l = f.lieutenants.find((x) => x.id === action.lieutenantId);
      if (!l) return { ok: false, reason: 'Vice capo non trovato.' };
      if (action.type === 'rewardLieutenant') {
        if (l.loyalty >= 100) return { ok: false, reason: 'Lealtà già massima.' };
        if (f.money < cost) return { ok: false, reason: 'Denaro insufficiente.' };
      }
      const job = action.type === 'assignLieutenant' ? action.assignment : null;
      if (job?.type === 'spaccio') {
        if (state.territories[job.territoryId].owner !== familyId)
          return { ok: false, reason: 'Lo spaccio si organizza solo in un quartiere che domini.' };
        const other = spaccioAt(f, job.territoryId);
        if (other && other.id !== l.id)
          return { ok: false, reason: `A ${ZONES[job.territoryId].name} c'è già ${fullName(other)}.` };
      }
      return { ok: true };
    }
    case 'recruit':
      if (f.money < cost) return { ok: false, reason: 'Denaro insufficiente.' };
      return { ok: true };
    case 'lowProfile':
      if (f.money < cost) return { ok: false, reason: 'Denaro insufficiente.' };
      if (f.heat <= 0) return { ok: false, reason: 'Esposizione già nulla.' };
      return { ok: true };
    case 'respect': {
      const target = state.families[action.targetId];
      if (!target?.alive) return { ok: false, reason: 'Organizzazione non più attiva.' };
      if (f.money < cost) return { ok: false, reason: 'Denaro insufficiente.' };
      return { ok: true };
    }
  }
}

function changeRelation(state: GameState, a: FamilyId, b: FamilyId, delta: number): void {
  const fa = state.families[a];
  const fb = state.families[b];
  fa.relations[b] = Math.max(-100, Math.min(100, (fa.relations[b] ?? 0) + delta));
  fb.relations[a] = Math.max(-100, Math.min(100, (fb.relations[a] ?? 0) + delta));
}

/** Applica un'azione modificando lo stato (che deve essere già una copia). */
export function applyAction(
  state: GameState,
  familyId: FamilyId,
  action: GameAction,
  rng: Rng,
): ActionResult {
  const check = validateAction(state, familyId, action);
  if (!check.ok) return check;
  const f = state.families[familyId];
  const cost = actionCost(state, familyId, action);

  switch (action.type) {
    case 'expand': {
      const losses = shiftInfluence(state, action.territoryId, familyId, expandGain(state, familyId));
      f.heat = Math.min(100, f.heat + BALANCE.expandHeat);
      for (const [victim, amount] of Object.entries(losses)) {
        if (victim === LOCALS || amount <= 0) continue;
        changeRelation(state, familyId, victim, -Math.round(6 + amount / 2));
      }
      updateOwner(state, action.territoryId, rng);
      break;
    }
    case 'consolidate':
      shiftInfluence(state, action.territoryId, familyId, BALANCE.consolidateGain);
      updateOwner(state, action.territoryId, rng);
      break;
    case 'takeSlot': {
      const id = action.racketId;
      if (action.from) {
        const victim = state.families[action.from];
        victim.rackets[id] = racketSlots(state, action.from, id) - 1;
        changeRelation(state, familyId, action.from, -BALANCE.stealRelation);
        if (f.isPlayer || victim.isPlayer)
          news(state, 'economia', `${RACKETS[id].name}: ${f.name} ${f.plural ? 'strappano' : 'strappa'} affari ${di(victim)}`, familyId,
            'Uno slot del mercato cambia padrone. Chi lo ha perso non dimenticherà.');
      }
      f.rackets[id] = racketSlots(state, familyId, id) + 1;
      const perk = RACKETS[id].perks.find((p) => p.slots === f.rackets[id]);
      if (f.isPlayer && perk) news(state, 'organizzazione', `Nuovo vantaggio: ${perk.name}`, familyId, perk.description);
      break;
    }
    case 'attack': {
      const defender = state.territories[action.territoryId].owner!;
      startBattle(state, familyId, action.territoryId, action.soldiers);
      f.heat = Math.min(100, f.heat + BALANCE.attackHeat);
      changeRelation(state, familyId, defender, -BALANCE.attackRelation);
      break;
    }
    case 'reinforce': {
      const b = state.battles.find((x) => x.id === action.battleId)!;
      if (b.attacker === familyId) b.attackers += action.soldiers;
      else b.defenders += action.soldiers;
      break;
    }
    case 'retreat':
      endBattle(state, state.battles.find((x) => x.id === action.battleId)!, 'defender', rng);
      break;
    case 'releaseSlot':
      // Lasciare uno slot lo rimette sul mercato ma non restituisce l'investimento.
      f.rackets[action.racketId] = racketSlots(state, familyId, action.racketId) - 1;
      break;
    case 'recruit':
      f.members += BALANCE.recruitAmount;
      break;
    case 'hireLieutenant': {
      const c = state.candidates.find((x) => x.id === action.candidateId)!;
      state.candidates = state.candidates.filter((x) => x.id !== c.id);
      f.lieutenants.push({ ...c, joinedWeek: state.week });
      break;
    }
    case 'dismissLieutenant':
      // Gli altri vice ne prendono nota.
      f.lieutenants = f.lieutenants.filter((x) => x.id !== action.lieutenantId);
      shakeLoyalty(f, BALANCE.dismissLoyaltyHit);
      break;
    case 'rewardLieutenant': {
      const l = f.lieutenants.find((x) => x.id === action.lieutenantId)!;
      l.loyalty = Math.min(100, l.loyalty + BALANCE.rewardLoyalty);
      break;
    }
    case 'assignLieutenant':
      f.lieutenants.find((x) => x.id === action.lieutenantId)!.assignment = action.assignment;
      break;
    case 'lowProfile':
      f.heat = Math.max(0, f.heat - BALANCE.lowProfileHeat);
      f.lowProfileUses += 1;
      break;
    case 'respect': {
      changeRelation(state, familyId, action.targetId, BALANCE.respectGain);
      if (f.isPlayer || state.families[action.targetId].isPlayer) {
        const target = state.families[action.targetId];
        news(state, 'diplomazia', `Segnali distensivi tra ${mid(f)} e ${mid(target)}`, familyId);
      }
      break;
    }
  }

  f.money -= cost;
  if (f.isPlayer) state.pendingSetup += cost;
  return { ok: true };
}

/** API per la UI: applica un'azione del giocatore su una copia dello stato. */
export function perform(state: GameState, action: GameAction): { state: GameState; result: ActionResult } {
  const next = structuredClone(state);
  const rng = new Rng(next.rngState);
  const result = applyAction(next, next.playerId, action, rng);
  if (!result.ok) return { state, result };
  next.rngState = rng.state;
  return { state: next, result };
}
