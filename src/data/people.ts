// Materiale per i personaggi generati: nomi comuni e soprannomi di fantasia.
// Evitare soprannomi legati a persone reali o a opere di finzione famose.

export const MALE_NAMES = [
  'Marco', 'Fabio', 'Stefano', 'Daniele', 'Claudio', 'Massimo', 'Roberto', 'Andrea',
  'Luca', 'Paolo', 'Sergio', 'Valerio', 'Mirko', 'Fabrizio', 'Emiliano', 'Gianni',
  'Riccardo', 'Alessio', 'Maurizio', 'Simone',
];

export const FEMALE_NAMES = [
  'Nadia', 'Laura', 'Sabrina', 'Monica', 'Valentina', 'Barbara', 'Daniela', 'Silvia',
  'Federica', 'Roberta', 'Alessia', 'Cinzia', 'Paola', 'Manuela',
];

export const LAST_NAMES = [
  'Ferri', 'Santoro', 'Marini', 'Rinaldi', 'Morelli', 'Fabbri', 'Conti', 'Gatti',
  'Bellini', 'Sorrentino', 'Testa', 'Pace', 'Caruso', 'Fiore', 'Leone', 'Ruggeri',
  'Mancini', 'Palombo', 'Ciccotti', 'Proietti', 'Bianchini', 'Orsini', 'Piras', 'Valente',
];

/** Soprannomi con l'articolo; `f` = adatto a un personaggio femminile, `m` maschile. */
export const NICKNAMES: { text: string; f?: boolean; m?: boolean }[] = [
  { text: 'il Biondo', m: true },
  { text: 'il Ragioniere', m: true },
  { text: 'il Muto', m: true },
  { text: 'il Sarto', m: true },
  { text: 'il Dottore', m: true },
  { text: 'il Notaio', m: true },
  { text: 'il Gatto', m: true },
  { text: 'er Secco', m: true },
  { text: 'er Moretto', m: true },
  { text: 'er Pallino', m: true },
  { text: 'er Sorcio', m: true },
  { text: 'la Volpe', f: true, m: true },
  { text: 'la Contessa', f: true },
  { text: 'la Rossa', f: true },
  { text: 'la Maestra', f: true },
  { text: 'la Zarina', f: true },
  { text: 'la Mora', f: true },
];
