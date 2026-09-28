import type { SatelliteCamera } from '../hooks/useSatelliteCamera';

/**
 * Renders the two crossfading tile layers a useSatelliteCamera scene carries.
 * The camera element itself (cameraRef) is owned by the caller, since it also
 * needs to size the drag/wheel/pinch listeners to the visible frame.
 */
export function SatelliteCameraView({ camera }: { camera: SatelliteCamera }) {
  if (!camera.scene) return null;
  const { current, incoming, origin } = camera.scene;
  return (
    <>
      <div className="sat-tiles" style={{ transform: current.transform, transformOrigin: origin, opacity: current.opacity }}>
        {current.tiles.map((t) => (
          <div key={t.url} className="sat-tile" style={{ left: t.left, top: t.top, backgroundImage: `url(${t.url})` }} />
        ))}
      </div>
      <div className="sat-tiles" style={{ transform: incoming.transform, transformOrigin: origin, opacity: incoming.opacity }}>
        {incoming.tiles.map((t) => (
          <div key={t.url} className="sat-tile" style={{ left: t.left, top: t.top, backgroundImage: `url(${t.url})` }} />
        ))}
      </div>
    </>
  );
}
