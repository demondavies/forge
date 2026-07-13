import type { KnowledgeEntry, PlannedTrack, Project, PromptAttribution } from "../../types";
import KnowledgeList from "../Knowledge/KnowledgeList";
import "./PromptAttribution.css";

interface AttributedPromptsPanelProps {
  track: PlannedTrack;
  project: Project;
  knowledgeEntries: KnowledgeEntry[];
  attributions: PromptAttribution[];
  onOpenKnowledgeEntry: (id: string) => void;
}

// Track Workspace's own "Album-Level Prompt Versions" section (see
// hooks/trackWorkspace.ts) exists because, until this sprint, Forge had no
// honest way to know which prompt was written for which track — so it
// correctly falls back to showing every prompt in the album. This panel is
// the proof that attribution changes what a creator can see: it shows only
// the prompt versions explicitly declared, in Prompt Studio's own "Target
// Track" choice, as written for *this* track — nothing inferred, nothing
// guessed. Rendered here, as a sibling beside TrackWorkspaceView, rather
// than inside it: Track Workspace is off-limits to modify this sprint, the
// same reason every other off-limits-host sprint's addition has lived in
// Workspace.tsx instead.
function AttributedPromptsPanel({
  track,
  project,
  knowledgeEntries,
  attributions,
  onOpenKnowledgeEntry,
}: AttributedPromptsPanelProps) {
  const attributedIds = new Set(
    attributions.filter((attribution) => attribution.trackId === track.id).map((attribution) => attribution.promptVersionId),
  );
  const attributedVersions = knowledgeEntries.filter((entry) => attributedIds.has(entry.id));

  // Graceful Disappearance: no attributed prompts yet, nothing to show —
  // Track Workspace's own "Album-Level Prompt Versions" section already
  // covers the honest fallback.
  if (attributedVersions.length === 0) return null;

  return (
    <div className="track-attributed-prompts">
      <h3 className="track-attributed-prompts-title">🎯 Track Prompt Versions</h3>
      <p className="track-attributed-prompts-subtitle">
        Explicitly written for "{track.title}" — declared in Prompt Studio, not inferred.
      </p>
      <KnowledgeList
        entries={attributedVersions}
        projects={[project]}
        selectedEntryId={null}
        onSelect={onOpenKnowledgeEntry}
      />
    </div>
  );
}

export default AttributedPromptsPanel;
