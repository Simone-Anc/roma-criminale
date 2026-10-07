// Comandi sovrapposti alla mappa a schermo intero: nastro del turno, cartigli del
// quartiere e del ramo d'affari, medaglione del capo, rivali, schermata del profilo.
// Solo presentazione: le regole restano nel motore.
import { useState, type ReactNode } from 'react';
import bossPortrait from '../assets/boss.jpg';
import { RACKETS, RACKET_LIST } from '../data/rackets';
import { AREAS, ZONES, ZONE_LIST, ZONES_TO_WIN } from '../data/zones';
import {
  BALANCE,
  LOCALS,
  actionCost,
  actionsPerTurn,
  activePerks,
  control,
  effectiveLevel,
  expandGain,
  forecast,
  fullName,
  ownedTerritories,
  policeAttention,
  racketCap,
  racketIncome,
  racketLevel,
  racketNetwork,
  unledSoldiers,
  validateAction,
  weekLabel,
  type Family,
  type GameAction,
  type GameState,
  type RacketId,
  type TerritoryId,
} from '../engine';
import { money, signedMoney, wealthLabel } from './format';
import { OrganizationPanel } from './OrganizationPanel';
import type { Act } from './panels';
import { RacketCard } from './RacketsPanel';

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

// ------------------------------------------------------------------ Nastro del turno

export function TurnRibbon({ game, onEndTurn }: { game: GameState; onEndTurn: () => void }) {
  const total = Math.max(actionsPerTurn(game, game.playerId), game.actionsLeft);
  const pips = (from: number, to: number) =>
    Array.from({ length: to - from }, (_, i) => <i key={i} className={`pip${from + i < game.actionsLeft ? ' on' : ''}`} />);
  const half = Math.ceil(total / 2);
  return (
    <div className="ribbon-wrap">
      <div className="ribbon">
        <span className="pips" aria-hidden="true">{pips(0, half)}</span>
        <h1>Settimana {game.week}</h1>
        <span className="pips" aria-hidden="true">{pips(half, total)}</span>
        <button className="end-turn" onClick={onEndTurn} disabled={game.status !== 'playing'}>
          Fine<br />turno
        </button>
      </div>
      <p className="ribbon-sub">
        <span className="sr">{game.actionsLeft} azioni rimaste su {total}. </span>
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
      <span>{money(actionCost(game, game.playerId, action))} · {game.actionsLeft} {game.actionsLeft === 1 ? 'azione' : 'azioni'}</span>
    </button>
  );
}

// ------------------------------------------------------------------ Cartiglio del quartiere

export function ZoneBanner({ game, zoneId, act, onClose, onDetails }: {
  game: GameState; zoneId: TerritoryId; act: Act; onClose: () => void; onDetails: () => void;
}) {
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
        <BannerButton
          game={game}
          action={action}
          act={act}
          label={mine ? `Rafforza +${BALANCE.consolidateGain}` : `Influenza +${expandGain(game, me.id)}`}
        />
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
      note={check.ok ? undefined : check.reason}
    />
  );
}

// ------------------------------------------------------------------ Rami d'affari

