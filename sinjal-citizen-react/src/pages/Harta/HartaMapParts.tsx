import type { CSSProperties } from 'react';
import type { Point, Tile } from './mapMath';
import { PIN_STATUS_META, type HartaPin } from './usePublicPins';

/** One layer of 256 px satellite tiles (#currentWrap / #incomingWrap). */
export function HartaTileLayer({ id, tiles, transform, origin, opacity }: { id: string; tiles: Tile[]; transform?: string; origin: string; opacity: number }) {
  return (
    <div id={id} className="harta-tiles" style={{ transform, transformOrigin: origin, opacity }}>
      {tiles.map((t) => (
        <div key={t.url} className="harta-tile" style={{ left: t.left, top: t.top, backgroundImage: `url(${t.url})` }} />
      ))}
    </div>
  );
}

/** The pulsing "you are here" marker. */
export function HartaUserMarker({ at }: { at: Point }) {
  return (
    <div id="marker" className="harta-marker" style={{ left: at.x, top: at.y }}>
      <div className="harta-marker__ring" />
      <div className="harta-marker__pulse" />
      <div className="harta-marker__dot" />
    </div>
  );
}

interface HartaPinMarkerProps {
  pin: HartaPin;
  at: Point;
  onEnter: (id: string) => void;
  onLeave: () => void;
  onToggle: (id: string) => void;
}

/** A map pin (teardrop in the status colour). Hover previews the case card, click pins it open. */
export function HartaPinMarker({ pin, at, onEnter, onLeave, onToggle }: HartaPinMarkerProps) {
  const style: CSSProperties = { left: at.x, top: at.y };
  return (
    <div className="harta-pin" style={style} data-pinid={pin.id} onMouseEnter={() => onEnter(pin.id)} onMouseLeave={onLeave} onClick={() => onToggle(pin.id)}>
      <div className="harta-pin__drop">
        <svg width="34" height="44" viewBox="0 0 30 38" fill="none">
          <path d="M15 1c7.7 0 14 6.2 14 14 0 10-14 22-14 22S1 25 1 15C1 7.2 7.3 1 15 1z" fill={PIN_STATUS_META[pin.status].color} stroke="#1B1917" strokeWidth="1" />
          <circle cx="15" cy="15" r="5" fill="#FBFAF8" />
        </svg>
      </div>
    </div>
  );
}

/** "Lejo qasjen në vendndodhje?" card over the still map (stays up after "Jo tani", as in the static page). */
export function HartaPermission({ errorMsg, onAllow, onDeny }: { errorMsg: string; onAllow: () => void; onDeny: () => void }) {
  return (
    <div id="permission" className="harta-permission">
      <span className="harta-permission__bar" />
      <h2 id="permissionTitle" className="harta-permission__title">
        {errorMsg ? 'Vendndodhja nuk u gjet' : 'Lejo qasjen në vendndodhje?'}
      </h2>
      <p id="permissionMsg" className="harta-permission__msg">
        {errorMsg || 'Sinjal kërkon vendndodhjen tënde reale nga pajisja, për të treguar raportet pranë teje.'}
      </p>
      <div className="harta-permission__actions">
        <button type="button" id="btnAllow" className="tap u-hover-red harta-permission__button harta-permission__button--allow" onClick={onAllow}>
          Lejo
        </button>
        <button type="button" id="btnDeny" className="tap harta-permission__button harta-permission__button--deny" onClick={onDeny}>
          Jo tani
        </button>
      </div>
    </div>
  );
}

/** Status strip at the bottom of the map ("Duke t'u afruar…"), with an optional spinner. */
export function HartaToast({ text, spinner }: { text: string; spinner: boolean }) {
  return (
    <div id="toast" className="harta-toast" role="status">
      {spinner && <span id="toastSpinner" className="harta-toast__spinner" />}
      <span id="toastText" className="harta-toast__text">
        {text}
      </span>
    </div>
  );
}

export function HartaZoomControls({ onZoomIn, onZoomOut }: { onZoomIn: () => void; onZoomOut: () => void }) {
  return (
    <div id="zoomControls" className="harta-zoom">
      <button type="button" id="btnZoomIn" aria-label="Zmadho" className="harta-zoom__button harta-zoom__button--in" onClick={onZoomIn}>
        +
      </button>
      <button type="button" id="btnZoomOut" aria-label="Zvogëlo" className="harta-zoom__button" onClick={onZoomOut}>
        −
      </button>
    </div>
  );
}
