import { useCallback, useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react';
import { BASE_ZOOM, DEMO_USER, ELBASAN, MAX_TILE_ZOOM, clampZoom, smoothstep, snappedTiles, toScreen, type LatLon, type MapSize, type Point, type Tile } from './mapMath';

/** permission → (Lejo) → locating → flying → arrived; "Jo tani" → denied (the card stays up). */
export type MapStage = 'permission' | 'denied' | 'locating' | 'flying' | 'arrived';

export interface MapView {
  stage: MapStage;
  zoomLevel: number;
  /** Set 500 ms after arriving: pins, zoom buttons and drag/zoom gestures appear then. */
  arrivedSettled: boolean;
  panX: number;
  panY: number;
  hoveredPinId: string | null;
  openPinId: string | null;
  /** Shown in the permission card instead of the default copy (unused by the demo flow, as in the static page). */
  errorMsg: string;
  userLat: number | null;
  userLon: number | null;
}

const INITIAL_VIEW: MapView = {
  stage: 'permission',
  zoomLevel: 8,
  arrivedSettled: false,
  panX: 0,
  panY: 0,
  hoveredPinId: null,
  openPinId: null,
  errorMsg: '',
  userLat: null,
  userLon: null,
};

/** Size the static page assumed before it could measure the map. */
const FALLBACK_SIZE: MapSize = { w: 350, h: 500 };

/** Fly-in after "Lejo": zoom 8 → 17 over 2.2 s (smoothstep), stepped every 30 ms. */
const FLY = { from: 8, to: 17, durationMs: 2200, stepMs: 30, delayMs: 150, settleMs: 500 };

/** Everything `render()` in harta.html derived from the state, computed once per render. */
export interface MapScene {
  anchor: LatLon;
  baseZ: number;
  scaleCur: number;
  /** transform-origin of the tile layers (map centre). */
  origin: string;
  current: { tiles: Tile[]; transform: string | undefined };
  incoming: { tiles: Tile[]; transform: string | undefined; opacity: number } | null;
  /** Screen position of the user's location marker, when it is shown. */
  marker: Point | null;
  showPermission: boolean;
  toastText: string;
  showSpinner: boolean;
  /** Drag, wheel/pinch zoom and the zoom buttons are active. */
  interactive: boolean;
  showPins: boolean;
}

function isInteractive(v: MapView) {
  return v.stage === 'arrived' && v.arrivedSettled;
}

function anchorOf(v: MapView): LatLon {
  return v.userLat != null && v.userLon != null ? [v.userLat, v.userLon] : ELBASAN;
}

export function deriveScene(v: MapView, size: MapSize): MapScene {
  const { stage } = v;
  const anchor = anchorOf(v);
  const origin = `${size.w / 2}px ${size.h / 2}px`;
  const showPermission = stage === 'permission' || stage === 'denied';
  let toastText = '';
  if (stage === 'locating') toastText = 'Duke kërkuar vendndodhjen tënde…';
  else if (stage === 'flying') toastText = "Duke t'u afruar…";

  let baseZ = BASE_ZOOM;
  let scaleCur = 1;
  let current: MapScene['current'];
  let incoming: MapScene['incoming'] = null;
  if (showPermission) {
    current = { tiles: snappedTiles(size, anchor, baseZ, 0, 0), transform: undefined };
  } else {
    const zl = v.zoomLevel;
    baseZ = Math.min(MAX_TILE_ZOOM, Math.floor(zl));
    const frac = zl - baseZ;
    scaleCur = Math.pow(2, frac);
    current = { tiles: snappedTiles(size, anchor, baseZ, v.panX, v.panY), transform: `scale(${scaleCur})` };
    incoming = { tiles: snappedTiles(size, anchor, baseZ + 1, v.panX, v.panY), transform: `scale(${scaleCur / 2})`, opacity: frac };
  }

  const interactive = isInteractive(v);
  return {
    anchor,
    baseZ,
    scaleCur,
    origin,
    current,
    incoming,
    marker: stage === 'arrived' ? toScreen(size, size.w / 2, size.h / 2, scaleCur, v.panX, v.panY) : null,
    showPermission,
    toastText,
    showSpinner: stage === 'locating' || stage === 'flying',
    interactive,
    showPins: showPermission || interactive,
  };
}

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

/**
 * The custom satellite map of harta.html (`initHartaMap`) as a hook: view state, the
 * "Lejo" fly-in timeline, drag / wheel / pinch gestures on `cameraRef`, and the map size
 * (re-measured with a ResizeObserver). All timers and listeners are removed on unmount.
 */
export function useHartaMap(cameraRef: RefObject<HTMLDivElement | null>) {
  const [view, setView] = useState<MapView>(INITIAL_VIEW);
  const [size, setSize] = useState<MapSize | null>(null);
  // Latest values for the native event listeners and timers (they outlive a single render).
  const viewRef = useRef(view);
  const sizeRef = useRef<MapSize>(FALLBACK_SIZE);
  const timers = useRef<{ t1?: number; t4?: number; zoom?: number }>({});

  const update = useCallback((patch: (v: MapView) => Partial<MapView>) => {
    const next = { ...viewRef.current, ...patch(viewRef.current) };
    viewRef.current = next;
    setView(next);
  }, []);

  const clearTimers = useCallback(() => {
    const t = timers.current;
    window.clearTimeout(t.t1);
    window.clearTimeout(t.t4);
    window.clearInterval(t.zoom);
    timers.current = {};
  }, []);

  // Measure before the first paint, then follow layout changes (rotation, resize, breakpoints).
  useLayoutEffect(() => {
    const camera = cameraRef.current;
    if (!camera) return;
    const rect = camera.getBoundingClientRect();
    sizeRef.current = { w: rect.width || FALLBACK_SIZE.w, h: rect.height || FALLBACK_SIZE.h };
    setSize(sizeRef.current);
    if (!window.ResizeObserver) return;
    const ro = new ResizeObserver(() => {
      const w = camera.offsetWidth,
        h = camera.offsetHeight;
      if (!w || !h || (w === sizeRef.current.w && h === sizeRef.current.h)) return;
      sizeRef.current = { w, h };
      setSize(sizeRef.current);
    });
    ro.observe(camera);
    return () => ro.disconnect();
  }, [cameraRef]);

  const zoomAt = useCallback(
    (newZoom: number, anchor: Point) => {
      update((v) => {
        const oldZoom = v.zoomLevel || 17;
        const z = clampZoom(newZoom);
        const scaleRatio = Math.pow(2, z - oldZoom);
        return { panX: anchor.x - (anchor.x - v.panX) * scaleRatio, panY: anchor.y - (anchor.y - v.panY) * scaleRatio, zoomLevel: z };
      });
    },
    [update],
  );

  // Drag, wheel and pinch. Native listeners: wheel and touchmove must be non-passive to preventDefault.
  useEffect(() => {
    const camera = cameraRef.current;
    if (!camera) return;
    let drag: Drag | null = null;
    let pinch: Pinch | null = null;

    const onDown = (e: MouseEvent | TouchEvent) => {
      const v = viewRef.current;
      if (!isInteractive(v)) return;
      if ('touches' in e && e.touches.length === 2) {
        const rect = camera.getBoundingClientRect();
        const mid = touchMid(e.touches[0], e.touches[1]);
        pinch = { dist: touchDist(e.touches[0], e.touches[1]), zoom: v.zoomLevel, panX: v.panX, panY: v.panY, anchor: { x: mid.x - rect.left, y: mid.y - rect.top } };
        drag = null;
        return;
      }
      pinch = null;
      const p = eventPoint(e);
      drag = { x: p.x, y: p.y, panX: v.panX, panY: v.panY };
    };
    const onMove = (e: MouseEvent | TouchEvent) => {
      if ('touches' in e && e.touches.length === 2 && pinch) {
        e.preventDefault();
        const pn = pinch;
        const ratio = touchDist(e.touches[0], e.touches[1]) / pn.dist;
        const newZoom = clampZoom(pn.zoom + Math.log2(ratio));
        const scaleRatio = Math.pow(2, newZoom - pn.zoom);
        const a = pn.anchor;
        update(() => ({ zoomLevel: newZoom, panX: a.x - (a.x - pn.panX) * scaleRatio, panY: a.y - (a.y - pn.panY) * scaleRatio }));
        return;
      }
      if (!drag) return;
      const d = drag;
      const p = eventPoint(e);
      update(() => ({ panX: d.panX + (p.x - d.x), panY: d.panY + (p.y - d.y) }));
    };
    const onUp = () => {
      drag = null;
      pinch = null;
    };
    const onWheel = (e: WheelEvent) => {
      const v = viewRef.current;
      if (!isInteractive(v)) return;
      e.preventDefault();
      const rect = camera.getBoundingClientRect();
      zoomAt((v.zoomLevel || 17) + (e.deltaY > 0 ? -0.35 : 0.35), { x: e.clientX - rect.left, y: e.clientY - rect.top });
    };

    camera.addEventListener('mousedown', onDown);
    camera.addEventListener('mousemove', onMove);
    camera.addEventListener('mouseup', onUp);
    camera.addEventListener('mouseleave', onUp);
    camera.addEventListener('touchstart', onDown, { passive: true });
    camera.addEventListener('touchmove', onMove, { passive: false });
    camera.addEventListener('touchend', onUp);
    camera.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      camera.removeEventListener('mousedown', onDown);
      camera.removeEventListener('mousemove', onMove);
      camera.removeEventListener('mouseup', onUp);
      camera.removeEventListener('mouseleave', onUp);
      camera.removeEventListener('touchstart', onDown);
      camera.removeEventListener('touchmove', onMove);
      camera.removeEventListener('touchend', onUp);
      camera.removeEventListener('wheel', onWheel);
    };
  }, [cameraRef, update, zoomAt]);

  // Stop the fly-in timeline if the page unmounts mid-animation.
  useEffect(() => clearTimers, [clearTimers]);

  /** "Lejo": jump to the demo user location and fly in (the static page never asked the browser for a real position). */
  const allow = useCallback(() => {
    clearTimers();
    update(() => ({ stage: 'locating', errorMsg: '' }));
    update(() => ({ userLat: DEMO_USER[0], userLon: DEMO_USER[1], zoomLevel: FLY.from, panX: 0, panY: 0, stage: 'flying' }));
    timers.current.t1 = window.setTimeout(() => {
      const start = Date.now();
      timers.current.zoom = window.setInterval(() => {
        const t = Math.min(1, (Date.now() - start) / FLY.durationMs);
        update(() => ({ zoomLevel: FLY.from + (FLY.to - FLY.from) * smoothstep(t) }));
        if (t >= 1) {
          window.clearInterval(timers.current.zoom);
          update(() => ({ stage: 'arrived' }));
          timers.current.t4 = window.setTimeout(() => update(() => ({ arrivedSettled: true })), FLY.settleMs);
        }
      }, FLY.stepMs);
    }, FLY.delayMs);
  }, [clearTimers, update]);

  const deny = useCallback(() => update(() => ({ stage: 'denied', errorMsg: '' })), [update]);
  const zoomIn = useCallback(() => zoomAt((viewRef.current.zoomLevel || 17) + 1, { x: sizeRef.current.w / 2, y: sizeRef.current.h / 2 }), [zoomAt]);
  const zoomOut = useCallback(() => zoomAt((viewRef.current.zoomLevel || 17) - 1, { x: sizeRef.current.w / 2, y: sizeRef.current.h / 2 }), [zoomAt]);

  const hoverPin = useCallback((id: string) => update(() => ({ hoveredPinId: id })), [update]);
  const unhover = useCallback(() => update(() => ({ hoveredPinId: null })), [update]);
  const togglePin = useCallback((id: string) => update((v) => ({ openPinId: v.openPinId === id ? null : id })), [update]);
  const closeCard = useCallback(() => update(() => ({ openPinId: null, hoveredPinId: null })), [update]);

  return { view, size, allow, deny, zoomIn, zoomOut, hoverPin, unhover, togglePin, closeCard };
}
