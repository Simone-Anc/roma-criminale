// IA delle famiglie rivali: semplice, basata su punteggi e personalità (aggressività).
import { RACKETS, RACKET_LIST } from '../data/rackets';
import { ZONE_LIST as TERRITORY_LIST } from '../data/zones';
import { applyAction, validateAction } from './actions';
import { BALANCE } from './balance';
import { chiefOfArea, directSoldiers, squadCapacity, wantedSoldiers } from './organization';
import { control, expandCost, ownedTerritories, recruitCost } from './queries';
import { membersBusy, racketHeat, racketIncome, racketLevel, upgradeCost } from './rackets';
import type { Rng } from './rng';
import { LOCALS, type FamilyId, type GameAction, type GameState, type RacketId } from './types';

const AI_ACTIONS_PER_TURN = 2;
const CASH_RESERVE = 40;
/** Un potenziamento conviene se si ripaga entro queste settimane (di più con molta cassa). */
const MAX_PAYBACK_WEEKS = 16;
const PAYBACK_PER_CASH = 1 / 40;
/** Valore indicativo (k€/sett.) di un vantaggio sbloccato. */
const PERK_VALUE = 3;

export function runAi(state: GameState, id: FamilyId, rng: Rng): void {
  if (!state.families[id].alive) return;
  coolDown(state, id, rng);
  organize(state, id, rng);
  for (let i = 0; i < AI_ACTIONS_PER_TURN; i++) {
    const action = chooseAction(state, id, rng);
    if (!action) break;
    applyAction(state, id, action, rng);
  }
}

/** Troppa esposizione: riduce il ramo che genera più rischio (non costa azioni). */
function coolDown(state: GameState, id: FamilyId, rng: Rng): void {
  if (state.families[id].heat <= 70) return;
  const worst = RACKET_LIST.map((r) => ({ id: r.id, heat: racketHeat(state, id, r.id) }))
    .filter((r) => r.heat > 0)
    .sort((a, b) => b.heat - a.heat)[0];
  if (worst) applyAction(state, id, { type: 'downgradeRacket', racketId: worst.id }, rng);
}

/** Riorganizzazione gratuita: incarichi alle aree scoperte, soldati liberi ai vice. */
function organize(state: GameState, id: FamilyId, rng: Rng): void {
  const f = state.families[id];
  for (const l of f.lieutenants) {
    if (l.assignment) continue;
    const area = ownedTerritories(state, id).map((t) => TERRITORY_LIST.find((z) => z.id === t.id)!.area)
      .find((a) => !chiefOfArea(f, a));
    if (area) applyAction(state, id, { type: 'assignLieutenant', lieutenantId: l.id, assignment: { type: 'area', area } }, rng);
  }
  // Prima chi ha fame di soldati (ambizione), poi gli altri fino alla capienza.
  const byNeed = [...f.lieutenants].sort((a, b) => (wantedSoldiers(b) - b.soldiers) - (wantedSoldiers(a) - a.soldiers));
  for (const l of byNeed)
    while (directSoldiers(f) > 0 && l.soldiers < squadCapacity(l))
      applyAction(state, id, { type: 'moveSoldiers', lieutenantId: l.id, delta: 1 }, rng);
}

/** Valore settimanale di un livello in più: entrate, rischio pesato dall'esposizione, vantaggi. */
function upgradeValue(state: GameState, id: FamilyId, racketId: RacketId): number {
  const f = state.families[id];
  const before = { income: racketIncome(state, id, racketId), heat: racketHeat(state, id, racketId) };
  const level = racketLevel(state, id, racketId);
  f.rackets[racketId] = level + 1; // prova su una copia di lavoro, poi si ripristina
  const income = racketIncome(state, id, racketId) - before.income;
  const heat = racketHeat(state, id, racketId) - before.heat;
  f.rackets[racketId] = level;
  const perk = RACKETS[racketId].perks.some((p) => p.level === level + 1) ? PERK_VALUE : 0;
  return income - heat * (0.3 + f.heat / 25) + perk;
}

function bestUpgrade(state: GameState, id: FamilyId): { racketId: RacketId; payback: number } | null {
  const f = state.families[id];
  let best: { racketId: RacketId; payback: number } | null = null;
  for (const r of RACKET_LIST) {
    if (!validateAction(state, id, { type: 'upgradeRacket', racketId: r.id }).ok) continue;
    const cost = upgradeCost(state, id, r.id);
    if (f.money - cost < CASH_RESERVE) continue;
    const value = upgradeValue(state, id, r.id);
    if (value <= 0) continue;
    const payback = cost / value;
    if (!best || payback < best.payback) best = { racketId: r.id, payback };
  }
  return best && best.payback <= MAX_PAYBACK_WEEKS + f.money * PAYBACK_PER_CASH ? best : null;
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

  // 2. Un vice capo vacilla: meglio ricompensarlo prima che se ne vada.
  const shaky = f.lieutenants.find((l) => l.loyalty < BALANCE.loyaltyWarn - 5);
  if (shaky && f.money > BALANCE.rewardCost + CASH_RESERVE) return { type: 'rewardLieutenant', lieutenantId: shaky.id };

  // 3. Esposizione troppo alta.
  if (f.heat > 65 && rng.chance(0.6)) return { type: 'lowProfile' };

  // 4. Slot da vice libero: assume il candidato più forte.
  if (f.isPlayer && state.candidates.length && f.money > BALANCE.hireCost + 80) {
    const best = [...state.candidates].sort((a, b) => b.skills.forza + b.loyalty - (a.skills.forza + a.loyalty))[0];
    if (validateAction(state, id, { type: 'hireLieutenant', candidateId: best.id }).ok)
      return { type: 'hireLieutenant', candidateId: best.id };
  }

  // 5. Affari: le organizzazioni prudenti investono più spesso di quelle aggressive.
  if (rng.chance(0.85 - f.aggression * 0.4)) {
    const best = bestUpgrade(state, id);
    if (best) return { type: 'upgradeRacket', racketId: best.racketId };
    // Tutti i membri impegnati: recluta per poter crescere.
    if (membersBusy(state, id) >= f.members && f.money > recruitCost(state, id) + 70) return { type: 'recruit' };
  }

  // 6. Espansione.
  if (rng.chance(0.35 + f.aggression * 0.6)) {
    let best: { tid: string; score: number } | null = null;
    for (const def of TERRITORY_LIST) {
      const t = state.territories[def.id];
      if (t.owner === id || !validateAction(state, id, { type: 'expand', territoryId: def.id }).ok) continue;
      if (f.money < expandCost(state, id, def.id) + 20) continue;
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

  // 7. Consolidamento dei territori deboli.
  const weak = ownedTerritories(state, id)
    .filter((t) => control(state, t.id, id) < 60)
    .sort((a, b) => control(state, a.id, id) - control(state, b.id, id))[0];
  if (weak && rng.chance(0.6)) return { type: 'consolidate', territoryId: weak.id };

  // 8. Diplomazia per le famiglie prudenti.
  if (f.aggression < 0.5) {
    const enemy = Object.entries(f.relations).find(
      ([other, v]) => v < -40 && state.families[other].alive,
    );
    if (enemy && rng.chance(0.3)) return { type: 'respect', targetId: enemy[0] };
  }
  return null;
}
