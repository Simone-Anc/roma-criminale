// IA delle famiglie rivali: semplice, basata su punteggi e personalità (aggressività).
import { RACKETS, RACKET_LIST } from '../data/rackets';
import { ZONE_LIST as TERRITORY_LIST } from '../data/zones';
import { applyAction, validateAction } from './actions';
import { BALANCE } from './balance';
import { freeSoldiers, spaccioAt } from './organization';
import { attackForce, attackShare, defenseForce, garrison } from './war';
import { control, expandCost, forecast, ownedTerritories, recruitCost, zoneDistance } from './queries';
import { freeSlots, racketHeat, racketIncome, racketSlots, slotCost, slotHolders } from './rackets';
import type { Rng } from './rng';
import { LOCALS, type Assignment, type FamilyId, type GameAction, type GameState, type RacketId } from './types';

/** Nessun limite di azioni: l'IA agisce finché ha soldi e buone mosse, con un tetto di sicurezza. */
const AI_MAX_ACTIONS = 6;
/** Settimane di stipendi che l'IA tiene sempre in cassa. */
const RESERVE_WEEKS = 4;
const CASH_RESERVE = 40;
/** Uno slot conviene se si ripaga entro queste settimane (di più con molta cassa). */
const MAX_PAYBACK_WEEKS = 16;
const PAYBACK_PER_CASH = 1 / 40;
/** Valore indicativo (k€/sett.) di un vantaggio sbloccato. */
const PERK_VALUE = 3;

export function runAi(state: GameState, id: FamilyId, rng: Rng): void {
  if (!state.families[id].alive) return;
  coolDown(state, id, rng);
  organize(state, id, rng);
  warPlanning(state, id, rng);
  // Si ferma quando in cassa restano poche settimane di stipendi: meglio non finire in rosso.
  const f = state.families[id];
  const reserve = Math.max(CASH_RESERVE, forecast(state, id).upkeep * RESERVE_WEEKS);
  for (let i = 0; i < AI_MAX_ACTIONS && f.money > reserve; i++) {
    const action = chooseAction(state, id, rng);
    if (!action) break;
    applyAction(state, id, action, rng);
  }
}

/**
 * Guerra: rinforzi dove si difende male, ritirata dove si attacca male, e al massimo un
 * nuovo assalto alla volta, solo con un netto vantaggio di forza.
 */
function warPlanning(state: GameState, id: FamilyId, rng: Rng): void {
  const f = state.families[id];
  // In difesa si reagisce subito: appena il fronte non è più a favore, si manda quasi tutto.
  for (const b of state.battles.filter((x) => x.defender === id && x.front >= 50)) {
    const soldiers = Math.floor(freeSoldiers(state, id) * 0.8);
    if (soldiers > 0) applyAction(state, id, { type: 'reinforce', battleId: b.id, soldiers }, rng);
  }
  for (const b of state.battles.filter((x) => x.attacker === id && (x.front <= 25 || x.attackers <= 1)))
    applyAction(state, id, { type: 'retreat', battleId: b.id }, rng);

  // Regole solo dell'IA: attacca spesso, e sempre più spesso col passare delle settimane.
  const ongoing = state.battles.filter((b) => b.attacker === id).length;
  if (ongoing >= (f.members >= BALANCE.aiBigArmy ? 2 : 1)) return;
  const chance = BALANCE.aiAttackChanceBase + f.aggression * BALANCE.aiAttackChanceAggression + BALANCE.aiAttackChancePerWeek * state.week;
  if (!rng.chance(chance)) return;
  const free = freeSoldiers(state, id);
  if (free < 3) return;
  const soldiers = Math.ceil(free * 0.7);
  if (f.money < soldiers * BALANCE.attackCostPerSoldier + CASH_RESERVE) return;
  let best: { tid: string; score: number } | null = null;
  for (const def of TERRITORY_LIST) {
    const owner = state.territories[def.id].owner;
    if (!owner || owner === id || zoneDistance(state, id, def.id) > 1) continue;
    if (!validateAction(state, id, { type: 'attack', territoryId: def.id, soldiers }).ok) continue;
    const share = attackShare(
      attackForce(state, id, def.id, soldiers),
      defenseForce(state, owner, def.id, garrison(state, owner)),
    );
    if (share < BALANCE.aiAttackShare) continue;
    const score = share + def.wealth / 20 - (f.relations[owner] ?? 0) / 200 + (state.families[owner].isPlayer ? f.aggression * 0.05 : 0);
    if (!best || score > best.score) best = { tid: def.id, score };
  }
  if (best) applyAction(state, id, { type: 'attack', territoryId: best.tid, soldiers }, rng);
}

/** Troppa esposizione: lascia uno slot del ramo che genera più rischio (non costa azioni). */
function coolDown(state: GameState, id: FamilyId, rng: Rng): void {
  if (state.families[id].heat <= 70) return;
  const worst = RACKET_LIST.map((r) => ({ id: r.id, heat: racketHeat(state, id, r.id) }))
    .filter((r) => r.heat > 0)
    .sort((a, b) => b.heat - a.heat)[0];
  if (worst) applyAction(state, id, { type: 'releaseSlot', racketId: worst.id }, rng);
}

