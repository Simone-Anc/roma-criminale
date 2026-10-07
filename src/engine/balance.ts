// Tutti i numeri di bilanciamento in un solo posto. Denaro in migliaia di euro (k€).
export const BALANCE = {
  actionsPerTurn: 3,
  /** Settimane iniziali in cui nessuno può erodere una zona dominata da altri. */
  truceWeeks: 6,
  startReputation: 20,
  playerStartReputation: 10,
  /** Influenza in meno nei quartieri iniziali diversi dalla base. */
  startZoneGap: 10,

  memberUpkeep: 1,

  /** Livelli utilizzabili di un ramo per ogni quartiere adatto dominato (più uno). */
  racketLevelsPerZone: 2,
  /** Entrate in più di un ramo per ogni quartiere adatto oltre il primo. */
  racketNetworkBonus: 0.1,
  /** % in più sulle entrate del ramo di specializzazione. */
  specializationBonus: 30,
  /** Livello iniziale del ramo di specializzazione. */
  specializationStartLevel: 2,
  /** La ricchezza attira attenzione: +1 rischio a settimana ogni tanti k€ in cassa. */
  cashPerHeat: 250,

  recruitCost: 20,
  recruitAmount: 3,

  // Gerarchia: capo → vice capi → soldati
  /** Soglie di reputazione che sbloccano un altro slot da vice capo (oltre al primo). */
  slotReputation: [25, 50, 75],
  lieutenantUpkeep: 3,
  hireCost: 15,
  rewardCost: 15,
  rewardLoyalty: 15,
  /** Soldati che il capo riesce a seguire di persona. */
  bossDirectSoldiers: 4,
  /** Rischio settimanale per ogni soldato senza guida. */
  unledHeat: 0.5,
  /** Soldati comandabili da un vice: base + 1 ogni 25 punti di forza. */
  squadBase: 3,
  /** Presidio: +1 influenza/sett. nei quartieri dell'area ogni tot soldati del vice. */
  soldiersPerPresidio: 3,
  presidioMax: 3,
  /** Lealtà persa ogni settimana: ambizione / questo valore. */
  ambitionDrag: 60,
  loyaltyWarn: 40,
  /** Sotto questa lealtà il vice trattiene parte degli incassi. */
  loyaltySkim: 25,
  /** Sotto questa lealtà, ogni settimana, può mettersi in proprio. */
  loyaltySplit: 15,
  splitChance: 0.35,
  splitCashShare: 0.1,
  /** Influenza iniziale di una scissione senza quartieri da portarsi via (sopra la soglia di dominio). */
  splitFreeInfluence: 40,
  /** Influenza che chi si scinde sottrae ai gruppi locali in ogni quartiere che si porta via. */
  splitLocalContacts: 15,
  dismissLoyaltyHit: 5,
  arrestLoyaltyHit: 5,
  candidateRefreshWeeks: 4,
  candidateCount: 3,

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

  tributeFactor: 1.0,

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
