import { RACKETS } from '../data/rackets';
import { AREAS, ZONES, ZONE_LIST } from '../data/zones';
import {
  BALANCE,
  LOCALS,
  actionCost,
  di,
  fullName,
  control,
  controlLevel,
  expandGain,
  ownedTerritories,
  racketSlots,
  spaccioAt,
  zoneDistance,
  power,
  relationLabel,
  tribute,
  validateAction,
  zoneRisk,
  type GameAction,
  type GameState,
  type NewsItem,
  type TerritoryId,
} from '../engine';
import { money, signed, wealthLabel } from './format';

export type Act = (a: GameAction) => void;

export function ActionButton({ game, action, label, act, primary }: {
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
      {label} <span className="cost">{money(actionCost(game, game.playerId, action))}</span>
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
export function ZonePanel({ game, zoneId, act, onSelectZone }: {
  game: GameState; zoneId: TerritoryId | null; act: Act; onSelectZone: (id: TerritoryId) => void;
}) {
  if (!zoneId)
    return (
      <div className="panel">
        <p className="empty">Seleziona un quartiere sulla mappa. L'influenza si aumenta solo nei quartieri neutrali (meno cara in quelli confinanti, tratteggiati); quelli controllati da altri si prendono con un assalto.</p>
      </div>
    );

  const zone = ZONES[zoneId];
  const t = game.territories[zoneId];
  const owner = t.owner ? game.families[t.owner] : null;
  const me = game.families[game.playerId];
  const mine = t.owner === me.id;
  const dealer = spaccioAt(me, zoneId);
  const distance = zoneDistance(game, me.id, zoneId);
  const myCtrl = control(game, zoneId, me.id);
  const influence = Object.entries(t.influence).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]);
  const colorOf = (id: string) => (id === LOCALS ? 'var(--land-hi)' : game.families[id].color);
  const nameOf = (id: string) => (id === LOCALS ? 'Gruppi locali' : `${game.families[id].name}${id === me.id ? ' (tu)' : ''}`);

  const expand: GameAction = { type: 'expand', territoryId: zoneId };
  const consolidate: GameAction = { type: 'consolidate', territoryId: zoneId };
  const reason = reasonFor(game, mine ? consolidate : expand);
  const areaZones = ZONE_LIST.filter((z) => z.area === zone.area);
  const areaMine = areaZones.filter((z) => game.territories[z.id].owner === me.id).length;

  return (
    <div className="panel">
      <div className="panel-head">
        <span className="eyebrow">Quartiere · {AREAS[zone.area]} · {zone.population}k abitanti</span>
        <h2>{zone.name}</h2>
        <span className="empty">{zone.flavor}</span>
        <span className="owner">
          {owner ? (
            <>
              <i className="dot" style={{ background: owner.color }} />
              {owner.isPlayer ? 'Dominato da te' : `Dominato da ${owner.name}`}
            </>
          ) : (
            'Nessuna organizzazione domina il quartiere'
          )}
        </span>
        {dealer && (
          <span className="empty">
            Allo spaccio: {fullName(dealer)}, {dealer.nickname}{mine ? '' : ' (fermo: il quartiere non è più tuo)'}
          </span>
        )}
      </div>

      <div className="attr-grid">
        <div className="attr"><span className="label">Il tuo controllo</span><span className="value">{Math.round(myCtrl)}%</span><span className="hint">{controlLevel(myCtrl)}</span></div>
        <div className="attr"><span className="label">Valore economico</span><span className="value">{zone.wealth}/10</span><span className="hint">{level10(zone.wealth)}</span></div>
        <div className="attr"><span className="label">Rischio</span><span className="value">{zoneRisk(game, zoneId)}%</span><span className="hint">polizia {level10(zone.lawPresence).toLowerCase()}</span></div>
      </div>

      <section>
        <h3>Influenza nel quartiere</h3>
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
          Domina il quartiere l'organizzazione con più influenza, se arriva almeno al {BALANCE.ownershipThreshold}%.
        </p>
      </section>

      <section>
        <h3>Azioni</h3>
        <div className="actions">
          {mine ? (
            <ActionButton game={game} action={consolidate} label={`Rafforza quartiere +${BALANCE.consolidateGain}`} act={act} primary />
          ) : owner ? null : (
            <ActionButton game={game} action={expand} label={`Aumenta influenza +${expandGain(game, me.id)}`} act={act} primary />
          )}
        </div>
        <p className="hint">
          {mine
            ? `Il quartiere è tuo: rafforzarlo costa poco, non attira attenzione e rende più difficile portartelo via.`
            : owner
              ? `Il quartiere è controllato ${di(owner)}: l'influenza non basta, si prende solo con un assalto (dal cartiglio in alto).`
              : `Quartiere neutrale: entri togliendo influenza ai gruppi locali (e, a metà resa, alle organizzazioni che non lo dominano). Lo domini dal ${BALANCE.ownershipThreshold}%. +${BALANCE.expandHeat} rischio.`}
          {!mine && !owner && distance > 1 && ` Lontano dai tuoi quartieri (${distance} di distanza): costa il ${Math.round(BALANCE.expandDistanceCost * (distance - 1) * 100)}% in più.`}
        </p>
        {reason && !(owner && !mine) && <p className="hint warn">{reason}</p>}
      </section>

      <section>
        <h3>Area {AREAS[zone.area]}</h3>
        <p className="hint">
          {areaZones.length} quartieri · ne domini {areaMine}
        </p>
        <div className="rows">
          {areaZones.map((z) => {
            const o = game.territories[z.id].owner;
            const f = o ? game.families[o] : null;
            return (
              <div className={`row${z.id === zoneId ? ' current' : ''}`} key={z.id}>
                <i className="dot" style={{ background: f ? f.color : 'var(--land-hi)' }} />
                <button className="link" onClick={() => onSelectZone(z.id)}>{z.name}</button>
                <span className="empty">{f ? (f.isPlayer ? 'tuo' : f.name) : 'libero'}</span>
                <span className="num">{f ? `${Math.round(control(game, z.id, f.id))}%` : ''}</span>
              </div>
            );
          })}
        </div>
      </section>

      <section>
        <h3>Affari legati al quartiere</h3>
        <p className="hint">
          {mine
            ? `Dominandolo puoi strappare ai rivali slot di questi rami quando il mercato è pieno. Tributo del quartiere ${money(tribute(game, me.id, zoneId))}/sett.`
            : 'Se lo domini, potrai strappare ai rivali slot di questi rami quando il mercato è pieno.'}
        </p>
        <div className="chips">
          {zone.rackets.map((rid) => (
            <span key={rid} className={`chip${me.specialization === rid ? ' spec' : ''}`}>
              {RACKETS[rid].name}
              <span className="empty"> · tuoi {racketSlots(game, me.id, rid)}/{RACKETS[rid].slots}</span>
            </span>
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
          Il tuo potere: <span className="num">{power(game, me.id)}</span>. Con rapporti tesi gli attacchi ai tuoi quartieri diventano più probabili.
        </p>
      </div>

      <div className="table-wrap">
        <table className="rivals">
          <thead>
            <tr><th>Organizzazione</th><th className="r">Potere</th><th>Denaro</th><th className="r">Quartieri</th><th>Relazione</th></tr>
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
              Quartieri:{' '}
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
  territorio: 'Quartieri',
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
