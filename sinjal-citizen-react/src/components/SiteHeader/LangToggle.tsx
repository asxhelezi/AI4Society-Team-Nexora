/**
 * SQ | EN | SR switcher. Deliberately "dumb" markup, identical to the static site:
 * public/i18n.js handles the clicks through a delegated listener on [data-lang] and keeps
 * aria-pressed in sync. Do not add onClick or aria-pressed here — React would fight it.
 * Styled by .r-lang in responsive.css.
 */
export function LangToggle() {
  return (
    <div className="r-lang" role="group" aria-label="Gjuha">
      <button type="button" data-lang="sq" lang="sq" aria-label="Shqip" title="Shqip">
        SQ
      </button>
      <button type="button" data-lang="en" lang="en" aria-label="English" title="English">
        EN
      </button>
      <button type="button" data-lang="sr" lang="sr-Latn" aria-label="Srpski" title="Srpski">
        SR
      </button>
    </div>
  );
}
