// Tutti i numeri di bilanciamento in un solo posto. Denaro in migliaia di euro (k€).
export const BALANCE = {
  actionsPerTurn: 3,
  /** Settimane iniziali in cui nessuno può erodere una zona dominata da altri. */
  truceWeeks: 6,
  startReputation: 20,
  playerStartReputation: 10,

  memberUpkeep: 1.5,
  membersPerActivity: 2,
  maxActivitiesPerTerritory: 3,

  recruitCost: 20,
  recruitAmount: 3,

  expandBaseCost: 8,
  expandWealthCost: 2,
  expandHeat: 3,
  /** Per essere dominanti: almeno questa influenza e più di chiunque altro. */
  ownershipThreshold: 35,

  consolidateCost: 8,
  consolidateGain: 8,

  lowProfileCost: 15,
  lowProfileHeat: 12,

  respectCost: 20,
  respectGain: 15,

  heatDecay: 4,
  relationDrift: 1,

  tributeFactor: 1.2,

  winMoney: 1000,
  maxWeeks: 104,
  brokeWeeksToLose: 4,
};

/** Fasce di controllo di una zona. */
export const CONTROL_LEVELS: { min: number; label: string }[] = [
  { min: 80, label: 'Dominio' },
  { min: 60, label: 'Controllo forte' },
  { min: 40, label: 'Controllo parziale' },
  { min: 20, label: 'Influenza' },
  { min: 1, label: 'Presenza marginale' },
  { min: 0, label: 'Assente' },
];
