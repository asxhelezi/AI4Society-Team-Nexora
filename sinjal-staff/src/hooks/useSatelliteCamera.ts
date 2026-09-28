import { useCallback, useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react';

const TILE = 256;
const TILE_URL = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/';
const CENTER_LAT = 41.1125;
const CENTER_LON = 20.0822;
const MAX_TILE_ZOOM = 18;
const MIN_ZOOM = 13;
const MAX_ZOOM = 19;
const ZOOM_ANIM_MS = 260;

export interface MapSize {
  w: number;
  h: number;
}
export interface Point {
  x: number;
  y: number;
}
interface Tile {
  left: number;
  top: number;
  url: string;
}
interface TileLayer {
  tiles: Tile[];
  transform: string;
  opacity: number;
}

function project(lat: number, lon: number, z: number): Point {
  const n = TILE * Math.pow(2, z);
  const r = (lat * Math.PI) / 180;
  return { x: ((lon + 180) / 360) * n, y: ((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2) * n };
}

function buildTiles(size: MapSize, z: number, panX: number, panY: number, buffer = 320): Tile[] {
  const cx = size.w / 2 + panX,
    cy = size.h / 2 + panY;
  const w0 = project(CENTER_LAT, CENTER_LON, z);
  const ox = cx - w0.x,
    oy = cy - w0.y;
  const out: Tile[] = [];
  const y0 = Math.floor((-buffer - oy) / TILE),
    y1 = Math.floor((size.h + buffer - oy) / TILE);
  const x0 = Math.floor((-buffer - ox) / TILE),
    x1 = Math.floor((size.w + buffer - ox) / TILE);
  for (let ty = y0; ty <= y1; ty++) {
    for (let tx = x0; tx <= x1; tx++) {
      out.push({ left: Math.round(tx * TILE + ox), top: Math.round(ty * TILE + oy), url: TILE_URL + z + '/' + ty + '/' + tx });
    }
  }
  return out;
}

const clampZoom = (z: number) => Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, z));

interface Drag {
  x: number;
  y: number;
  panX: number;
  panY: number;
}
interface Pinch {
  dist: number;
  zoom: number;
  panX: number;
  panY: number;
  anchor: Point;
}

function eventPoint(e: MouseEvent | TouchEvent): Point {
  if ('touches' in e && e.touches[0]) return { x: e.touches[0].clientX, y: e.touches[0].clientY };
  const m = e as MouseEvent;
  return { x: m.clientX, y: m.clientY };
}
const touchDist = (a: Touch, b: Touch) => Math.hypot(b.clientX - a.clientX, b.clientY - a.clientY);
const touchMid = (a: Touch, b: Touch): Point => ({ x: (a.clientX + b.clientX) / 2, y: (a.clientY + b.clientY) / 2 });

export interface SatelliteCamera {
  cameraRef: RefObject<HTMLDivElement | null>;
  /** null until the camera has been measured once. */
  scene: { current: TileLayer; incoming: TileLayer; origin: string } | null;
  zoomIn: () => void;
  zoomOut: () => void;
  /** Continuous zoom (13–19), screen-pixel pan and the measured frame size —
   * for callers that project their own points (pins, drawn shapes) onto the
   * same ground the imagery shows, instead of scaling a whole container
   * (which would also blow up any CSS filter/drop-shadow on its contents). */
  zoomLevel: number;
  pan: Point;
  size: MapSize | null;
}

/**
 * Real Esri World Imagery camera behind Harta/Kreu's schematic pins: continuous
 * fractional zoom with a cross-fading next-level tile layer (the same trick
 * sinjal-citizen's harta.html uses for a gradual, never-blocked zoom), plus
 * drag-to-pan, wheel and pinch. Purely visual, like the SatelliteMapBackground
 * it replaces — it never touches the percentage-space pins/clusters/zone-draw
 * overlay layered on top.
 */
