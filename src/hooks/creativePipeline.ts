// The Creative Pipeline Engine — Forge's high-level orchestration layer.
// Core Principle of this sprint: creators think in projects, projects move
// through stages, and individual tools perform work within those stages.
// This file organizes the project — it never performs any work itself.
//
// Every stage below is answered by asking an existing engine a question it
// already knows how to answer, not by inventing a new fact. Research and
// Prompt read the project's own Knowledge (via buildMusicWorkspace,
// completely unmodified); Production reads the project's own Assets (the
// same grouping); Release Manifest and Translation read the project's most
// recent Release through buildReleaseManifest, also completely unmodified.
// Nothing here is stored: buildCreativePipeline is a pure function of
// whatever Forge already knows *right now* — Temporary Truth, applied
// literally. If a creator deletes a Prompt Version, the very next call to
// this function sees one fewer prompt version and the Prompt stage
// naturally reports "not-started" again; nothing needs to be told to
// "recheck" anything.
//
// The one new type this file introduces — PipelineStageAction — exists
// because a stage's recommended action sometimes *is* an existing Creative
// Action (Create Release, Add Artwork, Capture Production Note — reused
// via bindCreativeAction, completely unmodified) and sometimes is a direct
// navigation callback Workspace.tsx already owns (Open Prompt Studio, Open
// Release Manifest, Export as release.json) that was deliberately kept
// outside the Creative Action system in earlier sprints (see Prompt
// Studio's and Release Manifest's own reports). CreativeActionId's closed
// union can't honestly represent the second group without extending
// Creative Actions, which is off-limits this sprint — so a stage's action
// is described here as the smallest common shape both groups already share
// (a label, an icon, and a callback), never a new workflow.
import type { Activity, Asset, Identity, KnowledgeEntry, Project, Release } from "../types";
import type { DiscoveryContext } from "./relationshipDiscovery";
import { buildMusicWorkspace } from "./musicWorkspace";
import { isPromptVersion } from "./promptComposition";
import { buildReleaseManifest } from "./releaseManifest";
import { bindCreativeAction } from "./creativeActions";
import type { CreativeAction } from "./creativeActions";

export type PipelineStageStatus = "not-started" | "in-progress" | "complete";

export type PipelineStageId =
  | "research"
  | "prompt"
  | "production"
  | "release-manifest"
  | "translation"
  | "published";

export interface PipelineStageAction {
  label: string;
  icon: string;
  onClick: () => void;
}

// One stage, fully described: what it's called, where it stands, why, and
// the one thing Forge would suggest doing about it. `action` is null only
// when there is genuinely nothing an existing Forge capability could
// recommend (see the Published stage below) — never a placeholder for a
// workflow that doesn't exist yet.
export interface PipelineStage {
  id: PipelineStageId;
  title: string;
  status: PipelineStageStatus;
  summary: string;
  action: PipelineStageAction | null;
}

export interface CreativePipeline {
  project: Project;
  stages: PipelineStage[];
  // The first stage that isn't yet complete — the direct, honest answer to
  // "where is this project right now?" Null only once every stage Forge
  // can currently observe is complete.
  currentStage: PipelineStage | null;
}

// Every existing Forge callback a stage's action might reuse — all of them
// already owned by Workspace.tsx/App.tsx before this sprint. Bundled into
// one parameter object purely so buildCreativePipeline's own signature
// stays short; nothing here is a new capability.
export interface CreativePipelineCallbacks {
  onCaptureKnowledge: () => void;
  onAddAsset: () => void;
  onCreateRelease: () => void;
  onOpenPromptStudio: (projectId: string) => void;
  onOpenReleaseManifest: (releaseId: string) => void;
  onOpenReleaseTranslation: (releaseId: string) => void;
}

// A stage's action is sometimes an existing CreativeAction (Create Release,
// Add Artwork, Capture Production Note) — this just takes the label/icon
// it already carries and renames its callback field (`run` -> `onClick`)
// to match PipelineStageAction's own honestly-generic shape; nothing about
// the action's meaning changes.
function toStageAction(action: CreativeAction): PipelineStageAction {
  return { label: action.label, icon: action.icon, onClick: action.run };
}

