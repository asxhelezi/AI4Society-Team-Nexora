import { useEffect, useRef } from 'react';

const TILE = 256;
const TILE_URL = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/';
const CENTER_LAT = 41.1125,
  CENTER_LON = 20.0822,
  ZOOM = 14;

function project(lat: number, lon: number, z: number) {
  const n = TILE * Math.pow(2, z);
  const r = (lat * Math.PI) / 180;
  return { x: ((lon + 180) / 360) * n, y: ((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2) * n };
}

function fill(el: HTMLDivElement) {
  const w = el.clientWidth,
    h = el.clientHeight;
  if (!w || !h) return;
  const c = project(CENTER_LAT, CENTER_LON, ZOOM);
  const x0 = Math.floor((c.x - w / 2) / TILE),
    x1 = Math.floor((c.x + w / 2) / TILE);
  const y0 = Math.floor((c.y - h / 2) / TILE),
    y1 = Math.floor((c.y + h / 2) / TILE);
  const frag = document.createDocumentFragment();
  for (let ty = y0; ty <= y1; ty++) {
    for (let tx = x0; tx <= x1; tx++) {
      const img = document.createElement('img');
      img.alt = '';
      img.draggable = false;
      img.decoding = 'async';
      img.style.cssText =
        'position:absolute;width:' +
        TILE +
        'px;height:' +
        TILE +
        'px;left:' +
        Math.round(tx * TILE - c.x + w / 2) +
        'px;top:' +
        Math.round(ty * TILE - c.y + h / 2) +
        'px;';
      img.src = TILE_URL + ZOOM + '/' + ty + '/' + tx;
      frag.appendChild(img);
    }
  }
  el.textContent = '';
  el.appendChild(frag);
}

/**
 * Real satellite base map (Esri World Imagery — same tile source as
 * sinjal-citizen/harta.html and sinjal-department/dept-map.js) behind Harta's
 * schematic pins. Purely visual: it never touches the clustering, heatmap or
 * zone-drawing overlays that render on top of it.
 */
export function SatelliteMapBackground() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    fill(el);
    const ro = new ResizeObserver(() => fill(el));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return <div ref={ref} aria-hidden="true" style={{ position: 'absolute', inset: 0, overflow: 'hidden', background: '#26241f', pointerEvents: 'none' }} />;
}
