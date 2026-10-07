import { useEffect, useMemo, useState, type MouseEvent } from 'react';
import { AREAS, ZONES, ZONE_LIST } from '../data/zones';
import { canReach, control, validateAction, type AreaId, type GameState, type TerritoryId } from '../engine';
import {
  ANIENE_PATH,
  AREA_BORDER_PATH,
  AREA_COLORS,
  AREA_SHAPES,
  MAP_NOTES,
  RING_PATH,
  SEA_PATH,
  TIBER_PATH,
  VIEWBOX,
  ZONE_SHAPES,
} from './romeMap';
import { useZoomPan } from './useZoomPan';

interface Props {
  game: GameState;
  selected: TerritoryId | null;
  /** Quartieri messi in evidenza in bianco (es. quelli adatti al ramo d'affari scelto). */
  highlight: ReadonlySet<TerritoryId>;
  onSelect: (id: TerritoryId) => void;
  /** Clic fuori dai quartieri: chiude la selezione. */
  onBackground: () => void;
  /** Vice capi disegnati dentro il quartiere dove lavorano (spaccio). */
  markers?: MapMarker[];
}

export interface MapMarker {
  zoneId: TerritoryId;
  /** Iniziali del personaggio. */
  text: string;
  /** Colore del bordo: lealtà del vice. */
  tone: string;
  /** Fermo (quartiere perso) o solo in anteprima. */
  dim?: boolean;
}

/** Controllo: colori delle organizzazioni. Aree: colori delle macro-aree. */
type MapMode = 'controllo' | 'aree';

/** Grigio dei quartieri senza padrone: il "tavolo" della mappa. */
const LAND = '#5c5e62';

/** Miscela due colori esadecimali: t = 1 → tutto `a`. */
function mix(a: string, b: string, t: number): string {
  const ch = (hex: string, i: number) => parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16);
  const out = [0, 1, 2].map((i) => Math.round(ch(a, i) * t + ch(b, i) * (1 - t)).toString(16).padStart(2, '0'));
  return `#${out.join('')}`;
}

/** Nei quartieri piccoli i nomi composti vanno su due righe. */
function nameLines(name: string, fontSize: number): string[] {
  const space = name.indexOf(' ');
  if (fontSize >= 11 || space === -1) return [name];
  return [name.slice(0, space), name.slice(space + 1)];
}

