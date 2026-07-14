import { useState, useEffect } from "react";
import type { Capture, CaptureType } from "../types";

const CAPTURES_KEY = "forge.captures";

function loadCaptures(): Capture[] {
  try {
    const raw = localStorage.getItem(CAPTURES_KEY);
    if (!raw) return [];
    return (JSON.parse(raw) as Array<Record<string, unknown>>).map(
      (c) => ({ ...c, createdAt: new Date(c.createdAt as string) }) as Capture,
    );
  } catch {
    return [];
  }
}

// The raw form values needed to create a new capture. "id", "identityId",
// and "createdAt" aren't included here because the engine itself fills
// those in (see createCapture below).
export interface CreateCaptureInput {
  type: CaptureType;
  content: string;
}

// createCapture() can fail validation, so instead of throwing it returns
// this small result object — the caller just checks "error" and decides
// what to do, no try/catch needed. "capture" carries the newly created
// capture on success (null otherwise) so callers — namely App.tsx's
// activity logging — can read it without a second lookup.
export interface CreateCaptureResult {
  error: string | null;
  capture: Capture | null;
}

// Mirrors useAssets()/useReleases(): one hook owns all capture state plus
// the logic that changes it, so components never call useState directly.
//
// Every capture for every identity lives in a single flat array — the way
// a real database table would hold every row regardless of which identity
// it belongs to. This hook filters that array down to whichever identity
// is currently active, newest first (an Inbox is meant to be read like a
// stream of recent thoughts, not an alphabetized list).
export function useCaptures(activeIdentityId: string | null) {
  const [captures, setCaptures] = useState<Capture[]>(loadCaptures);
  const [selectedCaptureId, setSelectedCaptureId] = useState<string | null>(null);

  useEffect(() => {
    try { localStorage.setItem(CAPTURES_KEY, JSON.stringify(captures)); } catch {}
  }, [captures]);

  const capturesForActiveIdentity = captures
    .filter((capture) => capture.identityId === activeIdentityId)
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  const selectedCapture =
    capturesForActiveIdentity.find((capture) => capture.id === selectedCaptureId) ?? null;

  // Accepts null so CaptureDetail's "Back to Inbox" button can clear the
  // selection and return to the list — mirrors useProjects' selectProject.
  function selectCapture(id: string | null) {
    setSelectedCaptureId(id);
  }

  function createCapture(input: CreateCaptureInput): CreateCaptureResult {
    if (!activeIdentityId) {
      return { error: "Select an identity first.", capture: null };
    }

    const trimmedContent = input.content.trim();
    if (!trimmedContent) {
      return { error: "There's nothing to capture yet.", capture: null };
    }

    const newCapture: Capture = {
      id: crypto.randomUUID(),
      identityId: activeIdentityId,
      type: input.type,
      content: trimmedContent,
      createdAt: new Date(),
    };

    // Functional update — guards against reading a stale `captures` value
    // if multiple updates ever happen in quick succession.
    setCaptures((current) => [...current, newCapture]);

    return { error: null, capture: newCapture };
  }

  return {
    captures: capturesForActiveIdentity,
    // The full, unfiltered list across every identity. Originally this
    // hook skipped exposing one (nothing searched across identities for a
    // Capture) — the Command Palette (and, through it, "Connect To…"'s
    // search step) now does, so this mirrors useProjects/useKnowledge/
    // useAssets/useReleases exactly.
    allCaptures: captures,
    selectedCapture,
    selectCapture,
    createCapture,
  };
}
