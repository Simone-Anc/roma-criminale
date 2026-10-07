import type { RacketDef, RacketId } from '../engine/types';

// Rami d'affari: volutamente astratti. Il giocatore decide solo QUANTO investire in
// una categoria; nessun dettaglio operativo. Denaro in migliaia di euro (k€).
// Un ramo rende solo se domini almeno un quartiere adatto (vedi `rackets` in zones.ts).
export const RACKET_LIST: RacketDef[] = [
  {
    id: 'furti', name: 'Furti e rapine',
    description: 'Si parte da qui: costa poco, rende subito, e fa rumore.',
    maxLevel: 5, baseCost: 8, costGrowth: 1.6, income: 2.5, heat: 2.5,
    perks: [
      { level: 3, name: 'Ricettatori fidati', description: 'Reclutare costa il 25% in meno.', bonus: { recruitDiscount: 25 } },
      { level: 5, name: 'Squadre esperte', description: '+2 influenza ogni volta che la aumenti.', bonus: { expandGain: 2 } },
    ],
  },
  {
    id: 'estorsioni', name: 'Estorsioni',
    description: 'Il controllo del territorio, una vetrina alla volta.',
    maxLevel: 6, baseCost: 12, costGrowth: 1.6, income: 2.5, heat: 1.5,
    perks: [
      { level: 2, name: 'Presenza costante', description: '+1 influenza a settimana in ogni quartiere che domini.', bonus: { influencePerWeek: 1 } },
      { level: 3, name: 'Un nome che pesa', description: '+1 reputazione a settimana.', bonus: { reputationPerWeek: 1 } },
      { level: 4, name: 'Protezione', description: 'Tributi dai quartieri +25%.', bonus: { tribute: 25 } },
      { level: 6, name: 'Controllo capillare', description: 'Un altro +1 influenza a settimana in ogni quartiere che domini.', bonus: { influencePerWeek: 1 } },
    ],
  },
  {
    id: 'stupefacenti', name: 'Traffico di stupefacenti',
    description: 'Il ramo più redditizio e il più esposto.',
    maxLevel: 8, baseCost: 30, costGrowth: 1.6, income: 6, heat: 4,
    perks: [
      { level: 4, name: 'Canali stabili', description: 'Questo ramo rende il 25% in più.', selfIncome: 25 },
      { level: 8, name: 'Grossisti', description: 'Questo ramo rende un altro 50% in più.', selfIncome: 50 },
    ],
  },
  {
    id: 'armi', name: 'Traffico di armi',
    description: 'Pochi carichi, grandi margini. E rende più temibili.',
    maxLevel: 8, baseCost: 40, costGrowth: 1.6, income: 5, heat: 3,
    perks: [
      { level: 3, name: 'Arsenale', description: 'Chi prova a sottrarti influenza paga il 50% in più.', bonus: { defense: 50 } },
      { level: 6, name: 'Potenza di fuoco', description: '+3 influenza ogni volta che la aumenti.', bonus: { expandGain: 3 } },
      { level: 8, name: 'Fornitori della città', description: 'Questo ramo rende il 30% in più.', selfIncome: 30 },
    ],
  },
  {
    id: 'riciclaggio', name: 'Riciclaggio',
    description: 'Rende poco, ma ogni livello abbassa il rischio.',
    maxLevel: 6, baseCost: 20, costGrowth: 1.6, income: 1, heat: -1.5,
    perks: [
      { level: 3, name: 'Società di comodo', description: 'Sequestri e arresti il 30% meno probabili.', bonus: { policeShield: 30 } },
      { level: 6, name: 'Capitali puliti', description: 'Tutti i rami rendono il 10% in più.', bonus: { income: 10 } },
    ],
  },
  {
    id: 'corruzione', name: 'Corruzione',
    description: 'Non rende nulla direttamente: compra tempo, porte aperte e silenzio.',
    maxLevel: 5, baseCost: 35, costGrowth: 1.7, income: 0, heat: -0.5,
    perks: [
      { level: 2, name: 'Amici negli uffici', description: 'Aumentare l’influenza costa il 25% in meno.', bonus: { expandDiscount: 25 } },
      { level: 4, name: 'Soffiate', description: 'Sequestri e arresti il 40% meno probabili.', bonus: { policeShield: 40 } },
      { level: 5, name: 'Uomini nelle istituzioni', description: 'Un’azione in più ogni settimana.', bonus: { actions: 1 } },
    ],
  },
];

export const RACKETS: Record<RacketId, RacketDef> = Object.fromEntries(
  RACKET_LIST.map((r) => [r.id, r]),
) as Record<RacketId, RacketDef>;
