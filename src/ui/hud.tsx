// Comandi sovrapposti alla mappa a schermo intero: nastro del turno, cartigli del
// quartiere e del ramo d'affari, medaglione del capo, rivali, schermata del profilo.
// Solo presentazione: le regole restano nel motore.
import { useEffect, useRef, useState, type ReactNode } from 'react';
import bossPortrait from '../assets/boss.jpg';
import { RACKETS, RACKET_LIST } from '../data/rackets';
import { AREAS, ZONES, ZONES_TO_WIN } from '../data/zones';
import {
  BALANCE,
  LOCALS,
  actionCost,
  activePerks,
  attackForce,
  attackShare,
  battleAt,
  battleForces,
  defenseForce,
  freeSoldiers,
  garrison,
  jailRisk,
  soldiersAtWar,
  canSteal,
  control,
  di,
  expandGain,
  forecast,
  freeSlots,
  fullName,
  lieutenantSlots,
  ownedTerritories,
  policeAttention,
  power,
  racketIncome,
  racketMajority,
  racketSlots,
  slotHolders,
  spaccioGain,
  validateAction,
  weekLabel,
  type Battle,
  type Family,
  type Force,
  type GameAction,
  type GameState,
  type RacketId,
  type TerritoryId,
} from '../engine';
import { money, signedMoney, wealthLabel } from './format';
import { LieutenantFace, OrganizationPanel } from './OrganizationPanel';
import type { Act } from './panels';
import { JailScale, RacketCard, SlotBar, StreetIcon } from './RacketsPanel';

export const BOSS_PORTRAIT = bossPortrait;

// ------------------------------------------------------------------ Elementi comuni

export function CloseButton({ onClick, label = 'Chiudi', className = '' }: { onClick: () => void; label?: string; className?: string }) {
  return (
    <button className={`round-close ${className}`} onClick={onClick} aria-label={label}>
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
    </button>
  );
}

export function RoundButton({ label, onClick, primary, pressed }: { label: string; onClick: () => void; primary?: boolean; pressed?: boolean }) {
  return (
    <button className={`round-btn${primary ? ' primary' : ''}`} onClick={onClick} aria-pressed={pressed}>
      <span>{label}</span>
    </button>
  );
}

/** Pannello laterale con intestazione chiara e X tonda, come un fascicolo aperto sul tavolo. */
export function Drawer({ title, side, onClose, children }: { title: string; side: 'left' | 'right'; onClose: () => void; children: ReactNode }) {
  return (
    <aside className={`drawer ${side}`} aria-label={title}>
      <header className="drawer-head">
        <h2>{title}</h2>
        <CloseButton onClick={onClose} />
      </header>
      <div className="drawer-body">{children}</div>
    </aside>
  );
}

