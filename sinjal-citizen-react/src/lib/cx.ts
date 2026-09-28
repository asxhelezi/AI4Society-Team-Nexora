/** Joins class names, skipping falsy ones: cx('card', active && 'card--active'). */
export function cx(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(' ');
}
