import type { AreaId, TerritoryDef, TerritoryId } from '../engine/types';
import { cellNeighbors, project, voronoi } from './geography';

// Roma divisa in quartieri, raggruppati in otto macro-aree. `rackets` sono i rami
// d'affari che il quartiere sostiene quando lo domini. I nomi dei quartieri sono
// solo riferimenti geografici: le descrizioni sono d'ambiente e non richiamano persone,
// gruppi o fatti reali. Le coordinate (lat, lon) sono il centro approssimativo del
// quartiere: confini e adiacenze si ricavano da lì (vedi geography.ts).

export const AREAS: Record<AreaId, string> = {
  centro: 'Centro',
  nord: 'Nord',
  nordest: 'Nord-Est',
  est: 'Est',
  sudest: 'Sud-Est',
  sud: 'Sud',
  sudovest: 'Sud-Ovest',
  ovest: 'Ovest',
};

type ZoneData = Omit<TerritoryDef, 'neighbors'>;

const DATA: ZoneData[] = [
  // ------------------------------------------------------------ Centro
  {
    id: 'centrostorico', name: 'Centro Storico', area: 'centro', coords: [41.8985, 12.4755],
    flavor: 'Palazzi del potere, piazze piene di turisti, locali esclusivi.',
    population: 35, wealth: 10, lawPresence: 10,
    rackets: ['riciclaggio', 'corruzione', 'estorsioni'],
  },
  {
    id: 'trastevere', name: 'Trastevere', area: 'centro', coords: [41.8865, 12.468],
    flavor: 'Vicoli, trattorie e movida fino all’alba.',
    population: 30, wealth: 8, lawPresence: 8,
    rackets: ['estorsioni', 'furti', 'stupefacenti', 'riciclaggio'],
  },
  {
    id: 'prati', name: 'Prati', area: 'centro', coords: [41.9085, 12.46],
    flavor: 'Viali dritti, tribunali, studi legali e negozi di lusso.',
    population: 70, wealth: 9, lawPresence: 9,
    rackets: ['corruzione', 'riciclaggio', 'estorsioni'],
  },
  {
    id: 'esquilino', name: 'Esquilino', area: 'centro', coords: [41.896, 12.503],
    flavor: 'La stazione, i mercati, mille lingue e traffici di ogni genere.',
    population: 50, wealth: 6, lawPresence: 8,
    rackets: ['furti', 'armi', 'stupefacenti', 'estorsioni'],
  },
  {
    id: 'sanlorenzo', name: 'San Lorenzo', area: 'centro', coords: [41.8985, 12.5195],
    flavor: 'Studenti, bar affollati e vecchie botteghe artigiane.',
    population: 20, wealth: 5, lawPresence: 6,
    rackets: ['estorsioni', 'stupefacenti', 'furti'],
  },
  {
    id: 'testaccio', name: 'Testaccio', area: 'centro', coords: [41.8805, 12.4785],
    flavor: 'Il vecchio mattatoio, locali notturni e mercato rionale.',
    population: 25, wealth: 7, lawPresence: 7,
    rackets: ['estorsioni', 'furti'],
  },
  // ------------------------------------------------------------ Nord
  {
    id: 'flaminio', name: 'Flaminio', area: 'nord', coords: [41.9255, 12.4765],
    flavor: 'Stadi, auditorium e la movida intorno al ponte.',
    population: 55, wealth: 8, lawPresence: 7,
    rackets: ['estorsioni', 'stupefacenti', 'riciclaggio'],
  },
  {
    id: 'parioli', name: 'Parioli', area: 'nord', coords: [41.9235, 12.4915],
    flavor: 'Ville, ambasciate e famiglie che contano.',
    population: 60, wealth: 10, lawPresence: 8,
    rackets: ['corruzione', 'riciclaggio', 'estorsioni'],
  },
  {
    id: 'trieste', name: 'Trieste', area: 'nord', coords: [41.919, 12.5135],
    flavor: 'Palazzine signorili, villini e professionisti.',
    population: 90, wealth: 8, lawPresence: 7,
    rackets: ['corruzione', 'estorsioni', 'riciclaggio'],
  },
  {
    id: 'cassia', name: 'Cassia', area: 'nord', coords: [41.972, 12.425],
    flavor: 'Comprensori recintati, ville e campagna lungo la consolare.',
    population: 90, wealth: 8, lawPresence: 5,
    rackets: ['riciclaggio', 'furti'],
  },
  {
    id: 'primaporta', name: 'Prima Porta', area: 'nord', coords: [42.005, 12.488],
    flavor: 'Ultima borgata a nord: capannoni, svincoli e campagna.',
    population: 50, wealth: 4, lawPresence: 4,
    rackets: ['armi', 'furti', 'estorsioni'],
  },
  // ------------------------------------------------------------ Nord-Est
  {
    id: 'montesacro', name: 'Montesacro', area: 'nordest', coords: [41.9465, 12.5365],
    flavor: 'Città giardino, grandi viali e centri commerciali.',
    population: 140, wealth: 6, lawPresence: 6,
    rackets: ['estorsioni', 'furti'],
  },
  {
    id: 'pietralata', name: 'Pietralata', area: 'nordest', coords: [41.927, 12.553],
    flavor: 'Case popolari, nuovi uffici e cantieri infiniti.',
    population: 60, wealth: 4, lawPresence: 5,
    rackets: ['estorsioni', 'furti', 'stupefacenti'],
  },
  {
    id: 'tiburtino', name: 'Tiburtino', area: 'nordest', coords: [41.9065, 12.5375],
    flavor: 'Lo scalo ferroviario, l’università e i palazzoni sulla consolare.',
    population: 70, wealth: 5, lawPresence: 6,
    rackets: ['furti', 'armi', 'estorsioni'],
  },
  {
    id: 'settecamini', name: 'Settecamini', area: 'nordest', coords: [41.937, 12.615],
    flavor: 'Zona industriale, depositi e strade senza illuminazione.',
    population: 45, wealth: 3, lawPresence: 3,
    rackets: ['armi', 'furti', 'stupefacenti'],
  },
  // ------------------------------------------------------------ Est
  {
    id: 'pigneto', name: 'Pigneto', area: 'est', coords: [41.8885, 12.533],
    flavor: 'Isola pedonale, locali alla moda e vecchie case basse.',
    population: 45, wealth: 5, lawPresence: 5,
    rackets: ['estorsioni', 'stupefacenti', 'furti'],
  },
  {
    id: 'centocelle', name: 'Centocelle', area: 'est', coords: [41.8775, 12.567],
    flavor: 'Periferia densa, mercati rionali e piazze sempre vive.',
    population: 120, wealth: 4, lawPresence: 5,
    rackets: ['estorsioni', 'furti', 'stupefacenti'],
  },
  {
    id: 'torsapienza', name: 'Tor Sapienza', area: 'est', coords: [41.8995, 12.5875],
    flavor: 'Fabbriche dismesse e grandi complessi residenziali.',
    population: 50, wealth: 3, lawPresence: 4,
    rackets: ['armi', 'furti', 'estorsioni'],
  },
  {
    id: 'pontedinona', name: 'Ponte di Nona', area: 'est', coords: [41.905, 12.665],
    flavor: 'Quartieri nuovi nati nel nulla, oltre il raccordo.',
    population: 70, wealth: 3, lawPresence: 3,
    rackets: ['furti', 'armi', 'estorsioni'],
  },
  {
    id: 'torreangela', name: 'Torre Angela', area: 'est', coords: [41.865, 12.632],
    flavor: 'Torri di cemento, strade larghe e servizi lontani.',
    population: 110, wealth: 3, lawPresence: 4,
    rackets: ['estorsioni', 'stupefacenti', 'furti'],
  },
  // ------------------------------------------------------------ Sud-Est
  {
    id: 'sangiovanni', name: 'San Giovanni', area: 'sudest', coords: [41.8825, 12.5135],
    flavor: 'La grande piazza, le mura e i negozi della via principale.',
    population: 80, wealth: 6, lawPresence: 7,
    rackets: ['estorsioni', 'corruzione', 'furti'],
  },
  {
    id: 'appiolatino', name: 'Appio Latino', area: 'sudest', coords: [41.8675, 12.5205],
    flavor: 'Ceto medio, palazzine ordinate e uffici pubblici.',
    population: 70, wealth: 6, lawPresence: 6,
    rackets: ['corruzione', 'estorsioni', 'riciclaggio'],
  },
  {
    id: 'tuscolano', name: 'Tuscolano', area: 'sudest', coords: [41.8665, 12.5455],
    flavor: 'Lunghi viali alberati e condomini a perdita d’occhio.',
    population: 110, wealth: 5, lawPresence: 5,
    rackets: ['estorsioni', 'furti', 'stupefacenti'],
  },
  {
    id: 'cinecitta', name: 'Cinecittà', area: 'sudest', coords: [41.8495, 12.5745],
    flavor: 'Gli studi del cinema, centri commerciali e grandi parcheggi.',
    population: 90, wealth: 5, lawPresence: 5,
    rackets: ['estorsioni', 'furti'],
  },
  {
    id: 'appiaantica', name: 'Appia Antica', area: 'sudest', coords: [41.837, 12.528],
    flavor: 'Ville appartate tra rovine, parchi e casali isolati.',
    population: 20, wealth: 9, lawPresence: 3,
    rackets: ['riciclaggio', 'armi'],
  },
  {
    id: 'torvergata', name: 'Tor Vergata', area: 'sudest', coords: [41.847, 12.618],
    flavor: 'L’università, il policlinico e la campagna verso i Castelli.',
    population: 60, wealth: 4, lawPresence: 4,
    rackets: ['furti', 'armi', 'estorsioni'],
  },
  // ------------------------------------------------------------ Sud
  {
    id: 'ostiense', name: 'Ostiense', area: 'sud', coords: [41.8655, 12.4745],
    flavor: 'Ex aree industriali, il gazometro e locali ricavati nei magazzini.',
    population: 40, wealth: 6, lawPresence: 6,
    rackets: ['estorsioni', 'stupefacenti', 'furti'],
  },
  {
    id: 'garbatella', name: 'Garbatella', area: 'sud', coords: [41.8585, 12.4905],
    flavor: 'Lotti popolari con i cortili, un paese dentro la città.',
    population: 45, wealth: 4, lawPresence: 5,
    rackets: ['estorsioni', 'furti'],
  },
  {
    id: 'marconi', name: 'Marconi', area: 'sud', coords: [41.8555, 12.4605],
    flavor: 'Il viale dei negozi, traffico e palazzi addossati al fiume.',
    population: 60, wealth: 5, lawPresence: 5,
    rackets: ['furti', 'estorsioni'],
  },
  {
    id: 'eur', name: 'EUR', area: 'sud', coords: [41.8305, 12.469],
    flavor: 'Architetture monumentali, ministeri e sedi di grandi aziende.',
    population: 50, wealth: 9, lawPresence: 8,
    rackets: ['corruzione', 'riciclaggio', 'estorsioni'],
  },
  {
    id: 'laurentino', name: 'Laurentino', area: 'sud', coords: [41.8135, 12.4965],
    flavor: 'Complessi residenziali collegati da ponti e lunghe strade.',
    population: 60, wealth: 4, lawPresence: 4,
    rackets: ['estorsioni', 'furti', 'stupefacenti'],
  },
  {
    id: 'spinaceto', name: 'Spinaceto', area: 'sud', coords: [41.785, 12.443],
    flavor: 'Quartiere-dormitorio tra il raccordo e la campagna.',
    population: 50, wealth: 4, lawPresence: 4,
    rackets: ['furti', 'estorsioni', 'armi'],
  },
  // ------------------------------------------------------------ Sud-Ovest
  {
    id: 'magliana', name: 'Magliana', area: 'sudovest', coords: [41.8485, 12.4245],
    flavor: 'Case strette tra l’argine e i viadotti, sotto il livello del fiume.',
    population: 55, wealth: 4, lawPresence: 5,
    rackets: ['furti', 'estorsioni', 'armi'],
  },
  {
    id: 'pontegaleria', name: 'Ponte Galeria', area: 'sudovest', coords: [41.818, 12.345],
    flavor: 'La fiera, la logistica e la strada per l’aeroporto.',
    population: 25, wealth: 4, lawPresence: 4,
    rackets: ['armi', 'corruzione', 'furti'],
  },
  {
    id: 'acilia', name: 'Acilia', area: 'sudovest', coords: [41.782, 12.358],
    flavor: 'Borgata cresciuta lungo la via del mare.',
    population: 70, wealth: 4, lawPresence: 3,
    rackets: ['armi', 'furti', 'estorsioni'],
  },
  {
    id: 'ostia', name: 'Ostia', area: 'sudovest', coords: [41.731, 12.29],
    flavor: 'Il litorale: porto turistico, stabilimenti e lungomare.',
    population: 90, wealth: 5, lawPresence: 4,
    rackets: ['armi', 'estorsioni', 'furti'],
  },
  // ------------------------------------------------------------ Ovest
  {
    id: 'balduina', name: 'Balduina', area: 'ovest', coords: [41.9195, 12.4405],
    flavor: 'Il colle con la vista sulla città, residenze e cliniche.',
    population: 80, wealth: 7, lawPresence: 6,
    rackets: ['estorsioni', 'riciclaggio', 'furti'],
  },
  {
    id: 'primavalle', name: 'Primavalle', area: 'ovest', coords: [41.926, 12.412],
    flavor: 'Lotti popolari e mercati, lontano dai riflettori.',
    population: 90, wealth: 4, lawPresence: 5,
    rackets: ['estorsioni', 'furti', 'stupefacenti'],
  },
  {
    id: 'aurelio', name: 'Aurelio', area: 'ovest', coords: [41.8985, 12.4345],
    flavor: 'Alle spalle del Vaticano: alberghi, conventi e traffico.',
    population: 90, wealth: 6, lawPresence: 6,
    rackets: ['estorsioni', 'furti', 'riciclaggio'],
  },
  {
    id: 'monteverde', name: 'Monteverde', area: 'ovest', coords: [41.876, 12.4505],
    flavor: 'Il grande parco, villini e strade in salita.',
    population: 75, wealth: 7, lawPresence: 6,
    rackets: ['estorsioni', 'riciclaggio'],
  },
  {
    id: 'boccea', name: 'Boccea', area: 'ovest', coords: [41.907, 12.375],
    flavor: 'Periferia sparsa, centri commerciali e campagna.',
    population: 80, wealth: 4, lawPresence: 4,
    rackets: ['furti', 'armi', 'estorsioni'],
  },
];

/** Celle della mappa: una per quartiere. Le adiacenze di gioco derivano da qui. */
export const ZONE_CELLS = voronoi(DATA.map((z) => ({ id: z.id, site: project(z.coords) })));

function buildNeighbors(): Record<TerritoryId, TerritoryId[]> {
  const sets: Record<TerritoryId, Set<TerritoryId>> = Object.fromEntries(DATA.map((z) => [z.id, new Set()]));
  for (const cell of ZONE_CELLS)
    for (const n of cellNeighbors(cell)) {
      sets[cell.id].add(n);
      sets[n].add(cell.id); // l'adiacenza è sempre simmetrica
    }
  return Object.fromEntries(Object.entries(sets).map(([id, s]) => [id, [...s]]));
}

const NEIGHBORS = buildNeighbors();

export const ZONE_LIST: TerritoryDef[] = DATA.map((z) => ({ ...z, neighbors: NEIGHBORS[z.id] }));

export const ZONES: Record<TerritoryId, TerritoryDef> = Object.fromEntries(
  ZONE_LIST.map((z) => [z.id, z]),
);

/** Dominio territoriale: controllare un terzo dei quartieri della città. */
export const ZONES_TO_WIN = Math.ceil(ZONE_LIST.length / 3);