/** Stemma di un'organizzazione: l'iniziale del nome, senza articolo, nel suo colore. */
function Crest({ f, size = 'md' }: { f: Family; size?: 'sm' | 'md' }) {
  if (f.isPlayer)
    return <span className={`crest ${size} portrait`}><img src={BOSS_PORTRAIT} alt="" /></span>;
  const letter = f.name.replace(/^(I|Il|Lo|La|Le|Gli|L')\s*/i, '').charAt(0).toUpperCase();
  return <span className={`crest ${size}`} style={{ background: f.color }} aria-hidden="true">{letter}</span>;
}

// ------------------------------------------------------------------ Icone dei rami

const RACKET_ICON: Record<RacketId, { color: string; path: ReactNode }> = {
  furti: { color: '#c0823a', path: <><circle cx="8" cy="12" r="4" /><path d="M12 12h9M18 12v3M21 12v2" /></> },
  estorsioni: { color: '#d0a43a', path: <path d="M3 10h18M4.5 10l1.5-5h12l1.5 5M5 10v9h14v-9M10 19v-5h4v5" /> },
  stupefacenti: { color: '#4f9e70', path: <><rect x="2.5" y="8.5" width="19" height="7" rx="3.5" transform="rotate(-35 12 12)" /><path d="M9.8 8.9l4.4 6.2" /></> },
  armi: { color: '#8b93a1', path: <path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z" /> },
  riciclaggio: { color: '#3f93b8', path: <><path d="M19 9A7.5 7.5 0 0 0 5.6 7.4M5 4v4h4" /><path d="M5 15a7.5 7.5 0 0 0 13.4 1.6M19 20v-4h-4" /></> },
  corruzione: { color: '#9563c4', path: <path d="M3 9l9-5 9 5M5.5 9v9M10 9v9M14 9v9M18.5 9v9M3 20.5h18" /> },
};

export function RacketIcon({ id }: { id: RacketId }) {
  const icon = RACKET_ICON[id];
  return (
    <svg className="racket-icon" viewBox="0 0 24 24" style={{ color: icon.color }} aria-hidden="true">
      {icon.path}
    </svg>
  );
}

// ------------------------------------------------------------------ Tracciato della polizia

/** Fasce del tracciato: dove inizia ognuna (in %). Le prime 10 sono tranquille. */
const POLICE_BANDS = [0, ...[...BALANCE.jailRisk].reverse().map((r) => r.min), 100];

/**
 * Quanto la polizia sa della tua organizzazione (attenzione 0-100), con le fasce di
 * rischio galera. Ogni assalto lo fa salire di colpo: un breve lampo lo segnala.
 */
export function PoliceTracker({ game, onOpen }: { game: GameState; onOpen: () => void }) {
  const attention = policeAttention(game, game.playerId);
  const risk = jailRisk(game, game.playerId);
  const prev = useRef(attention);
  const [jump, setJump] = useState(0);
  useEffect(() => {
    if (attention > prev.current) setJump((j) => j + 1);
    prev.current = attention;
  }, [attention]);
  return (
    <button className={`police${attention >= 41 ? ' hot' : ''}`} onClick={onOpen} aria-label={`Polizia: attenzione ${attention}%`}>
      <span className="police-head">
        <span>Polizia</span>
        <strong key={jump} className={jump ? 'jump' : ''}>{attention}%</strong>
      </span>
      <span className="police-bar" aria-hidden="true">
        {POLICE_BANDS.slice(0, -1).map((from, i) => (
          <i key={from} style={{ width: `${POLICE_BANDS[i + 1] - from}%` }} className={`b${i}`} />
        ))}
        <b style={{ left: `${attention}%` }} />
      </span>
      <span className="police-sub">
        {risk.chance > 0 ? `galera ${Math.round(risk.chance * 100)}% · −${risk.soldiers} a settimana` : 'nessun rischio di galera'}
      </span>
    </button>
  );
}

// ------------------------------------------------------------------ Nastro del turno

export function TurnRibbon({ game, onEndTurn }: { game: GameState; onEndTurn: () => void }) {
  // Nessun limite di azioni: si gioca finché ci sono soldi, poi si chiude la settimana.
  const diamonds = (
    <span className="pips" aria-hidden="true">
      <i className="pip on" />
      <i className="pip on" />
    </span>
  );
  return (
    <div className="ribbon-wrap">
      <div className="ribbon">
        {diamonds}
        <h1>Settimana {game.week}</h1>
        {diamonds}
        <button className="end-turn" onClick={onEndTurn} disabled={game.status !== 'playing'}>
          Fine<br />turno
        </button>
      </div>
      <p className="ribbon-sub">
        {game.week <= BALANCE.truceWeeks
          ? `Tregua fino alla settimana ${BALANCE.truceWeeks + 1} · scegli dove muoverti`
          : `${weekLabel(game.week)} · scegli dove muoverti`}
      </p>
    </div>
  );
}

// ------------------------------------------------------------------ Cartiglio (struttura comune)

function Banner({ tile, title, subtitle, button, onClose, strip, side, note, children }: {
  tile: ReactNode; title: string; subtitle: string; button: ReactNode; onClose: () => void;
  strip: ReactNode; side: ReactNode; note?: string; children?: ReactNode;
}) {
  return (
    <div className="banner-wrap">
      <div className="banner">
        <div className="banner-tile">{tile}</div>
        <div className="banner-title">
          <h2>{title}</h2>
          <span>{subtitle}</span>
        </div>
        <div className="banner-action">{button}</div>
        <div className="banner-strip">{strip}</div>
        <div className="banner-side">{side}</div>
        <CloseButton onClick={onClose} className="banner-close" />
      </div>
      {note && <p className="banner-note">{note}</p>}
      {children}
    </div>
  );
}

function BannerButton({ game, action, label, act }: { game: GameState; action: GameAction; label: string; act: Act }) {
  const check = validateAction(game, game.playerId, action);
  return (
    <button className="banner-btn" disabled={!check.ok} title={check.reason} onClick={() => act(action)}>
      <strong>{label}</strong>
      <span>{money(actionCost(game, game.playerId, action))}</span>
    </button>
  );
}

// ------------------------------------------------------------------ Cartiglio del quartiere

export function ZoneBanner({ game, zoneId, act, onClose, onDetails }: {
  game: GameState; zoneId: TerritoryId; act: Act; onClose: () => void; onDetails: () => void;
}) {
  const [planning, setPlanning] = useState(false);
  const battle = battleAt(game, zoneId);
  if (battle) return <BattleBanner key={battle.id} game={game} battle={battle} act={act} onClose={onClose} onDetails={onDetails} />;
  const zone = ZONES[zoneId];
  const t = game.territories[zoneId];
  const me = game.families[game.playerId];
  const owner = t.owner ? game.families[t.owner] : null;
  const mine = owner?.id === me.id;
  const action: GameAction = mine ? { type: 'consolidate', territoryId: zoneId } : { type: 'expand', territoryId: zoneId };
  const check = validateAction(game, me.id, action);
  const influence = Object.entries(t.influence).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]);
  const myCtrl = Math.round(control(game, zoneId, me.id));
  const ownerText = owner
    ? `${owner.isPlayer ? 'tuo' : owner.name} ${Math.round(control(game, zoneId, owner.id))}%`
    : 'senza padrone';

  return (
    <Banner
      tile={
        <span className="tile-value" style={{ background: owner?.color ?? '#3a3b3f' }}>
          <strong>{zone.wealth}</strong>
          <small>valore</small>
        </span>
      }
      title={zone.name}
      subtitle={`${AREAS[zone.area]} · ${ownerText}${mine ? '' : ` · tu ${myCtrl}%`}`}
      button={
        <>
          {/* I quartieri degli altri si prendono solo con un assalto. */}
          {(!owner || mine) && (
            <BannerButton
              game={game}
              action={action}
              act={act}
              label={mine ? `Rafforza +${BALANCE.consolidateGain}` : `Influenza +${expandGain(game, me.id)}`}
            />
          )}
          {owner && !mine && (
            <button className="banner-btn war" aria-pressed={planning} onClick={() => setPlanning(!planning)}>
              <strong>Assalto</strong>
              <span>scegli gli uomini</span>
            </button>
          )}
        </>
      }
      onClose={onClose}
      strip={
        <div className="influence-strip" aria-label="Influenza nel quartiere">
          {influence.map(([id, v]) => (
            <span
              key={id}
              title={`${id === LOCALS ? 'Gruppi locali' : game.families[id].name} ${Math.round(v)}%`}
              style={{ width: `${v}%`, background: id === LOCALS ? '#8d8f94' : game.families[id].color }}
            />
          ))}
          {/* Soglia per dominare il quartiere, come la linea tratteggiata del riferimento. */}
          <i className="threshold" style={{ left: `${BALANCE.ownershipThreshold}%` }} />
        </div>
      }
      side={
        <button className="banner-details" onClick={onDetails}>
          {owner ? <Crest f={owner} size="sm" /> : <span className="crest sm none">?</span>}
          <span>Dettagli</span>
        </button>
      }
      note={check.ok || (owner && !mine) ? undefined : check.reason}
    >
      {planning && owner && !mine && (
        <TroopPicker game={game} zoneId={zoneId} act={act} onDone={() => setPlanning(false)} />
      )}
    </Banner>
  );
}

// ------------------------------------------------------------------ Guerra

function SwordsIcon() {
  return (
    <svg className="swords" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 4l11 11M20 4L9 15M13 17l4 4M11 17l-4 4M15 13l4 0M9 13l-4 0" />
    </svg>
  );
}

function odds(myShare: number): { label: string; tone: string } {
  if (myShare >= 0.65) return { label: 'Netto vantaggio', tone: 'good' };
  if (myShare >= 0.55) return { label: 'Favorevole', tone: 'good' };
  if (myShare >= 0.45) return { label: 'Equilibrato', tone: 'even' };
  if (myShare >= 0.35) return { label: 'Sfavorevole', tone: 'bad' };
  return { label: 'Disperato', tone: 'bad' };
}

function ForceCard({ title, color, force }: { title: string; color: string; force: Force }) {
  return (
    <div className="force" style={{ ['--c' as string]: color }}>
      <span className="force-name">{title}</span>
      <span className="force-soldiers"><strong>{force.soldiers}</strong> uomini</span>
      <ul>
        {force.mods.map((m) => (
          <li key={m.label} className={m.pct < 0 ? 'neg' : ''}>{m.pct > 0 ? '+' : '−'}{Math.abs(m.pct)}% {m.label}</li>
        ))}
      </ul>
      <span className="force-power">Forza {Math.round(force.power * 10) / 10}</span>
    </div>
  );
}

/** Scelta degli uomini per un assalto (o per rinforzare uno scontro in corso), con il confronto delle forze. */
function TroopPicker({ game, zoneId, battle, act, onDone }: {
  game: GameState; zoneId: TerritoryId; battle?: Battle; act: Act; onDone: () => void;
}) {
  const me = game.families[game.playerId];
  const free = freeSoldiers(game, me.id);
  const [n, setN] = useState(Math.max(1, Math.ceil(free * (battle ? 0.5 : 0.6))));
  const sent = Math.min(Math.max(1, n), Math.max(1, free));
  const defenderId = battle ? battle.defender : game.territories[zoneId].owner!;
  const attackerId = battle ? battle.attacker : me.id;
  const iAttack = attackerId === me.id;
  const attack = battle
    ? attackForce(game, attackerId, zoneId, battle.attackers + (iAttack ? sent : 0))
    : attackForce(game, me.id, zoneId, sent);
  const defense = battle
    ? defenseForce(game, defenderId, zoneId, battle.defenders + (iAttack ? 0 : sent))
    : defenseForce(game, defenderId, zoneId, garrison(game, defenderId));
  const share = attackShare(attack, defense);
  const o = odds(iAttack ? share : 1 - share);
  const action: GameAction = battle
    ? { type: 'reinforce', battleId: battle.id, soldiers: sent }
    : { type: 'attack', territoryId: zoneId, soldiers: sent };
  const check = validateAction(game, me.id, action);
  const a = game.families[attackerId];
  const d = game.families[defenderId];

  return (
    <div className="banner-more war-plan">
      {free === 0 ? (
        <p className="hint warn">Nessun soldato libero: recluta, o aspetta che finiscano gli scontri in corso.</p>
      ) : (
        <>
          <label className="troops">
            <span>{battle ? 'Rinforzi' : 'Uomini da mandare'}</span>
            <input type="range" min={1} max={free} value={sent} onChange={(e) => setN(Number(e.target.value))} />
            <strong className="num">{sent}/{free}</strong>
          </label>
          <div className="forces">
            <ForceCard title={iAttack ? `${a.name} (tu)` : a.name} color={a.color} force={attack} />
            <div className={`odds ${o.tone}`}>
              <SwordsIcon />
              <strong>{o.label}</strong>
              <span>{Math.round((iAttack ? share : 1 - share) * 100)}% della forza</span>
            </div>
            <ForceCard title={iAttack ? d.name : `${d.name} (tu)`} color={d.color} force={defense} />
          </div>
          <p className="hint">
            {battle
              ? 'I rinforzi entrano negli scontri della prossima settimana.'
              : `Chi difende schiera subito il ${Math.round(BALANCE.defenderGarrison * 100)}% dei suoi soldati liberi e può mandare rinforzi.`}
            {' '}Gli scontri durano più settimane: ogni settimana entrambi perdono uomini e il fronte si sposta verso il più forte.
            Mentre combattono, i soldati non spacciano. Rischio +{BALANCE.attackHeat}, poi +{BALANCE.battleHeat} a settimana.
          </p>
          <div className="actions">
            <button
              className="btn btn-primary"
              disabled={!check.ok}
              title={check.reason}
              onClick={() => {
                act(action);
                onDone();
              }}
            >
              {battle ? 'Manda i rinforzi' : 'Lancia l’assalto'} <span className="cost">{money(actionCost(game, me.id, action))}</span>
            </button>
            <button className="btn btn-small" onClick={onDone}>Annulla</button>
          </div>
          {!check.ok && <p className="hint warn">{check.reason}</p>}
        </>
      )}
    </div>
  );
}

/** Barra del fronte: a destra vince chi attacca, a sinistra chi difende. */
function FrontBar({ game, battle }: { game: GameState; battle: Battle }) {
  const a = game.families[battle.attacker];
  const d = game.families[battle.defender];
  return (
    <div className="front" aria-label={`Fronte: ${battle.front} su 100`}>
      <span className="front-side" style={{ background: d.color }}>{battle.defenders}</span>
      <div className="front-bar">
        <span style={{ width: `${100 - battle.front}%`, background: d.color }} />
        <span style={{ width: `${battle.front}%`, background: a.color }} />
        <i style={{ left: `${100 - battle.front}%` }} />
      </div>
      <span className="front-side" style={{ background: a.color }}>{battle.attackers}</span>
    </div>
  );
}

export function BattleBanner({ game, battle, act, onClose, onDetails }: {
  game: GameState; battle: Battle; act: Act; onClose: () => void; onDetails: () => void;
}) {
  const [planning, setPlanning] = useState(false);
  const me = game.families[game.playerId];
  const a = game.families[battle.attacker];
  const d = game.families[battle.defender];
  const involved = a.id === me.id || d.id === me.id;
  const { attack, defense } = battleForces(game, battle);
  const share = attackShare(attack, defense);
  const myShare = a.id === me.id ? share : 1 - share;
  const last = battle.last;
  return (
    <Banner
      tile={<span className="tile-war"><SwordsIcon /></span>}
      title={`Guerra · ${ZONES[battle.territoryId].name}`}
      subtitle={`${a.name} attacca ${d.name} · ${battle.rounds === 0 ? 'gli schieramenti si preparano' : `settimana ${battle.rounds} di ${BALANCE.battleMaxRounds}`}`}
      button={
        involved ? (
          <button className="banner-btn war" aria-pressed={planning} onClick={() => setPlanning(!planning)}>
            <strong>Rinforza</strong>
            <span>{freeSoldiers(game, me.id)} liberi</span>
          </button>
        ) : (
          <span className="banner-btn done"><strong>Osservi</strong></span>
        )
      }
      onClose={onClose}
      strip={<FrontBar game={game} battle={battle} />}
      side={
        a.id === me.id ? (
          <button className="banner-details" onClick={() => act({ type: 'retreat', battleId: battle.id })}>
            <span>Ritirati</span>
          </button>
        ) : (
          <button className="banner-details" onClick={onDetails}>
            <Crest f={d} size="sm" />
            <span>Dettagli</span>
          </button>
        )
      }
      note={
        last
          ? `Ultima settimana: ${a.name} −${last.attackerLosses}, ${d.name} −${last.defenderLosses}, fronte ${last.shift >= 0 ? '+' : '−'}${Math.abs(last.shift)}.${involved ? ` Forza attuale: ${odds(myShare).label.toLowerCase()} per te.` : ''}`
          : involved ? `Forza attuale: ${odds(myShare).label.toLowerCase()} per te (${Math.round(myShare * 100)}%).` : undefined
      }
    >
      {planning && involved && (
        <TroopPicker game={game} zoneId={battle.territoryId} battle={battle} act={act} onDone={() => setPlanning(false)} />
      )}
    </Banner>
  );
}

// ------------------------------------------------------------------ Spaccio di strada (Affari)

export function StreetBanner({ game, act, onClose }: { game: GameState; act: Act; onClose: () => void }) {
  const me = game.families[game.playerId];
  const free = freeSoldiers(game, me.id);
  const atWar = soldiersAtWar(game, me.id);
  const attention = policeAttention(game, me.id);
  const risk = jailRisk(game, me.id);
  return (
    <Banner
      tile={<span className="tile-icon"><StreetIcon /></span>}
      title="Spaccio"
      subtitle={`${free} soldati in strada · ${money(free * BALANCE.streetIncome)}/sett.${atWar ? ` · ${atWar} in guerra` : ''}`}
      button={<BannerButton game={game} action={{ type: 'recruit' }} act={act} label={`Recluta +${BALANCE.recruitAmount}`} />}
      onClose={onClose}
      strip={<JailScale game={game} />}
      side={<span className="banner-details static"><span>Polizia {attention}%</span></span>}
      note={
        risk.chance > 0
          ? `Rischio galera ogni settimana: ${Math.round(risk.chance * 100)}% di perdere ${risk.soldiers === 1 ? 'un soldato' : `${risk.soldiers} soldati`}.`
          : 'Sotto il 10% di attenzione della polizia nessuno finisce in galera.'
      }
    />
  );
}

// ------------------------------------------------------------------ Spaccio: scelta sulla mappa

/** Cartiglio mostrato mentre si sceglie sulla mappa dove mettere un vice allo spaccio. */
export function PlacementBanner({ game, lieutenantId, zoneId, onConfirm, onCancel }: {
  game: GameState; lieutenantId: string; zoneId: TerritoryId | null; onConfirm: () => void; onCancel: () => void;
}) {
  const l = game.families[game.playerId].lieutenants.find((x) => x.id === lieutenantId);
  if (!l) return null;
  const zone = zoneId ? ZONES[zoneId] : null;
  return (
    <Banner
      tile={<LieutenantFace l={l} className="big" />}
      title={zone ? `Spaccio a ${zone.name}` : 'Scegli il quartiere'}
      subtitle={`${fullName(l)}, ${l.nickname}`}
      button={
        <button className="banner-btn" disabled={!zone} onClick={onConfirm}>
          <strong>Conferma</strong>
          <span>gratis</span>
        </button>
      }
      onClose={onCancel}
      strip={
        <p className="banner-hint">
          {zone
            ? `+${spaccioGain(l)} influenza a settimana qui, +${BALANCE.spaccioNeighborGain} in ognuno dei ${zone.neighbors.length} quartieri confinanti. Rischio +${BALANCE.spaccioHeat}/sett.`
            : 'Tocca uno dei tuoi quartieri in bianco.'}
        </p>
      }
      side={
        <button className="banner-details" onClick={onCancel}>
          <span>Annulla</span>
        </button>
      }
    />
  );
}

// ------------------------------------------------------------------ Rami d'affari

/** Colonna di icone dei rami (si apre con "Affari"). */
export function RacketRail({ game, selected, street, onSelect, onStreet, onSummary, onClose }: {
  game: GameState; selected: RacketId | null; street: boolean;
  onSelect: (id: RacketId) => void; onStreet: () => void; onSummary: () => void; onClose: () => void;
}) {
  const me = game.families[game.playerId];
  return (
    <nav className="rail" aria-label="Rami d'affari">
      <ul>
        <li>
          <button className="rail-item" aria-pressed={street} onClick={onStreet} title="Spaccio: i soldati in strada">
            <StreetIcon />
            <span className="rail-name">Spaccio</span>
            <span className="rail-level">{freeSoldiers(game, me.id)}</span>
          </button>
        </li>
        {RACKET_LIST.map((r) => {
          const level = racketSlots(game, me.id, r.id);
          const open = level > 0 || freeSlots(game, r.id) > 0 || canSteal(game, me.id, r.id);
          return (
            <li key={r.id}>
              <button
                className={`rail-item${open ? '' : ' locked'}`}
                aria-pressed={selected === r.id}
                onClick={() => onSelect(r.id)}
                title={r.name}
              >
                <RacketIcon id={r.id} />
                <span className="rail-name">{r.name}</span>
                {level > 0 && <span className="rail-level">{level}</span>}
              </button>
            </li>
          );
        })}
        <li>
          <button className="rail-item summary" onClick={onSummary} title="Riepilogo degli affari">
            <svg className="racket-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h10" /></svg>
            <span className="rail-name">Riepilogo</span>
          </button>
        </li>
      </ul>
      <CloseButton onClick={onClose} className="rail-close" />
    </nav>
  );
}

export function RacketBanner({ game, racketId, act, onClose, onSelectZone }: {
  game: GameState; racketId: RacketId; act: Act; onClose: () => void; onSelectZone: (id: TerritoryId) => void;
}) {
  const [open, setOpen] = useState(false);
  const def = RACKETS[racketId];
  const me = game.families[game.playerId];
  const mine = racketSlots(game, me.id, racketId);
  const majority = racketMajority(game, racketId);
  // Slot libero se c'è; altrimenti si punta a chi ne ha di più (gli altri sono nei dettagli).
  const victim = freeSlots(game, racketId) > 0
    ? undefined
    : slotHolders(game, racketId).find((h) => h.familyId !== me.id)?.familyId;
  const take: GameAction = { type: 'takeSlot', racketId, from: victim };
  const check = validateAction(game, me.id, take);
  const majorityText = majority ? (majority === me.id ? 'maggioranza tua' : `maggioranza ${game.families[majority].name}`) : 'nessuna maggioranza';

  return (
    <Banner
      tile={<span className="tile-icon"><RacketIcon id={racketId} /></span>}
      title={def.name}
      subtitle={`Tuoi ${mine}/${def.slots} · ${money(racketIncome(game, me.id, racketId))}/sett. · ${majorityText}`}
      button={
        victim || freeSlots(game, racketId) > 0
          ? <BannerButton game={game} action={take} act={act} label={victim ? `Strappa a ${game.families[victim].name}` : 'Prendi slot'} />
          : <span className="banner-btn done"><strong>Tutti tuoi</strong></span>
      }
      onClose={onClose}
      strip={<SlotBar game={game} racketId={racketId} className="slot-bar big" />}
      side={
        <button className="banner-details" onClick={() => setOpen(!open)} aria-expanded={open}>
          <span className="chev">{open ? '▴' : '▾'}</span>
          <span>Dettagli</span>
        </button>
      }
      note={check.ok ? undefined : check.reason}
    >
      {open && (
        <div className="banner-more">
          <ul className="racket-list">
            <RacketCard game={game} def={def} act={act} onSelectZone={onSelectZone} />
          </ul>
        </div>
      )}
    </Banner>
  );
}

// ------------------------------------------------------------------ Il capo e i rivali

export function PlayerHud({ game, onProfile }: { game: GameState; onProfile: () => void }) {
  const me = game.families[game.playerId];
  const fc = forecast(game, me.id);
  const owned = ownedTerritories(game, me.id).length;
  const heat = Math.round(me.heat);
  return (
    <div className="hud-player">
      <span className={`hud-net${fc.net < 0 ? ' neg' : ''}`}>{signedMoney(fc.net)}<small>/sett.</small></span>
      <button className="hud-box left" onClick={onProfile}>
        <strong>{owned}<small>/{ZONES_TO_WIN}</small></strong>
        <span>Quartieri</span>
      </button>
      <button className="hud-portrait" onClick={onProfile} aria-label="Profilo del capo e della banda">
        <span className="hud-profile-tag">Profilo</span>
        <img src={BOSS_PORTRAIT} alt="" />
        <span className={`hud-risk${heat >= 60 ? ' hot' : ''}`} title="Rischio">{heat}</span>
      </button>
      <button className="hud-box right" onClick={onProfile}>
        <strong className={me.money < 0 ? 'neg' : ''}>{money(me.money)}</strong>
        <span>Cassa</span>
      </button>
    </div>
  );
}

/** In basso si vedono solo i rivali più potenti; gli altri sono nel pannello "Rivali". */
const RIVALS_SHOWN = 3;

export function RivalChips({ game, onOpen }: { game: GameState; onOpen: () => void }) {
  const rivals = game.familyOrder
    .map((id) => game.families[id])
    .filter((f) => !f.isPlayer && f.alive)
    .sort((a, b) => power(game, b.id) - power(game, a.id));
  const hidden = rivals.length - RIVALS_SHOWN;
  return (
    <div className="hud-rivals">
      {rivals.slice(0, RIVALS_SHOWN).map((f) => (
        <button
          key={f.id}
          className="rival-chip"
          onClick={onOpen}
          style={{ ['--c' as string]: f.color }}
          aria-label={`${f.name}: ${ownedTerritories(game, f.id).length} quartieri`}
        >
          <span className="rival-box">
            <strong>{ownedTerritories(game, f.id).length}</strong>
            <small>{wealthLabel(f.money)}</small>
          </span>
          <Crest f={f} />
        </button>
      ))}
      {hidden > 0 && (
        <button className="rival-more" onClick={onOpen} aria-label={`Altre ${hidden} organizzazioni rivali`}>
          +{hidden}
        </button>
      )}
    </div>
  );
}

// ------------------------------------------------------------------ Profilo

type ProfileTab = 'banda' | 'quadro';

/** Vantaggi attivi e problemi aperti, come la scheda bonus/penalità del riferimento. */
function Outlook({ game }: { game: GameState }) {
  const me = game.families[game.playerId];
  const fc = forecast(game, me.id);
  const good: { value: string; text: string }[] = [];
  const bad: { value: string; text: string }[] = [];

  good.push({ value: `+${BALANCE.specializationBonus}%`, text: `Specialità: ${RACKETS[me.specialization].name}` });
  for (const r of RACKET_LIST)
    for (const p of activePerks(game, me.id, r.id)) good.push({ value: r.name.split(' ')[0], text: `${p.name} — ${p.description}` });
  for (const r of RACKET_LIST)
    if (racketMajority(game, r.id) === me.id && r.majorityBonus > 0)
      good.push({ value: `+${money(r.majorityBonus)}`, text: `Maggioranza in ${r.name.toLowerCase()}` });
  for (const l of me.lieutenants) {
    const job = l.assignment;
    if (job?.type === 'reclutare') good.push({ value: `+${BALANCE.recruitPerWeek}`, text: `Soldati a settimana: ${fullName(l)} recluta` });
    if (job?.type === 'spaccio') good.push({ value: ZONES[job.territoryId].name, text: `${fullName(l)} è allo spaccio` });
  }
  for (const b of game.battles)
    if (b.attacker === me.id) good.push({ value: `${b.attackers} uomini`, text: `Assalto in corso a ${ZONES[b.territoryId].name}` });
  if (game.week <= BALANCE.truceWeeks) good.push({ value: 'Tregua', text: `Nessuno può portarti via quartieri fino alla settimana ${BALANCE.truceWeeks + 1}` });

  for (const l of me.lieutenants)
    if (l.loyalty < BALANCE.loyaltyWarn) bad.push({ value: `${Math.round(l.loyalty)}`, text: `Lealtà bassa: ${fullName(l)}, ${l.nickname}` });
  // Soglie di sequestri (60) e arresti (85): vedi turn.ts.
  if (me.heat >= 85) bad.push({ value: `${Math.round(me.heat)}%`, text: 'Rischio altissimo: arresti possibili' });
  else if (me.heat >= 60) bad.push({ value: `${Math.round(me.heat)}%`, text: 'Rischio alto: sequestri possibili' });
  for (const b of game.battles)
    if (b.defender === me.id) bad.push({ value: `${b.defenders} uomini`, text: `Sotto assalto ${di(game.families[b.attacker])} a ${ZONES[b.territoryId].name}` });
  const risk = jailRisk(game, me.id);
  if (risk.chance > 0) bad.push({ value: `${Math.round(risk.chance * 100)}%`, text: `Rischio galera in strada ogni settimana (−${risk.soldiers})` });
  if (fc.net < 0) bad.push({ value: money(fc.net), text: 'Il bilancio settimanale è in rosso' });
  if (me.brokeWeeks > 0) bad.push({ value: `${me.brokeWeeks}/4`, text: 'Settimane con la cassa negativa' });
  if (fc.skimmed > 0) bad.push({ value: money(fc.skimmed), text: 'Trattenuti ogni settimana dai vice infedeli' });
  for (const l of me.lieutenants) {
    const job = l.assignment;
    if (job?.type === 'spaccio' && game.territories[job.territoryId].owner !== me.id)
      bad.push({ value: ZONES[job.territoryId].name, text: `Quartiere perso: lo spaccio di ${fullName(l)} è fermo` });
  }

  const column = (title: string, cls: string, rows: typeof good, empty: string) => (
    <section className={`outlook-col ${cls}`}>
      <h3>{title}</h3>
      {rows.length === 0 ? (
        <p className="empty">{empty}</p>
      ) : (
        <ul>
          {rows.map((r, i) => (
            <li key={i}>
              <i aria-hidden="true">{cls === 'good' ? '+' : '−'}</i>
              <strong>{r.value}</strong>
              <span>{r.text}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );

  return (
    <div className="panel outlook">
      {column('Vantaggi', 'good', good, 'Nessun vantaggio attivo.')}
      {column('Problemi', 'bad', bad, 'Nessun problema, per ora.')}
    </div>
  );
}

export function ProfileModal({ game, act, onClose, onPlaceSpaccio }: {
  game: GameState; act: Act; onClose: () => void; onPlaceSpaccio: (lieutenantId: string) => void;
}) {
  const [tab, setTab] = useState<ProfileTab>('banda');
  const me = game.families[game.playerId];
  const fc = forecast(game, me.id);
  const heat = Math.round(me.heat);
  const attention = policeAttention(game, me.id);
  const tiles: { label: string; value: string; sub?: string; tone?: string }[] = [
    { label: 'Cassa', value: money(me.money), sub: `${signedMoney(fc.net)}/sett.`, tone: fc.net < 0 ? 'neg' : 'pos' },
    { label: 'Soldati', value: `${me.members}`, sub: soldiersAtWar(game, me.id) ? `${soldiersAtWar(game, me.id)} in guerra` : `${money(fc.street)}/sett. in strada` },
    { label: 'Vice capi', value: `${me.lieutenants.length}/${lieutenantSlots(me)}` },
    { label: 'Quartieri', value: `${ownedTerritories(game, me.id).length}`, sub: `obiettivo ${ZONES_TO_WIN}` },
    { label: 'Potere', value: `${power(game, me.id)}` },
    { label: 'Reputazione', value: `${Math.round(me.reputation)}` },
    { label: 'Rischio', value: `${heat}%`, tone: heat >= 60 ? 'neg' : undefined },
    { label: 'Attenzione', value: `${attention}%`, tone: attention >= 60 ? 'neg' : undefined },
  ];
  return (
    <div className="overlay profile-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="profile" role="dialog" aria-modal="true" aria-label={`Profilo: ${me.name}`}>
        <header className="profile-head">
          <img className="profile-face" src={BOSS_PORTRAIT} alt="Ritratto del capo" />
          <div className="profile-id">
            <span className="eyebrow">Il capo</span>
            <h2>{me.name}</h2>
          </div>
          <dl className="stat-tiles">
            {tiles.map((t) => (
              <div key={t.label} className="stat-tile">
                <dt>{t.label}</dt>
                <dd className={t.tone ?? ''}>{t.value}</dd>
                {t.sub && <span className={`stat-sub ${t.tone ?? ''}`}>{t.sub}</span>}
              </div>
            ))}
          </dl>
        </header>
        <div className="profile-body">
          <div className="tabs" role="tablist">
            <button role="tab" className="tab" aria-selected={tab === 'banda'} onClick={() => setTab('banda')}>La banda</button>
            <button role="tab" className="tab" aria-selected={tab === 'quadro'} onClick={() => setTab('quadro')}>Vantaggi e problemi</button>
          </div>
          {tab === 'banda'
            ? <OrganizationPanel game={game} act={act} onPlaceSpaccio={onPlaceSpaccio} />
            : <Outlook game={game} />}
        </div>
        <CloseButton onClick={onClose} className="profile-close" />
      </div>
    </div>
  );
}
