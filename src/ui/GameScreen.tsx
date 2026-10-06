import { useState } from 'react';
import { ZONES_TO_WIN, ZONE_LIST } from '../data/zones';
import {
  BALANCE,
  endTurn,
  forecast,
  ownedTerritories,
  perform,
  policeAttention,
  totalInfluence,
  weekLabel,
  type GameAction,
  type GameState,
  type TerritoryId,
} from '../engine';
import { money, signedMoney } from './format';
import { MapView } from './MapView';
import { EndScreen, WeeklyReport } from './Newspaper';
import { NewsPanel, OrganizationPanel, RivalsPanel, ZonePanel } from './panels';

type Tab = 'zona' | 'organizzazione' | 'rivali' | 'notizie';
const TABS: { id: Tab; label: string }[] = [
  { id: 'zona', label: 'Zona' },
  { id: 'organizzazione', label: 'Organizzazione' },
  { id: 'rivali', label: 'Rivali' },
  { id: 'notizie', label: 'Notizie' },
];

interface Props {
  game: GameState;
  setGame: (g: GameState) => void;
  onQuit: () => void;
}

export function GameScreen({ game, setGame, onQuit }: Props) {
  const me = game.families[game.playerId];
  const [selected, setSelected] = useState<TerritoryId | null>(me.home);
  const [tab, setTab] = useState<Tab>('zona');
  const [showReport, setShowReport] = useState(false);

  const act = (action: GameAction) => {
    const { state, result } = perform(game, action);
    if (result.ok) setGame(state);
  };
  const selectZone = (id: TerritoryId) => {
    setSelected(id);
    setTab('zona');
  };
  const endWeek = () => {
    setGame(endTurn(game));
    setShowReport(true);
  };

  const fc = forecast(game, me.id);
  const owned = ownedTerritories(game, me.id).length;
  const attention = policeAttention(game, me.id);

  return (
    <div className="game">
      <header className="topbar">
        <span className="brand">Roma <span>criminale</span></span>
        <span className="week">
          <strong>Settimana {game.week}</strong>
          <small>{weekLabel(game.week)}</small>
        </span>
        <span className="pips" aria-label={`${game.actionsLeft} azioni rimaste su ${BALANCE.actionsPerTurn}`}>
          {Array.from({ length: BALANCE.actionsPerTurn }, (_, i) => (
            <i key={i} className={`pip${i < game.actionsLeft ? ' on' : ''}`} />
          ))}
          <small className="empty">azioni</small>
        </span>
        {game.week <= BALANCE.truceWeeks && (
          <small className="empty truce">Tregua: nessuno attacca fino alla settimana {BALANCE.truceWeeks + 1}</small>
        )}
        <span className="spacer" />
        <button className="btn btn-small" onClick={onQuit}>Abbandona</button>
        <button className="btn btn-primary" onClick={endWeek} disabled={game.status !== 'playing'}>
          Fine settimana →
        </button>
      </header>

      <div className="stats" role="list">
        <div className="stat" role="listitem">
          <span className="eyebrow">Denaro</span>
          <span className="value">{money(me.money)}</span>
          <span className={`sub ${fc.net >= 0 ? 'pos' : 'neg'}`}>{signedMoney(fc.net)}/sett.</span>
        </div>
        <div className="stat" role="listitem">
          <span className="eyebrow">Influenza</span>
          <span className="value">{totalInfluence(game, me.id)}</span>
          <span className="sub">reputazione {Math.round(me.reputation)}</span>
        </div>
        <div className="stat" role="listitem">
          <span className="eyebrow">Territori</span>
          <span className="value">{owned}/{ZONE_LIST.length}</span>
          <span className="sub">obiettivo {ZONES_TO_WIN}</span>
        </div>
        <div className="stat" role="listitem">
          <span className="eyebrow">Membri</span>
          <span className="value">{me.members}</span>
          <span className="sub">−{money(fc.upkeep)}/sett.</span>
        </div>
        <div className="stat" role="listitem">
          <span className="eyebrow">Rischio</span>
          <span className="value">{Math.round(me.heat)}%</span>
          <div className={`meter${me.heat >= 60 ? ' hot' : ''}`}><span style={{ width: `${me.heat}%` }} /></div>
        </div>
        <div className="stat" role="listitem">
          <span className="eyebrow">Attenzione</span>
          <span className="value">{attention}%</span>
          <div className={`meter${attention >= 60 ? ' hot' : ''}`}><span style={{ width: `${attention}%` }} /></div>
        </div>
      </div>

      <div className="board">
        <div className="map-wrap">
          <MapView game={game} selected={selected} onSelect={selectZone} />
          <div className="map-legend">
            {game.familyOrder.map((id) => {
              const f = game.families[id];
              return (
                <span key={id} style={{ opacity: f.alive ? 1 : 0.4 }}>
                  <i style={{ background: f.color }} />
                  {f.name}{f.isPlayer ? ' (tu)' : ''}
                </span>
              );
            })}
          </div>
        </div>

        <aside className="dossier">
          <div className="tabs" role="tablist">
            {TABS.map((t) => (
              <button key={t.id} id={`tab-${t.id}`} role="tab" className="tab" aria-selected={tab === t.id} onClick={() => setTab(t.id)}>
                {t.label}
              </button>
            ))}
          </div>
          {tab === 'zona' && <ZonePanel game={game} zoneId={selected} act={act} />}
          {tab === 'organizzazione' && <OrganizationPanel game={game} act={act} onSelectZone={selectZone} />}
          {tab === 'rivali' && <RivalsPanel game={game} act={act} onSelectZone={selectZone} />}
          {tab === 'notizie' && <NewsPanel game={game} />}
        </aside>
      </div>

      {showReport && game.lastReport && game.status === 'playing' && (
        <WeeklyReport report={game.lastReport} onClose={() => setShowReport(false)} />
      )}
      {game.status !== 'playing' && <EndScreen game={game} onRestart={onQuit} />}
    </div>
  );
}
