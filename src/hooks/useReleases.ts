import { useState, useEffect } from "react";
import type { Release, ReleasePlatform, ReleaseStatus } from "../types";

const RELEASES_KEY = "forge.releases";

function loadReleases(): Release[] {
  try {
    const raw = localStorage.getItem(RELEASES_KEY);
    if (!raw) return [];
    return (JSON.parse(raw) as Array<Record<string, unknown>>).map(
      (r) => ({
        ...r,
        createdAt: new Date(r.createdAt as string),
        releaseDate: new Date(r.releaseDate as string),
      }) as Release,
    );
  } catch {
    return [];
  }
}

// The raw form values needed to create a new release. "id", "identityId",
// and "createdAt" aren't included here because the engine itself fills
// those in (see createRelease below). releaseDate arrives as the raw
// string from a native <input type="date"> ("YYYY-MM-DD" or "").
export interface CreateReleaseInput {
  title: string;
  projectId: string;
  platform: ReleasePlatform;
  status: ReleaseStatus;
  releaseDate: string;
  description: string;
}

// createRelease() can fail validation, so instead of throwing it returns
// this small result object — the caller just checks "error" and decides
// what to do, no try/catch needed. "release" carries the newly created
// release on success (null otherwise) so callers — namely App.tsx's
// activity logging — can read its id/title without a second lookup.
export interface CreateReleaseResult {
  error: string | null;
  release: Release | null;
}

// Turns a "YYYY-MM-DD" date-input value into a local-midnight Date.
// `new Date("YYYY-MM-DD")` parses as UTC, which can display as the wrong
// day once toLocaleDateString converts it back to the user's local
// timezone — building it from parts avoids that off-by-one bug.
function parseDateInputValue(value: string): Date {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

// Mirrors useProjects()/useAssets(): one hook owns all release state plus
// the logic that changes it, so components never call useState directly.
//
// Every release for every identity lives in a single flat array — the way
// a real database table would hold every row regardless of which identity
// or project it belongs to. This hook filters that array down to whichever
// identity is currently active, and sorts by release date (newest first).
export function useReleases(activeIdentityId: string | null) {
  const [releases, setReleases] = useState<Release[]>(loadReleases);
  const [selectedReleaseId, setSelectedReleaseId] = useState<string | null>(null);

  useEffect(() => {
    try { localStorage.setItem(RELEASES_KEY, JSON.stringify(releases)); } catch {}
  }, [releases]);

  const releasesForActiveIdentity = releases
    .filter((release) => release.identityId === activeIdentityId)
    .sort((a, b) => b.releaseDate.getTime() - a.releaseDate.getTime());

  const selectedRelease =
    releasesForActiveIdentity.find((release) => release.id === selectedReleaseId) ?? null;

  // Accepts null so ReleaseDetail's "Back to Releases" button can clear the
  // selection and return to the list — mirrors useProjects' selectProject.
  function selectRelease(id: string | null) {
    setSelectedReleaseId(id);
  }

  function createRelease(input: CreateReleaseInput): CreateReleaseResult {
    if (!activeIdentityId) {
      return { error: "Select an identity first.", release: null };
    }

    const trimmedTitle = input.title.trim();
    if (!trimmedTitle) {
      return { error: "Give this release a title.", release: null };
    }

    if (!input.projectId) {
      return { error: "Choose which project this release belongs to.", release: null };
    }

    if (!input.releaseDate) {
      return { error: "Choose a release date.", release: null };
    }

    const newRelease: Release = {
      id: crypto.randomUUID(),
      identityId: activeIdentityId,
      projectId: input.projectId,
      title: trimmedTitle,
      platform: input.platform,
      status: input.status,
      releaseDate: parseDateInputValue(input.releaseDate),
      description: input.description.trim(),
      createdAt: new Date(),
    };

    // Functional update — guards against reading a stale `releases` value
    // if multiple updates ever happen in quick succession.
    setReleases((current) => [...current, newRelease]);

    return { error: null, release: newRelease };
  }

  return {
    releases: releasesForActiveIdentity,
    // The full, unfiltered list across every identity — needed by anything
    // that searches globally (the Command Palette) rather than within just
    // the active identity.
    allReleases: releases,
    selectedRelease,
    selectRelease,
    createRelease,
  };
}
