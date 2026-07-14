import { useState, useEffect } from "react";
import type { PlannedTrack } from "../types";

const TRACKS_KEY = "forge.tracks";

function loadTracks(): PlannedTrack[] {
  try {
    const raw = localStorage.getItem(TRACKS_KEY);
    if (!raw) return [];
    return (JSON.parse(raw) as Array<Record<string, unknown>>).map((t) => ({
      ...t,
      createdAt: new Date(t.createdAt as string),
      completedAt: t.completedAt ? new Date(t.completedAt as string) : undefined,
    }) as PlannedTrack);
  } catch {
    return [];
  }
}

// The raw input needed to plan one track. "id", "identityId", and
// "createdAt" aren't included here because the engine itself fills those
// in (see planTrack below) — a creator only ever chooses which project
// and what to call the track.
export interface PlanTrackInput {
  projectId: string;
  title: string;
  description?: string;
}

// planTrack() can fail validation, so instead of throwing it returns this
// small result object — mirrors CreateReleaseResult/QueueExecutionResult
// exactly.
export interface PlanTrackResult {
  error: string | null;
  track: PlannedTrack | null;
}

// Mirrors useStudioQueue()/useReleases(): one hook owns all planned-track
// state plus the logic that changes it. A planned track is genuinely
// creator-owned, creator-mutable data — not a derived projection like
// Music Workspace, Creative Pipeline, or Release Manifest — so it needs
// the same full create/remove hook shape those other creator-owned
// entities (Release/Asset/Knowledge/CreativeExecution) already have.
//
// Every planned track for every identity lives in one flat array,
// filtered down to whichever identity is currently active, and sorted by
// when it was planned — the same shape every other creator-owned entity
// in Forge already uses.
export function usePlannedTracks(activeIdentityId: string | null) {
  const [tracks, setTracks] = useState<PlannedTrack[]>(loadTracks);

  useEffect(() => {
    try { localStorage.setItem(TRACKS_KEY, JSON.stringify(tracks)); } catch {}
  }, [tracks]);

  const tracksForActiveIdentity = tracks
    .filter((track) => track.identityId === activeIdentityId)
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

  function planTrack(input: PlanTrackInput): PlanTrackResult {
    if (!activeIdentityId) {
      return { error: "Select an identity first.", track: null };
    }

    if (!input.projectId) {
      return { error: "Choose which album this track belongs to.", track: null };
    }

    const trimmedTitle = input.title.trim();
    if (!trimmedTitle) {
      return { error: "Give this track a title.", track: null };
    }

    const newTrack: PlannedTrack = {
      id: crypto.randomUUID(),
      identityId: activeIdentityId,
      projectId: input.projectId,
      title: trimmedTitle,
      description: input.description,
      createdAt: new Date(),
    };

    // Functional update — guards against reading a stale `tracks` value if
    // multiple updates ever happen in quick succession.
    setTracks((current) => [...current, newTrack]);

    return { error: null, track: newTrack };
  }

  // A planned track represents intent, not a record of something that
  // happened — removing one before (or instead of) ever acting on it is a
  // real, permanent deletion, the same honest choice Studio Queue's own
  // removeExecution already made for the same reason.
  function removeTrack(id: string) {
    setTracks((current) => current.filter((track) => track.id !== id));
  }

  function finishTrack(id: string) {
    setTracks((current) =>
      current.map((track) => (track.id === id ? { ...track, completedAt: new Date() } : track)),
    );
  }

  function reopenTrack(id: string) {
    setTracks((current) =>
      current.map((track) => (track.id === id ? { ...track, completedAt: undefined } : track)),
    );
  }

  function updateTrack(id: string, updates: { title?: string; description?: string }) {
    setTracks((current) =>
      current.map((track) => (track.id === id ? { ...track, ...updates } : track)),
    );
  }

  return {
    tracks: tracksForActiveIdentity,
    // The full, unfiltered list across every identity — kept for parity
    // with every other useX hook's own allX export.
    allTracks: tracks,
    planTrack,
    removeTrack,
    finishTrack,
    reopenTrack,
    updateTrack,
  };
}
