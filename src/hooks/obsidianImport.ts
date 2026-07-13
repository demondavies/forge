// Obsidian Vault Import's entire Parse-stage contribution. An Obsidian
// note is Markdown plus a small amount of vault-only syntax layered on
// top — this file's only job is peeling that layer off *before* handing
// the result to the completely unmodified parseMarkdown(), so everything
// Markdown Import already does (headings, bullets, emphasis, ordinary
// links, unsupported-syntax warnings) is inherited for free, not
// reimplemented. Nothing here writes an ImportableItem field Markdown
// Import didn't already define, and nothing below Parse (buildImportPlan,
// the Relationship Engine, Apply, the Creative Knowledge Engine) has any
// idea Obsidian exists — see folderImport.ts for the one-line PARSE_BY_FORMAT
// entry that's the only other place this function is even named.
import type { ImportableItem } from "./importFramework";
import { parseMarkdown } from "./markdownImport";

// A vault note almost always opens with a YAML frontmatter block (tags,
// aliases, dates) — real metadata, but the kind Forge deliberately isn't
// building ("Do not implement: ...metadata databases"). Leaving it in
// would make the cleaned body open with raw, half-understood YAML lines,
// which is worse than the Honest Degradation Principle asks for: reporting
// something as unsupported is honest, silently showing garbled YAML as if
// it were the note's own prose is not. So it's removed before Markdown
// parsing ever sees it, and its removal is the one thing this function
// reports back.
function stripFrontmatter(raw: string): { body: string; hadFrontmatter: boolean } {
  const match = raw.match(/^---\r?\n[\s\S]*?\r?\n---[ \t]*\r?\n?/);
  if (!match) return { body: raw, hadFrontmatter: false };
  return { body: raw.slice(match[0].length), hadFrontmatter: true };
}

// Obsidian's one genuinely vault-specific syntax: [[Note Name]] (a
// reference to another note) and [[Note Name|Alias]] (the same, displayed
// under a different label), plus the embed variant ![[Note Name]] (render
// that note's content inline — a feature Forge doesn't have, so it's
// honestly downgraded to a plain reference instead, flagged once rather
// than silently treated as identical to a real link).
//
// A plain [[Note Name]] becomes just its name — there's no separate label
// to keep. An aliased [[Note Name|Alias]] is translated into ordinary
// Markdown link syntax, [Alias](Note Name), and left for the completely
// unmodified stripInlineMarkdown() (inside parseMarkdown) to clean —
// reusing its existing "label (url)" rule rather than inventing a second
// display convention for what is, underneath, the same idea: a label plus
// what it points to.
//
// Whichever form runs, the referenced note's name survives as plain,
// visible text — which is what lets the existing, unmodified Relationship
// Engine (simple substring matching against other objects' titles) find
// it as a candidate relationship. No changes to buildImportPlan or
// findCandidateRelationships were needed to make wiki-links "explain
// inferred relationships"; converting them to plain text referencing the
// target's name is the entire mechanism.
function convertWikiLinks(text: string): { text: string; hadEmbeds: boolean } {
  let hadEmbeds = false;

  const converted = text
    .replace(/!\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_match, target: string, alias?: string) => {
      hadEmbeds = true;
      return alias ? `[${alias.trim()}](${target.trim()})` : target.trim();
    })
    .replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, (_match, target: string, alias: string) => `[${alias.trim()}](${target.trim()})`)
    .replace(/\[\[([^\]]+)\]\]/g, (_match, target: string) => target.trim());

  return { text: converted, hadEmbeds };
}

// The whole Obsidian-specific Parse step: strip what Forge deliberately
// doesn't model (frontmatter, embeds-as-embeds), convert what it does
// (wiki-links) into plain text an unmodified Markdown parse already knows
// how to handle, and merge in one honest note per thing that was
// downgraded rather than silently dropped.
export function parseObsidianNote(raw: string): ImportableItem {
  const { body: withoutFrontmatter, hadFrontmatter } = stripFrontmatter(raw);
  const { text: withoutWikiLinks, hadEmbeds } = convertWikiLinks(withoutFrontmatter);

  const parsed = parseMarkdown(withoutWikiLinks);

  const obsidianNotes: string[] = [];
  if (hadFrontmatter) {
    obsidianNotes.push("Frontmatter (metadata like tags or aliases) wasn't imported.");
  }
  if (hadEmbeds) {
    obsidianNotes.push("Embedded notes or files (![[...]]) were treated as plain references, not embedded content.");
  }

  return { ...parsed, parseNotes: [...(parsed.parseNotes ?? []), ...obsidianNotes] };
}
