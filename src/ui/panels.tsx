import { ACTIVITIES } from '../data/activities';
import { ZONES } from '../data/zones';
import {
  BALANCE,
  LOCALS,
  activeActivityCount,
  activityHeat,
  activitySlots,
  activityYield,
  actionCost,
  control,
  controlLevel,
  expandGain,
  forecast,
  heatLabel,
  ownedTerritories,
  power,
  relationLabel,
  totalInfluence,
  tribute,
  validateAction,
  zoneRisk,
  type GameAction,
  type GameState,
  type NewsItem,
  type TerritoryId,
} from '../engine';
import { money, signed, wealthLabel } from './format';

type Act = (a: GameAction) => void;

function ActionButton({ game, action, label, act, primary }: {
  game: GameState; action: GameAction; label: string; act: Act; primary?: boolean;
}) {
  const check = validateAction(game, game.playerId, action);
  return (
    <button
      className={`btn btn-small${primary ? ' btn-primary' : ''}`}
      disabled={!check.ok}
      title={check.reason}
      onClick={() => act(action)}
    >
      {label} <span className="cost">{money(actionCost(action))}</span>
    </button>
  );
}

function reasonFor(game: GameState, action: GameAction): string | undefined {
  const r = validateAction(game, game.playerId, action);
  return r.ok ? undefined : r.reason;
}

function level10(n: number): string {
  if (n >= 9) return 'Molto alta';
  if (n >= 7) return 'Alta';
  if (n >= 5) return 'Media';
  return 'Bassa';
}

