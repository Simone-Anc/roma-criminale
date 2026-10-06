// Azioni disponibili alle famiglie. Le stesse regole valgono per giocatore e IA.
import { ACTIVITIES } from '../data/activities';
import { ZONES as TERRITORIES } from '../data/zones';
import { BALANCE } from './balance';
import { mid, news } from './news';
import {
  activeActivityCount,
  activitySlots,
  canReach,
  control,
  expandCost,
  expandGain,
} from './queries';
import { Rng } from './rng';
import { shiftInfluence, updateOwner } from './territory';
import { LOCALS, type ActionResult, type FamilyId, type GameAction, type GameState } from './types';

/** Le azioni che consumano un'azione della settimana. */
export function costsAction(action: GameAction): boolean {
  return action.type !== 'toggleActivity';
}

export function actionCost(action: GameAction): number {
  switch (action.type) {
    case 'expand':
      return expandCost(action.territoryId);
    case 'consolidate':
      return BALANCE.consolidateCost;
    case 'recruit':
      return BALANCE.recruitCost;
    case 'lowProfile':
      return BALANCE.lowProfileCost;
    case 'respect':
      return BALANCE.respectCost;
    case 'toggleActivity':
      return ACTIVITIES[action.activityId].cost;
  }
}

export function validateAction(state: GameState, familyId: FamilyId, action: GameAction): ActionResult {
  const f = state.families[familyId];
  if (state.status !== 'playing') return { ok: false, reason: 'La partita è conclusa.' };
  if (f.isPlayer && costsAction(action) && state.actionsLeft <= 0)
    return { ok: false, reason: 'Nessuna azione rimasta questa settimana.' };

  switch (action.type) {
    case 'expand': {
      const t = state.territories[action.territoryId];
      if (t.owner === familyId && control(state, t.id, familyId) >= 95)
        return { ok: false, reason: 'Controllo già totale.' };
      if (t.owner && t.owner !== familyId && state.week <= BALANCE.truceWeeks)
        return { ok: false, reason: `Tregua iniziale: nessun attacco fino alla settimana ${BALANCE.truceWeeks + 1}.` };
      if (!canReach(state, familyId, action.territoryId))
        return { ok: false, reason: 'Zona non confinante con le tue.' };
      if (f.money < expandCost(action.territoryId)) return { ok: false, reason: 'Denaro insufficiente.' };
      return { ok: true };
    }
    case 'consolidate': {
      const t = state.territories[action.territoryId];
      if (t.owner !== familyId) return { ok: false, reason: 'Non sei l\'organizzazione dominante qui.' };
      if (control(state, t.id, familyId) >= 100) return { ok: false, reason: 'Controllo già totale.' };
      if (f.money < BALANCE.consolidateCost) return { ok: false, reason: 'Denaro insufficiente.' };
      return { ok: true };
    }
    case 'toggleActivity': {
      const t = state.territories[action.territoryId];
      if (t.activities.includes(action.activityId)) return { ok: true }; // disattivare è sempre possibile
      const act = ACTIVITIES[action.activityId];
      if (t.owner !== familyId) return { ok: false, reason: 'Non sei l\'organizzazione dominante qui.' };
      if (!TERRITORIES[t.id].activities.includes(action.activityId))
        return { ok: false, reason: 'Attività non disponibile qui.' };
      if (control(state, t.id, familyId) < act.minControl)
        return { ok: false, reason: `Serve un controllo di almeno ${act.minControl}.` };
      if (t.activities.length >= BALANCE.maxActivitiesPerTerritory)
        return { ok: false, reason: 'Troppe attività in questa zona.' };
      if (activeActivityCount(state, familyId) >= activitySlots(f))
        return { ok: false, reason: 'Membri insufficienti: recluta per gestire altre attività.' };
      if (f.money < act.cost) return { ok: false, reason: 'Denaro insufficiente.' };
      return { ok: true };
    }
    case 'recruit':
      if (f.money < BALANCE.recruitCost) return { ok: false, reason: 'Denaro insufficiente.' };
      return { ok: true };
    case 'lowProfile':
      if (f.money < BALANCE.lowProfileCost) return { ok: false, reason: 'Denaro insufficiente.' };
      if (f.heat <= 0) return { ok: false, reason: 'Esposizione già nulla.' };
      return { ok: true };
    case 'respect': {
      const target = state.families[action.targetId];
      if (!target?.alive) return { ok: false, reason: 'Organizzazione non più attiva.' };
      if (f.money < BALANCE.respectCost) return { ok: false, reason: 'Denaro insufficiente.' };
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
  const cost = actionCost(action);

  switch (action.type) {
    case 'expand': {
      const losses = shiftInfluence(state, action.territoryId, familyId, expandGain(f));
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
    case 'toggleActivity': {
      const t = state.territories[action.territoryId];
      if (t.activities.includes(action.activityId)) {
        // Disattivare è gratuito ma non restituisce l'investimento iniziale.
        t.activities = t.activities.filter((a) => a !== action.activityId);
        return { ok: true };
      }
      t.activities.push(action.activityId);
      break;
    }
    case 'recruit':
      f.members += BALANCE.recruitAmount;
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
