// Regole sul controllo dei quartieri (influenza a somma 100).
import { ZONES } from '../data/zones';
import { BALANCE } from './balance';
import { mid, news, v } from './news';
import { spaccioDefense } from './organization';
import { bonuses } from './rackets';
import type { Rng } from './rng';
import { LOCALS, type FamilyId, type GameState, type TerritoryId } from './types';

/**
 * Sposta `amount` punti di influenza verso `familyId`. Prima assorbe i gruppi
 * locali, poi erode l'organizzazione più forte: contro un'organizzazione ogni
 * punto costa il doppio, perché chi difende è avvantaggiato (e ancora di più se
 * ha il vantaggio "difesa").
 */
export function shiftInfluence(
  state: GameState,
  territoryId: TerritoryId,
  familyId: FamilyId,
  amount: number,
): Record<string, number> {
  const inf = state.territories[territoryId].influence;
  const losses: Record<string, number> = {};
  let remaining = amount;
  while (remaining > 0) {
    const holders = Object.entries(inf)
      .filter(([id, val]) => id !== familyId && val > 0)
      .sort((a, b) => (a[0] === LOCALS ? -1 : b[0] === LOCALS ? 1 : b[1] - a[1]));
    if (holders.length === 0) break;
    const [id, val] = holders[0];
    const defense = id === LOCALS ? 0 : bonuses(state, id).defense + spaccioDefense(state, id, territoryId);
    const rate = id === LOCALS ? 1 : 0.5 / (1 + defense / 100);
    const take = Math.min(val, Math.max(1, Math.round(remaining * rate)));
    remaining -= take / rate;
    inf[id] = val - take;
    if (inf[id] === 0 && id !== LOCALS) delete inf[id];
    inf[familyId] = (inf[familyId] ?? 0) + take;
    losses[id] = (losses[id] ?? 0) + take;
  }
  return losses;
}

/** Ricalcola l'organizzazione dominante e genera le notizie dei passaggi di mano. */
export function updateOwner(state: GameState, territoryId: TerritoryId, rng: Rng): void {
  const t = state.territories[territoryId];
  const zone = ZONES[territoryId];
  // I gruppi locali non sono un'organizzazione: domina chi ha più influenza tra le organizzazioni.
  const entries = Object.entries(t.influence)
    .filter(([id]) => id !== LOCALS)
    .sort((a, b) => b[1] - a[1]);
  let newOwner: FamilyId | null = null;
  if (entries.length > 0) {
    const [topId, topValue] = entries[0];
    if (topValue >= BALANCE.ownershipThreshold && topValue > (entries[1]?.[1] ?? 0)) newOwner = topId;
  }
  if (newOwner === t.owner) return;

  const oldOwner = t.owner;
  t.owner = newOwner;

  if (newOwner) {
    const f = state.families[newOwner];
    f.reputation = Math.min(100, f.reputation + 4);
    if (oldOwner) {
      const old = state.families[oldOwner];
      old.reputation = Math.max(0, old.reputation - 4);
      news(state, 'territorio', rng.pick([
        `${zone.name}, cambia la mappa del potere: ${f.name} ${v(f, 'scalza', 'scalzano')} ${mid(old)}`,
        `${zone.name}, passaggio di mano: ora ${v(f, 'comanda', 'comandano')} ${mid(f)}`,
      ]), newOwner, 'Gli equilibri del quartiere sono cambiati. Gli investigatori seguono la vicenda.');
    } else {
      news(state, 'territorio', rng.pick([
        `${zone.name}: ${f.name} ${v(f, 'diventa', 'diventano')} la presenza dominante`,
        `${zone.name}, nuovi padroni: ${f.name} ${v(f, 'allunga', 'allungano')} le mani sul quartiere`,
      ]), newOwner);
    }
  } else if (oldOwner) {
    const old = state.families[oldOwner];
    news(state, 'territorio', `${zone.name} senza padrone: ${old.name} ${v(old, 'perde', 'perdono')} la presa`, oldOwner);
  }
}
