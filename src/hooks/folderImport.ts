// Folder Import — proof that the Import Framework scales to many sources
// without changing shape. Folder Import's entire contribution is looping:
// nothing here parses or interprets anything itself. Each source in a
// batch still runs through the exact same parseText/parseMarkdown ->
// buildImportPlan pipeline a single pasted item already uses, called once
// per source, with one source's own Parse result never affected by
// another's. Batch Relationship Resolution (buildBatchDiscoveryContext
// below) adds exactly one thing on top: the *context* buildImportPlan sees
// for a given source now also includes every other queued source's own
// temporary preview, so items in the same batch can discover relationships
// with each other — not just with existing Forge knowledge — the same
// deterministic way discovery already works everywhere else. The Creative
// Knowledge Engine has no idea whether a given Knowledge entry came from a
// folder of ten files or from one paste, or whether a batch was even
// involved — this file is the only place that even knows "there were
// several," and it never modifies Parse, Interpret, Apply, or the
// Relationship Engine's own matching rules to do it.
//
// An ImportSource stands in for one file: a label plus raw content,
// regardless of which provider produced it — Native Folder Access's manual
// folder reader, or Obsidian Vault Import's recursive vault reader (see
// native/nativeFolderSource.ts for both). Neither provider, nor this file,
// nor buildImportPlan below, needed to change shape when Obsidian arrived —
// exactly what "a future real folder/Obsidian/Notion importer only needs to
// produce ImportSource values" (this comment, before Obsidian existed)
// predicted.
import { buildImportPlan, buildPreviewEntry, parseText } from "./importFramework";
import type { ImportPlan } from "./importFramework";
import { parseMarkdown } from "./markdownImport";
import { parseObsidianNote } from "./obsidianImport";
import type { DiscoveryContext } from "./relationshipDiscovery";
import type { KnowledgeEntry } from "../types";

export type ImportSourceFormat = "text" | "markdown" | "obsidian-markdown";

// One file (real, eventually — manually entered, for now) waiting to be
// processed — the input to orchestration, standing in for what a real
// folder reader would eventually hand this same pipeline.
export interface ImportSource {
  id: string;
  label: string;
  format: ImportSourceFormat;
  rawText: string;
}

// One source, already run through Parse -> Interpret — the exact same
// ImportPlan a single-item import already produces, just paired with the
// source it came from so a batch preview can tell several apart.
export interface ImportBatchItem {
  source: ImportSource;
  plan: ImportPlan;
}

// Which Parse function handles which format — the only place that maps a
// format label to a parser, so adding a future format here is a one-line
// addition, not a change to how batches are built. Obsidian Vault Import
// proved this: "obsidian-markdown" is the only line it added here.
const PARSE_BY_FORMAT: Record<ImportSourceFormat, (raw: string) => ReturnType<typeof parseText>> = {
  text: parseText,
  markdown: parseMarkdown,
  "obsidian-markdown": parseObsidianNote,
};

// Display label for each format — used anywhere a batch item shows what
// kind of source it came from (see FolderImportModal's badge). Kept beside
// PARSE_BY_FORMAT since the two lists must always name the same formats.
export const IMPORT_SOURCE_FORMAT_LABELS: Record<ImportSourceFormat, string> = {
  text: "Plain Text",
  markdown: "Markdown",
  "obsidian-markdown": "Obsidian Note",
};

// Batch Relationship Resolution's one new export: a discovery context that
// includes every *other* queued source as a temporary preview
// KnowledgeEntry (keyed by that source's own id, via the same
// buildPreviewEntry buildImportPlan already uses for "the current item" —
// never the fixed PREVIEW_ID sentinel, which stays reserved for whichever
// single item buildImportPlan is staging at a given moment). Nothing is
// written to real state here; this is a *reading* convenience only — "the
// Import Framework is responsible only for constructing an appropriate
// temporary context," per this sprint's own framing. findCandidateRelationships
// (unmodified) simply sees more discoverable KnowledgeEntries; it has no
// idea any of them are only temporary.
//
// This has two real, present-tense callers — buildImportBatch below (which
// needs each item's own batch-context to discover relationships against)
// and FolderImportModal (which needs the *same* merged context to resolve
// a suggestion pointing at a batch sibling back into a label, via the
// already-unmodified resolveObjectRef) — which is why it's exported rather
// than kept as a private implementation detail of buildImportBatch alone.
export function buildBatchDiscoveryContext(
  sources: ImportSource[],
  activeIdentityId: string,
  context: DiscoveryContext,
): DiscoveryContext {
  const previews: KnowledgeEntry[] = sources
    .filter((source) => source.rawText.trim())
    .map((source) => buildPreviewEntry(PARSE_BY_FORMAT[source.format](source.rawText), source.id, activeIdentityId));

  return { ...context, knowledgeEntries: [...context.knowledgeEntries, ...previews] };
}

// Each source is still parsed and interpreted completely independently —
// nothing about one source's content or outcome affects another's, which is
// what "process each file exactly as if it had been imported individually"
// still means: buildImportPlan itself is called exactly as ImportModal
// already calls it for one item, with the exact same signature. The only
// thing that changed this sprint is *which context* each call sees — every
// other queued source's own preview is now visible alongside real Forge
// knowledge, via buildBatchDiscoveryContext above, so a batch item can
// discover a relationship with a sibling the same deterministic way it
// already discovers one with existing knowledge.
export function buildImportBatch(
  sources: ImportSource[],
  activeIdentityId: string,
  context: DiscoveryContext,
): ImportBatchItem[] {
  const validSources = sources.filter((source) => source.rawText.trim());
  const batchContext = buildBatchDiscoveryContext(validSources, activeIdentityId, context);

  return validSources.map((source) => {
    const item = PARSE_BY_FORMAT[source.format](source.rawText);

    // Every sibling's preview except this source's own — buildImportPlan
    // stages *this* item's preview itself, under the fixed PREVIEW_ID.
    // Leaving its sibling-preview copy (keyed by source.id) in too would
    // let an item "discover" a relationship with a duplicate of itself.
    const contextWithoutSelf: DiscoveryContext = {
      ...batchContext,
      knowledgeEntries: batchContext.knowledgeEntries.filter((entry) => entry.id !== source.id),
    };

    return { source, plan: buildImportPlan(item, activeIdentityId, contextWithoutSelf) };
  });
}
