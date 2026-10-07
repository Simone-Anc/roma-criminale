import type { RacketDef, RacketId } from '../engine/types';

// Rami d'affari: volutamente astratti. Il giocatore decide solo QUANTO investire in
// una categoria; nessun dettaglio operativo. Denaro in migliaia di euro (k€).
// Ogni ramo è un mercato condiviso: la città ha un numero fisso di slot che tutte le
// organizzazioni si contendono. Ogni slot rende; chi ne ha più di tutti incassa anche
// il premio di maggioranza. Chi domina un quartiere adatto (`rackets` in zones.ts) può
// strappare slot ai rivali quando non ce ne sono più di liberi.
export const RACKET_LIST: RacketDef[] = [
  {
    id: 'furti', name: 'Furti e rapine',
    description: 'Si parte da qui: costa poco, rende subito, e fa rumore.',
    slots: 6, slotCost: 8, costGrowth: 1.45, income: 2.5, majorityBonus: 2.5, heat: 2,
    perks: [
      { slots: 2, name: 'Ricettatori fidati', description: 'Reclutare costa il 25% in meno.', bonus: { recruitDiscount: 25 } },
      { slots: 4, name: 'Squadre esperte', description: '+2 influenza ogni volta che la aumenti.', bonus: { expandGain: 2 } },
    ],
  },
  {
    id: 'estorsioni', name: 'Estorsioni',
    description: 'Il controllo del territorio, una vetrina alla volta.',
    slots: 8, slotCost: 12, costGrowth: 1.45, income: 2.5, majorityBonus: 3, heat: 1.5,
    perks: [
      { slots: 2, name: 'Presenza costante', description: '+1 influenza a settimana in ogni quartiere che domini.', bonus: { influencePerWeek: 1 } },
      { slots: 3, name: 'Un nome che pesa', description: '+1 reputazione a settimana.', bonus: { reputationPerWeek: 1 } },
      { slots: 4, name: 'Protezione', description: 'Tributi dai quartieri +25%.', bonus: { tribute: 25 } },
      { slots: 5, name: 'Controllo capillare', description: 'Un altro +1 influenza a settimana in ogni quartiere che domini.', bonus: { influencePerWeek: 1 } },
    ],
  },
  {
    id: 'stupefacenti', name: 'Traffico di stupefacenti',
    description: 'Il ramo più redditizio e il più esposto.',
    slots: 6, slotCost: 30, costGrowth: 1.45, income: 6, majorityBonus: 6, heat: 4,
    perks: [
      { slots: 3, name: 'Canali stabili', description: 'Questo ramo rende il 25% in più.', selfIncome: 25 },
      { slots: 5, name: 'Grossisti', description: 'Questo ramo rende un altro 50% in più.', selfIncome: 50 },
    ],
  },
  {
    id: 'armi', name: 'Traffico di armi',
    description: 'Pochi carichi, grandi margini. E rende più temibili.',
    slots: 5, slotCost: 35, costGrowth: 1.45, income: 4, majorityBonus: 4, heat: 3,
    perks: [
      { slots: 2, name: 'Arsenale', description: 'Chi prova a sottrarti influenza paga il 50% in più.', bonus: { defense: 50 } },
      { slots: 3, name: 'Potenza di fuoco', description: '+3 influenza ogni volta che la aumenti.', bonus: { expandGain: 3 } },
      { slots: 4, name: 'Fornitori della città', description: 'Questo ramo rende il 30% in più.', selfIncome: 30 },
    ],
  },
  {
    id: 'riciclaggio', name: 'Riciclaggio',
    description: 'Rende poco, ma ogni slot abbassa il rischio.',
    slots: 5, slotCost: 20, costGrowth: 1.45, income: 1, majorityBonus: 2, heat: -1.5,
    perks: [
      { slots: 2, name: 'Società di comodo', description: 'Sequestri e arresti il 30% meno probabili.', bonus: { policeShield: 30 } },
      { slots: 4, name: 'Capitali puliti', description: 'Tutti i rami rendono il 10% in più.', bonus: { income: 10 } },
    ],
  },
  {
    id: 'corruzione', name: 'Corruzione',
    description: 'Non rende nulla direttamente: compra tempo, porte aperte e silenzio.',
    slots: 4, slotCost: 40, costGrowth: 1.6, income: 0, majorityBonus: 0, heat: -0.5,
    perks: [
      { slots: 1, name: 'Amici negli uffici', description: 'Aumentare l’influenza costa il 25% in meno.', bonus: { expandDiscount: 25 } },
      { slots: 2, name: 'Soffiate', description: 'Sequestri e arresti il 40% meno probabili.', bonus: { policeShield: 40 } },
      { slots: 3, name: 'Uomini nelle istituzioni', description: 'Sequestri e arresti un altro 20% meno probabili, influenza un altro 15% meno cara.', bonus: { policeShield: 20, expandDiscount: 15 } },
    ],
  },
];

export const RACKETS: Record<RacketId, RacketDef> = Object.fromEntries(
  RACKET_LIST.map((r) => [r.id, r]),
) as Record<RacketId, RacketDef>;