/** Soldati che conviene avere: pochi all'inizio, di più man mano che si domina. */
function wantedMembers(state: GameState, id: FamilyId): number {
  return 6 + ownedTerritories(state, id).length * 2;
}

/**
 * Riorganizzazione gratuita, ogni settimana: i vice vanno allo spaccio nei quartieri
 * dominati che ne sono senza, e a reclutare solo finché l'organizzazione è piccola.
 */
function organize(state: GameState, id: FamilyId, rng: Rng): void {
  const f = state.families[id];
  const owned = ownedTerritories(state, id);
  for (const l of f.lieutenants) {
    const job = l.assignment;
    const keep =
      (job?.type === 'spaccio' && state.territories[job.territoryId].owner === id) ||
      (job?.type === 'reclutare' && f.members < wantedMembers(state, id));
    if (keep) continue;
    const zone = owned.find((t) => !spaccioAt(f, t.id));
    const assignment: Assignment | null = zone
      ? { type: 'spaccio', territoryId: zone.id }
      : f.members < wantedMembers(state, id) ? { type: 'reclutare' } : null;
    applyAction(state, id, { type: 'assignLieutenant', lieutenantId: l.id, assignment }, rng);
  }
}

/**
 * Valore settimanale di uno slot in più (strappato a `from`, se indicato): entrate,
 * compreso il premio di maggioranza, rischio pesato dall'esposizione, vantaggi.
 */
function slotValue(state: GameState, id: FamilyId, racketId: RacketId, from?: FamilyId): number {
  const f = state.families[id];
  const before = { income: racketIncome(state, id, racketId), heat: racketHeat(state, id, racketId) };
  const mine = racketSlots(state, id, racketId);
  const theirs = from ? racketSlots(state, from, racketId) : 0;
  // Prova su una copia di lavoro, poi si ripristina.
  f.rackets[racketId] = mine + 1;
  if (from) state.families[from].rackets[racketId] = theirs - 1;
  const income = racketIncome(state, id, racketId) - before.income;
  const heat = racketHeat(state, id, racketId) - before.heat;
  f.rackets[racketId] = mine;
  if (from) state.families[from].rackets[racketId] = theirs;
  const perk = RACKETS[racketId].perks.some((p) => p.slots === mine + 1) ? PERK_VALUE : 0;
  return income - heat * (0.2 + f.heat / 40) + perk;
}

function bestSlot(state: GameState, id: FamilyId): { action: GameAction; payback: number } | null {
  const f = state.families[id];
  let best: { action: GameAction; payback: number } | null = null;
  for (const r of RACKET_LIST) {
    // Slot libero se c'è; altrimenti lo si strappa a chi ne ha di più (meglio se ci si odia già).
    const victim = freeSlots(state, r.id) > 0
      ? undefined
      : slotHolders(state, r.id)
        .filter((h) => h.familyId !== id)
        .sort((a, b) => b.slots - a.slots || (f.relations[a.familyId] ?? 0) - (f.relations[b.familyId] ?? 0))[0]?.familyId;
    const action: GameAction = { type: 'takeSlot', racketId: r.id, from: victim };
    if (!validateAction(state, id, action).ok) continue;
    const cost = slotCost(state, id, r.id, !!victim);
    if (f.money - cost < CASH_RESERVE) continue;
    const value = slotValue(state, id, r.id, victim);
    if (value <= 0) continue;
    // Strappare crea nemici: serve un ritorno più rapido, meno per chi è aggressivo.
    const payback = (cost / value) * (victim ? 1.5 - f.aggression * 0.5 : 1);
    if (!best || payback < best.payback) best = { action, payback };
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

  // 2b. I soldati rendono in strada e servono in guerra: recluta finché ne servono.
  if (f.members < wantedMembers(state, id) && f.money > recruitCost(state, id) + CASH_RESERVE) return { type: 'recruit' };

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
    const best = bestSlot(state, id);
    if (best) return best.action;
  }

  // 6. Espansione.
  if (rng.chance(0.35 + f.aggression * 0.6)) {
    let best: { tid: string; score: number } | null = null;
    for (const def of TERRITORY_LIST) {
      const t = state.territories[def.id];
      if (t.owner === id || !validateAction(state, id, { type: 'expand', territoryId: def.id }).ok) continue;
      if (f.money < expandCost(state, id, def.id) + 20) continue;
      // Solo quartieri neutrali (quelli degli altri si prendono con gli assalti).
      let score = def.wealth * 2 - def.lawPresence * 0.5 + rng.next() * 4 + control(state, def.id, id) / 8 + 4;
      score -= Math.max(0, zoneDistance(state, id, def.id) - 1) * 3; // lontano costa di più
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
