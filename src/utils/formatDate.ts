// Formats a Date as something readable like "4 Jul 2026" without pulling in
// a date-formatting library — the browser's built-in Intl support (via
// toLocaleDateString) already knows how to do this.
export function formatDate(date: Date): string {
  return date.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
