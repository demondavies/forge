import { useState, useEffect } from "react";
import type { PromptAttribution } from "../types";

const ATTRIBUTIONS_KEY = "forge.attributions";

function loadAttributions(): PromptAttribution[] {
  try {
    const raw = localStorage.getItem(ATTRIBUTIONS_KEY);
    if (!raw) return [];
    return (JSON.parse(raw) as Array<Record<string, unknown>>).map(
      (a) => ({ ...a, createdAt: new Date(a.createdAt as string) }) as PromptAttribution,
    );
  } catch {
    return [];
  }
}

// The raw input needed to attribute one prompt version. "id", "identityId",
// and "createdAt" aren't included here because the engine itself fills
// those in (see attributePrompt below) — a creator only ever chooses
// which saved prompt version and which planned track.
export interface AttributePromptInput {
  promptVersionId: string;
  trackId: string;
}

// attributePrompt() can fail validation, so instead of throwing it returns
// this small result object — mirrors QueueExecutionResult/PlanTrackResult
// exactly.
export interface AttributePromptResult {
  error: string | null;
  attribution: PromptAttribution | null;
}

// Mirrors usePlannedTracks()/useStudioQueue(): one hook owns all
// attribution state plus the logic that changes it. A creator's own
// declared "I wrote this for that track" is real, creator-authored data —
// not a derived projection — so it gets the same hook shape every other
// creator-owned entity in Forge already has.
//
// Deliberately no removal function: an attribution isn't a queue item a
// creator takes back before it executes, or a plan that might change its
// mind — it's a settled record of a decision already made. If a creator
// wants a different track, they write a new prompt version and target
// that one instead; nothing here needs to support editing history.
//
// Every attribution for every identity lives in one flat array, filtered
// down to whichever identity is currently active — the same shape every
// other creator-owned entity in Forge already uses.
export function usePromptAttributions(activeIdentityId: string | null) {
  const [attributions, setAttributions] = useState<PromptAttribution[]>(loadAttributions);

  useEffect(() => {
    try { localStorage.setItem(ATTRIBUTIONS_KEY, JSON.stringify(attributions)); } catch {}
  }, [attributions]);

  const attributionsForActiveIdentity = attributions.filter(
    (attribution) => attribution.identityId === activeIdentityId,
  );

  function attributePrompt(input: AttributePromptInput): AttributePromptResult {
    if (!activeIdentityId) {
      return { error: "Select an identity first.", attribution: null };
    }

    if (!input.promptVersionId) {
      return { error: "Choose which prompt version this belongs to.", attribution: null };
    }

    if (!input.trackId) {
      return { error: "Choose which track this prompt was written for.", attribution: null };
    }

    const newAttribution: PromptAttribution = {
      id: crypto.randomUUID(),
      identityId: activeIdentityId,
      promptVersionId: input.promptVersionId,
      trackId: input.trackId,
      createdAt: new Date(),
    };

    // Functional update — guards against reading a stale `attributions`
    // value if multiple updates ever happen in quick succession.
    setAttributions((current) => [...current, newAttribution]);

    return { error: null, attribution: newAttribution };
  }

  // Which track (if any) a specific prompt version was explicitly written
  // for — the one question Track Workspace's future consumption and
  // Prompt Studio's own attribution badge both need answered.
  function getAttributedTrackId(promptVersionId: string): string | null {
    const match = attributionsForActiveIdentity.find(
      (attribution) => attribution.promptVersionId === promptVersionId,
    );
    return match ? match.trackId : null;
  }

  // Every prompt version explicitly written for a specific track — the
  // inverse lookup, for anything that needs to show "this track's own
  // prompts" rather than "this prompt's own track".
  function getAttributedPromptVersionIds(trackId: string): string[] {
    return attributionsForActiveIdentity
      .filter((attribution) => attribution.trackId === trackId)
      .map((attribution) => attribution.promptVersionId);
  }

  return {
    attributions: attributionsForActiveIdentity,
    // The full, unfiltered list across every identity — kept for parity
    // with every other useX hook's own allX export.
    allAttributions: attributions,
    attributePrompt,
    getAttributedTrackId,
    getAttributedPromptVersionIds,
  };
}
