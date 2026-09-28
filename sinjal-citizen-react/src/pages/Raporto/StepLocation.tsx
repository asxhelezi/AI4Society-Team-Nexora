import type { KeyboardEvent } from 'react';
import { EditButton } from './EditButton';
import { LocationMap } from './LocationMap';
import { NextButton } from './NextButton';
import type { ReportForm } from './useReportForm';

/** Step 2: address search, demo "current location", the picker map, and the identified address. */
export function StepLocation({ form }: { form: ReportForm }) {
  const { state, instant } = form;

  const onSearchKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    form.submitSearch();
  };

  return (
    <div data-reveal="1" data-revealed={instant ? '' : undefined} className="r-rap-step raporto-step raporto-step--location">
      <div className="raporto-label">
        <span>Vendndodhja</span>
        <span className="raporto-label__error">{state.locError}</span>
      </div>

      {!state.resolvedAddress && (
        <div className="raporto-loc">
          <div className="raporto-search">
            <input
              value={state.searchQuery}
              onChange={(e) => form.setSearchQuery(e.target.value)}
              onKeyDown={onSearchKeyDown}
              placeholder="Kërko një adresë..."
              className="raporto-input raporto-input--grow"
            />
            <button type="button" onClick={form.submitSearch} className="tap u-hover-ink raporto-search__btn">
              Kërko
            </button>
          </div>

          <button type="button" onClick={form.pickCurrentLocation} className="tap raporto-gps">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#1B1917" strokeWidth="1.8">
              <circle cx="12" cy="12" r="3" />
              <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
            </svg>
            <span>Përdor vendndodhjen aktuale</span>
          </button>
          {state.geoError && <span className="raporto-geo-error">{state.geoError}</span>}

          <span className="raporto-loc__or">— ose vendos pikën në hartë —</span>

          <LocationMap pin={state.locMode === 'pin' ? state.pinPos : null} showGpsDot={state.locMode === 'gps'} onSelect={form.selectMapPoint} />
        </div>
      )}

      {state.resolvedAddress && (
        <div className="raporto-address">
          <span className="raporto-caption">Adresa e identifikuar</span>
          <div className="raporto-address__row">
            <span className="raporto-address__text">{state.resolvedAddress}</span>
            <EditButton onClick={form.changeLocation} />
          </div>
        </div>
      )}

      <NextButton onClick={form.nextFromLocation} />
    </div>
  );
}
