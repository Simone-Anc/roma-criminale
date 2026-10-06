// IA delle famiglie rivali: semplice, basata su punteggi e personalità (aggressività).
import { ACTIVITIES } from '../data/activities';
import { ZONES as TERRITORIES, ZONE_LIST as TERRITORY_LIST } from '../data/zones';
import { applyAction, validateAction } from './actions';
import {
  activeActivityCount,
  activityHeat,
  activitySlots,
  activityYield,
  control,
  expandCost,
  ownedTerritories,
} from './queries';
import type { Rng } from './rng';
import { LOCALS, type FamilyId, type GameAction, type GameState } from './types';

const AI_ACTIONS_PER_TURN = 2;
const CASH_RESERVE = 40;

export function runAi(state: GameState, id: FamilyId, rng: Rng): void {
  if (!state.families[id].alive) return;
  manageActivities(state, id, rng);
  for (let i = 0; i < AI_ACTIONS_PER_TURN; i++) {
    const action = chooseAction(state, id, rng);
    if (!action) break;
    applyAction(state, id, action, rng);
  }
}

function manageActivities(state: GameState, id: FamilyId, rng: Rng): void {
  const f = state.families[id];
  const owned = ownedTerritories(state, id);

  // Troppa esposizione: chiude l'attività più rumorosa.
  if (f.heat > 70) {
    let worst: { t: string; a: keyof typeof ACTIVITIES; h: number } | null = null;
    for (const t of owned)
      for (const a of t.activities) {
        const h = activityHeat(t.id, a);
        if (!worst || h > worst.h) worst = { t: t.id, a, h };
      }
    if (worst) applyAction(state, id, { type: 'toggleActivity', territoryId: worst.t, activityId: worst.a }, rng);
    return;
  }

  // Apre le attività più convenienti finché ha membri e denaro.
  for (;;) {
    if (activeActivityCount(state, id) >= activitySlots(f)) return;
    const options: { action: GameAction; score: number }[] = [];
    for (const t of owned) {
      for (const a of TERRITORIES[t.id].activities) {
        const action: GameAction = { type: 'toggleActivity', territoryId: t.id, activityId: a };
        if (t.activities.includes(a) || !validateAction(state, id, action).ok) continue;
        if (f.money - ACTIVITIES[a].cost < CASH_RESERVE) continue;
        const heat = activityHeat(t.id, a);
        if (f.heat > 50 && heat > 2) continue;
        options.push({ action, score: activityYield(state, id, t.id, a) - heat * (f.heat / 25) });
      }
    }
    if (options.length === 0) return;
    options.sort((x, y) => y.score - x.score);
    applyAction(state, id, options[0].action, rng);
  }
}

function chooseAction(state: GameState, id: FamilyId, rng: Rng): GameAction | null {
  const f = state.families[id];
  if (f.money < 25) return null;

  // 1. Difesa: un rivale sta erodendo un territorio controllato.
  for (const t of ownedTerritories(state, id)) {
    const mine = control(state, t.id, id);
    const threat = Object.entries(t.influence).some(
      ([other, v]) => other !== id && other !== LOCALS && v >= mine - 20,
    );
    if (threat && mine < 80) return { type: 'consolidate', territoryId: t.id };
  }

  // 2. Esposizione troppo alta.
  if (f.heat > 65 && rng.chance(0.6)) return { type: 'lowProfile' };

  // 3. Personale insufficiente per crescere.
  if (activeActivityCount(state, id) >= activitySlots(f) && f.money > 90) return { type: 'recruit' };

  // 4. Espansione.
  if (rng.chance(0.35 + f.aggression * 0.6)) {
    let best: { tid: string; score: number } | null = null;
    for (const def of TERRITORY_LIST) {
      const t = state.territories[def.id];
      if (t.owner === id || !validateAction(state, id, { type: 'expand', territoryId: def.id }).ok) continue;
      if (f.money < expandCost(def.id) + 20) continue;
      let score = def.wealth * 2 - def.lawPresence * 0.5 + rng.next() * 4 + control(state, def.id, id) / 8;
      if (t.owner === null) {
        score += 4;
      } else {
        const owner = state.families[t.owner];
        score -= 9 - f.aggression * 8;
        score -= (f.relations[t.owner] ?? 0) / 15;
        score -= (control(state, def.id, t.owner) - 50) / 10;
        if (owner.isPlayer) score += f.aggression * 2;
      }
      if (!best || score > best.score) best = { tid: def.id, score };
    }
    if (best && best.score > 2) return { type: 'expand', territoryId: best.tid };
  }

  // 5. Consolidamento dei territori deboli.
  const weak = ownedTerritories(state, id)
    .filter((t) => control(state, t.id, id) < 60)
    .sort((a, b) => control(state, a.id, id) - control(state, b.id, id))[0];
  if (weak && rng.chance(0.6)) return { type: 'consolidate', territoryId: weak.id };

  // 6. Diplomazia per le famiglie prudenti.
  if (f.aggression < 0.5) {
    const enemy = Object.entries(f.relations).find(
      ([other, v]) => v < -40 && state.families[other].alive,
    );
    if (enemy && rng.chance(0.3)) return { type: 'respect', targetId: enemy[0] };
  }
  return null;
}
