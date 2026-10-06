import type { ActivityDef, ActivityId } from '../engine/types';

// Attività volutamente astratte: il giocatore decide solo SE investire in una categoria.
export const ACTIVITIES: Record<ActivityId, ActivityDef> = {
  traffico: {
    id: 'traffico', name: 'Traffico',
    income: 22, heat: 6, cost: 30, minControl: 55, influence: 0,
    description: 'Il profitto più alto, e la pressione più alta.',
  },
  estorsioni: {
    id: 'estorsioni', name: 'Estorsioni',
    income: 13, heat: 5, cost: 10, minControl: 45, influence: 2,
    description: 'Rafforza la presa sulla zona ogni settimana.',
  },
  rapine: {
    id: 'rapine', name: 'Rapine',
    income: 15, heat: 8, cost: 5, minControl: 20, influence: 0,
    description: 'Avvio quasi gratuito e poco controllo richiesto, ma attira subito l’attenzione.',
  },
  contrabbando: {
    id: 'contrabbando', name: 'Contrabbando',
    income: 12, heat: 3, cost: 20, minControl: 40, influence: 0,
    description: 'Flusso costante di merci fuori dai registri.',
  },
  scommesse: {
    id: 'scommesse', name: 'Scommesse clandestine',
    income: 9, heat: 2, cost: 12, minControl: 30, influence: 1,
    description: 'Entrate modeste, sicure, e una rete di contatti nel quartiere.',
  },
  riciclaggio: {
    id: 'riciclaggio', name: 'Riciclaggio',
    income: 6, heat: -3, cost: 25, minControl: 40, influence: 0,
    description: 'Rende poco ma riduce il rischio dell’organizzazione.',
  },
  affari: {
    id: 'affari', name: 'Affari illegali',
    income: 18, heat: 3, cost: 35, minControl: 50, influence: 1,
    description: 'Appalti e società di comodo: servono capitali.',
  },
  mercatonero: {
    id: 'mercatonero', name: 'Mercato nero',
    income: 11, heat: 3, cost: 15, minControl: 35, influence: 0,
    description: 'Merci rivendute fuori da ogni circuito ufficiale.',
  },
};
