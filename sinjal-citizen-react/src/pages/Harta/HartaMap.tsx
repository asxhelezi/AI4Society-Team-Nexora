import { useRef } from 'react';
import { cx } from '../../lib/cx';
import { HartaPermission, HartaPinMarker, HartaTileLayer, HartaToast, HartaUserMarker, HartaZoomControls } from './HartaMapParts';
import { HartaPinCard } from './HartaPinCard';
import { pinCanvasXY, toScreen, type MapSize } from './mapMath';
import { deriveScene, useHartaMap } from './useHartaMap';
import type { HartaPin, PinsStatus } from './usePublicPins';

/**
 * The satellite map box (#mapBox): Esri imagery tiles, the user marker, case pins, the
 * permission card, status toast, pin card and zoom buttons. State and gestures live in
 * useHartaMap; this component only lays the scene out.
 */
export function HartaMap({ pins, pinsStatus }: { pins: HartaPin[]; pinsStatus: PinsStatus }) {
  const cameraRef = useRef<HTMLDivElement>(null);
  const map = useHartaMap(cameraRef);
  const { view } = map;
  // Until the first measurement (before paint) only the empty frame is rendered.
  const size: MapSize | null = map.size;
  const scene = size ? deriveScene(view, size) : null;

  const screenPoint = (pin: HartaPin) => {
    if (!size || !scene) return { x: 0, y: 0 };
    const raw = pinCanvasXY(size, scene.anchor, pin.lat, pin.lon, scene.baseZ);
    return toScreen(size, raw.x, raw.y, scene.scaleCur, view.panX, view.panY);
  };

  const activePinId = view.openPinId || view.hoveredPinId;
  const activePin = scene?.showPins && activePinId ? pins.find((p) => p.id === activePinId) : undefined;

  // Loading / empty / error only surface once the stage toast is gone (never in the mock happy path).
  let toastText = scene?.toastText ?? '';
  if (!toastText && pinsStatus === 'error') toastText = 'Raportimet nuk mund të ngarkoheshin.';
  else if (!toastText && pinsStatus === 'ready' && pins.length === 0 && scene?.interactive) toastText = 'Nuk ka ende raportime në hartë.';

  return (
    <div id="mapBox" className="harta-map" aria-busy={pinsStatus === 'loading' || undefined}>
      <div id="camera" ref={cameraRef} className={cx('harta-camera', scene?.interactive && 'harta-camera--grab')}>
        {scene && (
          <>
            <HartaTileLayer id="currentWrap" tiles={scene.current.tiles} transform={scene.current.transform} origin={scene.origin} opacity={1} />
            <HartaTileLayer id="incomingWrap" tiles={scene.incoming?.tiles ?? []} transform={scene.incoming?.transform} origin={scene.origin} opacity={scene.incoming?.opacity ?? 0} />
          </>
        )}
        <div className="harta-camera__tint" />
        {scene?.marker && <HartaUserMarker at={scene.marker} />}
        <div id="pinsLayer">
          {scene?.showPins && pins.map((pin) => <HartaPinMarker key={pin.id} pin={pin} at={screenPoint(pin)} onEnter={map.hoverPin} onLeave={map.unhover} onToggle={map.togglePin} />)}
        </div>
      </div>

      {scene?.showPermission && <HartaPermission errorMsg={view.errorMsg} onAllow={map.allow} onDeny={map.deny} />}
      {toastText && <HartaToast text={toastText} spinner={!!scene?.showSpinner} />}
      {activePin && size && (
        <div id="pinCard">
          <HartaPinCard pin={activePin} pt={screenPoint(activePin)} size={size} onClose={map.closeCard} onMouseLeave={map.unhover} />
        </div>
      )}
      {scene?.interactive && <HartaZoomControls onZoomIn={map.zoomIn} onZoomOut={map.zoomOut} />}

      <span className="harta-map__credit">Imagery © Esri</span>
    </div>
  );
}
