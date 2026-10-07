import { RACKET_LIST } from '../data/rackets';
import { ZONES, ZONE_LIST } from '../data/zones';
import {
  BALANCE,
  canSteal,
  freeSoldiers,
  jailRisk,
  policeAttention,
  soldiersAtWar,
  forecast,
  freeSlots,
  racketHeat,
  racketIncome,
  racketMajority,
  racketSlots,
  slotHolders,
  validateAction,
  zoneDistance,
  type GameAction,
  type GameState,
  type RacketDef,
  type RacketId,
  type TerritoryId,
} from '../engine';
import { money, signed } from './format';
import { ActionButton, type Act } from './panels';

/** Gli slot del ramo in città, colorati per organizzazione: prima chi ne ha di più, poi i liberi. */
export function SlotBar({ game, racketId, className = 'slot-bar' }: { game: GameState; racketId: RacketId; className?: string }) {
  const holders = slotHolders(game, racketId);
  const cells: { color?: string; mine: boolean; title: string }[] = [];
  for (const h of holders) {
    const f = game.families[h.familyId];
    for (let i = 0; i < h.slots; i++) cells.push({ color: f.color, mine: f.isPlayer, title: f.isPlayer ? 'Tuo' : f.name });
  }
  for (let i = freeSlots(game, racketId); i > 0; i--) cells.push({ mine: false, title: 'Libero' });
  return (
    <div className={className} role="img" aria-label={holders.map((h) => `${game.families[h.familyId].name} ${h.slots}`).join(', ') + `, liberi ${freeSlots(game, racketId)}`}>
      {cells.map((c, i) => (
        <i key={i} className={c.mine ? 'mine' : c.color ? '' : 'free'} style={c.color ? { background: c.color } : undefined} title={c.title} />
      ))}
    </div>
  );
}

/** Quartieri adatti al ramo, non tuoi, dal più vicino: dominarne uno permette di strappare slot. */
function stealZones(game: GameState, def: RacketDef): TerritoryId[] {
  return ZONE_LIST.filter((z) => z.rackets.includes(def.id) && game.territories[z.id].owner !== game.playerId)
    .sort((a, b) => zoneDistance(game, game.playerId, a.id) - zoneDistance(game, game.playerId, b.id))
    .map((z) => z.id);
}

export function RacketCard({ game, def, act, onSelectZone }: {
  game: GameState; def: RacketDef; act: Act; onSelectZone: (id: TerritoryId) => void;
}) {
  const me = game.families[game.playerId];
  const mine = racketSlots(game, me.id, def.id);
  const free = freeSlots(game, def.id);
  const majority = racketMajority(game, def.id);
  const rivals = slotHolders(game, def.id).filter((h) => h.familyId !== me.id);
  const take: GameAction = { type: 'takeSlot', racketId: def.id };
  const release: GameAction = { type: 'releaseSlot', racketId: def.id };
  const check = validateAction(game, me.id, take);
  const targets = stealZones(game, def);

  return (
    <li className={`racket${mine > 0 ? ' on' : ''}`}>
      <div className="racket-head">
        <span className="name">
          {def.name}
          {me.specialization === def.id && <span className="spec-tag">specialità</span>}
        </span>
        <span className="num level">Tuoi {mine}/{def.slots}</span>
      </div>
      <SlotBar game={game} racketId={def.id} />
      <p className="desc">{def.description}</p>
      <span className="meta">
        <span>entrate {money(racketIncome(game, me.id, def.id))}/sett.</span>
        <span>rischio {signed(racketHeat(game, me.id, def.id))}/sett.</span>
        <span>per slot {money(def.income)} · {signed(def.heat)}</span>
        {def.majorityBonus > 0 && <span>maggioranza +{money(def.majorityBonus)}</span>}
      </span>
      <p className="desc">
        Maggioranza:{' '}
        {majority ? (majority === me.id ? <strong>tua</strong> : game.families[majority].name) : `nessuno (servono almeno ${BALANCE.majorityMinSlots} slot e più di tutti)`}
        {' · '}liberi {free}
      </p>

      <ul className="perks">
        {def.perks.map((p) => (
          <li key={p.slots} className={mine >= p.slots ? 'on' : ''}>
            <span className="num">{p.slots} slot</span>
            <span><strong>{p.name}</strong> — {p.description}</span>
          </li>
        ))}
      </ul>

      <div className="actions">
        {free > 0 ? (
          <ActionButton game={game} action={take} label="Prendi uno slot" act={act} primary />
        ) : (
          rivals.map((h) => (
            <ActionButton
              key={h.familyId}
              game={game}
              action={{ type: 'takeSlot', racketId: def.id, from: h.familyId }}
              label={`Strappa a ${game.families[h.familyId].name}`}
              act={act}
            />
          ))
        )}
        {mine > 0 && (
          <button className="btn btn-small" onClick={() => act(release)} title="Rimette lo slot sul mercato e riduce il rischio. Non restituisce l’investimento.">
            Lascia uno slot
          </button>
        )}
      </div>
      {free > 0 && !check.ok && <p className="desc warn">{check.reason}</p>}
      {free === 0 && rivals.length > 0 && !canSteal(game, me.id, def.id) && (
        <p className="desc warn">
          Mercato pieno. Per strappare uno slot devi dominare un quartiere adatto
          {targets.length > 0 && (
            <>
              , per esempio{' '}
              {targets.slice(0, 3).map((z, i) => (
                <span key={z}>
                  {i > 0 && ', '}
                  <button className="link inline" onClick={() => onSelectZone(z)}>{ZONES[z].name}</button>
                </span>
              ))}
            </>
          )}
          .
        </p>
      )}
    </li>
  );
}

