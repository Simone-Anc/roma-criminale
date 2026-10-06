import type { TerritoryDef, TerritoryId } from '../engine/types';

// Roma divisa in 8 macro-zone. Le descrizioni sono d'ambiente e non si riferiscono
// a quartieri reali. In futuro ogni zona potrà essere divisa in quartieri.
export const ZONE_LIST: TerritoryDef[] = [
  {
    id: 'centro', name: 'Centro', flavor: 'Palazzi del potere, turismo, locali esclusivi.',
    population: 180, wealth: 10, lawPresence: 10,
    neighbors: ['nord', 'nordest', 'est', 'sudest', 'sud', 'sudovest', 'ovest'],
    activities: ['riciclaggio', 'affari', 'scommesse', 'traffico'],
  },
  {
    id: 'nord', name: 'Nord', flavor: 'Residenze eleganti, studi professionali, ville.',
    population: 420, wealth: 9, lawPresence: 7,
    neighbors: ['centro', 'ovest', 'nordest'],
    activities: ['affari', 'riciclaggio', 'scommesse', 'traffico'],
  },
  {
    id: 'nordest', name: 'Nord-Est', flavor: 'Università, scali ferroviari, capannoni.',
    population: 380, wealth: 6, lawPresence: 6,
    neighbors: ['centro', 'nord', 'est'],
    activities: ['mercatonero', 'scommesse', 'contrabbando', 'estorsioni'],
  },
  {
    id: 'est', name: 'Est', flavor: 'Periferia densa, mercati rionali, palazzoni.',
    population: 520, wealth: 4, lawPresence: 5,
    neighbors: ['centro', 'nordest', 'sudest'],
    activities: ['estorsioni', 'mercatonero', 'traffico', 'rapine'],
  },
  {
    id: 'sudest', name: 'Sud-Est', flavor: 'Grandi viali, centri commerciali, campagna urbana.',
    population: 460, wealth: 5, lawPresence: 5,
    neighbors: ['centro', 'est', 'sud'],
    activities: ['estorsioni', 'traffico', 'mercatonero', 'scommesse'],
  },
  {
    id: 'sud', name: 'Sud', flavor: 'Uffici direzionali, cantieri pubblici, fiere.',
    population: 400, wealth: 6, lawPresence: 6,
    neighbors: ['centro', 'sudest', 'sudovest'],
    activities: ['affari', 'estorsioni', 'scommesse', 'riciclaggio'],
  },
  {
    id: 'sudovest', name: 'Sud-Ovest', flavor: 'Verso il litorale: porto turistico, lidi, magazzini.',
    population: 300, wealth: 5, lawPresence: 4,
    neighbors: ['centro', 'sud', 'ovest'],
    activities: ['contrabbando', 'mercatonero', 'scommesse', 'rapine'],
  },
  {
    id: 'ovest', name: 'Ovest', flavor: 'Colline residenziali e grandi arterie di scorrimento.',
    population: 350, wealth: 6, lawPresence: 6,
    neighbors: ['centro', 'sudovest', 'nord'],
    activities: ['rapine', 'scommesse', 'mercatonero', 'affari'],
  },
];

export const ZONES: Record<TerritoryId, TerritoryDef> = Object.fromEntries(
  ZONE_LIST.map((z) => [z.id, z]),
);

/** Dominio territoriale: zone da controllare per vincere. */
export const ZONES_TO_WIN = 5;
