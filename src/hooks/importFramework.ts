// The Import Framework — the architecture that lets existing creative work
// become first-class knowledge inside Forge. Import is acquisition, not
// migration: once created, an imported KnowledgeEntry is indistinguishable
// from one a creator typed by hand — nothing downstream (Discovery,
// History, Relationships, Chief, ...) can tell the difference, because
// nothing here writes a "was imported" flag onto the object it creates.
//
// Three separate stages, each independently testable and unaware of the
// others' internals:
//   1. Parse     — turn some external source into an ImportableItem.
//                  parseText() below is the trivial first example (plain
//                  pasted/typed text needs no real parsing at all);
//                  markdownImport.ts's parseMarkdown() is the first real
//                  one, handling headings/bullets/links/emphasis. Neither
//                  this file nor buildImportPlan below know Markdown
//                  exists — they only ever see the ImportableItem it
//                  produces.
//   2. Interpret — turn an ImportableItem into an ImportPlan: a
//                  deterministic preview of exactly what Forge would
//                  create, reusing the existing Relationship Engine to
//                  suggest connections. Pure — writes nothing, ever.
//   3. Apply     — take an approved ImportPlan and call the exact same
//                  creation functions (captureKnowledge,
//                  createManualRelationship) any other Knowledge entry
//                  already uses. There is no "applyImportPlan" function
//                  here on purpose: creation isn't import-specific business
//                  logic, it's just calling the hooks that already exist —
//                  see ImportModal.tsx, which does this the same way
//                  CaptureKnowledgeModal already does.
//
// A future importer (Markdown, a folder, Notion, ...) only ever needs to
// write its own parse step producing an ImportableItem; buildImportPlan
// below already works for it, unchanged.
import type { KnowledgeEntry, KnowledgeSource, ObjectRef } from "../types";
import type { CandidateRelationship, DiscoveryContext } from "./relationshipDiscovery";
import { findCandidateRelationships } from "./relationshipDiscovery";

// The output of parsing, and the only thing buildImportPlan ever reads.
// Any future source just needs to produce this same shape — two plain
// strings, nothing format-specific.
export interface ImportableItem {
  title: string;
  body: string;
  // Optional, and empty by default — a channel for a Parse stage to report
  // format-specific things it couldn't confidently understand (e.g.
  // Markdown Import flags a table or an embedded image it left untouched).
  // This is the one deliberate touch Interpret needed this sprint: Parse
  // alone has nowhere to surface "anything ignored or unsupported" (a
  // real UX requirement), since ImportPlan.warnings is already the
  // established, format-agnostic channel for "things the creator should
  // see before committing." buildImportPlan below only ever passes these
  // through unread and unmodified — it still has no idea what Markdown,
  // or any other format, actually is.
  parseNotes?: string[];
}

// A deterministic preview of what importing one ImportableItem would
// create — shown to the creator before anything is written, so "how Forge
// interpreted it" and "what relationships were inferred" are both
// answerable in full before Import commits to anything.
export interface ImportPlan {
  entry: {
    title: string;
    insight: string;
    source: KnowledgeSource;
  };
  // Reuses the exact CandidateRelationship shape the Relationship Engine
  // already produces for ordinary discovery — an import is just another
  // way a new Knowledge entry can enter Forge, so it deserves the same
  // suggestions any other new entry would get, not a second kind of guess.
  suggestedRelationships: CandidateRelationship[];
  // "What could not be understood" — plain-language notes about anything
  // the parse/interpret steps couldn't confidently fill in. Never blocks
  // the import; the creator decides what to do with an incomplete preview.
  warnings: string[];
}

// The one, trivial "parse" step this sprint proves the pipeline with:
// plain pasted or typed text needs no real parsing — the first line
// becomes the title (falling back to a generic one if there isn't a clear
// first line), the rest becomes the body. A future Markdown/folder/Notion
// importer replaces only a function like this one; buildImportPlan below
// is already source-agnostic.
export function parseText(raw: string): ImportableItem {
  const trimmed = raw.trim();
  const [firstLine, ...rest] = trimmed.split("\n");
  const title = firstLine?.trim() || "";
  const body = rest.join("\n").trim() || (title ? "" : trimmed);
  return { title, body };
}

// A stable, never-persisted placeholder id — used only to let the existing
// discovery rules "see" the not-yet-created entry while building a
// preview (see below). It never reaches real state; nothing is ever
// actually created with this id.
const PREVIEW_ID = "__import_preview__";

// Turns an ImportableItem into the temporary KnowledgeEntry shape
// findCandidateRelationships needs to "see" it — the same title/insight
// fallback rules buildImportPlan below has always used, just extracted so
// Batch Relationship Resolution's own temporary context (folderImport.ts's
// buildBatchDiscoveryContext) can stage every *other* batch item's preview
// the identical way, under its own id, instead of re-deriving these rules a
// second time. Never written to real state — id is the caller's concern
// entirely (buildImportPlan uses the fixed PREVIEW_ID for "the current
// item"; a batch uses each source's own id for "every sibling").
export function buildPreviewEntry(item: ImportableItem, id: string, activeIdentityId: string): KnowledgeEntry {
  return {
    id,
    identityId: activeIdentityId,
    projectId: null,
    title: item.title.trim() || "Untitled Import",
    insight: item.body.trim(),
    source: "Observation",
    createdAt: new Date(),
  };
}

// The one interpretation rule this sprint implements: an ImportableItem
// always becomes a Knowledge entry (source: "Observation" — imported
// content is something Forge is observing from outside itself, the same
// meaning that source already carries for hand-captured knowledge).
// Deterministic: the same item and the same existing Knowledge Engine
// state always produce the same plan.
export function buildImportPlan(
  item: ImportableItem,
  activeIdentityId: string,
  context: DiscoveryContext,
): ImportPlan {
  // Passed through, never interpreted — see ImportableItem's own doc
  // comment on parseNotes.
  const warnings: string[] = [...(item.parseNotes ?? [])];

  if (!item.title.trim()) {
    warnings.push("No clear title was found — using a generic one instead.");
  }
  if (!item.body.trim()) {
    warnings.push("No content was found beyond the title.");
  }

  // Staging a preview entry into a copy of the context is what lets
  // findCandidateRelationships — completely unmodified — treat the
  // not-yet-created entry as if it already existed, so the exact same
  // deterministic rules used everywhere else in Forge produce these
  // suggestions, rather than a second, import-specific matching system.
  // `context` may already carry *other* items' own previews (see
  // buildBatchDiscoveryContext) — this function has no idea whether it
  // does, and doesn't need to: one more discoverable KnowledgeEntry looks
  // the same to it (and to findCandidateRelationships) whether it's real
  // Forge knowledge or a batch sibling awaiting creation.
  const previewRef: ObjectRef = { type: "knowledge", id: PREVIEW_ID };
  const previewEntry = buildPreviewEntry(item, PREVIEW_ID, activeIdentityId);

  const previewContext: DiscoveryContext = {
    ...context,
    knowledgeEntries: [...context.knowledgeEntries, previewEntry],
  };

  const suggestedRelationships = findCandidateRelationships(previewRef, previewContext);

  return {
    entry: { title: previewEntry.title, insight: previewEntry.insight, source: "Observation" },
    suggestedRelationships,
    warnings,
  };
}