export function useSatelliteCamera(opts: { initialZoom?: number; panEnabled?: boolean } = {}): SatelliteCamera {
  const cameraRef = useRef<HTMLDivElement>(null);
  const [zoomLevel, setZoomLevel] = useState(opts.initialZoom ?? 15.4);
  const [pan, setPan] = useState<Point>({ x: 0, y: 0 });
  const [size, setSize] = useState<MapSize | null>(null);
  const zoomRef = useRef(zoomLevel);
  zoomRef.current = zoomLevel;
  const panRef = useRef(pan);
  panRef.current = pan;
  const animRef = useRef<number | undefined>(undefined);
  const panEnabled = opts.panEnabled !== false;

  useLayoutEffect(() => {
    const el = cameraRef.current;
    if (!el) return;
    const measure = () => {
      const w = el.clientWidth,
        h = el.clientHeight;
      if (!w || !h) return;
      setSize((prev) => (prev && prev.w === w && prev.h === h ? prev : { w, h }));
    };
    measure();
    if (!window.ResizeObserver) return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const zoomAt = useCallback((newZoom: number, anchor: Point) => {
    const oldZoom = zoomRef.current;
    const z = clampZoom(newZoom);
    const scaleRatio = Math.pow(2, z - oldZoom);
    const p = panRef.current;
    const next = { x: anchor.x - (anchor.x - p.x) * scaleRatio, y: anchor.y - (anchor.y - p.y) * scaleRatio };
    zoomRef.current = z;
    panRef.current = next;
    setZoomLevel(z);
    setPan(next);
  }, []);

  // Buttons/double-click animate over ~260ms (smoothstep) instead of jumping,
  // so pressing "+" reads as the same gradual zoom as spinning the wheel.
  const animateZoomBy = useCallback(
    (delta: number) => {
      const el = cameraRef.current;
      const anchor = el ? { x: el.clientWidth / 2, y: el.clientHeight / 2 } : { x: 0, y: 0 };
      const from = zoomRef.current;
      const to = clampZoom(from + delta);
      if (animRef.current) cancelAnimationFrame(animRef.current);
      const start = performance.now();
      const step = (now: number) => {
        const t = Math.min(1, (now - start) / ZOOM_ANIM_MS);
        const eased = t * t * (3 - 2 * t);
        zoomAt(from + (to - from) * eased, anchor);
        if (t < 1) animRef.current = requestAnimationFrame(step);
      };
      animRef.current = requestAnimationFrame(step);
    },
    [zoomAt],
  );

  useEffect(
    () => () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    },
    [],
  );

  useEffect(() => {
    const el = cameraRef.current;
    if (!el) return;
    let drag: Drag | null = null;
    let pinch: Pinch | null = null;

    const onDown = (e: MouseEvent | TouchEvent) => {
      if (!panEnabled) return;
      if ('touches' in e && e.touches.length === 2) {
        const rect = el.getBoundingClientRect();
        const mid = touchMid(e.touches[0], e.touches[1]);
        pinch = { dist: touchDist(e.touches[0], e.touches[1]), zoom: zoomRef.current, panX: panRef.current.x, panY: panRef.current.y, anchor: { x: mid.x - rect.left, y: mid.y - rect.top } };
        drag = null;
        return;
      }
      pinch = null;
      const p = eventPoint(e);
      drag = { x: p.x, y: p.y, panX: panRef.current.x, panY: panRef.current.y };
    };
    const onMove = (e: MouseEvent | TouchEvent) => {
      if ('touches' in e && e.touches.length === 2 && pinch) {
        e.preventDefault();
        const pn = pinch;
        const ratio = touchDist(e.touches[0], e.touches[1]) / pn.dist;
        const newZoom = clampZoom(pn.zoom + Math.log2(ratio));
        const scaleRatio = Math.pow(2, newZoom - pn.zoom);
        const a = pn.anchor;
        zoomRef.current = newZoom;
        panRef.current = { x: a.x - (a.x - pn.panX) * scaleRatio, y: a.y - (a.y - pn.panY) * scaleRatio };
        setZoomLevel(zoomRef.current);
        setPan(panRef.current);
        return;
      }
      if (!drag) return;
      const p = eventPoint(e);
      const next = { x: drag.panX + (p.x - drag.x), y: drag.panY + (p.y - drag.y) };
      panRef.current = next;
      setPan(next);
    };
    const onUp = () => {
      drag = null;
      pinch = null;
    };
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      zoomAt(zoomRef.current + (e.deltaY > 0 ? -0.35 : 0.35), { x: e.clientX - rect.left, y: e.clientY - rect.top });
    };

    el.addEventListener('mousedown', onDown);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    el.addEventListener('touchstart', onDown, { passive: true });
    el.addEventListener('touchmove', onMove, { passive: false });
    el.addEventListener('touchend', onUp);
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      el.removeEventListener('mousedown', onDown);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      el.removeEventListener('touchstart', onDown);
      el.removeEventListener('touchmove', onMove);
      el.removeEventListener('touchend', onUp);
      el.removeEventListener('wheel', onWheel);
    };
  }, [panEnabled, zoomAt]);

  let scene: SatelliteCamera['scene'] = null;
  if (size) {
    const baseZ = Math.min(MAX_TILE_ZOOM, Math.floor(zoomLevel));
    const frac = zoomLevel - baseZ;
    const scaleCur = Math.pow(2, frac);
    const nextZ = Math.min(MAX_TILE_ZOOM, baseZ + 1);
    scene = {
      current: { tiles: buildTiles(size, baseZ, pan.x, pan.y), transform: `scale(${scaleCur})`, opacity: 1 },
      incoming: { tiles: baseZ < MAX_TILE_ZOOM ? buildTiles(size, nextZ, pan.x, pan.y) : [], transform: `scale(${scaleCur / 2})`, opacity: baseZ < MAX_TILE_ZOOM ? frac : 0 },
      origin: `${size.w / 2}px ${size.h / 2}px`,
    };
  }

  const zoomIn = useCallback(() => animateZoomBy(1), [animateZoomBy]);
  const zoomOut = useCallback(() => animateZoomBy(-1), [animateZoomBy]);

  return { cameraRef, scene, zoomIn, zoomOut, zoomLevel, pan, size };
}
