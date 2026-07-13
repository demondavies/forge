import { useState } from "react";

// Mirrors the shape of every other transient, session-only piece of App
// state (activeBlueprint/firstBlueprintVisit) rather than a creator-owned
// hook like useCandidates or usePlannedTracks: which Workspace Surface,
// if any, is currently open is a fact about the current session's UI, not
// creative data a project or identity owns — it isn't scoped per
// identity, and nothing here is ever meant to survive a full reload, the
// same reason Forge's own in-memory model already resets everything else
// on one.
//
// "Remember the last opened surface" (this sprint's own requirement)
// means exactly this and nothing more: reopening a Workspace Surface
// within the same session defaults to whichever one was open last,
// without a creator re-choosing it — not a persisted preference that
// survives quitting Forge.
export function useWorkspaceSurface() {
  const [openSurfaceId, setOpenSurfaceId] = useState<string | null>(null);
  const [lastOpenedSurfaceId, setLastOpenedSurfaceId] = useState<string | null>(null);

  function openSurface(id: string) {
    setOpenSurfaceId(id);
    setLastOpenedSurfaceId(id);
  }

  function closeSurface() {
    setOpenSurfaceId(null);
  }

  return {
    openSurfaceId,
    lastOpenedSurfaceId,
    openSurface,
    closeSurface,
  };
}
