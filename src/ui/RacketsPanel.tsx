import { RACKET_LIST } from '../data/rackets';
import { ZONES, ZONE_LIST } from '../data/zones';
import {
  canReach,
  effectiveLevel,
  forecast,
  membersBusy,
  racketCap,
  racketHeat,
  racketIncome,
  racketLevel,
  racketNetwork,
  validateAction,
  type GameAction,
  type GameState,
  type RacketDef,
  type TerritoryId,
} from '../engine';
import { money, signed } from './format';
import { ActionButton, type Act } from './panels';

/** Quartieri adatti al ramo che il giocatore può raggiungere ma non domina ancora. */
function nextZones(game: GameState, def: RacketDef): TerritoryId[] {
  return ZONE_LIST.filter(
    (z) => z.rackets.includes(def.id) && game.territories[z.id].owner !== game.playerId && canReach(game, game.playerId, z.id),
  ).map((z) => z.id);
}

export function RacketCard({ game, def, act, onSelectZone }: {
  game: GameState; def: RacketDef; act: Act; onSelectZone: (id: TerritoryId) => void;
}) {
  const me = game.families[game.playerId];
  const level = racketLevel(game, me.id, def.id);
  const active = effectiveLevel(game, me.id, def.id);
  const cap = racketCap(game, me.id, def.id);
  const network = racketNetwork(game, me.id, def.id);
  const upgrade: GameAction = { type: 'upgradeRacket', racketId: def.id };
  const downgrade: GameAction = { type: 'downgradeRacket', racketId: def.id };
  const check = validateAction(game, me.id, upgrade);
  const targets = nextZones(game, def);
  const zoneLinks = (ids: TerritoryId[]) => (
    <>
      {ids.slice(0, 4).map((z, i) => (
        <span key={z}>
          {i > 0 && ', '}
          <button className="link inline" onClick={() => onSelectZone(z)}>{ZONES[z].name}</button>
        </span>
      ))}
      {ids.length > 4 && ` e altri ${ids.length - 4}`}
    </>
  );

  // Ramo che non puoi ancora avviare: solo il nome e dove trovare un quartiere adatto.
  if (level === 0 && cap === 0)
    return (
      <li className="racket locked">
        <div className="racket-head">
          <span className="name">{def.name}</span>
          <span className="num level">{money(def.income)}/liv. · rischio {signed(def.heat)}</span>
        </div>
        <p className="desc">
          {def.description} Serve un quartiere adatto{targets.length > 0 ? <>: {zoneLinks(targets)}</> : ', per ora lontano da te.'}
        </p>
      </li>
    );

  return (
    <li className={`racket${active > 0 ? ' on' : ''}`}>
      <div className="racket-head">
        <span className="name">
          {def.name}
          {me.specialization === def.id && <span className="spec-tag">specialità</span>}
        </span>
        <span className="num level">Liv. {level}/{def.maxLevel}</span>
      </div>
      <div className="level-pips" aria-hidden="true">
        {Array.from({ length: def.maxLevel }, (_, i) => (
          <i key={i} className={i < active ? 'on' : i < level ? 'idle' : i < cap ? 'open' : ''} />
        ))}
      </div>
      <p className="desc">{def.description}</p>
      <span className="meta">
        <span>entrate {money(racketIncome(game, me.id, def.id))}/sett.</span>
        <span>rischio {signed(racketHeat(game, me.id, def.id))}/sett.</span>
        <span>per livello {money(def.income)} · {signed(def.heat)}</span>
      </span>
      <p className="desc">
        Rete: {network.length === 0 ? 'nessun quartiere adatto' : network.map((z) => ZONES[z].name).join(', ')}
        {cap > 0 && cap < def.maxLevel && ` · fino al livello ${cap}`}
      </p>
      {level > active && (
        <p className="desc warn">
          {level - active} {level - active === 1 ? 'livello fermo' : 'livelli fermi'}: la rete non basta più a sostenerli.
        </p>
      )}
      {cap < def.maxLevel && targets.length > 0 && <p className="desc">Per crescere: {zoneLinks(targets)}</p>}

      <ul className="perks">
        {def.perks.map((p) => (
          <li key={p.level} className={active >= p.level ? 'on' : ''}>
            <span className="num">Liv. {p.level}</span>
            <span><strong>{p.name}</strong> — {p.description}</span>
          </li>
        ))}
      </ul>

      <div className="actions">
        {level < def.maxLevel && <ActionButton game={game} action={upgrade} label="Potenzia" act={act} primary />}
        {level > 0 && (
          <button className="btn btn-small" onClick={() => act(downgrade)} title="Libera un membro e riduce il rischio. Non restituisce l’investimento.">
            Riduci
          </button>
        )}
      </div>
      {level < def.maxLevel && !check.ok && <p className="desc warn">{check.reason}</p>}
    </li>
  );
}

// ------------------------------------------------------------------ Affari
export function RacketsPanel({ game, act, onSelectZone }: {
  game: GameState; act: Act; onSelectZone: (id: TerritoryId) => void;
}) {
  const me = game.families[game.playerId];
  const fc = forecast(game, me.id);
  const heat = RACKET_LIST.reduce((s, r) => s + racketHeat(game, me.id, r.id), 0);
  // Prima i rami avviati, poi quelli che si possono avviare, infine gli altri.
  const sorted = [...RACKET_LIST].sort((a, b) => {
    const rank = (r: RacketDef) => (racketLevel(game, me.id, r.id) > 0 ? 0 : racketCap(game, me.id, r.id) > 0 ? 1 : 2);
    return rank(a) - rank(b);
  });

  return (
    <div className="panel">
      <div className="panel-head">
        <span className="eyebrow">Rami d'affari</span>
        <h2>Affari</h2>
        <span className="empty">
          Ogni livello rende ogni settimana e impegna un membro; potenziare costa un'azione. A certi livelli si
          sbloccano vantaggi permanenti. Un ramo cresce solo se domini quartieri adatti.
        </span>
      </div>

      <div className="attr-grid">
        <div className="attr"><span className="label">Entrate affari</span><span className="value">{money(fc.rackets)}</span><span className="hint">a settimana</span></div>
        <div className="attr"><span className="label">Membri impegnati</span><span className="value">{membersBusy(game, me.id)}/{me.members}</span><span className="hint">uno per livello</span></div>
        <div className="attr"><span className="label">Rischio dagli affari</span><span className="value">{signed(heat)}</span><span className="hint">a settimana</span></div>
      </div>

      <ul className="racket-list">
        {sorted.map((def) => (
          <RacketCard key={def.id} game={game} def={def} act={act} onSelectZone={onSelectZone} />
        ))}
      </ul>
    </div>
  );
}
