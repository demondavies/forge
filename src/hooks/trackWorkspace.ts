// Track Workspace — Forge's first dedicated composition point for one
// Planned Track. Like Album Production before it, this file owns no
// creative capability of its own: every fact here is read from an engine
// that already exists and is already correct (buildMusicWorkspace,
// isPromptVersion, buildCreativeHistory, findDiscoveries,
// findOpportunities, buildChiefObservations — every one of them completely
// unmodified), filtered down to whatever Forge can honestly attribute to
// this one track.
//
// Same honest limitation Album Production already established, restated
// here rather than hidden: Prompt Studio's saved versions and Studio
// Queue's executions carry no track-level attribution Forge can trust
// (Prompt Studio always titles a version "Production Prompt v{N}", a
// fixed, project-wide convention this sprint cannot change) — so prompt
// and queue facts are surfaced honestly as album-level, never guessed per
// track. Only Audio Assets and non-prompt Knowledge (both freely named by
// the creator) are matched to this track, via the exact same
// case-insensitive name/title-substring heuristic Album Production's own
// engine already uses — reimplemented locally here since that function
// isn't exported and Album Production Engine is off-limits to modify this
// sprint.
import type {
  Activity,
  Asset,
  CreativeExecution,
  KnowledgeEntry,
  ObjectRef,
  PlannedTrack,
  Project,
} from "../types";
import type { DiscoveryContext } from "./relationshipDiscovery";
import { isSameRef, refKey, resolveObjectRef } from "./relationshipDiscovery";
import { buildMusicWorkspace } from "./musicWorkspace";
import { isPromptVersion } from "./promptComposition";
import { buildCreativeHistory } from "./creativeHistory";
import type { HistoryEntry } from "./creativeHistory";
import { findDiscoveries } from "./discoveryEngine";
import { findOpportunities } from "./opportunityEngine";
import type { Opportunity } from "./opportunityEngine";
import { buildChiefObservations } from "./chief";
import type { ChiefObservation } from "./chief";

// Does `name` plausibly reference `trackTitle`? The same honest, low-tech
// heuristic relationshipDiscovery.ts's own similar-title/shared-filename
// rules already use elsewhere in Forge, and the same one Album
// Production's own (unexported) matching function already established —
// not a new matching mechanism invented for this sprint.
function nameReferencesTrack(name: string, trackTitle: string): boolean {
  const normalizedTitle = trackTitle.trim().toLowerCase();
  if (!normalizedTitle) return false;
  return name.toLowerCase().includes(normalizedTitle);
}

// Mirrors creativeSession.ts's own private observationObjects helper
// exactly — Chief's discriminated union keeps each source's real objects
// intact, so reading them back out takes the same one-line switch either
// caller needs.
function observationObjects(observation: ChiefObservation): ObjectRef[] {
  return observation.kind === "discovery" ? observation.discovery.objects : observation.opportunity.objects;
}

export interface TrackWorkspaceComposition {
  track: PlannedTrack;
  project: Project;
  matchedAudio: Asset[];
  matchedNotes: KnowledgeEntry[];
  history: HistoryEntry[];
  opportunities: Opportunity[];
  chiefObservations: ChiefObservation[];
  // Album-wide, never track-attributed — see this file's own opening
  // comment for why.
  albumPromptVersions: KnowledgeEntry[];
  albumExecutions: CreativeExecution[];
  hasAudio: boolean;
  hasNotes: boolean;
  hasAlbumPrompt: boolean;
  hasQueued: boolean;
  hasCompletedExecution: boolean;
}

// The one composition this sprint adds. `track`, `project`, `context`,
// `activities`, and `executions` together already carry everything
// needed — no new data is read from anywhere this file introduces itself.
export function buildTrackWorkspace(
  track: PlannedTrack,
  project: Project,
  context: DiscoveryContext,
  activities: Activity[],
  executions: CreativeExecution[],
): TrackWorkspaceComposition {
  // Reused completely unmodified — the same audio/notes grouping Music
  // Workspace, Creative Pipeline, Release Manifest, and Album Production
  // each already build their own view from.
  const workspace = buildMusicWorkspace(project, context, activities);

  const matchedAudio = workspace.audio.filter((asset) => nameReferencesTrack(asset.name, track.title));
  const otherNotes = workspace.notes.filter((entry) => !isPromptVersion(entry));
  const matchedNotes = otherNotes.filter((entry) => nameReferencesTrack(entry.title, track.title));
  const albumPromptVersions = workspace.notes.filter(isPromptVersion);
  const albumExecutions = executions.filter((execution) => execution.projectId === project.id);

  const matchedRefs: ObjectRef[] = [
    ...matchedAudio.map((asset): ObjectRef => ({ type: "asset", id: asset.id })),
    ...matchedNotes.map((entry): ObjectRef => ({ type: "knowledge", id: entry.id })),
  ];

  const relationships = context.relationships ?? [];

  // Creative History is never computed "for a track" directly — a Planned
  // Track has no ObjectRef of its own, and creativeHistory.ts rightly
  // doesn't know it exists. Instead, each matched object's own, already-
  // correct history is built (exactly as AssetDetail/KnowledgeDetail
  // already do for themselves) and merged into one chronological story
  // about this track.
  const history: HistoryEntry[] = matchedRefs
    .flatMap((ref) =>
      buildCreativeHistory(
        ref,
        [],
        activities,
        relationships.filter(
          (relationship) => isSameRef(relationship.source, ref) || isSameRef(relationship.target, ref),
        ),
        (candidate) => resolveObjectRef(candidate, context),
      ),
    )
    .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

  // Same "ask the real, identity-wide engine, then filter to what's
  // relevant" pattern Creative Sessions already established for a whole
  // Project — applied here to the track's own matched objects instead.
  // Both engines still run identity-wide, exactly as they do everywhere
  // else; filtering happens only after, on their already-computed output.
  const matchedRefKeys = new Set(matchedRefs.map(refKey));
  const involvesTrack = (objects: ObjectRef[]) => objects.some((ref) => matchedRefKeys.has(refKey(ref)));

  const discoveries = findDiscoveries(context);
  const allOpportunities = findOpportunities(context);
  const opportunities = allOpportunities.filter((opportunity) => involvesTrack(opportunity.objects));
  const chiefObservations = buildChiefObservations(discoveries, allOpportunities).filter((observation) =>
    involvesTrack(observationObjects(observation)),
  );

  return {
    track,
    project,
    matchedAudio,
    matchedNotes,
    history,
    opportunities,
    chiefObservations,
    albumPromptVersions,
    albumExecutions,
    hasAudio: matchedAudio.length > 0,
    hasNotes: matchedNotes.length > 0,
    hasAlbumPrompt: albumPromptVersions.length > 0,
    hasQueued: albumExecutions.length > 0,
    hasCompletedExecution: albumExecutions.some((execution) => execution.status === "Completed"),
  };
}
