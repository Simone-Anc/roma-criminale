// Tutti i numeri di bilanciamento in un solo posto. Denaro in migliaia di euro (k€).
export const BALANCE = {
  /** Settimane iniziali in cui nessuno può erodere una zona dominata da altri. */
  truceWeeks: 6,
  startReputation: 20,
  playerStartReputation: 10,
  /** Influenza in meno nei quartieri iniziali diversi dalla base. */
  startZoneGap: 10,

  /** I soldati non hanno stipendio: costa solo reclutarli. I vice capi sì (lieutenantUpkeep). */

  // Spaccio di strada: i soldati non impegnati in un assalto rendono ogni settimana, ma
  // possono finire in galera. Il rischio dipende dall'attenzione della polizia (0-100).
  streetIncome: 1,
  /** Dall'alto in basso: la prima fascia con attenzione >= min si applica. */
  jailRisk: [
    { min: 61, chance: 0.3, soldiers: 3 },
    { min: 41, chance: 0.25, soldiers: 2 },
    { min: 31, chance: 0.2, soldiers: 2 },
    { min: 21, chance: 0.15, soldiers: 1 },
    { min: 10, chance: 0.1, soldiers: 1 },
  ],

  // Guerra: assalti ai quartieri dominati da altri, risolti settimana per settimana.
  /** Costo per ogni soldato mandato in un assalto (mezzi, armi, spese). */
  attackCostPerSoldier: 2,
  attackHeat: 8,
  /** Attenzione della polizia in più per ogni assalto che stai conducendo. */
  attentionPerAttack: 12,
  attackRelation: 40,
  /** Rischio settimanale per ogni assalto in cui si è coinvolti. */
  battleHeat: 2,
  /** Quota dei soldati liberi che chi difende schiera subito. */
  defenderGarrison: 0.7,
  /** Spostamento del fronte per punto di vantaggio (0-1) e variabilità settimanale. */
  frontSpeed: 100,
  frontNoise: 8,
  /** Quota dei propri uomini persi ogni settimana, moltiplicata per la forza nemica relativa. */
  battleLosses: 0.35,
  /** Dopo tante settimane senza vincitore chi attacca si ritira. */
  battleMaxRounds: 6,
  /** Influenza di chi difende che passa a chi attacca quando vince. */
  conquestShare: 0.7,
  battleReputation: 6,
  // Regole solo per le organizzazioni dell'IA (non sono giocatori): crescono da sole col
  // passare delle settimane e attaccano spesso. Così la pressione sul giocatore aumenta.
  /** Denaro regalato ogni settimana: base + per settimana × numero della settimana (k€). */
  aiMoneyBase: 2,
  aiMoneyPerWeek: 0.1,
  /** Probabilità settimanale di un soldato in più: base + per settimana × settimana (max 0,95). */
  aiSoldierChanceBase: 0.15,
  aiSoldierChancePerWeek: 0.008,
  /** Probabilità settimanale di lanciare un assalto: base + aggressività × peso + per settimana × settimana. */
  aiAttackChanceBase: 0.15,
  aiAttackChanceAggression: 0.3,
  aiAttackChancePerWeek: 0.004,
  /** Quota minima di forza con cui l'IA attacca. */
  aiAttackShare: 0.55,
  /** Assalti contemporanei: uno, due per chi ha almeno tanti soldati. */
  aiBigArmy: 12,
  /** Modificatori di forza, in punti %. */
  homeDefense: 25,
  baseDefense: 50,
  armsPerSlot: 10,
  armsMax: 50,
  distancePenalty: 10,

  /** Strappare uno slot d'affari a un rivale costa questo multiplo del prezzo normale. */
  stealCostFactor: 2,
  /** Slot minimi in un ramo per contare come maggioranza (oltre ad averne più di tutti). */
  majorityMinSlots: 2,
  /** Rapporti peggiorati con chi si vede strappare uno slot. */
  stealRelation: 20,
  /** % in più sulle entrate del ramo di specializzazione. */
  specializationBonus: 30,
  /** Slot iniziali nel ramo di specializzazione. */
  specializationStartSlots: 2,
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
  /** Incarico "reclutare": soldati in più ogni settimana. */
  recruitPerWeek: 1,
  /** Incarico "spaccio": influenza settimanale nel quartiere (+1 ogni 50 di affari) e in ognuno di quelli confinanti. */
  spaccioZoneGain: 3,
  spaccioNeighborGain: 1,
  /** Rischio settimanale portato da ogni vice allo spaccio. */
  spaccioHeat: 1,
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
  /** Soldati che un vice si porta via quando si mette in proprio. */
  splitSoldiers: 2,
  dismissLoyaltyHit: 5,
  arrestLoyaltyHit: 5,
  candidateRefreshWeeks: 4,
  candidateCount: 3,

  expandBaseCost: 8,
  expandWealthCost: 2,
  expandHeat: 3,
  /** Sovrapprezzo di "Aumenta influenza" per ogni quartiere di distanza dai tuoi oltre il primo. */
  expandDistanceCost: 0.3,
  /** Per essere dominanti: almeno questa influenza e più di chiunque altro. */
  ownershipThreshold: 35,

  consolidateCost: 8,
  consolidateGain: 8,

  /** Nessun limite di azioni: il basso profilo costa il doppio a ogni uso nella stessa settimana. */
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
