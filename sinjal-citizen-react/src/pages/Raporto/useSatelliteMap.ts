import { useCallback, useLayoutEffect, useRef, useState, type RefObject } from 'react';
import { DEMO_LAT, DEMO_LON } from './data';
import type { MapSelection } from './useReportForm';

const TILE = 256;
const MIN_ZOOM = 14;
const MAX_ZOOM = 19;
const TILE_URL = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile';

interface View {
  zoom: number;
  panX: number;
  panY: number;
  width: number;
  height: number;
}

export interface MapTile {
  key: string;
  left: number;
  top: number;
  url: string;
}

/** Web-Mercator pixel coordinates of a point at zoom `z`. */
function project(lat: number, lon: number, z: number) {
  const n = TILE * Math.pow(2, z);
  const r = (lat * Math.PI) / 180;
  return { x: ((lon + 180) / 360) * n, y: ((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2) * n };
}

function unproject(x: number, y: number, z: number) {
  const n = TILE * Math.pow(2, z);
  const lon = (x / n) * 360 - 180;
  const lat = (180 / Math.PI) * Math.atan(Math.sinh(Math.PI * (1 - (2 * y) / n)));
  return { lat, lon };
}

/** Top-left of the map's world pixel space relative to the box (map centred on the demo point, then panned). */
function origin(v: View) {
  const center = project(DEMO_LAT, DEMO_LON, v.zoom);
  return { center, left: v.width / 2 - center.x + v.panX, top: v.height / 2 - center.y + v.panY };
}

function tilesFor(v: View): MapTile[] {
  const { left, top } = origin(v);
  const minX = Math.floor((-left - TILE) / TILE);
  const maxX = Math.ceil((v.width - left + TILE) / TILE);
  const minY = Math.floor((-top - TILE) / TILE);
  const maxY = Math.ceil((v.height - top + TILE) / TILE);
  const tiles: MapTile[] = [];
  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      tiles.push({ key: `${v.zoom}/${y}/${x}`, left: left + x * TILE, top: top + y * TILE, url: `${TILE_URL}/${v.zoom}/${y}/${x}` });
    }
  }
  return tiles;
}

type PointerLike = { clientX: number; clientY: number };

function pointOf(e: MouseEvent | TouchEvent): PointerLike {
  if ('touches' in e) return e.touches[0] ?? e.changedTouches[0] ?? { clientX: 0, clientY: 0 };
  return e;
}

/**
 * The satellite picker map of raporto.html (`initRaportoMap`): Esri World Imagery tiles
 * centred on Elbasan, drag to pan, wheel or +/− to zoom (14–19). A press that doesn't move
 * more than 3px selects that point; call `takeTap()` from the map's click handler to get it.
 */
export function useSatelliteMap(mapRef: RefObject<HTMLDivElement | null>) {
  const viewRef = useRef<View>({ zoom: 16, panX: 0, panY: 0, width: 350, height: 260 });
  const [view, setView] = useState<View | null>(null);
  const [dragging, setDragging] = useState(false);
  /** Set by the pointer handlers, read (and cleared) by the click handler. */
  const tapRef = useRef<{ moved: boolean; point: MapSelection | null }>({ moved: false, point: null });

  const commit = useCallback(() => setView({ ...viewRef.current }), []);

  useLayoutEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const v = viewRef.current;
    const rect = map.getBoundingClientRect();
    v.width = rect.width || 350;
    v.height = rect.height || 260;
    let active = false;
    let moved = false;
    let startX = 0;
    let startY = 0;
    let startPanX = 0;
    let startPanY = 0;

    const down = (e: MouseEvent | TouchEvent) => {
      const p = pointOf(e);
      active = true;
      moved = false;
      startX = p.clientX;
      startY = p.clientY;
      startPanX = v.panX;
      startPanY = v.panY;
      // A drag that ended outside the map (mouseleave) produces no click, so forget it here;
      // otherwise the next real tap would be swallowed (a bug in the static page).
      tapRef.current = { moved: false, point: null };
      setDragging(true);
    };
    const move = (e: MouseEvent | TouchEvent) => {
      if (!active) return;
      const p = pointOf(e);
      const dx = p.clientX - startX;
      const dy = p.clientY - startY;
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) moved = true;
      v.panX = startPanX + dx;
      v.panY = startPanY + dy;
      commit();
      if (e.cancelable) e.preventDefault();
    };
    const up = (e: MouseEvent | TouchEvent) => {
      if (!active) return;
      active = false;
      setDragging(false);
      if (moved) {
        tapRef.current = { moved: true, point: null };
        return;
      }
      const p = pointOf(e);
      const box = map.getBoundingClientRect();
      const { center } = origin(v);
      const selected = unproject(center.x + (p.clientX - box.left - v.width / 2 - v.panX), center.y + (p.clientY - box.top - v.height / 2 - v.panY), v.zoom);
      tapRef.current.point = { lat: selected.lat, lon: selected.lon, x: ((p.clientX - box.left) / box.width) * 100, y: ((p.clientY - box.top) / box.height) * 100 };
    };
    const wheel = (e: WheelEvent) => {
      e.preventDefault();
      v.zoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, v.zoom + (e.deltaY < 0 ? 1 : -1)));
      commit();
    };

    map.addEventListener('mousedown', down);
    map.addEventListener('mousemove', move);
    map.addEventListener('mouseup', up);
    map.addEventListener('mouseleave', up);
    map.addEventListener('touchstart', down, { passive: true });
    map.addEventListener('touchmove', move, { passive: false });
    map.addEventListener('touchend', up);
    map.addEventListener('wheel', wheel, { passive: false });
    commit();

    // Re-measure when the layout reflows (rotation, window resize, breakpoint change).
    const ro = new ResizeObserver(() => {
      if (!map.offsetWidth || (map.offsetWidth === v.width && map.offsetHeight === v.height)) return;
      v.width = map.offsetWidth;
      v.height = map.offsetHeight;
      commit();
    });
    ro.observe(map);

    return () => {
      ro.disconnect();
      map.removeEventListener('mousedown', down);
      map.removeEventListener('mousemove', move);
      map.removeEventListener('mouseup', up);
      map.removeEventListener('mouseleave', up);
      map.removeEventListener('touchstart', down);
      map.removeEventListener('touchmove', move);
      map.removeEventListener('touchend', up);
      map.removeEventListener('wheel', wheel);
    };
  }, [mapRef, commit]);

  const zoomBy = useCallback(
    (delta: number) => {
      const v = viewRef.current;
      v.zoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, v.zoom + delta));
      commit();
    },
    [commit],
  );

  /**
   * For the map's click handler. Returns 'drag' after a pan (ignore the click), the point
   * picked by the press, or null (click without a tracked press, e.g. synthetic).
   */
  const takeTap = useCallback((): 'drag' | MapSelection | null => {
    const tap = tapRef.current;
    if (tap.moved) {
      tap.moved = false;
      return 'drag';
    }
    const point = tap.point;
    tap.point = null;
    return point;
  }, []);

  return { tiles: view ? tilesFor(view) : [], dragging, zoomBy, takeTap };
}
