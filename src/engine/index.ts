// API pubblica del motore: la UI importa solo da qui.
export * from './types';
export * from './queries';
export { BALANCE, CONTROL_LEVELS } from './balance';
export { di } from './news';
export { newGame } from './setup';
export { perform, validateAction, actionCost } from './actions';
export { endTurn } from './turn';
export {
  activePerks,
  bonuses,
  canSteal,
  freeSlots,
  racketHeat,
  racketIncome,
  racketMajority,
  racketSlots,
  slotCost,
  slotHolders,
} from './rackets';
export {
  freeSoldiers,
  fullName,
  lieutenantSlots,
  spaccioAt,
  soldiersAtWar,
  spaccioGain,
} from './organization';
export {
  attackForce,
  attackShare,
  battleAt,
  battleForces,
  defenseForce,
  garrison,
  type Force,
  type Modifier,
} from './war';
