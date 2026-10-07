import { useMemo, useState } from 'react';
import { ZONE_LIST } from '../data/zones';
import { endTurn, fullName, perform, spaccioAt, type GameAction, type GameState, type RacketId, type TerritoryId } from '../engine';
import {
  Drawer,
  PlacementBanner,
  PlayerHud,
  PoliceTracker,
  ProfileModal,
  RacketBanner,
  RacketRail,
  RivalChips,
  RoundButton,
  StreetBanner,
  TurnRibbon,
  ZoneBanner,
} from './hud';
import { MapView, type MapMarker } from './MapView';
import { EndScreen, WeeklyReport } from './Newspaper';
import { loyaltyTone } from './OrganizationPanel';
import { NewsPanel, RivalsPanel, ZonePanel } from './panels';
import { RacketsPanel } from './RacketsPanel';

/** Cosa occupa il cartiglio in alto: un quartiere o un ramo d'affari. */
type Focus = { kind: 'zone'; id: TerritoryId } | { kind: 'racket'; id: RacketId } | { kind: 'street' } | null;
type DrawerId = 'zona' | 'affari' | 'rivali' | 'notizie' | null;
/** Scelta sulla mappa del quartiere dove mettere un vice allo spaccio. */
type Placing = { lieutenantId: string; zone: TerritoryId | null } | null;

const TONE_COLOR: Record<string, string> = { ok: '#8fa66a', warn: '#c19a5b', danger: '#c0584a' };
const initials = (s: string) => s.split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase();

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
  const [placing, setPlacing] = useState<Placing>(null);
  const me = game.families[game.playerId];

  const act = (action: GameAction) => {
    const { state, result } = perform(game, action);
    if (result.ok) setGame(state);
  };
  // Quartieri dove il vice può andare allo spaccio: tuoi e senza un altro vice.
  const spaccioZones = useMemo(() => {
    if (!placing) return new Set<TerritoryId>();
    return new Set<TerritoryId>(
      ZONE_LIST.filter((z) => {
        if (game.territories[z.id].owner !== game.playerId) return false;
        const other = spaccioAt(game.families[game.playerId], z.id);
        return !other || other.id === placing.lieutenantId;
      }).map((z) => z.id),
    );
  }, [game, placing]);

  const startPlacing = (lieutenantId: string) => {
    setProfile(false);
    setRail(false);
    setDrawer(null);
    setFocus(null);
    setPlacing({ lieutenantId, zone: null });
  };
  const confirmPlacing = () => {
    if (!placing?.zone) return;
    act({ type: 'assignLieutenant', lieutenantId: placing.lieutenantId, assignment: { type: 'spaccio', territoryId: placing.zone } });
    setPlacing(null);
  };
  const cancelPlacing = () => {
    setPlacing(null);
    setProfile(true);
  };

  const selectZone = (id: TerritoryId) => {
    if (placing) {
      if (spaccioZones.has(id)) setPlacing({ ...placing, zone: id });
      return;
    }
    setFocus({ kind: 'zone', id });
    setProfile(false);
    // Il fascicolo del quartiere resta aperto e si aggiorna; gli altri si chiudono per mostrare la mappa.
    if (drawer !== 'zona') setDrawer(null);
  };
  const clearFocus = () => {
    if (placing) return setPlacing({ ...placing, zone: null });
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

  const selected = placing ? placing.zone : focus?.kind === 'zone' ? focus.id : null;
  const racket = focus?.kind === 'racket' ? focus.id : null;
  const highlight = useMemo(
    () => placing
      ? spaccioZones
      : new Set<TerritoryId>(racket ? ZONE_LIST.filter((z) => z.rackets.includes(racket)).map((z) => z.id) : []),
    [racket, placing, spaccioZones],
  );
  // I vice allo spaccio sulla mappa; durante la scelta, quello che si sta spostando va dove indicato.
  const markers: MapMarker[] = me.lieutenants.flatMap((l) => {
    const moving = placing?.lieutenantId === l.id;
    const zone = moving ? placing!.zone : l.assignment?.type === 'spaccio' ? l.assignment.territoryId : null;
    if (!zone) return [];
    return [{
      zoneId: zone,
      text: initials(fullName(l)),
      tone: TONE_COLOR[loyaltyTone(l.loyalty)],
      dim: !moving && game.territories[zone].owner !== me.id,
    }];
  });

  return (
    <div className="game">
      <MapView game={game} selected={selected} highlight={highlight} markers={markers} onSelect={selectZone} onBackground={clearFocus} />

      {placing ? (
        <PlacementBanner game={game} lieutenantId={placing.lieutenantId} zoneId={placing.zone} onConfirm={confirmPlacing} onCancel={cancelPlacing} />
      ) : focus?.kind === 'zone' ? (
        <ZoneBanner game={game} zoneId={focus.id} act={act} onClose={clearFocus} onDetails={() => toggleDrawer('zona')} />
      ) : focus?.kind === 'street' ? (
        <StreetBanner game={game} act={act} onClose={clearFocus} />
      ) : focus?.kind === 'racket' ? (
        <RacketBanner key={focus.id} game={game} racketId={focus.id} act={act} onClose={clearFocus} onSelectZone={selectZone} />
      ) : (
        <TurnRibbon game={game} onEndTurn={endWeek} />
      )}

      <div className="top-left">
        <button className="corner-btn" onClick={quit}>Esci</button>
        <PoliceTracker game={game} onOpen={() => { setRail(true); setDrawer(null); setFocus({ kind: 'street' }); }} />
      </div>
      <button className="corner-btn right" onClick={() => toggleDrawer('notizie')} aria-pressed={drawer === 'notizie'}>Notizie</button>

      {rail ? (
        <RacketRail
          game={game}
          selected={racket}
          street={focus?.kind === 'street'}
          onSelect={(id) => setFocus({ kind: 'racket', id })}
          onStreet={() => setFocus({ kind: 'street' })}
          onSummary={() => toggleDrawer('affari')}
          onClose={() => {
            setRail(false);
            if (racket || focus?.kind === 'street') setFocus(null);
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

      {profile && <ProfileModal game={game} act={act} onClose={() => setProfile(false)} onPlaceSpaccio={startPlacing} />}
      {showReport && game.lastReport && game.status === 'playing' && (
        <WeeklyReport report={game.lastReport} onClose={() => setShowReport(false)} />
      )}
      {game.status !== 'playing' && <EndScreen game={game} onRestart={onQuit} />}
    </div>
  );
}
