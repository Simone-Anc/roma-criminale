// Passo settimanale della gerarchia: lealtà dei vice capi, scissioni, nuovi candidati.
// Per ora solo il giocatore ha vice capi; le organizzazioni rivali restano astratte.
import { ZONES, ZONE_LIST } from '../data/zones';
import { BALANCE } from './balance';
import { mid, news } from './news';
import { fullName, generateLieutenant } from './organization';
import { freeSlots } from './rackets';
import type { Rng } from './rng';
import { updateOwner } from './territory';
import { LOCALS, type Family, type FamilyId, type GameState, type Lieutenant, type TerritoryId } from './types';

// Colori delle scissioni: diversi da quelli delle organizzazioni iniziali.
const SPLIT_COLORS = ['#c96f6f', '#6fa8a0', '#a07ac9', '#c9b46f', '#7a9ac9', '#a8a8a8'];

/**
 * Variazione settimanale della lealtà. `lostZones` sono i quartieri persi dal
 * giocatore durante la settimana.
 */
function loyaltyDelta(state: GameState, f: Family, l: Lieutenant, lostZones: TerritoryId[], rng: Rng): number {
  let d = -l.ambition / BALANCE.ambitionDrag; // chi è ambizioso vuole sempre di più
  d += l.assignment ? 0.4 : -0.5; // con un incarico si sente importante, senza messo da parte
  if (f.money < 0) d -= 2; // non viene pagato
  if (f.heat > 70) d -= 0.5; // troppa esposizione: ha paura
  // Ha perso il quartiere dove lavorava.
  const job = l.assignment;
  if (job?.type === 'spaccio' && lostZones.includes(job.territoryId)) d -= 3;
  return d + (rng.next() - 0.5) * 2;
}

export function organizationStep(state: GameState, ownedBefore: Set<TerritoryId>, rng: Rng): void {
  const player = state.families[state.playerId];
  const lostZones = [...ownedBefore].filter((z) => state.territories[z].owner !== player.id);

  for (const l of [...player.lieutenants]) {
    const before = l.loyalty;
    l.loyalty = Math.max(0, Math.min(100, l.loyalty + loyaltyDelta(state, player, l, lostZones, rng)));
    const who = `${fullName(l)}, ${l.nickname}`;
    if (before >= BALANCE.loyaltyWarn && l.loyalty < BALANCE.loyaltyWarn)
      news(state, 'organizzazione', `Malumori nell'organizzazione: ${who} è insofferente`, player.id,
        'Un vice capo scontento chiede più spazio. Più soldati, un incarico o una ricompensa possono riportarlo dalla tua parte.');
    if (before >= BALANCE.loyaltySkim && l.loyalty < BALANCE.loyaltySkim)
      news(state, 'organizzazione', `Conti che non tornano: ${who} trattiene parte degli incassi`, player.id,
        'Se la sua lealtà scende ancora, potrebbe mettersi in proprio.');
    if (l.loyalty < BALANCE.loyaltySplit && rng.chance(BALANCE.splitChance)) splitOff(state, l, rng);
  }

  if (state.week % BALANCE.candidateRefreshWeeks === 0)
    state.candidates = Array.from({ length: BALANCE.candidateCount }, () => generateLieutenant(state, rng));
}

/** Tutti i vice perdono un po' di lealtà (arresti, licenziamenti...). */
export function shakeLoyalty(f: Family, amount: number): void {
  for (const l of f.lieutenants) l.loyalty = Math.max(0, l.loyalty - amount);
}

/**
 * Scissione: il vice se ne va con qualche soldato, una parte della cassa e gran parte
 * dell'influenza nel quartiere dove lavorava (mai la base del capo), e diventa
 * un'organizzazione rivale.
 */
export function splitOff(state: GameState, l: Lieutenant, rng: Rng): FamilyId {
  const player = state.families[state.playerId];
  const id = `scissione${state.nextId++}`;
  const job = l.assignment;
  const workplace = job?.type === 'spaccio' ? job.territoryId : null;
  const area = workplace ? ZONES[workplace].area : undefined;
  const zones = workplace && workplace !== player.home && state.territories[workplace].owner === player.id ? [workplace] : [];
  const soldiers = Math.min(BALANCE.splitSoldiers, Math.max(0, player.members - 1));
  // Senza quartieri da portarsi via, riparte dai suoi contatti in un quartiere libero vicino.
  const home = zones[0] ?? pickFreeZone(state, area, rng);
  const cash = Math.max(0, Math.round(player.money * BALANCE.splitCashShare));
  const used = new Set(Object.values(state.families).map((f) => f.color));
  const color = SPLIT_COLORS.find((c) => !used.has(c)) ?? rng.pick(SPLIT_COLORS);

  const relations: Record<FamilyId, number> = {};
  for (const other of Object.values(state.families)) {
    relations[other.id] = other.id === player.id ? -60 : 0;
    other.relations[id] = other.id === player.id ? -60 : 0;
  }
  state.families[id] = {
    id,
    name: `Gli uomini di ${fullName(l)}`,
    plural: true,
    color,
    home,
    startZones: [],
    specialization: ZONES[home].rackets[0],
    aggression: 0.7,
    trait: `Nati dalla scissione di ${l.nickname}, ex vice capo di ${mid(player)}. Conoscono i tuoi metodi.`,
    startMoney: cash,
    startMembers: soldiers + 1,
    startInfluence: 0,
    money: cash,
    members: soldiers + 1,
    reputation: 15,
    // Si porta via un posto negli affari, se il mercato ne ha ancora uno libero.
    rackets: freeSlots(state, ZONES[home].rackets[0]) > 0 ? { [ZONES[home].rackets[0]]: 1 } : {},
    heat: 20,
    lieutenants: [],
    relations,
    isPlayer: false,
    alive: true,
    brokeWeeks: 0,
    lowProfileUses: 0,
  };
  state.familyOrder.push(id);

  player.money -= cash;
  player.members -= soldiers;
  player.lieutenants = player.lieutenants.filter((x) => x.id !== l.id);

  news(state, 'organizzazione', `Scissione: ${fullName(l)}, ${l.nickname}, si mette in proprio`, id,
    `Se ne va con ${soldiers} soldati e ${Math.round(cash)}k €${zones.length ? `, e si prende ${zones.map((z) => ZONES[z].name).join(', ')}` : ''}.`);

  if (zones.length === 0) {
    const inf = state.territories[home].influence;
    const take = Math.min(inf[LOCALS] ?? 0, BALANCE.splitFreeInfluence);
    inf[LOCALS] = (inf[LOCALS] ?? 0) - take;
    inf[id] = take;
    updateOwner(state, home, rng);
  }
  // Si porta via due terzi della tua influenza e i suoi contatti tra i gruppi locali.
  for (const z of zones) {
    const inf = state.territories[z].influence;
    const take = Math.round(((inf[player.id] ?? 0) * 2) / 3);
    const contacts = Math.min(inf[LOCALS] ?? 0, BALANCE.splitLocalContacts);
    inf[player.id] -= take;
    inf[LOCALS] = (inf[LOCALS] ?? 0) - contacts;
    inf[id] = take + contacts;
    updateOwner(state, z, rng);
  }
  return id;
}

function pickFreeZone(state: GameState, area: string | undefined, rng: Rng): TerritoryId {
  const free = ZONE_LIST.filter((z) => !state.territories[z.id].owner);
  const inArea = free.filter((z) => z.area === area);
  return rng.pick(inArea.length ? inArea : free.length ? free : ZONE_LIST).id;
}
