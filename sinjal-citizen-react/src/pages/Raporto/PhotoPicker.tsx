import type { ChangeEvent } from 'react';
import { MAX_PHOTOS } from './data';
import type { Photo } from './useReportForm';

interface PhotoPickerProps {
  photos: Photo[];
  onAdd: (files: File[]) => void;
  onRemove: (id: number) => void;
}

/** Step 3 photo grid: previews with a remove "×", plus the dashed "+" tile (hidden once the 10-photo limit is reached). */
export function PhotoPicker({ photos, onAdd, onRemove }: PhotoPickerProps) {
  const onFiles = (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = '';
    onAdd(files);
  };

  return (
    <div className="raporto-field">
      <span className="raporto-label">
        <span>Foto · opsionale</span>
        <span className="raporto-label__count">{photos.length ? `${photos.length} foto` : 'Opsionale'}</span>
      </span>
      <div className="raporto-photos">
        {photos.map((ph) => (
          <div key={ph.id} className="raporto-photo">
            <img src={ph.url} alt={ph.name} className="raporto-photo__img" />
            <button type="button" onClick={() => onRemove(ph.id)} aria-label="Hiq foton" className="tap u-hover-ink raporto-photo__remove">
              ×
            </button>
          </div>
        ))}
        {photos.length < MAX_PHOTOS && (
          <label className="raporto-photo-add">
            <span aria-hidden="true" className="raporto-photo-add__plus">
              +
            </span>
            <input type="file" accept="image/*" multiple onChange={onFiles} aria-label="Shto foto" className="raporto-photo-add__input" />
          </label>
        )}
      </div>
    </div>
  );
}