export function MapView({ game, selected, highlight, onSelect, onBackground, markers = [] }: Props) {
  // Tratteggiati i quartieri confinanti: l'influenza si può aumentare ovunque, ma lì costa meno.
  const reachable = useMemo(() => {
    const set = new Set<string>();
    for (const z of ZONE_LIST) {
      if (game.territories[z.id].owner === game.playerId || !canReach(game, game.playerId, z.id)) continue;
      if (validateAction(game, game.playerId, { type: 'expand', territoryId: z.id }).ok) set.add(z.id);
    }
    return set;
  }, [game]);
  // L'SVG occupa tutto lo schermo; a zoom 1 la mappa sta nello spazio lasciato libero
  // dai comandi sovrapposti (margini --map-top/right/bottom/left definiti nel CSS).
  const [frame, setFrame] = useState({ fit: 1, box: { x: 0, y: 0, w: VIEWBOX.w, h: VIEWBOX.h } });
  const cam = useZoomPan(frame.box);
  const [mode, setMode] = useState<MapMode>('controllo');

  useEffect(() => {
    const svg = cam.svgRef.current;
    if (!svg) return;
    const measure = () => {
      const { width: W, height: H } = svg.getBoundingClientRect();
      if (!W || !H) return;
      const css = getComputedStyle(svg);
      const inset = (name: string) => parseFloat(css.getPropertyValue(`--map-${name}`)) || 0;
      const [t, r, b, l] = [inset('top'), inset('right'), inset('bottom'), inset('left')];
      const freeW = Math.max(W - l - r, W * 0.4);
      const freeH = Math.max(H - t - b, H * 0.4);
      // Pixel sullo schermo per unità della mappa a zoom 1.
      const fit = Math.min(freeW / VIEWBOX.w, freeH / VIEWBOX.h);
      const box = {
        x: -(l + (freeW - VIEWBOX.w * fit) / 2) / fit,
        y: -(t + (freeH - VIEWBOX.h * fit) / 2) / fit,
        w: W / fit,
        h: H / fit,
      };
      setFrame((prev) =>
        Math.abs(prev.fit - fit) < 1e-3 && Math.abs(prev.box.x - box.x) < 0.5 && Math.abs(prev.box.y - box.y) < 0.5
          ? prev
          : { fit, box },
      );
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(svg);
    return () => ro.disconnect();
  }, [cam.svgRef]);
  const fit = frame.fit;
  const px = fit * cam.zoom; // pixel per unità con lo zoom attuale

  // Con lo zoom le etichette crescono, ma meno della mappa: restano leggibili senza invaderla.
  const labelScale = 1 / Math.sqrt(cam.zoom);
  // I nomi delle aree servono a colpo d'occhio: sfumano man mano che si ingrandisce.
  const areaLabelOpacity = mode === 'aree' ? 0.9 : Math.max(0, 0.4 - (cam.zoom - 1) * 0.2);
  const selectedArea = selected ? ZONES[selected].area : null;
  const raised = ZONE_LIST.filter((z) => z.id === selected || highlight.has(z.id));
  // Spessore dell'effetto "rilievo" dei quartieri in evidenza: costante sullo schermo.
  const lift = 3 / px;

  const background = (e: MouseEvent<SVGSVGElement>) => {
    if (!(e.target as Element).classList.contains('zone-shape')) onBackground();
  };

  return (
    <>
      <svg
        ref={cam.svgRef}
        className={`map-svg${cam.zoom > 1 ? ' zoomed' : ''}`}
        viewBox={cam.viewBox}
        role="img"
        aria-label="Mappa dei quartieri di Roma"
        onClick={background}
        {...cam.handlers}
      >
        <path className="map-sea" d={SEA_PATH} />

        {/* Ombra e bordo esterno spesso della città: i quartieri ci si appoggiano sopra. */}
        <g className="map-shadow" transform={`translate(0 ${5 / px})`}>
          {ZONE_LIST.map((z) => <path key={z.id} d={ZONE_SHAPES[z.id].path} />)}
        </g>
        <g className="map-rim">
          {ZONE_LIST.map((z) => <path key={z.id} d={ZONE_SHAPES[z.id].path} />)}
        </g>

        {ZONE_LIST.map((z) => {
          const t = game.territories[z.id];
          const owner = t.owner ? game.families[t.owner] : null;
          const ctrl = owner ? control(game, z.id, owner.id) : 0;
          const fill =
            mode === 'aree' ? mix(AREA_COLORS[z.area], LAND, 0.75)
            : owner ? mix(owner.color, LAND, 0.4 + ctrl / 220)
            : LAND;
          return (
            <path
              key={z.id}
              className="zone-shape"
              d={ZONE_SHAPES[z.id].path}
              fill={fill}
              role="button"
              tabIndex={0}
              aria-label={`${z.name}${owner ? `, dominato da ${owner.name}` : ', libero'}`}
              aria-pressed={z.id === selected}
              onClick={() => onSelect(z.id)}
              onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onSelect(z.id)}
            />
          );
        })}

        <path className="map-ring" d={RING_PATH} />
        <path className="map-river" d={TIBER_PATH} />
        <path className="map-river minor" d={ANIENE_PATH} />
        <path className="map-area-border" d={AREA_BORDER_PATH} />

        {/* Quartieri in evidenza: bianchi e "sollevati", come pedine sul tavolo. */}
        {raised.map((z) => (
          <g key={z.id} className={`zone-raised${z.id === selected ? ' selected' : ''}`}>
            <path className="lift" d={ZONE_SHAPES[z.id].path} transform={`translate(${lift * 0.4} ${lift})`} />
            <path className="top" d={ZONE_SHAPES[z.id].path} />
          </g>
        ))}

        {selectedArea && <path className="map-area-selected" d={AREA_SHAPES[selectedArea].outline} />}
        {ZONE_LIST.map((z) =>
          reachable.has(z.id) && !highlight.has(z.id) && z.id !== selected
            ? <path key={z.id} className="zone-outline reach" d={ZONE_SHAPES[z.id].path} />
            : null,
        )}

        <text className="map-note" transform={`translate(${MAP_NOTES.tevere.x} ${MAP_NOTES.tevere.y}) rotate(${MAP_NOTES.tevere.angle})`}>
          Tevere
        </text>
        <text className="map-note" transform={`translate(${MAP_NOTES.aniene.x} ${MAP_NOTES.aniene.y}) rotate(${MAP_NOTES.aniene.angle})`}>
          Aniene
        </text>
        <text className="map-note sea" transform={`translate(${MAP_NOTES.mare.x} ${MAP_NOTES.mare.y}) rotate(${MAP_NOTES.mare.angle})`}>
          Mar Tirreno
        </text>

        {areaLabelOpacity > 0 &&
          (Object.keys(AREA_SHAPES) as AreaId[]).map((a) => {
            const { label, fontSize } = AREA_SHAPES[a];
            return (
              <text
                key={a}
                className="map-area-label"
                x={label.x}
                y={label.y}
                style={{ fontSize: fontSize * labelScale, opacity: areaLabelOpacity }}
              >
                {AREAS[a].toUpperCase()}
              </text>
            );
          })}

        {ZONE_LIST.map((z) => {
          const shape = ZONE_SHAPES[z.id];
          const t = game.territories[z.id];
          const owner = t.owner ? game.families[t.owner] : null;
          const lit = z.id === selected || highlight.has(z.id);
          // Badge col valore del quartiere: ~9 px sullo schermo, mai più grande del quartiere.
          const r = Math.min(9 / px, shape.fontSize * 0.95);
          const showNumber = r * px >= 4.5;
          const nameSize = shape.fontSize * labelScale;
          const showName = nameSize * px >= 8.5 || z.id === selected;
          const lines = nameLines(z.name, shape.fontSize);
          const { x, y } = shape.label;
          const top = y - (showName ? (lines.length * nameSize) / 2 : 0);
          return (
            <g key={z.id} className={`map-label${lit ? ' lit' : ''}`}>
              {showNumber && (
                <circle
                  className={`badge${owner?.isPlayer ? ' mine' : ''}`}
                  cx={x}
                  cy={top}
                  r={r}
                  style={owner ? { fill: owner.color } : undefined}
                />
              )}
              {showNumber && (
                <text className="badge-num" x={x} y={top} style={{ fontSize: r * 1.15 }}>
                  {z.wealth}
                </text>
              )}
              {showName &&
                lines.map((line, i) => (
                  <text key={i} className="zone-name" x={x} y={top + r + nameSize * (i + 0.9)} style={{ fontSize: nameSize }}>
                    {line}
                  </text>
                ))}
            </g>
          );
        })}
        {/* Guerre in corso: contorno rosso che scorre, spade, uomini in campo e fronte. */}
        {game.battles.map((b) => (
          <path key={`o${b.id}`} className="zone-battle" d={ZONE_SHAPES[b.territoryId].path} />
        ))}
        {game.battles.map((b) => {
          const shape = ZONE_SHAPES[b.territoryId];
          const a = game.families[b.attacker];
          const d = game.families[b.defender];
          const u = 1 / px; // un pixel sullo schermo
          const w = 64 * u;
          const h = 22 * u;
          const x = shape.label.x - w / 2;
          const y = shape.label.y + 10 * u;
          const bar = 4 * u;
          const split = (w - 8 * u) * (1 - b.front / 100);
          return (
            <g key={`b${b.id}`} className="map-battle" transform={`translate(${x} ${y})`}>
              <rect className="map-battle-bg" width={w} height={h + bar + 4 * u} rx={4 * u} />
              <text className="map-battle-num" x={10 * u} y={h / 2 + 1 * u} style={{ fontSize: 12 * u, fill: d.color }}>{b.defenders}</text>
              <g transform={`translate(${w / 2 - 7 * u} ${h / 2 - 7 * u}) scale(${(14 * u) / 24})`}>
                <path className="map-battle-swords" d="M4 4l11 11M20 4L9 15M13 17l4 4M11 17l-4 4M15 13l4 0M9 13l-4 0" />
              </g>
              <text className="map-battle-num" x={w - 10 * u} y={h / 2 + 1 * u} style={{ fontSize: 12 * u, fill: a.color }}>{b.attackers}</text>
              <rect x={4 * u} y={h} width={split} height={bar} style={{ fill: d.color }} />
              <rect x={4 * u + split} y={h} width={w - 8 * u - split} height={bar} style={{ fill: a.color }} />
            </g>
          );
        })}

        {/* Vice allo spaccio: un medaglione dentro il quartiere, accanto al valore. */}
        {markers.map((m, i) => {
          const shape = ZONE_SHAPES[m.zoneId];
          const R = Math.min(15 / px, shape.fontSize * 1.5);
          const r = Math.min(9 / px, shape.fontSize * 0.95);
          const x = shape.label.x + r + R * 0.9;
          const y = shape.label.y - R * 0.6;
          return (
            <g key={`${m.zoneId}${i}`} className={`map-marker${m.dim ? ' dim' : ''}`}>
              <circle cx={x} cy={y} r={R} style={{ stroke: m.tone }} />
              <text x={x} y={y} style={{ fontSize: R * 0.85 }}>{m.text}</text>
            </g>
          );
        })}
      </svg>

      <div className="map-tools" role="group" aria-label="Mappa">
        <button className="tool" onClick={cam.zoomIn} aria-label="Ingrandisci" disabled={cam.zoom >= 6}>+</button>
        <button className="tool" onClick={cam.zoomOut} aria-label="Riduci" disabled={cam.zoom <= 1}>−</button>
        <button className="tool" onClick={cam.reset} aria-label="Mostra tutta la città" disabled={cam.zoom <= 1}>⤢</button>
        <button
          className="tool text"
          aria-pressed={mode === 'aree'}
          onClick={() => setMode(mode === 'aree' ? 'controllo' : 'aree')}
          title="Colora la mappa per macro-area"
        >
          Aree
        </button>
      </div>
    </>
  );
}
