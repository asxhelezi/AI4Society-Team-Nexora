import { useRef, type MouseEvent } from 'react';
import { cx } from '../../lib/cx';
import { DEMO_LAT, DEMO_LON } from './data';
import type { MapSelection } from './useReportForm';
import { useSatelliteMap } from './useSatelliteMap';

interface LocationMapProps {
  /** Pin position in % of the box (shown only in "pin" mode). */
  pin: { x: string; y: string } | null;
  showGpsDot: boolean;
  onSelect: (sel: MapSelection) => void;
}

/** #reportMap: tap (or click) to drop the pin; drag to pan; wheel / +/− to zoom. */
export function LocationMap({ pin, showGpsDot, onSelect }: LocationMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const { tiles, dragging, zoomBy, takeTap } = useSatelliteMap(mapRef);

  const onMapClick = (e: MouseEvent<HTMLDivElement>) => {
    const tap = takeTap();
    if (tap === 'drag') return;
    if (tap) return onSelect(tap);
    // No tracked press: place the pin where the click landed, at the map's centre coordinates.
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Number(Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100)).toFixed(1));
    const y = Number(Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100)).toFixed(1));
    onSelect({ x, y, lat: DEMO_LAT, lon: DEMO_LON });
  };

  const zoom = (delta: number) => (e: MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    zoomBy(delta);
  };

  return (
    <div id="reportMap" ref={mapRef} onClick={onMapClick} aria-label="Vendos pikën e vendndodhjes në hartë" className={cx('tap raporto-map', dragging && 'raporto-map--dragging')}>
      <span aria-hidden="true" className="raporto-map__grid" />
      <span aria-hidden="true" className="raporto-map__road raporto-map__road--h" />
      <span aria-hidden="true" className="raporto-map__road raporto-map__road--v" />
      <span id="reportMapTiles" aria-hidden="true" className="raporto-map__tiles">
        {tiles.map((t) => (
          <span key={t.key} className="raporto-map__tile" style={{ left: t.left, top: t.top, backgroundImage: `url(${t.url})` }} />
        ))}
      </span>
      <span className="raporto-map__zoom">
        <button type="button" id="reportZoomIn" aria-label="Zmadho hartën" onClick={zoom(1)} className="raporto-map__zoom-btn raporto-map__zoom-btn--in">
          +
        </button>
        <button type="button" id="reportZoomOut" aria-label="Zvogëlo hartën" onClick={zoom(-1)} className="raporto-map__zoom-btn">
          −
        </button>
      </span>
      {pin && (
        <span aria-hidden="true" className="raporto-map__pin" style={{ left: `${pin.x}%`, top: `${pin.y}%` }}>
          <svg width="28" height="36" viewBox="0 0 30 38" fill="none">
            <path d="M15 1c7.7 0 14 6.2 14 14 0 10-14 22-14 22S1 25 1 15C1 7.2 7.3 1 15 1z" fill="#C23B31" stroke="#1B1917" strokeWidth="1" />
            <circle cx="15" cy="15" r="5" fill="#F5F2ED" />
          </svg>
        </span>
      )}
      {showGpsDot && (
        <span aria-hidden="true" className="raporto-map__gps">
          <span className="raporto-map__gps-core" />
        </span>
      )}
      <span aria-hidden="true" className="raporto-map__hint">
        Trokit për të vendosur pikën
      </span>
    </div>
  );
}