// ------------------------------------------------------------------ Zona
export function ZonePanel({ game, zoneId, act }: { game: GameState; zoneId: TerritoryId | null; act: Act }) {
  if (!zoneId)
    return (
      <div className="panel">
        <p className="empty">Seleziona una zona sulla mappa. Il bordo tratteggiato indica dove puoi estendere la tua influenza.</p>
      </div>
    );

  const zone = ZONES[zoneId];
  const t = game.territories[zoneId];
  const owner = t.owner ? game.families[t.owner] : null;
  const me = game.families[game.playerId];
  const mine = t.owner === me.id;
  const myCtrl = control(game, zoneId, me.id);
  const influence = Object.entries(t.influence).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]);
  const colorOf = (id: string) => (id === LOCALS ? 'var(--land-hi)' : game.families[id].color);
  const nameOf = (id: string) => (id === LOCALS ? 'Gruppi locali' : `${game.families[id].name}${id === me.id ? ' (tu)' : ''}`);

  const expand: GameAction = { type: 'expand', territoryId: zoneId };
  const consolidate: GameAction = { type: 'consolidate', territoryId: zoneId };
  const reason = reasonFor(game, mine ? consolidate : expand);

  return (
    <div className="panel">
      <div className="panel-head">
        <span className="eyebrow">Zona</span>
        <h2>{zone.name}</h2>
        <span className="empty">{zone.flavor}</span>
        <span className="owner">
          {owner ? (
            <>
              <i className="dot" style={{ background: owner.color }} />
              {owner.isPlayer ? 'Dominata da te' : `Dominata da ${owner.name}`}
            </>
          ) : (
            'Nessuna organizzazione domina la zona'
          )}
        </span>
      </div>

      <div className="attr-grid">
        <div className="attr"><span className="label">Il tuo controllo</span><span className="value">{Math.round(myCtrl)}%</span><span className="hint">{controlLevel(myCtrl)}</span></div>
        <div className="attr"><span className="label">Valore economico</span><span className="value">{zone.wealth}/10</span><span className="hint">{level10(zone.wealth)}</span></div>
        <div className="attr"><span className="label">Rischio</span><span className="value">{zoneRisk(game, zoneId)}%</span><span className="hint">polizia {level10(zone.lawPresence).toLowerCase()}</span></div>
      </div>

      <section>
        <h3>Influenza nella zona</h3>
        <div className="influence-bar" aria-hidden="true">
          {influence.map(([id, v]) => <span key={id} style={{ width: `${v}%`, background: colorOf(id) }} />)}
        </div>
        <ul className="influence-list">
          {influence.map(([id, v]) => (
            <li key={id}>
              <i className="dot" style={{ background: colorOf(id) }} />
              {nameOf(id)}
              <span className="empty level">{id === LOCALS ? 'non organizzati' : controlLevel(v)}</span>
              <span className="num">{Math.round(v)}%</span>
            </li>
          ))}
        </ul>
        <p className="hint">
          Domina la zona l'organizzazione con più influenza, se arriva almeno al {BALANCE.ownershipThreshold}%.
        </p>
      </section>

      <section>
        <h3>Azioni</h3>
        <div className="actions">
          <ActionButton game={game} action={expand} label={`Aumenta influenza +${expandGain(me)}`} act={act} primary={!mine} />
          {mine && <ActionButton game={game} action={consolidate} label={`Rafforza zona +${BALANCE.consolidateGain}`} act={act} />}
        </div>
        {reason && <p className="hint">{reason}</p>}
        {!mine && owner && <p className="hint">Sottrarre influenza a un'organizzazione costa il doppio e peggiora i rapporti con lei.</p>}
      </section>

      <section>
        <h3>Attività</h3>
        <p className="hint">
          {mine
            ? `Membri impegnati: ${activeActivityCount(game, me.id) * BALANCE.membersPerActivity} su ${me.members} · tributo della zona ${money(tribute(game, me.id, zoneId))}/sett.`
            : 'Solo l’organizzazione dominante gestisce le attività della zona.'}
        </p>
        <ul className="activity-list">
          {zone.activities.map((aid) => {
            const a = ACTIVITIES[aid];
            const on = t.activities.includes(aid);
            const action: GameAction = { type: 'toggleActivity', territoryId: zoneId, activityId: aid };
            const check = validateAction(game, me.id, action);
            return (
              <li key={aid} className={`activity${on && mine ? ' on' : ''}`}>
                <span className="name">
                  {a.name}
                  {me.specialization === aid && <span className="spec-tag">specialità</span>}
                </span>
                {mine && (
                  <button className={`btn btn-small${on ? '' : ' btn-primary'}`} disabled={!check.ok} title={check.reason} onClick={() => act(action)}>
                    {on ? 'Chiudi' : <>Avvia <span className="cost">{money(a.cost)}</span></>}
                  </button>
                )}
                <span className="meta">
                  {mine && <span>profitto {money(activityYield(game, me.id, zoneId, aid))}/sett.</span>}
                  <span>rischio {signed(activityHeat(zoneId, aid))}</span>
                  {a.influence > 0 && <span>influenza +{a.influence}/sett.</span>}
                  <span>controllo min. {a.minControl}%</span>
                </span>
                <p className="desc">{a.description}</p>
                {mine && !on && !check.ok && <p className="desc warn">{check.reason}</p>}
                {!mine && on && owner && <p className="desc">Gestita da {owner.name}.</p>}
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}

// ------------------------------------------------------------------ Organizzazione
export function OrganizationPanel({ game, act, onSelectZone }: { game: GameState; act: Act; onSelectZone: (id: TerritoryId) => void }) {
  const me = game.families[game.playerId];
  const owned = ownedTerritories(game, me.id);
  const fc = forecast(game, me.id);
  const tributes = owned.reduce((s, t) => s + tribute(game, me.id, t.id), 0);
  const assigned = activeActivityCount(game, me.id) * BALANCE.membersPerActivity;

  return (
    <div className="panel">
      <div className="panel-head">
        <span className="eyebrow">La tua organizzazione</span>
        <h2>{me.name}</h2>
      </div>

      <div className="attr-grid four">
        <div className="attr"><span className="label">Potere</span><span className="value">{power(game, me.id)}</span></div>
        <div className="attr"><span className="label">Denaro</span><span className="value">{money(me.money)}</span></div>
        <div className="attr"><span className="label">Influenza</span><span className="value">{totalInfluence(game, me.id)}</span></div>
        <div className="attr"><span className="label">Reputazione</span><span className="value">{Math.round(me.reputation)}</span></div>
      </div>

      <section>
        <h3>Struttura</h3>
        <ul className="tree">
          <li><strong>Capo</strong> <span className="empty">· tu</span></li>
          {owned.map((t) => (
            <li key={t.id} className="branch">
              Responsabile zona {ZONES[t.id].name} <span className="empty">· da nominare</span>
            </li>
          ))}
          <li className="branch">
            Membri <span className="num">{me.members}</span>{' '}
            <span className="empty">· {assigned} sulle attività, {me.members - assigned} liberi</span>
          </li>
        </ul>
        <p className="hint">Personaggi con nome, ruoli e lealtà arriveranno con la versione 0.6.</p>
      </section>

      <section>
        <h3>Gestione</h3>
        <div className="actions">
          <ActionButton game={game} action={{ type: 'recruit' }} label={`Recluta ${BALANCE.recruitAmount} membri`} act={act} />
          <ActionButton game={game} action={{ type: 'lowProfile' }} label={`Basso profilo −${BALANCE.lowProfileHeat} rischio`} act={act} />
        </div>
        <p className="hint">
          Ogni membro costa {money(BALANCE.memberUpkeep)} a settimana; ogni attività ne impegna {BALANCE.membersPerActivity}.
          Rischio attuale: {heatLabel(me.heat).toLowerCase()}. Puoi gestire {activitySlots(me)} attività.
        </p>
      </section>

      <section>
        <h3>Bilancio previsto</h3>
        <div className="rows">
          <div className="row">Tributi dalle zone<span className="num">{money(tributes)}</span></div>
          <div className="row">Attività<span className="num">{money(fc.income - tributes)}</span></div>
          <div className="row">Mantenimento membri<span className="num">−{money(fc.upkeep)}</span></div>
          <div className="row"><strong>Saldo settimanale</strong><span className={`num ${fc.net < 0 ? 'neg' : ''}`}>{fc.net >= 0 ? '+' : ''}{money(fc.net)}</span></div>
          <div className="row">Rischio<span className="num">{signed(fc.heat)}/sett.</span></div>
        </div>
      </section>

      <section>
        <h3>Zone</h3>
        <div className="rows">
          {owned.map((t) => (
            <div className="row" key={t.id}>
              <button className="link" onClick={() => onSelectZone(t.id)}>{ZONES[t.id].name}</button>
              <span className="empty">{controlLevel(control(game, t.id, me.id))} · {t.activities.length} attività</span>
              <span className="num">{Math.round(control(game, t.id, me.id))}%</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

// ------------------------------------------------------------------ Rivali
export function RivalsPanel({ game, act, onSelectZone }: { game: GameState; act: Act; onSelectZone: (id: TerritoryId) => void }) {
  const me = game.families[game.playerId];
  const rivals = game.familyOrder
    .map((id) => game.families[id])
    .filter((f) => !f.isPlayer)
    .sort((a, b) => power(game, b.id) - power(game, a.id));

  return (
    <div className="panel">
      <div className="panel-head">
        <span className="eyebrow">Organizzazioni rivali</span>
        <p className="hint" style={{ margin: 0 }}>
          Il tuo potere: <span className="num">{power(game, me.id)}</span>. Con rapporti tesi gli attacchi alle tue zone diventano più probabili.
        </p>
      </div>

      <div className="table-wrap">
        <table className="rivals">
          <thead>
            <tr><th>Organizzazione</th><th className="r">Potere</th><th>Denaro</th><th className="r">Zone</th><th>Relazione</th></tr>
          </thead>
          <tbody>
            {rivals.map((f) => (
              <tr key={f.id} className={f.alive ? '' : 'out'}>
                <td><i className="dot" style={{ background: f.color }} /> {f.name}</td>
                <td className="r num">{f.alive ? power(game, f.id) : '—'}</td>
                <td>{wealthLabel(f.money)}</td>
                <td className="r num">{ownedTerritories(game, f.id).length}</td>
                <td>{relationLabel(me.relations[f.id] ?? 0)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {rivals.map((f) => {
        const rel = me.relations[f.id] ?? 0;
        const owned = ownedTerritories(game, f.id);
        return (
          <article key={f.id} className={`rival${f.alive ? '' : ' out'}`}>
            <div className="rival-head">
              <i className="dot" style={{ background: f.color, width: 14, height: 14 }} />
              <h3>{f.name}</h3>
              <span className="num">{f.members} membri</span>
            </div>
            <p>{f.trait}</p>
            <p>
              Zone:{' '}
              {owned.length === 0 ? 'nessuna' : owned.map((t, i) => (
                <span key={t.id}>
                  {i > 0 && ', '}
                  <button className="link inline" onClick={() => onSelectZone(t.id)}>{ZONES[t.id].name}</button>
                </span>
              ))}
            </p>
            <div className="rel">
              <span>{relationLabel(rel)}</span>
              <span className="num">{signed(rel)}</span>
              <div className="rel-track" aria-hidden="true"><i style={{ left: `calc(${(rel + 100) / 2}% - 1px)` }} /></div>
            </div>
            {f.alive && (
              <div className="actions">
                <ActionButton game={game} action={{ type: 'respect', targetId: f.id }} label={`Gesto di rispetto +${BALANCE.respectGain}`} act={act} />
              </div>
            )}
          </article>
        );
      })}
      <p className="hint">Alleanze, accordi e dichiarazioni di guerra arriveranno con la diplomazia (versione 0.8).</p>
    </div>
  );
}

// ------------------------------------------------------------------ Notizie
const KIND_LABEL: Record<NewsItem['kind'], string> = {
  territorio: 'Zone',
  economia: 'Economia',
  diplomazia: 'Rapporti',
  polizia: 'Cronaca giudiziaria',
  organizzazione: 'Organizzazioni',
};

export function NewsPanel({ game }: { game: GameState }) {
  return (
    <div className="panel">
      <div className="panel-head"><span className="eyebrow">Notiziario</span></div>
      <ul className="news-list">
        {game.news.map((n, i) => (
          <li key={i} className="news-item">
            <span className={`kicker ${n.kind}`}>Sett. {n.week} · {KIND_LABEL[n.kind]}</span>
            <h4>{n.headline}</h4>
            {n.body && <p>{n.body}</p>}
          </li>
        ))}
      </ul>
    </div>
  );
}
