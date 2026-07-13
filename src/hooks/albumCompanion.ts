// Album Companion — Creative Intelligence Phase 2. Treats the album as a
// complete work rather than a pile of individual tracks. Every observation
// here is derived from facts already present inside Forge: PlannedTracks,
// CreativeExecutions, Candidates, KnowledgeEntries, and PromptAttributions.
// No LLMs, no embeddings, no external APIs, no scoring, no sentiment.
//
// Reuses analyzeCreativeHistory from promptCoach.ts rather than
// duplicating its phrase/word extraction — the same logic that powers
// Prompt Coach's per-session view is what the Album Companion uses for the
// album's creative memory section, scoped to the current project.
import type {
  Candidate,
  CreativeExecution,
  KnowledgeEntry,
  PromptAttribution,
} from "../types";
import type { AlbumProductionComposition } from "./albumProduction";
import { analyzeCreativeHistory, type PromptCoachAnalysis } from "./promptCoach";

export interface AlbumProgressStats {
  plannedCount: number;
  tracksWithAudio: number;
  tracksGenerated: number;
  tracksWithApprovedCandidates: number;
  tracksAwaitingReview: number;
  tracksWithCurrentBest: number;
  tracksWithAlbumVersion: number;
  tracksFinished: number;
}

export interface AlbumCreativeActivity {
  totalPromptVersions: number;
  totalGenerations: number;
  totalCandidates: number;
  approvedCandidates: number;
  rejectedCandidates: number;
  pendingCandidates: number;
}

export interface AlbumCreativeMemory {
  noteThemes: string[];
  approvedPhrases: string[];
  rejectedPhrases: string[];
}

export interface AlbumCompanionAnalysis {
  progress: AlbumProgressStats;
  activity: AlbumCreativeActivity;
  memory: AlbumCreativeMemory;
  observations: string[];
  suggestions: string[];
  hasData: boolean;
}

// Determine which tracks in `album.tracks` have reached each production
// milestone. The attribution chain is the only honest link between a track
// and the executions/candidates produced for it:
//   PlannedTrack → PromptAttribution → CreativeExecution → Candidate
// Tracks with no attribution honestly have no data at these levels; they
// are counted as "not yet generated" regardless of how many album-wide
// executions exist.
function computeTrackMilestones(
  album: AlbumProductionComposition,
  executions: CreativeExecution[],
  candidates: Candidate[],
  attributions: PromptAttribution[],
): { generated: number; withApproved: number; awaitingReview: number; withCurrentBest: number; withAlbumVersion: number } {
  // Build lookups so the per-track loop stays O(tracks) rather than
  // O(tracks × executions × candidates).
  const execsByPromptVersion = new Map<string, CreativeExecution[]>();
  for (const exec of executions) {
    const bucket = execsByPromptVersion.get(exec.promptVersionId) ?? [];
    bucket.push(exec);
    execsByPromptVersion.set(exec.promptVersionId, bucket);
  }

  const approvedExecIds = new Set(
    candidates.filter((c) => c.status === "Approved").map((c) => c.executionId),
  );
  const pendingExecIds = new Set(
    candidates.filter((c) => c.status === "Pending Review").map((c) => c.executionId),
  );
  const currentBestExecIds = new Set(
    candidates.filter((c) => c.isCurrentBest).map((c) => c.executionId),
  );
  const albumVersionExecIds = new Set(
    candidates.filter((c) => c.isAlbumVersion).map((c) => c.executionId),
  );

  let generated = 0;
  let withApproved = 0;
  let awaitingReview = 0;
  let withCurrentBest = 0;
  let withAlbumVersion = 0;

  for (const { track } of album.tracks) {
    const trackAttrs = attributions.filter((a) => a.trackId === track.id);
    const trackExecs = trackAttrs.flatMap(
      (a) => execsByPromptVersion.get(a.promptVersionId) ?? [],
    );

    if (trackExecs.length === 0) continue;
    generated++;

    if (trackExecs.some((e) => approvedExecIds.has(e.id))) withApproved++;
    else if (trackExecs.some((e) => pendingExecIds.has(e.id))) awaitingReview++;

    if (trackExecs.some((e) => currentBestExecIds.has(e.id))) withCurrentBest++;
    if (trackExecs.some((e) => albumVersionExecIds.has(e.id))) withAlbumVersion++;
  }

  return { generated, withApproved, awaitingReview, withCurrentBest, withAlbumVersion };
}

