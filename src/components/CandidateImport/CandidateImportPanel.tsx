import { useState } from "react";
import type { CreativeExecution, KnowledgeEntry, PlannedTrack } from "../../types";
import { resolveExecutionTrack } from "../../hooks/trackQueueAttribution";
import "./CandidateImport.css";

export interface ImportCandidatesResult {
  imported: number;
  message: string;
}

interface CandidateImportPanelProps {
  track: PlannedTrack;
  executions: CreativeExecution[];
  plannedTracks: PlannedTrack[];
  knowledgeEntries: KnowledgeEntry[];
  getAttributedTrackId: (promptVersionId: string) => string | null;
  onImportCandidates: (execution: CreativeExecution) => Promise<ImportCandidatesResult>;
}

// The Candidate Import Engine's one visible surface — rendered as a
// sibling above Candidate Review's own panel (reusing the exact same
// track/execution lookup, via resolveExecutionTrack, completely
// unmodified, from the Track Queue Attribution sprint), rather than
// inside it: Candidate Review is off-limits to modify this sprint. Once
// an import succeeds, the new Candidates it creates need no display code
// here at all — they simply appear inside CandidateReviewPanel's own
// existing, unmodified list, the moment it re-renders, because that panel
// already shows every Candidate matching an execution regardless of how
// it came to exist.
//
// Asking a provider "what have you got" is a real, honest network-shaped
// question (see requestExecutionReport in executionProviders.ts) — this
// component shows exactly what comes back, including "nothing yet,"
// never a fake success.
function CandidateImportPanel({
  track,
  executions,
  plannedTracks,
  knowledgeEntries,
  getAttributedTrackId,
  onImportCandidates,
}: CandidateImportPanelProps) {
  const [runningId, setRunningId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Record<string, string>>({});

  const trackExecutions = executions.filter(
    (execution) => resolveExecutionTrack(execution, getAttributedTrackId, plannedTracks)?.id === track.id,
  );

  if (trackExecutions.length === 0) return null;

  async function handleImport(execution: CreativeExecution) {
    setRunningId(execution.id);
    const result = await onImportCandidates(execution);
    setMessages((current) => ({ ...current, [execution.id]: result.message }));
    setRunningId(null);
  }

  return (
    <div className="candidate-import">
      <h3 className="candidate-import-title">⬇️ Candidate Import</h3>
      <p className="candidate-import-subtitle">
        Ask "{track.title}"'s own executions what their provider has produced so far — a completed execution's
        outputs become Candidates here, ready for review below. Nothing is ever promoted to an Asset by this step.
      </p>

      {trackExecutions.map((execution) => {
        const promptVersion = knowledgeEntries.find((entry) => entry.id === execution.promptVersionId);
        return (
          <div key={execution.id} className="candidate-import-row">
            <span className="candidate-import-label">{promptVersion?.title ?? "Queued execution"}</span>
            <button
              className="secondary candidate-import-btn"
              disabled={runningId === execution.id}
              onClick={() => handleImport(execution)}
            >
              {runningId === execution.id ? "Checking…" : "⬇️ Import Provider Outputs"}
            </button>
            {messages[execution.id] && <p className="field-label candidate-import-message">{messages[execution.id]}</p>}
          </div>
        );
      })}
    </div>
  );
}

export default CandidateImportPanel;
