// Zoom e spostamento della mappa: rotella (o pizzico sul trackpad), trascinamento,
// pizzico a due dita sul telefono. Agisce solo sul viewBox dell'SVG: nessuna regola di gioco.
import { useCallback, useEffect, useRef, useState, type MouseEvent, type PointerEvent } from 'react';

const MAX_ZOOM = 6;
/** Movimento (px) oltre il quale un tocco diventa un trascinamento e non un clic. */
const DRAG_THRESHOLD = 5;

interface Camera {
  /** Fattore di zoom: 1 = mappa intera. */
  k: number;
  /** Centro dell'inquadratura, in coordinate della mappa. */
  cx: number;
  cy: number;
}

/** Riquadro inquadrato a zoom 1, in coordinate della mappa (può sporgere oltre la mappa). */
export interface Box { x: number; y: number; w: number; h: number }

export function useZoomPan(box: Box) {
  const svgRef = useRef<SVGSVGElement>(null);
  const initial: Camera = { k: 1, cx: box.x + box.w / 2, cy: box.y + box.h / 2 };
  // Il ref è la fonte di verità durante i gesti (più eventi tra un render e l'altro).
  const camRef = useRef<Camera>(initial);
  const [cam, setCam] = useState<Camera>(initial);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const moved = useRef(0);
  const dragging = useRef(false);

  const viewBox = (c: Camera) => {
    const w = box.w / c.k;
    const h = box.h / c.k;
    return { x: c.cx - w / 2, y: c.cy - h / 2, w, h };
  };

  const update = useCallback((c: Camera) => {
    const k = Math.min(MAX_ZOOM, Math.max(1, c.k));
    const hw = box.w / (2 * k);
    const hh = box.h / (2 * k);
    camRef.current = {
      k,
      cx: Math.min(box.x + box.w - hw, Math.max(box.x + hw, c.cx)),
      cy: Math.min(box.y + box.h - hh, Math.max(box.y + hh, c.cy)),
    };
    setCam(camRef.current);
  }, [box.x, box.y, box.w, box.h]);

  // Il riquadro cambia quando cambia lo schermo (rotazione del telefono, finestra
  // ridimensionata): si tiene lo zoom e si riporta l'inquadratura dentro i limiti.
  useEffect(() => {
    if (camRef.current.k <= 1) update({ k: 1, cx: box.x + box.w / 2, cy: box.y + box.h / 2 });
    else update(camRef.current);
  }, [update]);

  /** Scala (px per unità della mappa) e origine dell'SVG sullo schermo, con il letterbox. */
  const screen = () => {
    const rect = svgRef.current!.getBoundingClientRect();
    const vb = viewBox(camRef.current);
    const s = Math.min(rect.width / vb.w, rect.height / vb.h);
    return { vb, s, ox: rect.left + (rect.width - vb.w * s) / 2, oy: rect.top + (rect.height - vb.h * s) / 2 };
  };

  const zoomAt = useCallback((x: number, y: number, factor: number) => {
    const { vb, s, ox, oy } = screen();
    const mx = vb.x + (x - ox) / s;
    const my = vb.y + (y - oy) / s;
    const c = camRef.current;
    const k = Math.min(MAX_ZOOM, Math.max(1, c.k * factor));
    const f = k / c.k;
    update({ k, cx: mx + (c.cx - mx) / f, cy: my + (c.cy - my) / f });
  }, [update]);

  const panBy = (dx: number, dy: number) => {
    const { s } = screen();
    const c = camRef.current;
    update({ ...c, cx: c.cx - dx / s, cy: c.cy - dy / s });
  };

  // La rotella va registrata a mano: i listener di React sono passivi e non bloccano lo scroll.
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      // ctrlKey = pizzico sul trackpad: delta piccoli, serve più sensibilità.
      zoomAt(e.clientX, e.clientY, Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0015)));
    };
    svg.addEventListener('wheel', onWheel, { passive: false });
    return () => svg.removeEventListener('wheel', onWheel);
  }, [zoomAt]);

  const onPointerDown = (e: PointerEvent<SVGSVGElement>) => {
    if (pointers.current.size === 0) {
      moved.current = 0;
      dragging.current = false;
    }
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
  };

  const onPointerMove = (e: PointerEvent<SVGSVGElement>) => {
    const prev = pointers.current.get(e.pointerId);
    if (!prev) return;
    const cur = { x: e.clientX, y: e.clientY };
    const others = [...pointers.current.entries()].filter(([id]) => id !== e.pointerId);

    if (others.length === 0) {
      moved.current += Math.hypot(cur.x - prev.x, cur.y - prev.y);
      if (!dragging.current && moved.current > DRAG_THRESHOLD) {
        dragging.current = true;
        // Catturare il puntatore solo ora: prima, il clic deve arrivare al quartiere.
        e.currentTarget.setPointerCapture(e.pointerId);
      }
      if (dragging.current) panBy(cur.x - prev.x, cur.y - prev.y);
    } else {
      // Pizzico: zoom sul punto medio delle due dita, più lo spostamento del punto medio.
      const other = others[0][1];
      dragging.current = true;
      const d0 = Math.hypot(prev.x - other.x, prev.y - other.y);
      const d1 = Math.hypot(cur.x - other.x, cur.y - other.y);
      const mid0 = { x: (prev.x + other.x) / 2, y: (prev.y + other.y) / 2 };
      const mid1 = { x: (cur.x + other.x) / 2, y: (cur.y + other.y) / 2 };
      if (d0 > 0) zoomAt(mid1.x, mid1.y, d1 / d0);
      panBy(mid1.x - mid0.x, mid1.y - mid0.y);
    }
    pointers.current.set(e.pointerId, cur);
  };

  const onPointerUp = (e: PointerEvent<SVGSVGElement>) => {
    pointers.current.delete(e.pointerId);
  };

  /** Dopo un trascinamento il clic finale non deve selezionare il quartiere. */
  const onClickCapture = (e: MouseEvent<SVGSVGElement>) => {
    if (dragging.current) e.stopPropagation();
  };

  const vb = viewBox(cam);
  return {
    svgRef,
    zoom: cam.k,
    viewBox: `${vb.x} ${vb.y} ${vb.w} ${vb.h}`,
    handlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp,
      onPointerCancel: onPointerUp,
      onClickCapture,
    },
    zoomIn: () => update({ ...camRef.current, k: camRef.current.k * 1.6 }),
    zoomOut: () => update({ ...camRef.current, k: camRef.current.k / 1.6 }),
    reset: () => update(initial),
  };
}