/** Colonna di icone dei rami (si apre con "Affari"). */
export function RacketRail({ game, selected, onSelect, onSummary, onClose }: {
  game: GameState; selected: RacketId | null; onSelect: (id: RacketId) => void; onSummary: () => void; onClose: () => void;
}) {
  const me = game.families[game.playerId];
  return (
    <nav className="rail" aria-label="Rami d'affari">
      <ul>
        {RACKET_LIST.map((r) => {
          const level = racketLevel(game, me.id, r.id);
          const open = level > 0 || racketCap(game, me.id, r.id) > 0;
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
  const level = racketLevel(game, me.id, racketId);
  const active = effectiveLevel(game, me.id, racketId);
  const cap = racketCap(game, me.id, racketId);
  const network = racketNetwork(game, me.id, racketId);
  const upgrade: GameAction = { type: 'upgradeRacket', racketId };
  const check = validateAction(game, me.id, upgrade);
  const suited = ZONE_LIST.filter((z) => z.rackets.includes(racketId)).length;

  return (
    <Banner
      tile={<span className="tile-icon"><RacketIcon id={racketId} /></span>}
      title={def.name}
      subtitle={`Liv. ${level}/${def.maxLevel} · ${money(racketIncome(game, me.id, racketId))}/sett. · rete ${network.length} di ${suited} quartieri adatti`}
      button={
        level < def.maxLevel
          ? <BannerButton game={game} action={upgrade} act={act} label="Potenzia" />
          : <span className="banner-btn done"><strong>Al massimo</strong></span>
      }
      onClose={onClose}
      strip={
        <div className="level-strip" aria-label={`Livello ${active} attivo su ${level}`}>
          {Array.from({ length: def.maxLevel }, (_, i) => (
            <i key={i} className={i < active ? 'on' : i < level ? 'idle' : i < cap ? 'open' : ''} />
          ))}
        </div>
      }
      side={
        <button className="banner-details" onClick={() => setOpen(!open)} aria-expanded={open}>
          <span className="chev">{open ? '▴' : '▾'}</span>
          <span>Dettagli</span>
        </button>
      }
      note={level < def.maxLevel && !check.ok ? check.reason : undefined}
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

export function RivalChips({ game, onOpen }: { game: GameState; onOpen: () => void }) {
  const rivals = game.familyOrder.map((id) => game.families[id]).filter((f) => !f.isPlayer);
  return (
    <div className="hud-rivals">
      {rivals.map((f) => (
        <button
          key={f.id}
          className={`rival-chip${f.alive ? '' : ' out'}`}
          onClick={onOpen}
          style={{ ['--c' as string]: f.color }}
          aria-label={`${f.name}: ${ownedTerritories(game, f.id).length} quartieri`}
        >
          <span className="rival-box">
            <strong>{ownedTerritories(game, f.id).length}</strong>
            <small>{f.alive ? wealthLabel(f.money) : 'fuori'}</small>
          </span>
          <Crest f={f} />
        </button>
      ))}
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
  for (const l of me.lieutenants)
    if (l.assignment) good.push({ value: AREAS[l.assignment.area], text: `${fullName(l)} è responsabile dell'area` });
  if (game.week <= BALANCE.truceWeeks) good.push({ value: 'Tregua', text: `Nessuno può portarti via quartieri fino alla settimana ${BALANCE.truceWeeks + 1}` });

  const unled = unledSoldiers(me);
  if (unled > 0) bad.push({ value: `${unled}`, text: `Soldati senza guida: rischio in aumento` });
  for (const l of me.lieutenants)
    if (l.loyalty < BALANCE.loyaltyWarn) bad.push({ value: `${Math.round(l.loyalty)}`, text: `Lealtà bassa: ${fullName(l)}, ${l.nickname}` });
  // Soglie di sequestri (60) e arresti (85): vedi turn.ts.
  if (me.heat >= 85) bad.push({ value: `${Math.round(me.heat)}%`, text: 'Rischio altissimo: arresti possibili' });
  else if (me.heat >= 60) bad.push({ value: `${Math.round(me.heat)}%`, text: 'Rischio alto: sequestri possibili' });
  if (fc.net < 0) bad.push({ value: money(fc.net), text: 'Il bilancio settimanale è in rosso' });
  if (me.brokeWeeks > 0) bad.push({ value: `${me.brokeWeeks}/4`, text: 'Settimane con la cassa negativa' });
  if (fc.skimmed > 0) bad.push({ value: money(fc.skimmed), text: 'Trattenuti ogni settimana dai vice infedeli' });
  for (const r of RACKET_LIST) {
    const idle = racketLevel(game, me.id, r.id) - effectiveLevel(game, me.id, r.id);
    if (idle > 0) bad.push({ value: `${idle} liv.`, text: `${r.name}: la rete non basta a sostenerli` });
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

export function ProfileModal({ game, act, onClose, onSelectZone }: {
  game: GameState; act: Act; onClose: () => void; onSelectZone: (id: TerritoryId) => void;
}) {
  const [tab, setTab] = useState<ProfileTab>('banda');
  const me = game.families[game.playerId];
  const attention = policeAttention(game, me.id);
  return (
    <div className="overlay profile-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="profile" role="dialog" aria-modal="true" aria-label={`Profilo: ${me.name}`}>
        <div className="profile-art">
          <img src={BOSS_PORTRAIT} alt="Ritratto del capo" />
          <div className="profile-caption">
            <span className="eyebrow">Il capo</span>
            <h2>{me.name}</h2>
            <dl className="profile-stats">
              <div><dt>Rischio</dt><dd>{Math.round(me.heat)}%</dd></div>
              <div><dt>Attenzione</dt><dd>{attention}%</dd></div>
              <div><dt>Soldati</dt><dd>{me.members}</dd></div>
              <div><dt>Vice capi</dt><dd>{me.lieutenants.length}</dd></div>
            </dl>
          </div>
        </div>
        <div className="profile-body">
          <div className="tabs" role="tablist">
            <button role="tab" className="tab" aria-selected={tab === 'banda'} onClick={() => setTab('banda')}>La banda</button>
            <button role="tab" className="tab" aria-selected={tab === 'quadro'} onClick={() => setTab('quadro')}>Vantaggi e problemi</button>
          </div>
          {tab === 'banda'
            ? <OrganizationPanel game={game} act={act} onSelectZone={onSelectZone} />
            : <Outlook game={game} />}
        </div>
        <CloseButton onClick={onClose} className="profile-close" />
      </div>
    </div>
  );
}
