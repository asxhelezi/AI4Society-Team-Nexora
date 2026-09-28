export const ALBANIAN_MONTHS = ['Janar', 'Shkurt', 'Mars', 'Prill', 'Maj', 'Qershor', 'Korrik', 'Gusht', 'Shtator', 'Tetor', 'Nëntor', 'Dhjetor'] as const;

/**
 * "2026-03-19T…" → "19 Mars 2026" (local date). Returns '' for an invalid date.
 * Keep dates in this exact Albanian form in the DOM: i18n.js recognises the pattern and
 * translates it ("19 March 2026" / "19. mart 2026.").
 */
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getDate()} ${ALBANIAN_MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

/** "19 Mars 2026" → ISO string at local noon (so the day never shifts across time zones). */
export function parseAlbanianDate(text: string): string {
  const [day, month, year] = text.trim().split(/\s+/);
  const monthIndex = ALBANIAN_MONTHS.indexOf(month as (typeof ALBANIAN_MONTHS)[number]);
  if (monthIndex === -1) throw new Error(`Unknown Albanian month in "${text}"`);
  return new Date(Number(year), monthIndex, Number(day), 12).toISOString();
}
