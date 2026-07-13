// Producer Companion — Creative Intelligence Phase 3. Observes one track's
// complete creative journey: what has been tried, what has been kept, what
// has been rejected, and where there may be opportunities to explore next.
//
// Scope is deliberately narrower than Album Companion's album-wide view:
// every fact here is either attributable to this specific track (via the
// PromptAttribution chain: Track → PromptAttribution → CreativeExecution
// → Candidate) or comes from the album level with an honest label. No
// track-level data is ever inferred from naming, timestamps, or guesswork.
//
// Reuses analyzeCreativeHistory from promptCoach.ts — the same engine
// Prompt Coach and Album Companion both use, scoped to the candidates and
// executions that can be honestly attributed to this track.
import type {
  Candidate,
  CreativeExecution,
  KnowledgeEntry,
  PlannedTrack,
  Project,
  PromptAttribution,
} from "../types";
import { analyzeCreativeHistory, type PromptCoachAnalysis } from "./promptCoach";

export interface ProducerCompanionAnalysis {
  // True when at least one PromptAttribution exists for this track —
  // without it, nothing below can be honestly attributed.
  hasAttributedData: boolean;

  // Track-attributed counts (via attribution chain only).
  trackPromptVersionCount: number;
  trackGenerationCount: number;
  totalCandidates: number;
  approvedCandidates: number;
  rejectedCandidates: number;
  pendingCandidates: number;

  // Pending candidates by title, so suggestions can name them.
  pendingCandidateTitles: string[];

  // Phrase and theme analysis via Prompt Coach engine, scoped to this
  // track's own candidates.
  noteThemes: string[];
  approvedPhrases: string[];
  rejectedPhrases: string[];

  // Whether the track appears to be looping: multiple generations
  // reviewed and rejected, with no approval and nothing pending.
  isLooping: boolean;

  observations: string[];
  suggestions: string[];

  // True when enough data exists to show anything useful.
  hasData: boolean;
}

// Resolve which executions and candidates can be honestly attributed to
// this track via the PromptAttribution chain.
function resolveTrackData(
  track: PlannedTrack,
  project: Project,
  executions: CreativeExecution[],
  candidates: Candidate[],
  attributions: PromptAttribution[],
): {
  trackAttributions: PromptAttribution[];
  trackExecutions: CreativeExecution[];
  trackCandidates: Candidate[];
} {
  const trackAttributions = attributions.filter((a) => a.trackId === track.id);
  const attributedVersionIds = new Set(trackAttributions.map((a) => a.promptVersionId));

  const trackExecutions = executions.filter(
    (e) => e.projectId === project.id && attributedVersionIds.has(e.promptVersionId),
  );
  const trackExecIds = new Set(trackExecutions.map((e) => e.id));
  const trackCandidates = candidates.filter((c) => trackExecIds.has(c.executionId));

  return { trackAttributions, trackExecutions, trackCandidates };
}

