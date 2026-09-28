/*
 * Map math from harta.html `initHartaMap`, ported unchanged: Web-Mercator projection,
 * Esri World Imagery tile lists, and canvas → screen transforms. Pure functions; the map
 * size (MAPW × MAPH) and the anchor (map centre) are passed in instead of read from closures.
 */

/** Map centre before the user shares a location (Elbasan). */
export const ELBASAN: LatLon = [41.1111, 20.0806];
/** Demo "user location" the map flies to after "Lejo" (the static site never used real geolocation). */
export const DEMO_USER: LatLon = [41.1118, 20.0812];

export type LatLon = [lat: number, lon: number];

export interface MapSize {
  w: number;
  h: number;
}

export interface Tile {
  left: number;
  top: number;
  url: string;
}

export interface Point {
  x: number;
  y: number;
}

/** Zoom level of the still map shown behind the permission card. */
export const BASE_ZOOM = 14;
/** Highest imagery level requested (fractional zoom above it is CSS scaling). */
export const MAX_TILE_ZOOM = 18;
export const MIN_ZOOM = 14;
export const MAX_ZOOM = 19.5;

/** World pixel coordinates at zoom z (256 px tiles). */
export function project(lat: number, lon: number, z: number): Point {
  const n = 256 * Math.pow(2, z);
  const r = (lat * Math.PI) / 180;
  return { x: ((lon + 180) / 360) * n, y: ((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2) * n };
}

/** Tiles covering the map (plus a 320 px buffer) for a centre + pan at zoom z. */
export function tiles(size: MapSize, lat: number, lon: number, z: number, panX = 0, panY = 0, buffer = 320): Tile[] {
  const cx = size.w / 2 + panX,
    cy = size.h / 2 + panY;
  const w0 = project(lat, lon, z);
  const ox = cx - w0.x,
    oy = cy - w0.y,
    out: Tile[] = [];
  for (let ty = Math.floor((-buffer - oy) / 256); ty <= Math.floor((size.h + buffer - oy) / 256); ty++) {
    for (let tx = Math.floor((-buffer - ox) / 256); tx <= Math.floor((size.w + buffer - ox) / 256); tx++) {
      out.push({
        left: Math.round(tx * 256 + ox),
        top: Math.round(ty * 256 + oy),
        url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/' + z + '/' + ty + '/' + tx,
      });
    }
  }
  return out;
}

/**
 * The static page's `getTiles`: the pan is snapped to a 24 px grid (it was the cache key),
 * so the imagery moves in 24 px steps while dragging. Kept as-is for parity.
 */
export function snappedTiles(size: MapSize, anchor: LatLon, z: number, panX: number, panY: number): Tile[] {
  const rx = Math.round(panX / 24) * 24,
    ry = Math.round(panY / 24) * 24;
  return tiles(size, anchor[0], anchor[1], z, rx, ry);
}

/**
 * Canvas-space offset (before pan/scale) of a real lat/lon relative to the map's current
 * centre, at zoom z — mirrors the tile projection so pins line up with imagery.
 */
export function pinCanvasXY(size: MapSize, anchor: LatLon, lat: number, lon: number, z: number): Point {
  const c0 = project(anchor[0], anchor[1], z);
  const cp = project(lat, lon, z);
  return { x: size.w / 2 + (cp.x - c0.x), y: size.h / 2 + (cp.y - c0.y) };
}

export function toScreen(size: MapSize, x: number, y: number, scaleCur: number, panX: number, panY: number): Point {
  return { x: size.w / 2 + (x - size.w / 2) * scaleCur + panX, y: size.h / 2 + (y - size.h / 2) * scaleCur + panY };
}

export function smoothstep(t: number): number {
  return t * t * (3 - 2 * t);
}

export function clampZoom(z: number): number {
  return Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, z));
}
