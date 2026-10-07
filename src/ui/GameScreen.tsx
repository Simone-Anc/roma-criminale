import { useMemo, useState } from 'react';
import { ZONE_LIST } from '../data/zones';
import { endTurn, perform, type GameAction, type GameState, type RacketId, type TerritoryId } from '../engine';
import {
  Drawer,
  PlayerHud,
  ProfileModal,
  RacketBanner,
  RacketRail,
  RivalChips,
  RoundButton,
  TurnRibbon,
  ZoneBanner,
} from './hud';
import { MapView } from './MapView';
import { EndScreen, WeeklyReport } from './Newspaper';
import { NewsPanel, RivalsPanel, ZonePanel } from './panels';
import { RacketsPanel } from './RacketsPanel';

/** Cosa occupa il cartiglio in alto: un quartiere o un ramo d'affari. */
type Focus = { kind: 'zone'; id: TerritoryId } | { kind: 'racket'; id: RacketId } | null;
type DrawerId = 'zona' | 'affari' | 'rivali' | 'notizie' | null;

interface Props {
  game: GameState;
  setGame: (g: GameState) => void;
  onQuit: () => void;
}

export function GameScreen({ game, setGame, onQuit }: Props) {
  const [focus, setFocus] = useState<Focus>(null);
  const [rail, setRail] = useState(false);
  const [drawer, setDrawer] = useState<DrawerId>(null);
  const [profile, setProfile] = useState(false);
  const [showReport, setShowReport] = useState(false);

  const act = (action: GameAction) => {
    const { state, result } = perform(game, action);
    if (result.ok) setGame(state);
  };
  const selectZone = (id: TerritoryId) => {
    setFocus({ kind: 'zone', id });
    setProfile(false);
    // Il fascicolo del quartiere resta aperto e si aggiorna; gli altri si chiudono per mostrare la mappa.
    if (drawer !== 'zona') setDrawer(null);
  };
  const clearFocus = () => {
    setFocus(null);
    if (drawer === 'zona') setDrawer(null);
  };
  const endWeek = () => {
    setGame(endTurn(game));
    setShowReport(true);
  };
  const quit = () => {
    if (window.confirm('Abbandonare la partita? I progressi andranno persi.')) onQuit();
  };
  const toggleDrawer = (d: Exclude<DrawerId, null>) => setDrawer(drawer === d ? null : d);

  const selected = focus?.kind === 'zone' ? focus.id : null;
  const racket = focus?.kind === 'racket' ? focus.id : null;
  const highlight = useMemo(
    () => new Set<TerritoryId>(racket ? ZONE_LIST.filter((z) => z.rackets.includes(racket)).map((z) => z.id) : []),
    [racket],
  );

  return (
    <div className="game">
      <MapView game={game} selected={selected} highlight={highlight} onSelect={selectZone} onBackground={clearFocus} />

      {focus?.kind === 'zone' ? (
        <ZoneBanner game={game} zoneId={focus.id} act={act} onClose={clearFocus} onDetails={() => toggleDrawer('zona')} />
      ) : focus?.kind === 'racket' ? (
        <RacketBanner key={focus.id} game={game} racketId={focus.id} act={act} onClose={clearFocus} onSelectZone={selectZone} />
      ) : (
        <TurnRibbon game={game} onEndTurn={endWeek} />
      )}

      <button className="corner-btn left" onClick={quit}>Esci</button>
      <button className="corner-btn right" onClick={() => toggleDrawer('notizie')} aria-pressed={drawer === 'notizie'}>Notizie</button>

      {rail ? (
        <RacketRail
          game={game}
          selected={racket}
          onSelect={(id) => setFocus({ kind: 'racket', id })}
          onSummary={() => toggleDrawer('affari')}
          onClose={() => {
            setRail(false);
            if (racket) setFocus(null);
          }}
        />
      ) : (
        <nav className="round-menu" aria-label="Menu">
          <RoundButton label="Affari" primary onClick={() => { setRail(true); setDrawer(null); }} />
          <RoundButton label="Banda" onClick={() => setProfile(true)} />
          <RoundButton label="Rivali" onClick={() => toggleDrawer('rivali')} pressed={drawer === 'rivali'} />
        </nav>
      )}

      <RivalChips game={game} onOpen={() => toggleDrawer('rivali')} />
      <PlayerHud game={game} onProfile={() => setProfile(true)} />

      {drawer === 'zona' && selected && (
        <Drawer title="Quartiere" side="right" onClose={() => setDrawer(null)}>
          <ZonePanel game={game} zoneId={selected} act={act} onSelectZone={selectZone} />
        </Drawer>
      )}
      {drawer === 'affari' && (
        <Drawer title="Affari" side="left" onClose={() => setDrawer(null)}>
          <RacketsPanel game={game} act={act} onSelectZone={selectZone} />
        </Drawer>
      )}
      {drawer === 'rivali' && (
        <Drawer title="Rivali" side="left" onClose={() => setDrawer(null)}>
          <RivalsPanel game={game} act={act} onSelectZone={selectZone} />
        </Drawer>
      )}
      {drawer === 'notizie' && (
        <Drawer title="Notizie" side="right" onClose={() => setDrawer(null)}>
          <NewsPanel game={game} />
        </Drawer>
      )}

      {profile && <ProfileModal game={game} act={act} onClose={() => setProfile(false)} onSelectZone={selectZone} />}
      {showReport && game.lastReport && game.status === 'playing' && (
        <WeeklyReport report={game.lastReport} onClose={() => setShowReport(false)} />
      )}
      {game.status !== 'playing' && <EndScreen game={game} onRestart={onQuit} />}
    </div>
  );
}
