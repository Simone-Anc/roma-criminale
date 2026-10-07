import type { FamilyDef, RacketId, TerritoryId } from '../engine/types';

// Organizzazioni interamente immaginarie. Tutte partono da un solo quartiere: due più
// grandi (Lupi e Corvi) e tante bande piccole sparse per la città. Le basi non confinano
// con le partenze del giocatore e stanno lontane dai luoghi associati a gruppi reali.
export const RIVAL_DEFS: FamilyDef[] = [
  {
    id: 'lupi', name: 'I Lupi', plural: true, color: '#b0503f',
    home: 'centocelle', startZones: [],
    specialization: 'estorsioni', startRackets: { stupefacenti: 1 }, aggression: 0.75,
    trait: 'Aggressivi e numerosi. Per loro il territorio viene prima del denaro.',
    startMoney: 140, startMembers: 9, startInfluence: 60,
  },
  {
    id: 'corvi', name: 'I Corvi', plural: true, color: '#7486b3',
    home: 'parioli', startZones: [],
    specialization: 'riciclaggio', startRackets: { corruzione: 1 }, aggression: 0.4,
    trait: 'Ricchi e discreti, con amici nei posti giusti.',
    startMoney: 200, startMembers: 8, startInfluence: 55,
  },
  // Bande piccole: un quartiere, pochi uomini, uno slot nella loro specialità.
  {
    id: 'vipere', name: 'Le Vipere', plural: true, color: '#4f9a94',
    home: 'trastevere', startZones: [], specialization: 'stupefacenti', startSpecSlots: 1, aggression: 0.55,
    trait: 'Giovani e veloci, si muovono tra i vicoli.',
    startMoney: 60, startMembers: 5, startInfluence: 45,
  },
  {
    id: 'sciacalli', name: 'Gli Sciacalli', plural: true, color: '#d0703a',
    home: 'esquilino', startZones: [], specialization: 'armi', startSpecSlots: 1, aggression: 0.7,
    trait: 'Arrivano dove gli altri si indeboliscono.',
    startMoney: 70, startMembers: 6, startInfluence: 45,
  },
  {
    id: 'volpi', name: 'Le Volpi', plural: true, color: '#8f6bb8',
    home: 'prati', startZones: [], specialization: 'riciclaggio', startSpecSlots: 1, aggression: 0.3,
    trait: 'Professionisti in giacca e cravatta: preferiscono i conti alle strade.',
    startMoney: 110, startMembers: 4, startInfluence: 40,
  },
  {
    id: 'mastini', name: 'I Mastini', plural: true, color: '#7f5a46',
    home: 'primaporta', startZones: [], specialization: 'furti', startSpecSlots: 1, aggression: 0.65,
    trait: 'Duri e testardi, difendono la loro periferia a ogni costo.',
    startMoney: 50, startMembers: 6, startInfluence: 50,
  },
  {
    id: 'scorpioni', name: 'Gli Scorpioni', plural: true, color: '#b5577f',
    home: 'settecamini', startZones: [], specialization: 'stupefacenti', startSpecSlots: 1, aggression: 0.6,
    trait: 'Pochi ma pericolosi, ai margini della città.',
    startMoney: 55, startMembers: 5, startInfluence: 45,
  },
  {
    id: 'ramarri', name: 'I Ramarri', plural: true, color: '#5b8f4a',
    home: 'pigneto', startZones: [], specialization: 'estorsioni', startSpecSlots: 1, aggression: 0.5,
    trait: 'Conoscono ogni bar e ogni bottega del quartiere.',
    startMoney: 60, startMembers: 5, startInfluence: 45,
  },
  {
    id: 'gabbiani', name: 'I Gabbiani', plural: true, color: '#3f8fc0',
    home: 'marconi', startZones: [], specialization: 'furti', startSpecSlots: 1, aggression: 0.5,
    trait: 'Opportunisti: prendono quello che trovano lungo il fiume.',
    startMoney: 50, startMembers: 5, startInfluence: 45,
  },
  {
    id: 'faine', name: 'Le Faine', plural: true, color: '#9a8c3a',
    home: 'pontedinona', startZones: [], specialization: 'estorsioni', startSpecSlots: 1, aggression: 0.45,
    trait: 'Silenziose e pazienti, aspettano il momento giusto.',
    startMoney: 50, startMembers: 4, startInfluence: 45,
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
    startMoney: 120,
    startMembers: 5,
    startInfluence: 40,
  };
}
