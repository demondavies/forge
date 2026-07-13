import type { KnowledgeEntry, PromptAttribution } from "../types";
import { listExecutionProviders } from "./executionProviders";

// Whether Forge currently has an active Provider Workspace — a live,
// already-authenticated session with a provider (for example, a real
// browser automation session), as distinct from the Execution Provider
// Framework's own configured-adapter model (Suno Service Adapter, and
// whatever else registers itself there). No such workspace exists in this
// build yet, so this has exactly one honest answer today: false. A future
// sprint that actually builds one would change only this function —
// resolveGenerationProvider below, and every caller of it, stay exactly
// as they are.
function hasActiveProviderWorkspace(): boolean {
  return false;
}

export type GenerationProviderSource = "provider-workspace" | "execution-provider" | "none";

// What Forge currently knows about who would fulfil a generation request
// right now, if a creator asked for one. Deliberately never persisted:
// Provider Results Are Temporary, and CreativeExecution.provider stays
// exactly what Studio Queue's own queueExecution already sets it to
// (UNASSIGNED_PROVIDER) — this is a live, re-askable fact for display
// only, the same reason resolveProviderForExecution and
// requestExecutionReport (Execution Provider Framework) never write
// anything back either.
export interface GenerationProviderResolution {
  source: GenerationProviderSource;
  displayName: string | null;
}

// Intent Before Provider: a creator only ever asks Forge to generate
// something — which provider actually fulfils that request is Forge's own
// decision, resolved fresh every time this is called, never chosen by the
// creator. Prefers an active Provider Workspace first; falls back to
// whichever registered Execution Provider currently reports itself
// available; honestly resolves to "none" if neither exists yet, rather
// than guessing or defaulting to the first provider regardless of state.
export function resolveGenerationProvider(): GenerationProviderResolution {
  if (hasActiveProviderWorkspace()) {
    return { source: "provider-workspace", displayName: "Active Provider Workspace" };
  }

  const availableProvider = listExecutionProviders().find(
    (provider) => provider.checkAvailability() === "available",
  );

  if (availableProvider) {
    return { source: "execution-provider", displayName: availableProvider.displayName };
  }

  return { source: "none", displayName: null };
}

// Which of a track's own attributed prompt versions "Generate Track"
// should actually queue — the most recently saved one, since a creator
// revising a prompt clearly means the newer version reflects their
// current intent. Reuses PromptAttribution exactly as
// AttributedPromptsPanel already does (a plain filter over the same,
// completely unmodified attributions array) rather than introducing a
// second way to ask the same question. Returns null, honestly, if the
// track has no attributed prompt version at all: Intent Before Execution
// means Forge never guesses one to generate instead.
export function resolveTrackPromptVersion(
  trackId: string,
  attributions: PromptAttribution[],
  knowledgeEntries: KnowledgeEntry[],
): KnowledgeEntry | null {
  const attributedIds = new Set(
    attributions.filter((attribution) => attribution.trackId === trackId).map((attribution) => attribution.promptVersionId),
  );
  const candidates = knowledgeEntries.filter((entry) => attributedIds.has(entry.id));

  if (candidates.length === 0) return null;

  return candidates.reduce((latest, entry) => (entry.createdAt > latest.createdAt ? entry : latest));
}
