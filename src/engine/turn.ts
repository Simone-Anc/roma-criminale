// "Fine settimana": economia, IA, territori, pressione, fine partita.
// Ogni passo è una funzione separata, così i sistemi futuri (Eventi, Polizia,
// Diplomazia, Guerra) si inseriscono come nuovi passi senza toccare gli altri.
import { ACTIVITIES } from '../data/activities';
import { ZONES_TO_WIN, ZONE_LIST } from '../data/zones';
import { runAi } from './ai';
import { BALANCE } from './balance';
import { mid, news, v } from './news';
import { control, forecast, ownedTerritories, power, totalInfluence } from './queries';
import { Rng } from './rng';
import { shiftInfluence, updateOwner } from './territory';
import type { Family, GameState, NewsItem, TerritoryId, TurnReport } from './types';

export function endTurn(prev: GameState): GameState {
  if (prev.status !== 'playing') return prev;
  const state = structuredClone(prev);
  const rng = new Rng(state.rngState);
  const marker = state.news[0] ?? null;
  const player = state.families[state.playerId];
  const heatBefore = player.heat;
  const controlBefore = snapshotControl(state);

  // 1. Economia
  const { income, upkeep } = economyStep(state);
  // 2. Le organizzazioni IA agiscono
  aiStep(state, rng);
  // 3. Le attività radicano l'influenza nelle zone
  territoryStep(state, rng);
  // 4. Eventi (versione 0.5) — 5. Pressione delle forze dell'ordine (prima bozza)
  for (const f of alive(state)) pressureStep(state, f, rng);
  // 6. Statistiche, relazioni, organizzazioni eliminate
  upkeepStep(state);

  const controlAfter = snapshotControl(state);
  const controlDelta: Record<TerritoryId, number> = {};
  for (const z of ZONE_LIST) {
    const d = controlAfter[z.id] - controlBefore[z.id];
    if (d !== 0) controlDelta[z.id] = d;
  }

  const report: TurnReport = {
    week: state.week,
    income,
    upkeep,
    setup: state.pendingSetup,
    heatBefore,
    heatAfter: player.heat,
    controlDelta,
    news: newsSince(state.news, marker),
  };

  // 7. Fine turno
  checkEnd(state);
  state.week += 1;
  state.actionsLeft = BALANCE.actionsPerTurn;
  state.pendingSetup = 0;
  state.lastReport = report;
  state.rngState = rng.state;
  return state;
}

function economyStep(state: GameState): { income: number; upkeep: number } {
  let income = 0;
  let upkeep = 0;
  for (const f of alive(state)) {
    const fc = forecast(state, f.id);
    f.money = round1(f.money + fc.net);
    f.heat = round1(Math.min(100, Math.max(0, f.heat + fc.heat)));
    if (f.isPlayer) ({ income, upkeep } = fc);
  }
  return { income, upkeep };
}

function aiStep(state: GameState, rng: Rng): void {
  const order = state.familyOrder.filter((id) => !state.families[id].isPlayer);
  for (let i = order.length - 1; i > 0; i--) {
    const j = rng.int(0, i);
    [order[i], order[j]] = [order[j], order[i]];
  }
  for (const id of order) runAi(state, id, rng);
}

function territoryStep(state: GameState, rng: Rng): void {
  for (const z of ZONE_LIST) {
    const t = state.territories[z.id];
    if (!t.owner) continue;
    const gain = t.activities.reduce((s, a) => s + ACTIVITIES[a].influence, 0);
    if (gain > 0) {
      shiftInfluence(state, z.id, t.owner, gain);
      updateOwner(state, z.id, rng);
    }
  }
}

function pressureStep(state: GameState, f: Family, rng: Rng): void {
  if (f.heat >= 60 && rng.chance((f.heat - 55) / 120)) {
    const seized = Math.max(10, Math.round(Math.max(0, f.money) * 0.12));
    f.money -= seized;
    news(state, 'polizia', `Sequestro di beni: nel mirino ${mid(f)}`, f.id,
      f.isPlayer ? `Bloccati circa ${seized}k €. Ridurre il rischio abbassa la probabilità di nuovi sequestri.` : undefined);
  }
  if (f.heat >= 85 && rng.chance(0.25)) {
    f.members = Math.max(1, f.members - 2);
    f.reputation = Math.max(0, f.reputation - 5);
    news(state, 'polizia', `${f.name}, operazione all'alba: scattano gli arresti`, f.id,
      f.isPlayer ? 'Due membri dell’organizzazione sono stati fermati.' : undefined);
  }
}

function upkeepStep(state: GameState): void {
  for (const f of alive(state)) {
    if (f.money < 0) {
      f.brokeWeeks += 1;
      f.members = Math.max(1, f.members - 1);
      if (f.isPlayer)
        news(state, 'economia', 'Casse vuote: un membro lascia l’organizzazione', f.id,
          `Settimane consecutive in rosso: ${f.brokeWeeks} su ${BALANCE.brokeWeeksToLose}.`);
    } else {
      f.brokeWeeks = 0;
    }
    for (const other of Object.keys(f.relations)) {
      const r = f.relations[other];
      f.relations[other] = r > 0 ? Math.max(0, r - BALANCE.relationDrift) : Math.min(0, r + BALANCE.relationDrift);
    }
    if (!f.isPlayer && ownedTerritories(state, f.id).length === 0 && totalInfluence(state, f.id) < 2) {
      f.alive = false;
      news(state, 'organizzazione', `Fine di un'epoca: ${f.name} ${v(f, 'esce', 'escono')} di scena`, f.id);
    }
  }
}

function checkEnd(state: GameState): void {
  const player = state.families[state.playerId];
  const owned = ownedTerritories(state, player.id).length;

  if (owned === 0) return end(state, 'lost', 'Hai perso tutte le zone: l’organizzazione si è dissolta.');
  if (player.brokeWeeks >= BALANCE.brokeWeeksToLose)
    return end(state, 'lost', 'Senza risorse: l’organizzazione è collassata.');
  if (owned >= ZONES_TO_WIN)
    return end(state, 'won', `Dominio territoriale: controlli ${owned} zone su ${ZONE_LIST.length}.`);
  if (player.money >= BALANCE.winMoney)
    return end(state, 'won', `Dominio economico: oltre ${BALANCE.winMoney / 1000} milione di euro in cassa.`);
  if (alive(state).every((f) => f.isPlayer))
    return end(state, 'won', 'Dominio criminale: nessuna organizzazione rivale è rimasta in piedi.');
  if (state.week >= BALANCE.maxWeeks) {
    const ranking = alive(state).sort((a, b) => power(state, b.id) - power(state, a.id));
    if (ranking[0].isPlayer) end(state, 'won', 'Sopravvivenza: due anni dopo, sei l’organizzazione più potente di Roma.');
    else end(state, 'lost', `Due anni dopo, ${mid(ranking[0])} ${v(ranking[0], 'resta', 'restano')} più potenti di te.`);
  }
}

function end(state: GameState, status: 'won' | 'lost', reason: string): void {
  state.status = status;
  state.endReason = reason;
}

function alive(state: GameState): Family[] {
  return state.familyOrder.map((id) => state.families[id]).filter((f) => f.alive);
}

function snapshotControl(state: GameState): Record<TerritoryId, number> {
  return Object.fromEntries(ZONE_LIST.map((z) => [z.id, control(state, z.id, state.playerId)]));
}

function newsSince(all: NewsItem[], marker: NewsItem | null): NewsItem[] {
  if (!marker) return [...all];
  const idx = all.indexOf(marker);
  return idx === -1 ? [...all] : all.slice(0, idx);
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
