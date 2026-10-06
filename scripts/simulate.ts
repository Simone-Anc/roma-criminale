// Simulazione headless per il bilanciamento: npm run simulate
// Il giocatore viene pilotato dalla stessa IA delle organizzazioni rivali.
import { START_OPTIONS, playerDef } from '../src/data/organizations';
import { runAi } from '../src/engine/ai';
import { endTurn, newGame, ownedTerritories, power, type GameState } from '../src/engine';
import { Rng } from '../src/engine/rng';

function play(startIdx: number, seed: number, passive: boolean) {
  let s: GameState = newGame(playerDef('Il Gruppo', START_OPTIONS[startIdx]), seed);
  while (s.status === 'playing') {
    if (!passive) {
      s = structuredClone(s);
      const rng = new Rng(s.rngState);
      s.families[s.playerId].aggression = 0.6;
      runAi(s, s.playerId, rng);
      s.rngState = rng.state;
    }
    s = endTurn(s);
  }
  return s;
}

for (const passive of [false, true]) {
  console.log(passive ? '\n== Giocatore passivo ==' : '== Giocatore guidato dall’IA ==');
  START_OPTIONS.forEach((opt, i) => {
    const results: Record<string, number> = {};
    let weeks = 0;
    const N = 40;
    for (let k = 0; k < N; k++) {
      const s = play(i, 500 + k, passive);
      const key = `${s.status}: ${s.endReason}`;
      results[key] = (results[key] ?? 0) + 1;
      weeks += s.week;
    }
    console.log(`partenza ${opt.zone.padEnd(9)} durata media ${Math.round(weeks / N)} sett.`);
    for (const [k, v] of Object.entries(results).sort((a, b) => b[1] - a[1])) console.log(`   ${v}x ${k}`);
  });
}

let s = newGame(playerDef('Il Gruppo', START_OPTIONS[0]), 9);
for (let w = 0; w < 50 && s.status === 'playing'; w++) {
  s = endTurn(s);
  if (w % 10 === 9)
    console.log(`sett ${s.week}: ` + s.familyOrder.map((id) => {
      const f = s.families[id];
      return `${f.name} €${Math.round(f.money)} m${f.members} r${Math.round(f.heat)} z${ownedTerritories(s, id).length} p${power(s, id)}`;
    }).join(' | '));
}
