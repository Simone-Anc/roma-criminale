// Geografia di Roma: coordinate reali (semplificate) di confine comunale, costa, fiumi e
// GRA, proiettate su un piano con una "lente" che ingrandisce il centro, come nelle
// mappe della metropolitana. I quartieri sono celle di Voronoi attorno al loro centro.
// Modulo puro: lo usano sia le regole (adiacenze) sia la UI (disegno della mappa).

/** Punto geografico: [latitudine, longitudine]. */
export type LatLon = [number, number];
/** Punto sulla mappa (coordinate SVG). */
export type Pt = [number, number];

const ORIGIN: LatLon = [41.893, 12.492]; // circa il Colosseo
const KM_LAT = 110.57;
const KM_LON = 111.32 * Math.cos((ORIGIN[0] * Math.PI) / 180);
/** Raggio (km) entro cui la scala è quasi lineare; oltre, la periferia viene compressa. */
const LENS_KM = 5.5;

/** Confine del Comune di Roma, molto semplificato, in senso orario da Cesano. */
const BOUNDARY: LatLon[] = [
  [42.085, 12.33], [42.092, 12.4], [42.062, 12.45], [42.072, 12.5], [42.05, 12.56],
  [42.012, 12.61], [41.962, 12.64], [41.952, 12.7], [41.922, 12.762], [41.882, 12.742],
  [41.852, 12.692], [41.828, 12.652], [41.812, 12.628], [41.795, 12.585], [41.77, 12.565],
  [41.738, 12.568], [41.702, 12.535], [41.703, 12.472], [41.688, 12.425],
  // costa, da Capocotta alla foce del Tevere
  [41.662, 12.39], [41.676, 12.362], [41.695, 12.332], [41.714, 12.302], [41.73, 12.272],
  [41.738, 12.251], [41.742, 12.234],
  // confine con Fiumicino, verso nord
  [41.762, 12.262], [41.782, 12.292], [41.81, 12.302], [41.842, 12.29], [41.872, 12.252],
  [41.91, 12.232], [41.95, 12.252], [41.99, 12.282], [42.04, 12.292],
];

/** Linea di costa estesa oltre il comune (Fiumicino a nord, Torvaianica a sud). */
const COAST: LatLon[] = [
  [42.2, 11.85], [42.08, 11.98], [42.0, 12.06], [41.92, 12.13], [41.86, 12.19], [41.8, 12.215], [41.765, 12.222],
  [41.742, 12.234], [41.738, 12.251], [41.73, 12.272], [41.714, 12.302], [41.695, 12.332],
  [41.676, 12.362], [41.662, 12.39], [41.64, 12.43], [41.6, 12.49], [41.55, 12.56],
];

export const TIBER: LatLon[] = [
  [42.1, 12.585], [42.06, 12.565], [42.03, 12.545], [42.005, 12.515], [41.985, 12.505],
  [41.965, 12.5], [41.95, 12.492], [41.944, 12.48], [41.94, 12.47], [41.934, 12.466],
  [41.925, 12.468], [41.915, 12.471], [41.908, 12.474], [41.903, 12.47], [41.9, 12.465],
  [41.896, 12.466], [41.892, 12.471], [41.889, 12.477], [41.882, 12.477], [41.875, 12.473],
  [41.868, 12.472], [41.86, 12.468], [41.853, 12.462], [41.849, 12.452], [41.845, 12.44],
  [41.84, 12.427], [41.834, 12.413], [41.826, 12.396], [41.818, 12.375], [41.807, 12.352],
  [41.794, 12.332], [41.78, 12.31], [41.767, 12.285], [41.755, 12.26], [41.742, 12.234],
  [41.735, 12.215],
];

export const ANIENE: LatLon[] = [
  [41.96, 12.79], [41.935, 12.69], [41.924, 12.65], [41.928, 12.61], [41.925, 12.575],
  [41.927, 12.548], [41.933, 12.525], [41.94, 12.51], [41.946, 12.496],
];

/** Coordinate grezze (km "a lente", origine al centro), prima dell'adattamento al riquadro. */
function lens([lat, lon]: LatLon): Pt {
  const dx = (lon - ORIGIN[1]) * KM_LON;
  const dy = (ORIGIN[0] - lat) * KM_LAT;
  const r = Math.hypot(dx, dy);
  const f = r > 0 ? (LENS_KM * Math.log(1 + r / LENS_KM)) / r : 1;
  return [dx * f, dy * f];
}

