import { useState, useEffect } from "react";
import type { Candidate, CandidateNote } from "../types";

const CANDIDATES_KEY = "forge.candidates";

function loadCandidates(): Candidate[] {
  try {
    const raw = localStorage.getItem(CANDIDATES_KEY);
    if (!raw) return [];
    return (JSON.parse(raw) as Array<Record<string, unknown>>).map((c) => ({
      ...c,
      createdAt: new Date(c.createdAt as string),
      notes: ((c.notes as Array<Record<string, unknown>>) ?? []).map(
        (n) => ({ ...n, createdAt: new Date(n.createdAt as string) }) as CandidateNote,
      ),
      isCurrentBest: (c.isCurrentBest as boolean) ?? false,
      isAlbumVersion: (c.isAlbumVersion as boolean) ?? false,
    }) as Candidate);
  } catch {
    return [];
  }
}

// The raw input needed to declare that a candidate exists. "id",
// "identityId", "status", "createdAt", and "approvedAssetId" aren't
// included here because the engine itself fills those in (see
// addCandidate below) — a creator only ever says which execution produced
// it and what to call it.
export interface AddCandidateInput {
  executionId: string;
  title: string;
  filePath?: string | null;
}

// addCandidate() can fail validation, so instead of throwing it returns
// this small result object — mirrors PlanTrackResult/AttributePromptResult
// exactly.
export interface AddCandidateResult {
  error: string | null;
  candidate: Candidate | null;
}

// Mirrors usePlannedTracks()/usePromptAttributions(): one hook owns all
// candidate state plus the logic that changes it. A candidate's existence,
// and a creator's approval or rejection of it, are all real, creator-
// declared facts — never derived, never scored, never inferred — so this
// gets the same hook shape every other creator-owned entity in Forge
// already has.
//
// Deliberately narrow: this file never imports useAssets.ts or calls
// createAsset. Promoting an approved candidate into a real Audio Asset is
// a composition of *two* systems (Candidate Review and the Creative
// Knowledge Engine), and that composition belongs one layer up, in
// App.tsx — exactly where Studio Queue and Prompt Attribution's own
// cross-system moments already live. This hook only ever answers "does
// this candidate exist, and what did the creator decide about it."
//
// No removal, ever — Rejected candidates remain historical evidence, per
// this sprint's own Non-Negotiables ("No deletion. History matters."), and
// once decided, a candidate stays decided: there is no path back to
// "Pending Review" once approved or rejected.
export function useCandidates(activeIdentityId: string | null) {
  const [candidates, setCandidates] = useState<Candidate[]>(loadCandidates);

  useEffect(() => {
    try { localStorage.setItem(CANDIDATES_KEY, JSON.stringify(candidates)); } catch {}
  }, [candidates]);

  const candidatesForActiveIdentity = candidates
    .filter((candidate) => candidate.identityId === activeIdentityId)
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

  function addCandidate(input: AddCandidateInput): AddCandidateResult {
    if (!activeIdentityId) {
      return { error: "Select an identity first.", candidate: null };
    }

    if (!input.executionId) {
      return { error: "Choose which execution produced this candidate.", candidate: null };
    }

    const trimmedTitle = input.title.trim();
    if (!trimmedTitle) {
      return { error: "Give this candidate a title.", candidate: null };
    }

    const newCandidate: Candidate = {
      id: crypto.randomUUID(),
      identityId: activeIdentityId,
      executionId: input.executionId,
      title: trimmedTitle,
      status: "Pending Review",
      createdAt: new Date(),
      approvedAssetId: null,
      filePath: input.filePath ?? null,
      notes: [],
      isCurrentBest: false,
      isAlbumVersion: false,
    };

    // Functional update — guards against reading a stale `candidates`
    // value if multiple updates ever happen in quick succession.
    setCandidates((current) => [...current, newCandidate]);

    return { error: null, candidate: newCandidate };
  }

  // Deliberately takes the already-created Asset's id rather than creating
  // it itself — see this file's own opening comment for why that
  // composition happens in App.tsx, not here.
  function approveCandidate(id: string, assetId: string) {
    setCandidates((current) =>
      current.map((candidate) =>
        candidate.id === id ? { ...candidate, status: "Approved", approvedAssetId: assetId } : candidate,
      ),
    );
  }

  function addNote(candidateId: string, text: string) {
    const trimmed = text.trim();
    if (!trimmed) return;
    const note: CandidateNote = {
      id: crypto.randomUUID(),
      text: trimmed,
      createdAt: new Date(),
    };
    setCandidates((current) =>
      current.map((c) => (c.id === candidateId ? { ...c, notes: [...c.notes, note] } : c)),
    );
  }

  function rejectCandidate(id: string) {
    setCandidates((current) =>
      current.map((candidate) => (candidate.id === id ? { ...candidate, status: "Rejected" } : candidate)),
    );
  }

  // Sets a promotion field (isCurrentBest or isAlbumVersion) to true on
  // candidateId and clears it on siblingsToUnset — all candidates for the
  // same track, computed by the caller from the attribution chain. This
  // enforces the per-track exclusivity constraint without the hook needing
  // to import PromptAttributions or know anything about track scope.
  function setCandidatePromotion(
    candidateId: string,
    field: "isCurrentBest" | "isAlbumVersion",
    siblingsToUnset: string[],
  ) {
    setCandidates((current) =>
      current.map((c) => {
        if (c.id === candidateId) return { ...c, [field]: true };
        if (siblingsToUnset.includes(c.id)) return { ...c, [field]: false };
        return c;
      }),
    );
  }

  return {
    candidates: candidatesForActiveIdentity,
    // The full, unfiltered list across every identity — kept for parity
    // with every other useX hook's own allX export.
    allCandidates: candidates,
    addCandidate,
    addNote,
    approveCandidate,
    rejectCandidate,
    setCandidatePromotion,
  };
}
