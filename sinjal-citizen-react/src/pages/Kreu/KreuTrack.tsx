import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ROUTES, trackPath } from '../../lib/routes';

/** "Gjurmo një raportim": tracking-code field that opens the Gjurmo page. */
export function KreuTrack() {
  const navigate = useNavigate();
  const [code, setCode] = useState('');
  const [infoOpen, setInfoOpen] = useState(false);

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = code.trim();
    if (trimmed) navigate(trackPath(trimmed));
  };

  return (
    <section id="gjurmo" className="kreu-track">
      <button type="button" onClick={() => setInfoOpen((open) => !open)} aria-label="Çfarë është numri i gjurmimit?" aria-expanded={infoOpen} className="tap r-info kreu-track__info">
        i
      </button>
      <div className="r-wrap r-track-sec kreu-track__inner">
        <h2 data-reveal="0" className="kreu-heading kreu-track__title">
          Gjurmo një raportim
        </h2>
        <p className="kreu-track__hint" hidden={!infoOpen}>
          Numri i gjurmimit ndodhet në konfirmimin e raportimit.
        </p>
        <form data-reveal="2" className="r-track kreu-track__form" onSubmit={onSubmit}>
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            aria-label="Numri i gjurmimit"
            placeholder="SNJ-000000"
            inputMode="text"
            autoComplete="off"
            className="kreu-track__input"
          />
          <button type="submit" className="tap u-hover-ink kreu-track__button">
            Gjurmo
          </button>
        </form>
        <Link to={ROUTES.raportetEMia} className="tap kreu-track__mine">
          <span>Shiko raportet e mia</span>
          <span className="kreu-track__mine-arrow">→</span>
        </Link>
      </div>
    </section>
  );
}
