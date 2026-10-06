// Geometria della mappa stilizzata di Roma, generata in modo deterministico:
// un Centro e sette settori a raggiera, con bordi irregolari "disegnati a mano".
// Per cambiare la forma basta modificare gli angoli dei settori o le funzioni di rumore.
import type { TerritoryId } from '../engine';

export const VIEWBOX = { w: 600, h: 580 };
const CX = 300;
const CY = 290;
const SX = 1.08; // leggera ellisse orizzontale
const SY = 0.92;
const deg = (d: number) => (d * Math.PI) / 180;

const rIn = (a: number) => 80 + 9 * Math.sin(3 * a + 1) + 5 * Math.sin(5 * a + 2);
const rOut = (a: number) => 238 + 14 * Math.sin(2 * a + 0.5) + 10 * Math.sin(5 * a + 1.3) + 5 * Math.sin(11 * a);
const rRing = (a: number) => 186 + 4 * Math.sin(3 * a);

function pt(a: number, r: number): [number, number] {
  return [CX + Math.cos(a) * r * SX, CY + Math.sin(a) * r * SY];
}

function arc(a1: number, a2: number, r: (a: number) => number, steps = 24): [number, number][] {
  const out: [number, number][] = [];
  for (let i = 0; i <= steps; i++) {
    const a = a1 + ((a2 - a1) * i) / steps;
    out.push(pt(a, r(a)));
  }
  return out;
}

/** Confine radiale tra due settori, leggermente ondulato (condiviso dai due vicini). */
function divider(a: number): [number, number][] {
  const out: [number, number][] = [];
  const steps = 10;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const r = rIn(a) + (rOut(a) - rIn(a)) * t;
    const wobble = 0.05 * Math.sin(t * Math.PI * 2.2 + a * 3);
    out.push(pt(a + wobble, r));
  }
  return out;
}

const toPath = (pts: [number, number][]) =>
  'M' + pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join('L') + 'Z';

/** Settori in senso orario partendo da nord (gradi SVG: 0 = est, 90 = sud). */
const SECTORS: { id: TerritoryId; from: number; to: number }[] = [
  { id: 'nord', from: -115, to: -62 },
  { id: 'nordest', from: -62, to: -15 },
  { id: 'est', from: -15, to: 35 },
  { id: 'sudest', from: 35, to: 80 },
  { id: 'sud', from: 80, to: 128 },
  { id: 'sudovest', from: 128, to: 190 },
  { id: 'ovest', from: 190, to: 245 },
];

export interface ZoneShape {
  path: string;
  label: { x: number; y: number };
}

function buildShapes(): Record<TerritoryId, ZoneShape> {
  const shapes: Record<TerritoryId, ZoneShape> = {
    centro: { path: toPath(arc(0, Math.PI * 2, rIn, 72)), label: { x: CX, y: CY } },
  };
  for (const s of SECTORS) {
    const a1 = deg(s.from);
    const a2 = deg(s.to);
    const pts = [
      ...arc(a1, a2, rIn),
      ...divider(a2),
      ...arc(a2, a1, rOut),
      ...divider(a1).reverse(),
    ];
    const mid = (a1 + a2) / 2;
    const [x, y] = pt(mid, (rIn(mid) + rOut(mid)) / 2 + 6);
    shapes[s.id] = { path: toPath(pts), label: { x, y } };
  }
  return shapes;
}

export const ZONE_SHAPES = buildShapes();

/** Anello del raccordo, puramente decorativo. */
export const RING_PATH = toPath(arc(0, Math.PI * 2, rRing, 96));

/** Il fiume: entra da nord, attraversa il Centro, esce verso il mare a sud-ovest. */
export const RIVER_PATH =
  'M262,22 C280,70 300,110 286,150 S240,205 268,240 S320,282 300,320 ' +
  'S236,360 222,392 S170,445 132,470 S70,520 30,556';
