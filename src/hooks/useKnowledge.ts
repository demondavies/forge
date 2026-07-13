import { useState } from "react";
import type { KnowledgeEntry, KnowledgeSource } from "../types";
import { CODEX_KNOWLEDGE_ENTRIES } from "../data/codexSeed";

// The raw form values needed to capture a new knowledge entry. "id",
// "identityId", and "createdAt" aren't included here because the engine
// itself fills those in (see captureKnowledge below).
export interface CaptureKnowledgeInput {
  title: string;
  insight: string;
  source: KnowledgeSource;
  projectId: string | null;
}

// captureKnowledge() can fail validation, so instead of throwing it returns
// this small result object — the caller just checks "error" and decides
// what to do, no try/catch needed. "entry" carries the newly captured
// entry on success (null otherwise) so callers — namely App.tsx's activity
// logging — can read its id/title without a second lookup.
export interface CaptureKnowledgeResult {
  error: string | null;
  entry: KnowledgeEntry | null;
}

// Mirrors useIdentities() and useProjects(): one hook owns all knowledge
// state plus the logic that changes it, so components never call useState
// directly.
//
// Just like projects, every knowledge entry for every identity lives in a
// single flat array — the way a real database table would hold every row
// regardless of which identity it belongs to. This hook filters that array
// down to whichever identity is currently active.
export function useKnowledge(activeIdentityId: string | null) {
  // Seeded with the Living Codex's own Knowledge (scoped to the "Forge"
  // identity, see codexSeed.ts) — every other identity's array starts empty
  // exactly as before; this is just non-empty initial data for one of them,
  // not a special case in this hook's own logic.
  const [entries, setEntries] = useState<KnowledgeEntry[]>(CODEX_KNOWLEDGE_ENTRIES);
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);

  // Only the knowledge that belongs to the currently selected identity,
  // newest first.
  const entriesForActiveIdentity = entries
    .filter((entry) => entry.identityId === activeIdentityId)
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  const selectedEntry =
    entriesForActiveIdentity.find((entry) => entry.id === selectedEntryId) ?? null;

  // Accepts null so KnowledgeDetail's "Back to Knowledge" button can clear
  // the selection and return to the list — mirrors useProjects' selectProject.
  function selectEntry(id: string | null) {
    setSelectedEntryId(id);
  }

  function captureKnowledge(input: CaptureKnowledgeInput): CaptureKnowledgeResult {
    if (!activeIdentityId) {
      return { error: "Select an identity first.", entry: null };
    }

    const trimmedTitle = input.title.trim();
    if (!trimmedTitle) {
      return { error: "Give this knowledge a title.", entry: null };
    }

    const trimmedInsight = input.insight.trim();
    if (!trimmedInsight) {
      return { error: "Describe the insight you learned.", entry: null };
    }

    const newEntry: KnowledgeEntry = {
      id: crypto.randomUUID(),
      identityId: activeIdentityId,
      // A project can only ever be attached from the active identity's own
      // project list (see CaptureKnowledgeModal), so there's no need to
      // re-validate that here.
      projectId: input.projectId,
      title: trimmedTitle,
      insight: trimmedInsight,
      source: input.source,
      createdAt: new Date(),
    };

    // Functional update — guards against reading a stale `entries` value if
    // multiple updates ever happen in quick succession.
    setEntries((current) => [...current, newEntry]);

    return { error: null, entry: newEntry };
  }

  return {
    entries: entriesForActiveIdentity,
    // The full, unfiltered list across every identity — needed by anything
    // that searches globally (the Command Palette) rather than within just
    // the active identity.
    allEntries: entries,
    selectedEntry,
    selectEntry,
    captureKnowledge,
  };
}