const MARGIN = 26;
const WIDTH = 760;
const FIT = (() => {
  const pts = BOUNDARY.map(lens);
  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  const scale = (WIDTH - 2 * MARGIN) / (Math.max(...xs) - minX);
  const height = Math.ceil((Math.max(...ys) - minY) * scale + 2 * MARGIN);
  return { minX, minY, scale, height };
})();

export const VIEWBOX = { w: WIDTH, h: FIT.height };

/** Proietta un punto geografico sulla mappa. */
export function project(p: LatLon): Pt {
  const [x, y] = lens(p);
  return [MARGIN + (x - FIT.minX) * FIT.scale, MARGIN + (y - FIT.minY) * FIT.scale];
}

/** Cerchio approssimato del Grande Raccordo Anulare (~10,8 km di raggio). */
export function graRing(steps = 120): LatLon[] {
  const center: LatLon = [41.895, 12.49];
  const out: LatLon[] = [];
  for (let i = 0; i < steps; i++) {
    const a = (i / steps) * Math.PI * 2;
    const r = 10.8 + 0.6 * Math.sin(3 * a + 0.7) + 0.4 * Math.sin(5 * a);
    out.push([center[0] - (Math.sin(a) * r) / KM_LAT, center[1] + (Math.cos(a) * r) / KM_LON]);
  }
  return out;
}

export const BOUNDARY_PTS: Pt[] = BOUNDARY.map(project);
export const COAST_PTS: Pt[] = COAST.map(project);

// ------------------------------------------------------------------ Voronoi

/** Lato di una cella: `to` è l'id del quartiere confinante, oppure null sul confine comunale. */
export interface CellVertex {
  p: Pt;
  /** Chi sta dall'altra parte del lato che parte da questo vertice. */
  to: string | null;
}

export interface Cell {
  id: string;
  site: Pt;
  vertices: CellVertex[];
}

/**
 * Taglia il poligono con il semipiano dei punti più vicini a `a` che a `b`
 * (Sutherland-Hodgman), annotando su ogni lato chi c'è dall'altra parte.
 */
function clip(poly: CellVertex[], a: Pt, b: Pt, label: string): CellVertex[] {
  const n: Pt = [b[0] - a[0], b[1] - a[1]];
  const m: Pt = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  const side = (p: Pt) => (p[0] - m[0]) * n[0] + (p[1] - m[1]) * n[1];
  const out: CellVertex[] = [];
  for (let i = 0; i < poly.length; i++) {
    const cur = poly[i];
    const nxt = poly[(i + 1) % poly.length];
    const sc = side(cur.p);
    const sn = side(nxt.p);
    const cross = (): Pt => {
      const t = sc / (sc - sn);
      return [cur.p[0] + (nxt.p[0] - cur.p[0]) * t, cur.p[1] + (nxt.p[1] - cur.p[1]) * t];
    };
    if (sc <= 0 && sn <= 0) out.push(cur);
    else if (sc <= 0) out.push(cur, { p: cross(), to: label });
    else if (sn <= 0) out.push({ p: cross(), to: cur.to });
  }
  return out;
}

/** Celle di Voronoi dei siti, ritagliate sul confine del comune. */
export function voronoi(sites: { id: string; site: Pt }[]): Cell[] {
  const border: CellVertex[] = BOUNDARY_PTS.map((p) => ({ p, to: null }));
  return sites.map(({ id, site }) => {
    let vertices = border;
    for (const other of sites) if (other.id !== id) vertices = clip(vertices, site, other.site, other.id);
    return { id, site, vertices };
  });
}

/** Lunghezza minima (px) di un lato in comune perché due quartieri confinino. */
const MIN_SHARED_EDGE = 6;

export function cellNeighbors(cell: Cell): string[] {
  const out = new Set<string>();
  cell.vertices.forEach((v, i) => {
    const next = cell.vertices[(i + 1) % cell.vertices.length];
    if (v.to && Math.hypot(next.p[0] - v.p[0], next.p[1] - v.p[1]) >= MIN_SHARED_EDGE) out.add(v.to);
  });
  return [...out];
}
