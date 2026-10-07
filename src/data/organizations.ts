import type { FamilyDef, RacketId, TerritoryId } from '../engine/types';

// Organizzazioni interamente immaginarie.
export const RIVAL_DEFS: FamilyDef[] = [
  {
    id: 'lupi', name: 'I Lupi', plural: true, color: '#b0503f',
    home: 'centocelle', startZones: ['torsapienza', 'torreangela'],
    specialization: 'estorsioni', startRackets: { stupefacenti: 1, furti: 1 }, aggression: 0.75,
    trait: 'Aggressivi e radicati. Per loro il territorio viene prima del denaro.',
    startMoney: 140, startMembers: 12, startInfluence: 60,
  },
  {
    id: 'corvi', name: 'I Corvi', plural: true, color: '#7486b3',
    home: 'parioli', startZones: ['trieste', 'flaminio'],
    specialization: 'riciclaggio', startRackets: { corruzione: 1 }, aggression: 0.4,
    trait: 'Ricchi e discreti, con amici nei posti giusti.',
    startMoney: 320, startMembers: 8, startInfluence: 55,
  },
];

export const PLAYER_ID = 'giocatore';
export const PLAYER_COLOR = '#c9a15e';

/** I quartieri in cui il giocatore può cominciare: piccole basi, ognuna con un carattere. */
export interface StartOption {
  zone: TerritoryId;
  specialization: RacketId;
  pitch: string;
}

export const START_OPTIONS: StartOption[] = [
  { zone: 'acilia', specialization: 'armi', pitch: 'Lontano dai rivali, sulla via del mare. Poca polizia, poco denaro.' },
  { zone: 'garbatella', specialization: 'estorsioni', pitch: 'A un passo dal centro e dall’EUR: tutti i grandi giri passano qui vicino.' },
  { zone: 'primavalle', specialization: 'furti', pitch: 'A ovest, lontano dai Lupi. Ma i Corvi sono a due quartieri di distanza.' },
];

export function playerDef(name: string, start: StartOption): FamilyDef {
  const clean = name.trim() || 'Il Gruppo';
  return {
    id: PLAYER_ID,
    name: clean,
    plural: /^(i|gli|le)\s/i.test(clean),
    color: PLAYER_COLOR,
    home: start.zone,
    startZones: [],
    specialization: start.specialization,
    aggression: 0.5,
    trait: 'Un piccolo gruppo con grandi ambizioni.',
    startMoney: 90,
    startMembers: 5,
    startInfluence: 40,
  };
}
