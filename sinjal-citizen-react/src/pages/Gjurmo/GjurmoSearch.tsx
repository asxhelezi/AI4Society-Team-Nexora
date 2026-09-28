import { useState, type FormEvent } from 'react';

interface GjurmoSearchProps {
  query: string;
  onQueryChange: (value: string) => void;
  onSubmit: () => void;
}

/** Title, "i" hint toggle and the tracking-code field. */
export function GjurmoSearch({ query, onQueryChange, onSubmit }: GjurmoSearchProps) {
  const [infoOpen, setInfoOpen] = useState(false);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    onSubmit();
  };

  return (
    <div className="gjurmo-search">
      <button type="button" onClick={() => setInfoOpen((open) => !open)} aria-label="Çfarë është numri i gjurmimit?" aria-expanded={infoOpen} className="tap gjurmo-search__info">
        i
      </button>
      <h1 className="gjurmo-search__title">Gjurmo një raportim</h1>
      {infoOpen && <p className="gjurmo-search__hint">Numri i gjurmimit ndodhet në konfirmimin e raportimit.</p>}
      <form className="citizen-control gjurmo-search__control" onSubmit={submit}>
        <input
          value={query}
          onChange={(e) => onQueryChange(e.target.value.toUpperCase())}
          aria-label="Numri i gjurmimit"
          placeholder="SNJ-000000"
          autoComplete="off"
          spellCheck={false}
          className="gjurmo-search__input"
        />
        <button type="submit" className="tap u-hover-ink gjurmo-search__button">
          Gjurmo
        </button>
      </form>
    </div>
  );
}
