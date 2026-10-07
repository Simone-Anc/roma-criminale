// Geometria SVG della mappa di Roma. Le celle dei quartieri arrivano da data/zones.ts
// (Voronoi sulle coordinate reali); qui diventano tracciati con confini "disegnati a
// mano", più fiumi, raccordo, costa ed etichette.
import { ANIENE, COAST_PTS, TIBER, VIEWBOX, graRing, project, type LatLon, type Pt } from '../data/geography';
import { AREAS, ZONES, ZONE_CELLS } from '../data/zones';
import type { AreaId, TerritoryId } from '../engine';

export { VIEWBOX };

export interface ZoneShape {
  path: string;
  label: { x: number; y: number };
  /** Dimensione del carattere dell'etichetta, in base all'ampiezza del quartiere. */
  fontSize: number;
}

const fmt = (p: Pt) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`;
const polyPath = (pts: Pt[], close = true) => 'M' + pts.map(fmt).join('L') + (close ? 'Z' : '');

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return ((h >>> 0) % 1000) / 1000 * Math.PI * 2;
}

/** Punti intermedi ondulati da `a` a `b` (esclusi gli estremi). */
function wobble(a: Pt, b: Pt, seed: number): Pt[] {
  const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
  if (len < 5) return [];
  const n = Math.max(2, Math.round(len / 6));
  const nx = -(b[1] - a[1]) / len;
  const ny = (b[0] - a[0]) / len;
  const amp = Math.min(3.2, len * 0.07);
  const out: Pt[] = [];
  for (let k = 1; k < n; k++) {
    const t = k / n;
    const off = amp * Math.sin(Math.PI * t) *
      (0.65 * Math.sin(2 * Math.PI * t * (len / 40) + seed) + 0.35 * Math.sin(2 * Math.PI * t * (len / 15) + seed * 1.7));
    out.push([a[0] + (b[0] - a[0]) * t + nx * off, a[1] + (b[1] - a[1]) * t + ny * off]);
  }
  return out;
}

/**
 * Confine tra due quartieri. Viene sempre calcolato nello stesso verso, così le due
 * celle confinanti producono esattamente la stessa linea.
 */
function sharedEdge(a: Pt, b: Pt, i: string, j: string): Pt[] {
  const forward = Math.abs(a[0] - b[0]) > 0.5 ? a[0] < b[0] : a[1] < b[1];
  const seed = hash(i < j ? i + j : j + i);
  return forward ? wobble(a, b, seed) : wobble(b, a, seed).reverse();
}

/** Baricentro di un poligono. */
function centroid(pts: Pt[]): Pt {
  let a = 0, cx = 0, cy = 0;
  for (let i = 0; i < pts.length; i++) {
    const [x0, y0] = pts[i];
    const [x1, y1] = pts[(i + 1) % pts.length];
    const f = x0 * y1 - x1 * y0;
    a += f;
    cx += (x0 + x1) * f;
    cy += (y0 + y1) * f;
  }
  return a === 0 ? pts[0] : [cx / (3 * a), cy / (3 * a)];
}

function area(pts: Pt[]): number {
  let a = 0;
  for (let i = 0; i < pts.length; i++) {
    const [x0, y0] = pts[i];
    const [x1, y1] = pts[(i + 1) % pts.length];
    a += x0 * y1 - x1 * y0;
  }
  return Math.abs(a / 2);
}

export interface AreaShape {
  /** Contorno dell'area: insieme di tratti (solo da tracciare, non da riempire). */
  outline: string;
  label: { x: number; y: number };
  fontSize: number;
}

function inside([x, y]: Pt, poly: Pt[]): boolean {
  let hit = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) hit = !hit;
  }
  return hit;
}

interface Box { x: number; y: number; w: number; h: number }

const overlap = (a: Box, b: Box) =>
  Math.max(0, Math.min(a.x + a.w / 2, b.x + b.w / 2) - Math.max(a.x - a.w / 2, b.x - b.w / 2)) *
  Math.max(0, Math.min(a.y + a.h / 2, b.y + b.h / 2) - Math.max(a.y - a.h / 2, b.y - b.h / 2));

/**
 * Posizione del nome di un'area: dentro l'area, vicino al suo baricentro, ma dove
 * copre il meno possibile i nomi dei quartieri.
 */
function placeAreaLabel(text: string, fontSize: number, center: Pt, polys: Pt[][], avoid: Box[]): Pt {
  const w = text.length * fontSize * 0.85; // lettere maiuscole spaziate
  const h = fontSize;
  let best: { p: Pt; score: number } = { p: center, score: Infinity };
  const xs = polys.flat().map((p) => p[0]);
  const ys = polys.flat().map((p) => p[1]);
  for (let x = Math.min(...xs); x <= Math.max(...xs); x += 4)
    for (let y = Math.min(...ys); y <= Math.max(...ys); y += 4) {
      const p: Pt = [x, y];
      if (!polys.some((poly) => inside(p, poly))) continue;
      const box = { x, y, w, h };
      const covered = avoid.reduce((s, b) => s + overlap(box, b), 0);
      const score = covered + Math.hypot(x - center[0], y - center[1]) * 2;
      if (score < best.score) best = { p, score };
    }
  return best.p;
}

function buildShapes() {
  const shapes: Record<TerritoryId, ZoneShape> = {};
  const areaBorders: string[] = [];
  const outlines: Partial<Record<AreaId, string[]>> = {};
  // Baricentro dell'area: media dei baricentri dei quartieri pesata sulla loro superficie.
  const weights: Partial<Record<AreaId, { x: number; y: number; a: number }>> = {};
  const polys: Partial<Record<AreaId, Pt[][]>> = {};

  for (const cell of ZONE_CELLS) {
    const myArea = ZONES[cell.id].area;
    const pts: Pt[] = [];
    cell.vertices.forEach((v, k) => {
      const next = cell.vertices[(k + 1) % cell.vertices.length];
      pts.push(v.p);
      const mid = v.to ? sharedEdge(v.p, next.p, cell.id, v.to) : [];
      pts.push(...mid);
      const edge = polyPath([v.p, ...mid, next.p], false);
      // Lato sul confine dell'area (verso un'altra area o fuori dal comune).
      if (!v.to || ZONES[v.to].area !== myArea) (outlines[myArea] ??= []).push(edge);
      // Confine tra macro-aree: disegnato una volta sola, dalla cella con l'id minore.
      if (v.to && cell.id < v.to && ZONES[v.to].area !== myArea) areaBorders.push(edge);
    });
    const c = centroid(cell.vertices.map((v) => v.p));
    const size = area(pts);
    const fontSize = Math.max(8.5, Math.min(13, Math.sqrt(size) / 6.5));
    shapes[cell.id] = { path: polyPath(pts), label: { x: c[0], y: c[1] }, fontSize };
    (polys[myArea] ??= []).push(pts);
    const w = (weights[myArea] ??= { x: 0, y: 0, a: 0 });
    w.x += c[0] * size;
    w.y += c[1] * size;
    w.a += size;
  }

  // Ingombro dei nomi dei quartieri (due righe: nome e controllo).
  const avoid: Box[] = ZONE_CELLS.map((cell) => {
    const { label, fontSize } = shapes[cell.id];
    return { x: label.x, y: label.y, w: ZONES[cell.id].name.length * fontSize * 0.55, h: fontSize * 2.4 };
  });
  const areas = {} as Record<AreaId, AreaShape>;
  for (const [id, w] of Object.entries(weights) as [AreaId, { x: number; y: number; a: number }][]) {
    const fontSize = Math.max(13, Math.min(24, Math.sqrt(w.a) / 9));
    const [x, y] = placeAreaLabel(AREAS[id], fontSize, [w.x / w.a, w.y / w.a], polys[id]!, avoid);
    areas[id] = { outline: outlines[id]!.join(''), label: { x, y }, fontSize };
  }
  return { shapes, areas, areaBorders: areaBorders.join('') };
}

const built = buildShapes();
export const ZONE_SHAPES = built.shapes;
export const AREA_SHAPES = built.areas;
/** Confini tra le macro-aree (Centro, Nord, ...), più marcati. */
export const AREA_BORDER_PATH = built.areaBorders;

/** Colori della vista "Aree": tenui, distinti tra loro, mai confondibili con un'organizzazione. */
export const AREA_COLORS: Record<AreaId, string> = {
  centro: '#8f7f62',
  nord: '#5d7491',
  nordest: '#5b8a76',
  est: '#94675d',
  sudest: '#776897',
  sud: '#8c8656',
  sudovest: '#568a90',
  ovest: '#7c7c86',
};

/** Curva morbida (Catmull-Rom) che passa per tutti i punti. */
function smooth(pts: Pt[], closed = false): string {
  const p = closed ? [pts[pts.length - 1], ...pts, pts[0], pts[1]] : [pts[0], ...pts, pts[pts.length - 1]];
  let d = `M${fmt(p[1])}`;
  for (let i = 1; i < p.length - 2; i++) {
    const c1: Pt = [p[i][0] + (p[i + 1][0] - p[i - 1][0]) / 6, p[i][1] + (p[i + 1][1] - p[i - 1][1]) / 6];
    const c2: Pt = [p[i + 1][0] - (p[i + 2][0] - p[i][0]) / 6, p[i + 1][1] - (p[i + 2][1] - p[i][1]) / 6];
    d += `C${fmt(c1)} ${fmt(c2)} ${fmt(p[i + 1])}`;
  }
  return closed ? d + 'Z' : d;
}

const line = (pts: LatLon[]) => smooth(pts.map(project));

export const TIBER_PATH = line(TIBER);
export const ANIENE_PATH = line(ANIENE);
/** Grande Raccordo Anulare, decorativo. */
export const RING_PATH = smooth(graRing(60).map(project), true);

/** Il mare: dalla costa fino al bordo inferiore sinistro della mappa. */
export const SEA_PATH = (() => {
  const first = COAST_PTS[0];
  const last = COAST_PTS[COAST_PTS.length - 1];
  const far = 4000;
  return polyPath([...COAST_PTS, [last[0], VIEWBOX.h + far], [-far, VIEWBOX.h + far], [-far, -far], [first[0], -far]]);
})();

/** Posizione e rotazione delle scritte geografiche. */
function note(at: LatLon, toward: LatLon) {
  const [x, y] = project(at);
  const [x2, y2] = project(toward);
  let angle = (Math.atan2(y2 - y, x2 - x) * 180) / Math.PI;
  if (angle > 90) angle -= 180; // mai scritte capovolte
  if (angle < -90) angle += 180;
  return { x, y, angle };
}

export const MAP_NOTES = {
  tevere: note([42.02, 12.533], [42.0, 12.511]),
  aniene: note([41.931, 12.597], [41.927, 12.567]),
  mare: note([41.705, 12.205], [41.668, 12.285]),
};