function buildResearchStage(notes: KnowledgeEntry[], callbacks: CreativePipelineCallbacks): PipelineStage {
  const hasNotes = notes.length > 0;
  return {
    id: "research",
    title: "Research",
    status: hasNotes ? "complete" : "not-started",
    summary: hasNotes
      ? `${notes.length} ${notes.length === 1 ? "note" : "notes"} captured for this project.`
      : "No notes captured for this project yet.",
    action: hasNotes ? null : toStageAction(bindCreativeAction("capture-production-note", callbacks.onCaptureKnowledge)),
  };
}

function buildPromptStage(
  promptVersions: KnowledgeEntry[],
  project: Project,
  callbacks: CreativePipelineCallbacks,
): PipelineStage {
  const hasPrompt = promptVersions.length > 0;
  return {
    id: "prompt",
    title: "Prompt",
    status: hasPrompt ? "complete" : "not-started",
    summary: hasPrompt
      ? `${promptVersions.length} production ${promptVersions.length === 1 ? "prompt" : "prompt versions"} saved.`
      : "No production prompt saved for this project yet.",
    action: {
      label: "Open Prompt Studio",
      icon: "🎛️",
      onClick: () => callbacks.onOpenPromptStudio(project.id),
    },
  };
}

function buildProductionStage(audio: Asset[], artwork: Asset[], callbacks: CreativePipelineCallbacks): PipelineStage {
  const hasAudio = audio.length > 0;
  const hasArtwork = artwork.length > 0;
  const status: PipelineStageStatus = hasAudio && hasArtwork ? "complete" : hasAudio || hasArtwork ? "in-progress" : "not-started";

  let summary: string;
  let action: PipelineStageAction | null;
  if (hasAudio && hasArtwork) {
    summary = `${audio.length} audio ${audio.length === 1 ? "asset" : "assets"} and ${artwork.length} artwork ${artwork.length === 1 ? "asset" : "assets"} in place.`;
    action = null;
  } else if (hasAudio) {
    summary = `${audio.length} audio ${audio.length === 1 ? "asset" : "assets"} added — no artwork yet.`;
    action = toStageAction(bindCreativeAction("add-artwork", callbacks.onAddAsset));
  } else if (hasArtwork) {
    summary = "Artwork added — no audio yet.";
    action = { label: "Add Audio", icon: "🎧", onClick: callbacks.onAddAsset };
  } else {
    summary = "No audio or artwork added to this project yet.";
    action = { label: "Add Audio", icon: "🎧", onClick: callbacks.onAddAsset };
  }

  return { id: "production", title: "Production", status, summary, action };
}

function buildReleaseManifestStage(
  latestRelease: Release | null,
  manifestCompleteness: { completeFieldCount: number; totalFieldCount: number; completeness: "complete" | "incomplete" } | null,
  callbacks: CreativePipelineCallbacks,
): PipelineStage {
  if (!latestRelease || !manifestCompleteness) {
    return {
      id: "release-manifest",
      title: "Release Manifest",
      status: "not-started",
      summary: "No release planned yet.",
      action: toStageAction(bindCreativeAction("create-release", callbacks.onCreateRelease)),
    };
  }

  const isComplete = manifestCompleteness.completeness === "complete";
  return {
    id: "release-manifest",
    title: "Release Manifest",
    status: isComplete ? "complete" : "in-progress",
    summary: `${manifestCompleteness.completeFieldCount} of ${manifestCompleteness.totalFieldCount} manifest fields complete.`,
    action: {
      label: "Open Release Manifest",
      icon: "📄",
      onClick: () => callbacks.onOpenReleaseManifest(latestRelease.id),
    },
  };
}

