/*
 * Real satellite base map (Esri World Imagery — same tile source as
 * sinjal-citizen/harta.html and sinjal-department/dept-map.js) behind Harta's
 * schematic pins. Fills any .harta-sat-bg element with tiles; it never touches
 * the clustering, heatmap or zone-drawing overlays rendered on top of it.
 */
(function () {
  'use strict';

  var TILE = 256;
  var TILE_URL = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/';
  var CENTER_LAT = 41.1125, CENTER_LON = 20.0822, ZOOM = 14;

  function project(lat, lon, z) {
    var n = TILE * Math.pow(2, z);
    var r = lat * Math.PI / 180;
    return { x: (lon + 180) / 360 * n, y: (1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2 * n };
  }

  function fill(el) {
    var w = el.clientWidth, h = el.clientHeight;
    if (!w || !h) return;
    var c = project(CENTER_LAT, CENTER_LON, ZOOM);
    var x0 = Math.floor((c.x - w / 2) / TILE), x1 = Math.floor((c.x + w / 2) / TILE);
    var y0 = Math.floor((c.y - h / 2) / TILE), y1 = Math.floor((c.y + h / 2) / TILE);
    var frag = document.createDocumentFragment();
    for (var ty = y0; ty <= y1; ty++) {
      for (var tx = x0; tx <= x1; tx++) {
        var img = document.createElement('img');
        img.alt = '';
        img.draggable = false;
        img.decoding = 'async';
        img.style.cssText = 'position:absolute;width:' + TILE + 'px;height:' + TILE + 'px;left:' +
          Math.round(tx * TILE - c.x + w / 2) + 'px;top:' + Math.round(ty * TILE - c.y + h / 2) + 'px;';
        img.src = TILE_URL + ZOOM + '/' + ty + '/' + tx;
        frag.appendChild(img);
      }
    }
    el.textContent = '';
    el.appendChild(frag);
  }

  var pending = false;
  function scan() {
    pending = false;
    var els = document.querySelectorAll('.harta-sat-bg');
    for (var i = 0; i < els.length; i++) fill(els[i]);
  }
  function scheduleScan() {
    if (pending) return;
    pending = true;
    requestAnimationFrame(scan);
  }

  new MutationObserver(scheduleScan).observe(document.documentElement, { childList: true, subtree: true });
  window.addEventListener('resize', scheduleScan);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', scheduleScan);
  else scheduleScan();
})();