// The one function this module exports. Accepts the already-computed
// AlbumProductionComposition (built by AlbumProductionView before it
// renders — no double-build) plus the three data sets that composition
// doesn't include: Candidates, PromptAttributions, and the full
// KnowledgeEntry list (needed so analyzeCreativeHistory can resolve which
// entries are saved Prompt Versions for phrase extraction).
export function analyzeAlbum(
  album: AlbumProductionComposition,
  executions: CreativeExecution[],
  candidates: Candidate[],
  knowledgeEntries: KnowledgeEntry[],
  attributions: PromptAttribution[],
): AlbumCompanionAnalysis {
  const { project } = album;

  // Scope all collections to this project only.
  const projectExecutions = executions.filter((e) => e.projectId === project.id);
  const projectExecIds = new Set(projectExecutions.map((e) => e.id));
  const projectCandidates = candidates.filter((c) => projectExecIds.has(c.executionId));
  const projectKnowledge = knowledgeEntries.filter((e) => e.projectId === project.id);

  // --- Production Progress ---
  const tracksWithAudio = album.tracks.filter((t) => t.hasAudio).length;
  const tracksFinished = album.tracks.filter((t) => !!t.track.completedAt).length;
  const { generated, withApproved, awaitingReview, withCurrentBest, withAlbumVersion } = computeTrackMilestones(
    album,
    projectExecutions,
    projectCandidates,
    attributions,
  );

  // --- Creative Activity ---
  const approvedCount = projectCandidates.filter((c) => c.status === "Approved").length;
  const rejectedCount = projectCandidates.filter((c) => c.status === "Rejected").length;
  const pendingCount = projectCandidates.filter((c) => c.status === "Pending Review").length;

  // --- Creative Memory (Prompt Coach engine, project-scoped) ---
  const coachAnalysis: PromptCoachAnalysis = analyzeCreativeHistory(
    projectCandidates,
    projectExecutions,
    projectKnowledge,
  );

  // --- Observations ---
  // Each is a plain, specific fact supported directly by the data above.
  // None guesses at artistic intent.
  const observations: string[] = [];

  if (tracksFinished > 0) {
    observations.push(
      tracksFinished === album.tracks.length
        ? `All ${album.tracks.length} tracks are now complete.`
        : `${tracksFinished} of ${album.tracks.length} tracks are now complete.`,
    );
  }

  const tracksNeverGenerated = album.tracks.length - generated;
  if (tracksNeverGenerated > 0 && album.tracks.length > 0) {
    observations.push(
      tracksNeverGenerated === 1
        ? `One planned track has never been generated.`
        : `${tracksNeverGenerated} planned tracks have never been generated.`,
    );
  }

  if (pendingCount > 0) {
    observations.push(
      pendingCount === 1
        ? `One candidate remains unreviewed.`
        : `${pendingCount} candidates remain unreviewed.`,
    );
  }

  if (coachAnalysis.noteThemes.length > 0) {
    observations.push(`Most listening notes mention "${coachAnalysis.noteThemes[0]}".`);
  }

  if (coachAnalysis.approvedPhrases.length > 0) {
    observations.push(`Most approved prompts reference "${coachAnalysis.approvedPhrases[0]}".`);
  }

  if (
    album.tracks.length > 0 &&
    withApproved === 0 &&
    projectCandidates.length > 0
  ) {
    observations.push(`No track has an approved candidate yet.`);
  } else if (withApproved > 0 && withApproved < album.tracks.length) {
    const remaining = album.tracks.length - withApproved;
    observations.push(
      remaining === 1
        ? `One track still has no approved performance.`
        : `${remaining} tracks still have no approved performance.`,
    );
  }

  // --- Suggestions ---
  // Humble, action-oriented. Never recommend changing artistic intent.
  const suggestions: string[] = [];

  if (pendingCount > 0) {
    suggestions.push(
      `Review remaining candidates before generating additional versions.`,
    );
  }

  if (
    album.promptVersionCount > 0 &&
    projectCandidates.length === 0 &&
    projectExecutions.length === 0
  ) {
    suggestions.push(
      `A prompt is saved. Consider queueing a generation to produce the first candidates.`,
    );
  }

  if (tracksNeverGenerated > 0 && album.promptVersionCount > 0) {
    suggestions.push(
      tracksNeverGenerated === 1
        ? `One track has no generation yet. Consider assigning a prompt and queueing it.`
        : `${tracksNeverGenerated} tracks have no generation yet. Consider assigning prompts before generating more album-wide versions.`,
    );
  }

  if (coachAnalysis.noteThemes.length > 0 && suggestions.length < 3) {
    suggestions.push(
      `Your listening notes frequently mention "${coachAnalysis.noteThemes[0]}". Consider naming it directly in the next prompt.`,
    );
  }

  const hasData =
    projectCandidates.length > 0 ||
    projectExecutions.length > 0 ||
    album.promptVersionCount > 0 ||
    album.tracks.length > 0;

  return {
    progress: {
      plannedCount: album.tracks.length,
      tracksWithAudio,
      tracksGenerated: generated,
      tracksWithApprovedCandidates: withApproved,
      tracksAwaitingReview: awaitingReview,
      tracksWithCurrentBest: withCurrentBest,
      tracksWithAlbumVersion: withAlbumVersion,
      tracksFinished,
    },
    activity: {
      totalPromptVersions: album.promptVersionCount,
      totalGenerations: projectExecutions.length,
      totalCandidates: projectCandidates.length,
      approvedCandidates: approvedCount,
      rejectedCandidates: rejectedCount,
      pendingCandidates: pendingCount,
    },
    memory: {
      noteThemes: coachAnalysis.noteThemes,
      approvedPhrases: coachAnalysis.approvedPhrases,
      rejectedPhrases: coachAnalysis.rejectedPhrases,
    },
    observations,
    suggestions,
    hasData,
  };
}
