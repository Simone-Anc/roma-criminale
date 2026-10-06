import type { ActivityId, FamilyDef, TerritoryId } from '../engine/types';

// Organizzazioni interamente immaginarie.
export const RIVAL_DEFS: FamilyDef[] = [
  {
    id: 'lupi', name: 'I Lupi', plural: true, color: '#b0503f',
    home: 'est', specialization: 'estorsioni', aggression: 0.75,
    trait: 'Aggressivi e radicati. Per loro il territorio viene prima del denaro.',
    startMoney: 140, startMembers: 12, startInfluence: 60,
  },
  {
    id: 'corvi', name: 'I Corvi', plural: true, color: '#7486b3',
    home: 'nord', specialization: 'affari', aggression: 0.4,
    trait: 'Ricchi e discreti, con amici nei posti giusti.',
    startMoney: 320, startMembers: 8, startInfluence: 55,
  },
];

export const PLAYER_ID = 'giocatore';
export const PLAYER_COLOR = '#c9a15e';

/** Le zone in cui il giocatore può cominciare: piccole basi, ognuna con un carattere. */
export interface StartOption {
  zone: TerritoryId;
  specialization: ActivityId;
  pitch: string;
}

export const START_OPTIONS: StartOption[] = [
  { zone: 'sudovest', specialization: 'contrabbando', pitch: 'Lontano dai rivali, vicino al mare. Poca polizia, poco denaro.' },
  { zone: 'sud', specialization: 'scommesse', pitch: 'Una zona contesa da nessuno, ma confinante con tutti i grandi giri.' },
  { zone: 'ovest', specialization: 'mercatonero', pitch: 'Alle porte dei Corvi: ricchezza a portata di mano, e rischi.' },
];

export function playerDef(name: string, start: StartOption): FamilyDef {
  const clean = name.trim() || 'Il Gruppo';
  return {
    id: PLAYER_ID,
    name: clean,
    plural: /^(i|gli|le)\s/i.test(clean),
    color: PLAYER_COLOR,
    home: start.zone,
    specialization: start.specialization,
    aggression: 0.5,
    trait: 'Un piccolo gruppo con grandi ambizioni.',
    startMoney: 90,
    startMembers: 5,
    startInfluence: 40,
  };
}
