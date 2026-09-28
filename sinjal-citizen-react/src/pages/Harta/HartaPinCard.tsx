import { useLayoutEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { cx } from '../../lib/cx';
import { PIN_STATUS_META, type HartaPin } from './usePublicPins';
import type { Point, MapSize } from './mapMath';

interface PhotoSlot {
  label: 'PARA' | 'PAS' | 'NË PRITJE';
  /** Box background + placeholder icon look (modifier of .harta-card__photo). */
  variant: 'before' | 'after' | 'waiting';
  icon: string;
  photo?: string;
}

/** Card width and position rules from harta.html `buildPinCard`. */
function cardBox(size: MapSize, pt: Point) {
  const width = Math.min(252, size.w - 24);
  const left = Math.max(12, Math.min(size.w - width - 12, pt.x - width / 2));
  const bottom = size.h - pt.y + 46;
  return { width, left, bottom };
}

interface HartaPinCardProps {
  pin: HartaPin;
  /** Screen position of the pin's tip. */
  pt: Point;
  size: MapSize;
  onClose: () => void;
  onMouseLeave: () => void;
}

/** The case card above a hovered / opened pin: street, title, status, before/after photos and a link. */
export function HartaPinCard({ pin, pt, size, onClose, onMouseLeave }: HartaPinCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [cardH, setCardH] = useState(0);
  const resolved = pin.status === 'resolved';
  const box = cardBox(size, pt);
  // Keep the card inside the map: never closer than 8 px to the top edge.
  const maxBottom = size.h - 8 - cardH;
  const bottom = cardH && box.bottom > maxBottom ? Math.max(8, maxBottom) : box.bottom;

  useLayoutEffect(() => {
    const h = cardRef.current?.offsetHeight ?? 0;
    if (h !== cardH) setCardH(h);
  });

  const slots: PhotoSlot[] = [
    { label: 'PARA', variant: 'before', icon: '🖼', photo: pin.beforePhoto },
    resolved ? { label: 'PAS', variant: 'after', icon: '🖼', photo: pin.afterPhoto } : { label: 'NË PRITJE', variant: 'waiting', icon: '🕐', photo: pin.afterPhoto },
  ];

  return (
    <div ref={cardRef} className="harta-card" style={{ left: box.left, bottom, width: box.width }} onMouseLeave={onMouseLeave}>
      <button type="button" aria-label="Mbyll" className="harta-card__close" onClick={onClose}>
        ×
      </button>
      <span className="harta-card__street">{pin.street}</span>
      <h3 className="harta-card__title">{pin.title}</h3>
      <div className="harta-card__meta">
        <span className="harta-card__category">{pin.category}</span>
        <span className={cx('harta-card__pill', `harta-card__pill--${pin.status}`)}>{PIN_STATUS_META[pin.status].label}</span>
        <span className="harta-card__code">{pin.reportId}</span>
      </div>
      <div className="harta-card__photos">
        {slots.map((slot, i) => (
          <div key={slot.label} className="harta-card__slot">
            <span className="harta-card__slot-label">{slot.label}</span>
            <div className={`harta-card__photo harta-card__photo--${slot.variant}`}>
              {slot.photo ? <img src={slot.photo} alt={pin.title} className={cx('harta-card__img', i === 0 && 'harta-card__img--before')} /> : <span className="harta-card__icon">{slot.icon}</span>}
            </div>
          </div>
        ))}
      </div>
      <Link to={pin.link} className="harta-card__link">
        {pin.linkText}
      </Link>
    </div>
  );
}