export function StreetIcon() {
  return (
    <svg className="racket-icon" viewBox="0 0 24 24" style={{ color: '#d05a4a' }} aria-hidden="true">
      <circle cx="8" cy="7" r="3" /><circle cx="16" cy="7" r="3" />
      <path d="M2.5 20c0-3.6 2.5-6 5.5-6s5.5 2.4 5.5 6M10.5 20c0-3.6 2.5-6 5.5-6s5.5 2.4 5.5 6" />
    </svg>
  );
}

/** Fasce di rischio della tabella: attenzione della polizia → galera. */
export function JailScale({ game }: { game: GameState }) {
  const attention = policeAttention(game, game.playerId);
  const bands = [...BALANCE.jailRisk].reverse();
  return (
    <div className="jail-scale" aria-label={`Attenzione della polizia ${attention}%`}>
      {bands.map((b, i) => {
        const next = bands[i + 1]?.min ?? 101;
        const on = attention >= b.min && attention < next;
        return (
          <span key={b.min} className={on ? 'on' : ''} title={`${b.min}-${next - 1}%`}>
            <strong>{Math.round(b.chance * 100)}%</strong>
            <small>−{b.soldiers}</small>
          </span>
        );
      })}
    </div>
  );
}

/** Lo spaccio di strada: tutti i soldati non impegnati negli assalti. */
function StreetCard({ game, act }: { game: GameState; act: Act }) {
  const me = game.families[game.playerId];
  const free = freeSoldiers(game, me.id);
  const atWar = soldiersAtWar(game, me.id);
  const risk = jailRisk(game, me.id);
  return (
    <li className="racket on">
      <div className="racket-head">
        <span className="name">Spaccio</span>
        <span className="num level">{free} in strada{atWar ? ` · ${atWar} in guerra` : ''}</span>
      </div>
      <p className="desc">
        Tutti i soldati che non combattono sono in strada: ognuno rende {money(BALANCE.streetIncome)} a settimana.
        Più la polizia ti tiene d'occhio, più è facile che qualcuno finisca in galera.
      </p>
      <span className="meta">
        <span>entrate {money(free * BALANCE.streetIncome)}/sett.</span>
        <span>polizia {policeAttention(game, me.id)}%</span>
        <span>{risk.chance > 0 ? `galera ${Math.round(risk.chance * 100)}% · −${risk.soldiers}` : 'nessun rischio di galera'}</span>
      </span>
      <JailScale game={game} />
      <div className="actions">
        <ActionButton game={game} action={{ type: 'recruit' }} label={`Recluta ${BALANCE.recruitAmount} soldati`} act={act} primary />
        <ActionButton game={game} action={{ type: 'lowProfile' }} label={`Basso profilo −${BALANCE.lowProfileHeat} rischio`} act={act} />
      </div>
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
  const held = RACKET_LIST.reduce((s, r) => s + racketSlots(game, me.id, r.id), 0);
  // Prima i rami in cui hai slot, poi quelli con slot liberi, infine gli altri.
  const sorted = [...RACKET_LIST].sort((a, b) => {
    const rank = (r: RacketDef) => (racketSlots(game, me.id, r.id) > 0 ? 0 : freeSlots(game, r.id) > 0 ? 1 : 2);
    return rank(a) - rank(b);
  });

  return (
    <div className="panel">
      <div className="panel-head">
        <span className="eyebrow">Rami d'affari</span>
        <h2>Affari</h2>
        <span className="empty">
          Ogni ramo ha un numero fisso di slot in città, conteso da tutte le organizzazioni. Ogni slot rende ogni
          settimana; chi ne ha più di tutti incassa anche il premio di maggioranza.
          Quando non ce ne sono più di liberi, chi domina un quartiere adatto può strapparli ai rivali, al doppio del prezzo.
        </span>
      </div>

      <div className="attr-grid">
        <div className="attr"><span className="label">Entrate affari</span><span className="value">{money(fc.rackets)}</span><span className="hint">a settimana</span></div>
        <div className="attr"><span className="label">Slot posseduti</span><span className="value">{held}</span><span className="hint">in tutti i rami</span></div>
        <div className="attr"><span className="label">Rischio dagli affari</span><span className="value">{signed(heat)}</span><span className="hint">a settimana</span></div>
      </div>

      <ul className="racket-list">
        <StreetCard game={game} act={act} />
        {sorted.map((def) => (
          <RacketCard key={def.id} game={game} def={def} act={act} onSelectZone={onSelectZone} />
        ))}
      </ul>
    </div>
  );
}
