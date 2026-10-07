// Azioni disponibili alle famiglie. Le stesse regole valgono per giocatore e IA.
import { RACKETS } from '../data/rackets';
import { AREAS } from '../data/zones';
import { shakeLoyalty } from './loyalty';
import { chiefOfArea, directSoldiers, fullName, lieutenantSlots, squadCapacity } from './organization';
import { BALANCE } from './balance';
import { mid, news } from './news';
import { canReach, control, expandCost, expandGain, recruitCost } from './queries';
import { effectiveLevel, membersBusy, racketCap, racketLevel, upgradeCost } from './rackets';
import { Rng } from './rng';
import { shiftInfluence, updateOwner } from './territory';
import { LOCALS, type ActionResult, type FamilyId, type GameAction, type GameState } from './types';

/** Azioni gratuite: riorganizzare non consuma la settimana. */
const FREE_ACTIONS: GameAction['type'][] = ['downgradeRacket', 'assignLieutenant', 'moveSoldiers'];

/** Le azioni che consumano un'azione della settimana. */
export function costsAction(action: GameAction): boolean {
  return !FREE_ACTIONS.includes(action.type);
}

export function actionCost(state: GameState, familyId: FamilyId, action: GameAction): number {
  switch (action.type) {
    case 'expand':
      return expandCost(state, familyId, action.territoryId);
    case 'consolidate':
      return BALANCE.consolidateCost;
    case 'recruit':
      return recruitCost(state, familyId);
    case 'lowProfile':
      return BALANCE.lowProfileCost;
    case 'respect':
      return BALANCE.respectCost;
    case 'upgradeRacket':
      return upgradeCost(state, familyId, action.racketId);
    case 'hireLieutenant':
      return BALANCE.hireCost;
    case 'rewardLieutenant':
      return BALANCE.rewardCost;
    case 'downgradeRacket':
    case 'dismissLieutenant':
    case 'assignLieutenant':
    case 'moveSoldiers':
      return 0;
  }
}

export function validateAction(state: GameState, familyId: FamilyId, action: GameAction): ActionResult {
  const f = state.families[familyId];
  const cost = actionCost(state, familyId, action);
  if (state.status !== 'playing') return { ok: false, reason: 'La partita è conclusa.' };
  if (f.isPlayer && costsAction(action) && state.actionsLeft <= 0)
    return { ok: false, reason: 'Nessuna azione rimasta questa settimana.' };

  switch (action.type) {
    case 'expand': {
      const t = state.territories[action.territoryId];
      // Nei propri quartieri si usa "Rafforza": un'azione sola per ogni situazione.
      if (t.owner === familyId) return { ok: false, reason: 'Il quartiere è già tuo: rafforzalo.' };
      if (t.owner && t.owner !== familyId && state.week <= BALANCE.truceWeeks)
        return { ok: false, reason: `Tregua iniziale: nessun attacco fino alla settimana ${BALANCE.truceWeeks + 1}.` };
      if (!canReach(state, familyId, action.territoryId))
        return { ok: false, reason: 'Quartiere non confinante con i tuoi.' };
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
    case 'upgradeRacket': {
      const def = RACKETS[action.racketId];
      const level = racketLevel(state, familyId, action.racketId);
      if (level >= def.maxLevel) return { ok: false, reason: 'Livello massimo raggiunto.' };
      if (level >= racketCap(state, familyId, action.racketId))
        return {
          ok: false,
          reason: level === 0
            ? 'Serve un quartiere adatto a questo ramo.'
            : 'Rete troppo piccola: domina un altro quartiere adatto per crescere ancora.',
        };
      if (membersBusy(state, familyId) >= f.members)
        return { ok: false, reason: 'Tutti i membri sono già impegnati: recluta.' };
      if (f.money < cost) return { ok: false, reason: 'Denaro insufficiente.' };
      return { ok: true };
    }
    case 'downgradeRacket':
      if (racketLevel(state, familyId, action.racketId) <= 0) return { ok: false, reason: 'Ramo non avviato.' };
      return { ok: true };
    case 'hireLieutenant':
      if (!state.candidates.some((c) => c.id === action.candidateId)) return { ok: false, reason: 'Candidato non più disponibile.' };
      if (f.lieutenants.length >= lieutenantSlots(f))
        return { ok: false, reason: 'Nessuno slot libero: la reputazione ne sblocca altri.' };
      if (f.money < cost) return { ok: false, reason: 'Denaro insufficiente.' };
      return { ok: true };
    case 'dismissLieutenant':
    case 'rewardLieutenant':
    case 'assignLieutenant':
    case 'moveSoldiers': {
      const l = f.lieutenants.find((x) => x.id === action.lieutenantId);
      if (!l) return { ok: false, reason: 'Vice capo non trovato.' };
      if (action.type === 'rewardLieutenant') {
        if (l.loyalty >= 100) return { ok: false, reason: 'Lealtà già massima.' };
        if (f.money < cost) return { ok: false, reason: 'Denaro insufficiente.' };
      }
      if (action.type === 'assignLieutenant' && action.assignment) {
        const chief = chiefOfArea(f, action.assignment.area);
        if (chief && chief.id !== l.id)
          return { ok: false, reason: `${AREAS[action.assignment.area]} è già affidata a ${fullName(chief)}.` };
      }
      if (action.type === 'moveSoldiers') {
        if (action.delta > 0 && directSoldiers(f) < action.delta) return { ok: false, reason: 'Nessun soldato libero ai tuoi ordini.' };
        if (action.delta > 0 && l.soldiers + action.delta > squadCapacity(l))
          return { ok: false, reason: `Può comandare al massimo ${squadCapacity(l)} soldati.` };
        if (action.delta < 0 && l.soldiers + action.delta < 0) return { ok: false, reason: 'Non ha soldati da cedere.' };
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
    case 'upgradeRacket': {
      const id = action.racketId;
      f.rackets[id] = racketLevel(state, familyId, id) + 1;
      const perk = RACKETS[id].perks.find((p) => p.level === f.rackets[id]);
      if (f.isPlayer && perk && effectiveLevel(state, familyId, id) >= perk.level)
        news(state, 'organizzazione', `Nuovo vantaggio: ${perk.name}`, familyId, perk.description);
      break;
    }
    case 'downgradeRacket':
      // Ridurre un ramo libera un membro ma non restituisce l'investimento.
      f.rackets[action.racketId] = racketLevel(state, familyId, action.racketId) - 1;
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
      // I soldati tornano agli ordini del capo; gli altri vice ne prendono nota.
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
    case 'moveSoldiers':
      f.lieutenants.find((x) => x.id === action.lieutenantId)!.soldiers += action.delta;
      break;
    case 'lowProfile':
      f.heat = Math.max(0, f.heat - BALANCE.lowProfileHeat);
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
  if (f.isPlayer) {
    state.pendingSetup += cost;
    if (costsAction(action)) state.actionsLeft -= 1;
  }
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