function buildTranslationStage(
  latestRelease: Release | null,
  manifestCompleteness: { completeFieldCount: number; totalFieldCount: number; completeness: "complete" | "incomplete" } | null,
  callbacks: CreativePipelineCallbacks,
): PipelineStage {
  if (!latestRelease || !manifestCompleteness) {
    return {
      id: "translation",
      title: "Translation",
      status: "not-started",
      summary: "Nothing to translate until a release exists.",
      action: null,
    };
  }

  // Translation's own completeness is never computed separately — a
  // translation can only ever be as complete as the manifest it faithfully
  // represents, so this stage simply carries the Manifest stage's own
  // already-computed fact forward rather than re-deriving it.
  const isComplete = manifestCompleteness.completeness === "complete";
  return {
    id: "translation",
    title: "Translation",
    status: isComplete ? "complete" : "in-progress",
    summary: isComplete
      ? "release.json is ready to export."
      : `release.json will note ${manifestCompleteness.totalFieldCount - manifestCompleteness.completeFieldCount} missing field(s).`,
    action: {
      label: "Export as release.json",
      icon: "🔁",
      onClick: () => callbacks.onOpenReleaseTranslation(latestRelease.id),
    },
  };
}

function buildPublishedStage(latestRelease: Release | null): PipelineStage {
  if (!latestRelease) {
    return {
      id: "published",
      title: "Published",
      status: "not-started",
      summary: "No release planned yet.",
      action: null,
    };
  }

  const isReleased = latestRelease.status === "Released";
  return {
    id: "published",
    title: "Published",
    // Deliberately never "complete" for a Scheduled/Planned/Archived
    // release — only Release's own existing "Released" status counts,
    // exactly as it already means everywhere else in Forge.
    status: isReleased ? "complete" : "in-progress",
    summary: isReleased
      ? `Marked Released on ${latestRelease.releaseDate.toLocaleDateString()}.`
      : `Currently ${latestRelease.status}.`,
    // No action: marking a release as Released isn't an existing Forge
    // capability (that's Publishing — explicitly future work, not
    // implemented this sprint) — an honestly empty recommendation, not an
    // invented one.
    action: null,
  };
}

// The one composition this sprint adds. `project` and `context` together
// already carry everything needed. `identity` is only used the same way
// Release Manifest already uses it — to resolve an Artist name if a
// release's manifest needs building.
export function buildCreativePipeline(
  project: Project,
  identity: Identity,
  context: DiscoveryContext,
  activities: Activity[],
  callbacks: CreativePipelineCallbacks,
): CreativePipeline {
  // Reused completely unmodified — the same grouping Music Workspace and
  // Release Manifest already both build their own views from.
  const workspace = buildMusicWorkspace(project, context, activities);

  const promptVersions = workspace.notes.filter(isPromptVersion);
  const researchNotes = workspace.notes.filter((entry) => !isPromptVersion(entry));

  // The project's own most relevant release — the same "newest release
  // date first" ordering useReleases.ts already sorts by, so "latest"
  // means the same thing here as it does everywhere else releases are
  // shown.
  const latestRelease =
    [...workspace.releases].sort((a, b) => b.releaseDate.getTime() - a.releaseDate.getTime())[0] ?? null;

  const manifestCompleteness = latestRelease
    ? (() => {
        const manifest = buildReleaseManifest(latestRelease, project, identity, context, activities);
        return {
          completeFieldCount: manifest.completeFieldCount,
          totalFieldCount: manifest.totalFieldCount,
          completeness: manifest.completeness,
        };
      })()
    : null;

  const stages: PipelineStage[] = [
    buildResearchStage(researchNotes, callbacks),
    buildPromptStage(promptVersions, project, callbacks),
    buildProductionStage(workspace.audio, workspace.artwork, callbacks),
    buildReleaseManifestStage(latestRelease, manifestCompleteness, callbacks),
    buildTranslationStage(latestRelease, manifestCompleteness, callbacks),
    buildPublishedStage(latestRelease),
  ];

  const currentStage = stages.find((stage) => stage.status !== "complete") ?? null;

  return { project, stages, currentStage };
}
