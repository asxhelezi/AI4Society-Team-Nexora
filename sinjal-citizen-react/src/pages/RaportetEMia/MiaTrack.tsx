import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { trackPath } from '../../lib/routes';

/** "Gjurmo një raportim": look any code up on the Gjurmo page, saved here or not. */
export function MiaTrack({ instant }: { instant: boolean }) {
  const navigate = useNavigate();
  const [tracking, setTracking] = useState('');

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const code = tracking.trim();
    if (code) navigate(trackPath(code));
  };

  return (
    <div data-reveal="2" data-revealed={instant ? '' : undefined} className="r-mia-track mia-track">
      <h2 className="mia-track__title">Gjurmo një raportim</h2>
      <p className="mia-track__text">Kërko me numrin e gjurmimit për të parë ecurinë e çdo raportimi, edhe nëse nuk është ruajtur këtu.</p>
      <form className="mia-track__control" onSubmit={submit}>
        <input
          value={tracking}
          onChange={(e) => setTracking(e.target.value.toUpperCase())}
          aria-label="Numri i gjurmimit"
          placeholder="SNJ-000000"
          inputMode="text"
          autoComplete="off"
          className="mia-track__input"
        />
        <button type="submit" className="tap u-hover-ink mia-track__button">
          Gjurmo
        </button>
      </form>
    </div>
  );
}
