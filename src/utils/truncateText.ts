// Shortens text to at most `maxLength` characters, adding an ellipsis when
// something had to be cut. Used wherever a short label needs to be derived
// from a longer block of free-form text — e.g. Quick Capture deriving a
// Knowledge title, or an Activity entry summarizing a capture's content.
export function truncateText(text: string, maxLength: number): string {
  const trimmed = text.trim();
  return trimmed.length <= maxLength ? trimmed : `${trimmed.slice(0, maxLength - 3)}...`;
}
