import type { CreativeExecution, KnowledgeEntry, PlannedTrack, Project } from "../../types";
import { groupExecutionsByTrack } from "../../hooks/trackQueueAttribution";
import "./TrackQueueAttribution.css";

interface QueueTrackGroupsViewProps {
  project: Project;
  executions: CreativeExecution[];
  plannedTracks: PlannedTrack[];
  knowledgeEntries: KnowledgeEntry[];
  getAttributedTrackId: (promptVersionId: string) => string | null;
  onOpenKnowledgeEntry: (id: string) => void;
}

// Studio Queue's own display (see this sprint's report for why that file
// isn't touched directly) already shows each queued item's requested
// provider and stored status. This panel adds exactly the one new fact
// this sprint composes — which track (if any) requested each execution —
// by grouping the same queued executions Studio Queue already lists,
// never duplicating or re-deciding anything about them. Rendered here, as
// a sibling below StudioQueueView, rather than inside it: Studio Queue is
// off-limits to modify this sprint.
function QueueTrackGroupsView({
  project,
  executions,
  plannedTracks,
  knowledgeEntries,
  getAttributedTrackId,
  onOpenKnowledgeEntry,
}: QueueTrackGroupsViewProps) {
  const projectExecutions = executions.filter((execution) => execution.projectId === project.id);
  const projectTracks = plannedTracks.filter((track) => track.projectId === project.id);

  // Graceful Disappearance: nothing queued, nothing to group.
  if (projectExecutions.length === 0) return null;

  const groups = groupExecutionsByTrack(projectExecutions, getAttributedTrackId, projectTracks);

  return (
    <div className="queue-track-groups">
      <h4 className="queue-track-groups-title">🎯 Queue by Track</h4>
      <p className="queue-track-groups-subtitle">
        Each queued execution inherits its track from its own attributed prompt version — never chosen manually.
      </p>
      {groups.map((group) => (
        <div key={group.track ? group.track.id : "album-wide"} className="queue-track-group">
          <h5 className="queue-track-group-title">
            {group.track ? `🎵 ${group.track.title}` : "📀 Album-wide"}
          </h5>
          {group.executions.map((execution) => {
            const promptVersion = knowledgeEntries.find((entry) => entry.id === execution.promptVersionId);
            return (
              <button
                key={execution.id}
                className="queue-track-execution-row"
                onClick={() => onOpenKnowledgeEntry(execution.promptVersionId)}
              >
                <span className="queue-track-execution-label">{promptVersion?.title ?? "Queued execution"}</span>
                <span
                  className={`badge queue-track-status-badge queue-track-status-${execution.status.toLowerCase()}`}
                >
                  {execution.status}
                </span>
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}

export default QueueTrackGroupsView;