export function analyzeTrack(
  track: PlannedTrack,
  project: Project,
  executions: CreativeExecution[],
  candidates: Candidate[],
  knowledgeEntries: KnowledgeEntry[],
  attributions: PromptAttribution[],
): ProducerCompanionAnalysis {
  const { trackAttributions, trackExecutions, trackCandidates } = resolveTrackData(
    track,
    project,
    executions,
    candidates,
    attributions,
  );

  const hasAttributedData = trackAttributions.length > 0;

  const approvedCandidates = trackCandidates.filter((c) => c.status === "Approved").length;
  const rejectedCandidates = trackCandidates.filter((c) => c.status === "Rejected").length;
  const pendingCandidates = trackCandidates.filter((c) => c.status === "Pending Review").length;
  const pendingCandidateTitles = trackCandidates
    .filter((c) => c.status === "Pending Review")
    .map((c) => c.title);

  // Creative memory via Prompt Coach engine, scoped to this track's data.
  const projectKnowledge = knowledgeEntries.filter((e) => e.projectId === project.id);
  const coachAnalysis: PromptCoachAnalysis = analyzeCreativeHistory(
    trackCandidates,
    trackExecutions,
    projectKnowledge,
  );

  // Looping: multiple generations, all reviewed, all rejected, nothing
  // pending, nothing approved. The creator has been here before.
  const isLooping =
    trackExecutions.length >= 3 &&
    approvedCandidates === 0 &&
    pendingCandidates === 0 &&
    rejectedCandidates >= 3;

  // --- Observations ---
  // Specific, grounded, never invented. Each one only appears when the
  // data that supports it actually exists.
  const observations: string[] = [];

  if (hasAttributedData) {
    if (trackExecutions.length >= 3 && approvedCandidates === 0) {
      observations.push(
        `${trackExecutions.length} version${trackExecutions.length === 1 ? "" : "s"} have been generated without an approved candidate.`,
      );
    }

    if (pendingCandidates > 0) {
      observations.push(
        pendingCandidates === 1
          ? `One candidate remains unreviewed.`
          : `${pendingCandidates} candidates remain unreviewed.`,
      );
    }

    if (isLooping) {
      observations.push(`All generated versions have been reviewed and rejected. This track may benefit from a fresh approach.`);
    }

    if (coachAnalysis.noteThemes.length > 0) {
      observations.push(`Your notes for this track repeatedly mention "${coachAnalysis.noteThemes[0]}".`);
    }

    if (coachAnalysis.approvedPhrases.length > 0 && approvedCandidates > 0) {
      observations.push(`Approved takes consistently reference "${coachAnalysis.approvedPhrases[0]}".`);
    }

    if (coachAnalysis.rejectedPhrases.length > 0 && rejectedCandidates > 1) {
      observations.push(`Rejected takes frequently included "${coachAnalysis.rejectedPhrases[0]}".`);
    }
  } else {
    // No attributions — surface this honestly rather than silently.
    const albumExecCount = executions.filter((e) => e.projectId === project.id).length;
    if (albumExecCount > 0) {
      observations.push(
        `${albumExecCount} album-level generation${albumExecCount === 1 ? "" : "s"} exist but have not been attributed to this track. Use "Target Track" in Prompt Studio to link them.`,
      );
    }
  }

  // --- Suggestions ---
  // Humble and action-oriented. Never recommend changing artistic intent.
  const suggestions: string[] = [];

  if (hasAttributedData) {
    if (pendingCandidates >= 2 && pendingCandidateTitles.length >= 2) {
      suggestions.push(
        `Consider comparing "${pendingCandidateTitles[0]}" and "${pendingCandidateTitles[1]}" before generating another version.`,
      );
    } else if (pendingCandidates === 1) {
      suggestions.push(`Review "${pendingCandidateTitles[0]}" before generating a new version.`);
    }

    if (isLooping) {
      suggestions.push(
        `Several versions have been generated and rejected. Consider revisiting earlier takes or significantly changing the prompt approach.`,
      );
    }

    if (coachAnalysis.noteThemes.length > 0 && suggestions.length < 3) {
      suggestions.push(
        `Your notes consistently emphasise "${coachAnalysis.noteThemes[0]}". Consider naming it directly in the next prompt.`,
      );
    }

    if (approvedCandidates > 0 && coachAnalysis.approvedPhrases.length >= 2 && suggestions.length < 3) {
      suggestions.push(
        `"${coachAnalysis.approvedPhrases[0]}" appears in every approved take. Consider anchoring future versions around it.`,
      );
    }
  }

  const hasData =
    hasAttributedData ||
    trackCandidates.length > 0 ||
    executions.some((e) => e.projectId === project.id);

  return {
    hasAttributedData,
    trackPromptVersionCount: trackAttributions.length,
    trackGenerationCount: trackExecutions.length,
    totalCandidates: trackCandidates.length,
    approvedCandidates,
    rejectedCandidates,
    pendingCandidates,
    pendingCandidateTitles,
    noteThemes: coachAnalysis.noteThemes,
    approvedPhrases: coachAnalysis.approvedPhrases,
    rejectedPhrases: coachAnalysis.rejectedPhrases,
    isLooping,
    observations,
    suggestions,
    hasData,
  };
}
