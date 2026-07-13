// The Album Production Engine — Forge's first orchestration layer that
// treats an album as a coordinated body of work, not a pile of unrelated
// prompts. It owns orchestration only: every fact below is read from
// engines that already exist and are already correct (buildMusicWorkspace,
// isPromptVersion, buildReleaseManifest — all three completely
// unmodified), or derived from PlannedTrack, the one new concept this
// sprint adds. Nothing here invents a second Studio Queue, a second Prompt
// Studio, or a second Creative Pipeline; it simply asks each of them what
// they already know and organises the answer around an album's own tracks.
//
// Honest limitation, stated plainly rather than hidden: Prompt Studio's
// saved versions are always titled "Production Prompt v{N}" — a fixed,
// project-wide convention Prompt Studio itself owns and this sprint cannot
// change — so there is no honest way to tell *which track* a given saved
// prompt or queued execution belongs to. Rather than fabricate that
// attribution, prompt/queue/candidate facts are surfaced at the album
// level, truthfully labelled as album-wide; only Audio and Knowledge
// (Assets and non-prompt notes a creator names themselves) can be honestly
// matched to a specific track, via the same title/name-matching heuristic
// the Relationship Engine's own "similar-title"/"shared-filename" rules
// already established as legitimate — applied locally here, not by
// modifying that engine.
import type { Activity, Asset, CreativeExecution, Identity, KnowledgeEntry, PlannedTrack, Project, Release } from "../types";
import type { DiscoveryContext } from "./relationshipDiscovery";
import { buildMusicWorkspace } from "./musicWorkspace";
import { isPromptVersion } from "./promptComposition";
import { buildReleaseManifest } from "./releaseManifest";

// One planned track, composed with whatever this album's own Assets and
// Knowledge can honestly be matched to it. `matchedAudio`/`matchedNotes`
// are never stored on PlannedTrack itself — they're recomputed fresh every
// time from the project's existing Assets/Knowledge, so renaming an asset
// to reference a track (or no longer referencing it) is reflected
// immediately, with nothing to keep in sync by hand.
export interface AlbumTrackComposition {
  track: PlannedTrack;
  matchedAudio: Asset[];
  matchedNotes: KnowledgeEntry[];
  hasAudio: boolean;
  hasNotes: boolean;
}

export interface AlbumProductionComposition {
  project: Project;
  tracks: AlbumTrackComposition[];
  // Album-wide facts — see this file's own opening comment for why prompt
  // versions, queued executions, and candidate state can't honestly be
  // narrowed down to one track.
  promptVersionCount: number;
  queuedExecutionCount: number;
  completedExecutionCount: number;
  latestRelease: Release | null;
  releaseManifestCompleteness: {
    completeFieldCount: number;
    totalFieldCount: number;
    completeness: "complete" | "incomplete";
  } | null;
}

// Does `name` plausibly reference `trackTitle`? A plain, case-insensitive
// substring check — the same honest, low-tech heuristic
// relationshipDiscovery.ts's own similar-title/shared-filename rules
// already use elsewhere in Forge, not a new matching mechanism invented
// for this sprint.
function nameReferencesTrack(name: string, trackTitle: string): boolean {
  const normalizedTitle = trackTitle.trim().toLowerCase();
  if (!normalizedTitle) return false;
  return name.toLowerCase().includes(normalizedTitle);
}

// The one composition this sprint adds. `project`, `tracks`, `executions`,
// and `context` together already carry everything needed — no new data is
// read from anywhere this file introduces itself.
export function buildAlbumProduction(
  project: Project,
  tracks: PlannedTrack[],
  executions: CreativeExecution[],
  identity: Identity,
  context: DiscoveryContext,
  activities: Activity[],
): AlbumProductionComposition {
  // Reused completely unmodified — the same audio/artwork/notes grouping
  // Music Workspace, Creative Pipeline, and Release Manifest already each
  // build their own view from.
  const workspace = buildMusicWorkspace(project, context, activities);

  const promptVersions = workspace.notes.filter(isPromptVersion);
  const otherNotes = workspace.notes.filter((entry) => !isPromptVersion(entry));

  const projectTracks = tracks.filter((track) => track.projectId === project.id);
  const trackCompositions: AlbumTrackComposition[] = projectTracks.map((track) => {
    const matchedAudio = workspace.audio.filter((asset) => nameReferencesTrack(asset.name, track.title));
    const matchedNotes = otherNotes.filter((entry) => nameReferencesTrack(entry.title, track.title));
    return {
      track,
      matchedAudio,
      matchedNotes,
      hasAudio: matchedAudio.length > 0,
      hasNotes: matchedNotes.length > 0,
    };
  });

  const projectExecutions = executions.filter((execution) => execution.projectId === project.id);
  const completedExecutionCount = projectExecutions.filter((execution) => execution.status === "Completed").length;

  // Same "newest release date first" pick Creative Pipeline's own
  // composition already uses — a one-line derivation, not a re-import of
  // logic Creative Pipeline never exported.
  const latestRelease =
    [...workspace.releases].sort((a, b) => b.releaseDate.getTime() - a.releaseDate.getTime())[0] ?? null;

  const releaseManifestCompleteness = latestRelease
    ? (() => {
        const manifest = buildReleaseManifest(latestRelease, project, identity, context, activities);
        return {
          completeFieldCount: manifest.completeFieldCount,
          totalFieldCount: manifest.totalFieldCount,
          completeness: manifest.completeness,
        };
      })()
    : null;

  return {
    project,
    tracks: trackCompositions,
    promptVersionCount: promptVersions.length,
    queuedExecutionCount: projectExecutions.length,
    completedExecutionCount,
    latestRelease,
    releaseManifestCompleteness,
  };
}
