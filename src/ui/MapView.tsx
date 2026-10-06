import { useMemo } from 'react';
import { ZONE_LIST } from '../data/zones';
import { control, validateAction, type GameState, type TerritoryId } from '../engine';
import { RING_PATH, RIVER_PATH, VIEWBOX, ZONE_SHAPES } from './romeMap';

interface Props {
  game: GameState;
  selected: TerritoryId | null;
  onSelect: (id: TerritoryId) => void;
}

export function MapView({ game, selected, onSelect }: Props) {
  const reachable = useMemo(() => {
    const set = new Set<string>();
    for (const z of ZONE_LIST) {
      if (game.territories[z.id].owner === game.playerId) continue;
      if (validateAction(game, game.playerId, { type: 'expand', territoryId: z.id }).ok) set.add(z.id);
    }
    return set;
  }, [game]);

  return (
    <svg viewBox={`0 0 ${VIEWBOX.w} ${VIEWBOX.h}`} role="img" aria-label="Mappa delle zone di Roma">
      {ZONE_LIST.map((z) => {
        const t = game.territories[z.id];
        const owner = t.owner ? game.families[t.owner] : null;
        const ctrl = owner ? control(game, z.id, owner.id) : 0;
        return (
          <path
            key={z.id}
            className="zone-shape"
            d={ZONE_SHAPES[z.id].path}
            fill={owner ? owner.color : 'var(--land)'}
            fillOpacity={owner ? 0.35 + ctrl / 160 : 1}
            role="button"
            tabIndex={0}
            aria-label={`Zona ${z.name}${owner ? `, dominata da ${owner.name}` : ', libera'}`}
            onClick={() => onSelect(z.id)}
            onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onSelect(z.id)}
          />
        );
      })}

      <path className="map-ring" d={RING_PATH} />
      <path className="map-river" d={RIVER_PATH} />
      <text className="map-note" x={318} y={112} transform="rotate(62 318 112)">
        Tevere
      </text>
      <text className="map-note" x={18} y={524}>
        Mar Tirreno
      </text>

      {ZONE_LIST.map((z) => {
        const cls = z.id === selected ? 'selected' : reachable.has(z.id) ? 'reach' : '';
        return cls ? <path key={z.id} className={`zone-outline ${cls}`} d={ZONE_SHAPES[z.id].path} /> : null;
      })}

      {ZONE_LIST.map((z) => {
        const { x, y } = ZONE_SHAPES[z.id].label;
        const t = game.territories[z.id];
        const owner = t.owner ? game.families[t.owner] : null;
        const mine = control(game, z.id, game.playerId);
        return (
          <g key={z.id} className="map-label" transform={`translate(${x} ${y})`}>
            <text y={-4}>{z.name}</text>
            <text className="ctrl" y={10}>
              {owner ? `${owner.isPlayer ? 'tu' : owner.name.replace(/^\S+\s/, '')} ${Math.round(control(game, z.id, owner.id))}%` : 'libera'}
            </text>
            {!owner?.isPlayer && mine > 0 && (
              <text className="ctrl mine" y={22}>
                tu {Math.round(mine)}%
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
