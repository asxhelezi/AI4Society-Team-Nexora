import { useEffect } from 'react';

/**
 * Sets the tab title for a page. Pass the Albanian title from the static page's <title>
 * ("Sinjal — Harta"); public/i18n.js notices the change and translates it.
 */
export function useDocumentTitle(title: string): void {
  useEffect(() => {
    document.title = title;
  }, [title]);
}
