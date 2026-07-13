// Prompt Studio's own composition — and the one place this sprint touches
// data at all. A prompt is not a new Forge entity: the moment a creator
// saves one, it becomes an entirely ordinary KnowledgeEntry (title +
// insight + source "Experiment", exactly like any other captured lesson),
// created through the exact same captureKnowledge/handleCaptureKnowledge
// this app has used since the Import Framework sprint. Nothing here calls
// the Creative Knowledge Engine, writes state, or knows React exists —
// this file only knows how to turn a structured draft into plain text,
// and how to recognise that plain text again later.
import type { KnowledgeEntry } from "../types";

// The one new type this sprint introduces, and the reason it's honestly
// needed: during drafting, a prompt is several short, separately-edited
// ideas (a genre, a mood, a list of references, ...), not yet the single
// block of prose a KnowledgeEntry's `insight` field holds. KnowledgeEntry
// itself can't truthfully represent "eight fields being composed at once"
// without inventing eight new fields on it — which would mean extending
// the Creative Knowledge Engine, explicitly off-limits. PromptDraft exists
// solely as transient, in-memory UI state (see PromptStudioView) — it is
// never persisted, never exported, and never crosses into Forge's own
// state as its own shape. Only its *composed output*, a plain string,
// ever becomes real Forge data, as an ordinary KnowledgeEntry.insight.
export interface PromptDraft {
  genre: string;
  mood: string;
  energy: string;
  instrumentation: string;
  references: string;
  productionStyle: string;
  mixingNotes: string;
  restrictions: string;
}

export function emptyPromptDraft(): PromptDraft {
  return {
    genre: "",
    mood: "",
    energy: "",
    instrumentation: "",
    references: "",
    productionStyle: "",
    mixingNotes: "",
    restrictions: "",
  };
}

// Display label + composition order for each field — the single source
// both the form (PromptStudioView) and the composed text below read from,
// so adding an eventual ninth field is a one-line addition here, not a
// change to how composition works.
export const PROMPT_FIELD_LABELS: Record<keyof PromptDraft, string> = {
  genre: "Genre",
  mood: "Mood",
  energy: "Energy",
  instrumentation: "Instrumentation",
  references: "References",
  productionStyle: "Production Style",
  mixingNotes: "Mixing Notes",
  restrictions: "Restrictions",
};

export const PROMPT_FIELD_ORDER: (keyof PromptDraft)[] = [
  "genre",
  "mood",
  "energy",
  "instrumentation",
  "references",
  "productionStyle",
  "mixingNotes",
  "restrictions",
];

// Turns a draft into the one thing that ever leaves this file as real
// data: a plain, labelled block of text. Deliberately just "Label: value"
// lines, not a stylised template — the honest, portable shape a creator
// could paste into Suno, MusicGPT, ACE, or anything else without Forge
// ever needing to know that platform exists. Empty fields are skipped
// rather than shown blank, so an early, half-filled draft still reads
// cleanly.
export function composePromptText(draft: PromptDraft): string {
  return PROMPT_FIELD_ORDER.filter((field) => draft[field].trim())
    .map((field) => `${PROMPT_FIELD_LABELS[field]}: ${draft[field].trim()}`)
    .join("\n");
}

// A prompt's "version history" is nothing but its project's own Knowledge
// entries, recognised by title rather than by a new field — the same
// "represent a new idea through an existing generic type's own content"
// pattern the Living Codex and Markdown Import both already established.
// Every prompt version is captured with this exact prefix (see
// PromptStudioView's own save handler), so Creative History, Creative
// Sessions, and Music Workspace's own Notes section all narrate a prompt's
// evolution automatically — none of them needed to change to do it.
export const PROMPT_VERSION_TITLE_PREFIX = "Production Prompt";

export function isPromptVersion(entry: KnowledgeEntry): boolean {
  return entry.title.startsWith(PROMPT_VERSION_TITLE_PREFIX);
}

export function nextPromptVersionTitle(existingVersions: KnowledgeEntry[]): string {
  return `${PROMPT_VERSION_TITLE_PREFIX} v${existingVersions.length + 1}`;
}
