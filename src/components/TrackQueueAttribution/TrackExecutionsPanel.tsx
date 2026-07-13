import type { CreativeExecution, KnowledgeEntry, PlannedTrack } from "../../types";
import { resolveExecutionTrack } from "../../hooks/trackQueueAttribution";
import "./TrackQueueAttribution.css";

interface TrackExecutionsPanelProps {
  track: PlannedTrack;
  executions: CreativeExecution[];
  plannedTracks: PlannedTrack[];
  knowledgeEntries: KnowledgeEntry[];
  getAttributedTrackId: (promptVersionId: string) => string | null;
  onOpenKnowledgeEntry: (id: string) => void;
}

// Track Workspace's own composition (hooks/trackWorkspace.ts) has no way
// to know which Studio Queue executions belong to this track — it was
// built before Track Queue Attribution existed, and stays unmodified this
// sprint. This panel is the proof that composing CreativeExecution with
// Prompt Attribution answers that honestly: it shows only the executions
// whose own prompt version was explicitly attributed to *this* track.
// Rendered here, as a sibling beside TrackWorkspaceView, rather than
// inside it: Track Workspace is off-limits to modify this sprint.
function TrackExecutionsPanel({
  track,
  executions,
  plannedTracks,
  knowledgeEntries,
  getAttributedTrackId,
  onOpenKnowledgeEntry,
}: TrackExecutionsPanelProps) {
  const trackExecutions = executions.filter(
    (execution) => resolveExecutionTrack(execution, getAttributedTrackId, plannedTracks)?.id === track.id,
  );

  // Graceful Disappearance: nothing queued for this track yet.
  if (trackExecutions.length === 0) return null;

  return (
    <div className="track-queue-attribution">
      <h3 className="track-queue-attribution-title">⚙️ Track Queue</h3>
      <p className="track-queue-attribution-subtitle">
        Executions requested for "{track.title}" — inherited automatically from their own attributed prompt
        version, never chosen manually.
      </p>
      {trackExecutions.map((execution) => {
        const promptVersion = knowledgeEntries.find((entry) => entry.id === execution.promptVersionId);
        return (
          <button
            key={execution.id}
            className="track-queue-execution-row"
            onClick={() => onOpenKnowledgeEntry(execution.promptVersionId)}
          >
            <span className="track-queue-execution-label">{promptVersion?.title ?? "Queued execution"}</span>
            <span
              className={`badge track-queue-status-badge track-queue-status-${execution.status.toLowerCase()}`}
            >
              {execution.status}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export default TrackExecutionsPanel;
