// Markdown Import — the first real Parse stage the Import Framework has,
// proving that a genuinely structured external format can become Forge
// knowledge without the framework itself changing. Everything here only
// ever produces an ImportableItem (see importFramework.ts); buildImportPlan,
// the Relationship Engine, Discovery, Chief, and the rest of the Creative
// Knowledge Engine have no idea Markdown exists, and nothing here writes
// anything or reads Forge's own state. Markdown is not, and must never
// become, a first-class Forge concept — it is one way of writing down
// knowledge Forge later understands the exact same way regardless of
// where it came from.
//
// "Forge should understand the knowledge, not recreate the document" —
// so this deliberately does not try to be a full Markdown renderer.
// Formatting syntax is stripped down to the plain meaning underneath it
// (a bold word becomes just the word); structure that has no equivalent
// in a Knowledge entry's plain title/insight shape (tables, images, code
// blocks, blockquotes) is left exactly as written in the body, and noted
// as unsupported rather than silently understood or silently discarded.
import type { ImportableItem } from "./importFramework";
import { parseText } from "./importFramework";

// Bold before italic — "**x**" would otherwise get half-matched by the
// single-marker italic pattern first. Order here is the whole trick.
function stripInlineMarkdown(text: string): string {
  return text
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1 ($2)") // [label](url) -> label (url)
    .replace(/(\*\*|__)(.*?)\1/g, "$2") // **bold**/__bold__ -> bold
    .replace(/(\*|_)(.*?)\1/g, "$2") // *italic*/_italic_ -> italic
    .trim();
}

// One line of Markdown, understood rather than preserved: a heading or a
// bullet becomes a plain line carrying the same meaning: emphasis and
// links inside it are stripped down to their plain text either way.
// Anything else (a table row, an image, a fenced code line, a blockquote)
// isn't recognized here, so it passes through completely unchanged —
// detectUnsupported() below is what tells the creator that happened.
function parseMarkdownLine(line: string): string {
  const heading = line.match(/^#{1,6}\s+(.*)$/);
  if (heading) return stripInlineMarkdown(heading[1]);

  const bullet = line.match(/^[-*+]\s+(.*)$/);
  if (bullet) return `• ${stripInlineMarkdown(bullet[1])}`;

  return stripInlineMarkdown(line);
}

// Markdown structures this sprint doesn't attempt to understand — each has
// no honest equivalent in a plain title/insight pair, so rather than guess,
// Forge leaves the raw line as written and says so once, plainly, in the
// preview.
const UNSUPPORTED_PATTERNS: { test: RegExp; label: string }[] = [
  { test: /^```/m, label: "code blocks" },
  { test: /^!\[[^\]]*\]\([^)]*\)/m, label: "images" },
  { test: /^\|.*\|\s*$/m, label: "tables" },
  { test: /^>\s?/m, label: "blockquotes" },
];

function detectUnsupported(raw: string): string[] {
  const found = UNSUPPORTED_PATTERNS.filter(({ test }) => test.test(raw)).map(({ label }) => label);
  if (found.length === 0) return [];

  return [`Some Markdown (${found.join(", ")}) wasn't understood and was left as written below.`];
}

// The first line starting with exactly one "# " becomes the title — the
// same role a document's first line already plays for parseText, just
// expressed as Markdown's own convention for "this is the title." If there
// is no top-level heading, this falls back to parseText's own "first line
// is the title" rule entirely, rather than inventing a second one for the
// same situation.
export function parseMarkdown(raw: string): ImportableItem {
  const normalized = raw.replace(/\r\n/g, "\n");
  const lines = normalized.split("\n");

  const titleLineIndex = lines.findIndex((line) => /^#\s+.+$/.test(line.trim()));
  const parseNotes = detectUnsupported(normalized);

  if (titleLineIndex === -1) {
    const fallback = parseText(lines.map(parseMarkdownLine).join("\n"));
    return { ...fallback, parseNotes };
  }

  const titleMatch = lines[titleLineIndex].trim().match(/^#\s+(.*)$/);
  const title = titleMatch ? stripInlineMarkdown(titleMatch[1]) : "";

  const bodyLines = [...lines.slice(0, titleLineIndex), ...lines.slice(titleLineIndex + 1)].map(
    parseMarkdownLine,
  );

  // Collapse runs of blank lines (common once the title's own line is
  // removed) down to one, so paragraphs stay readable rather than gappy.
  const body = bodyLines.join("\n").replace(/\n{3,}/g, "\n\n").trim();

  return { title, body, parseNotes };
}
