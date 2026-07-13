import { useState, Fragment } from "react";
import type { Candidate, CreativeExecution, KnowledgeEntry, PlannedTrack } from "../../types";
import { resolveExecutionTrack } from "../../hooks/trackQueueAttribution";
import type { AddCandidateInput, AddCandidateResult } from "../../hooks/useCandidates";
import { useCandidatePlayback } from "../../hooks/useCandidatePlayback";
import { formatDate } from "../../utils/formatDate";
import CandidatePromotionPanel from "./CandidatePromotionPanel";
import "./CandidateReview.css";

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

interface CandidateReviewPanelProps {
  track: PlannedTrack;
  executions: CreativeExecution[];
  plannedTracks: PlannedTrack[];
  knowledgeEntries: KnowledgeEntry[];
  candidates: Candidate[];
  getAttributedTrackId: (promptVersionId: string) => string | null;
  onAddCandidate: (input: AddCandidateInput) => AddCandidateResult;
  onAddNote: (candidateId: string, text: string) => void;
  onApproveCandidate: (candidate: Candidate) => void;
  onRejectCandidate: (id: string) => void;
  onSetCurrentBest: (candidateId: string) => void;
  onSetAlbumVersion: (candidateId: string) => void;
  onOpenKnowledgeEntry: (id: string) => void;
  onOpenAsset: (id: string) => void;
  onLog?: (message: string) => void;
}

// The Candidate Comparison Engine: a flat listening room where every take
// for this track appears in creation order. The creator can click between
// them freely — switching resumes each candidate from where they last left
// it, as long as the panel stays mounted. Approve/Reject remain on each
// card. The Add forms live below the comparison list so they don't compete
// with the evaluation workflow.
function CandidateReviewPanel({
  track,
  executions,
  plannedTracks,
  knowledgeEntries,
  candidates,
  getAttributedTrackId,
  onAddCandidate,
  onAddNote,
  onApproveCandidate,
  onRejectCandidate,
  onSetCurrentBest,
  onSetAlbumVersion,
  onOpenKnowledgeEntry,
  onOpenAsset,
  onLog,
}: CandidateReviewPanelProps) {
  const [draftTitles, setDraftTitles] = useState<Record<string, string>>({});
  const [messages, setMessages] = useState<Record<string, string | null>>({});
  const [draftNotes, setDraftNotes] = useState<Record<string, string>>({});
  const { activeCandidateId, isPlaying, currentTime, duration, play, pause, stop } =
    useCandidatePlayback(onLog);

  const trackExecutions = executions.filter(
    (execution) => resolveExecutionTrack(execution, getAttributedTrackId, plannedTracks)?.id === track.id,
  );

  if (trackExecutions.length === 0) return null;

  // All candidates for this track across every execution, in creation order.
  // Each item carries its execution so the card can show provenance and
  // route the Approve/Reject actions correctly.
  const comparisonCandidates = trackExecutions
    .flatMap((execution) =>
      candidates
        .filter((c) => c.executionId === execution.id)
        .map((c) => ({ candidate: c, execution })),
    )
    .sort((a, b) => a.candidate.createdAt.getTime() - b.candidate.createdAt.getTime());

  function handleAdd(executionId: string) {
    const title = draftTitles[executionId] ?? "";
    const result = onAddCandidate({ executionId, title });
    setMessages((current) => ({ ...current, [executionId]: result.error }));
    if (!result.error) {
      setDraftTitles((current) => ({ ...current, [executionId]: "" }));
    }
  }

  return (
    <div className="candidate-review">
      <h3 className="candidate-review-title">🗳️ Candidate Review</h3>
      <p className="candidate-review-subtitle">
        Which version of "{track.title}" survives? You decide.
      </p>

      {comparisonCandidates.length > 0 ? (
        <div className="candidate-comparison-list">
          {comparisonCandidates.map(({ candidate, execution }, index) => {
            const isActive = activeCandidateId === candidate.id;
            const isThisPlaying = isActive && isPlaying;
            const promptVersion = knowledgeEntries.find((e) => e.id === execution.promptVersionId);

            return (
              <Fragment key={candidate.id}>
                <div className={`candidate-card${isActive ? " candidate-card--playing" : ""}`}>
                  <div className="candidate-card-header">
                    <span className="candidate-title">{candidate.title}</span>
                    <span
                      className={`badge candidate-status-badge candidate-status-${candidate.status.toLowerCase().replace(" ", "-")}`}
                    >
                      {candidate.status}
                    </span>
                  </div>
                  <p className="candidate-meta">
                    <button
                      className="candidate-execution-link"
                      onClick={() => onOpenKnowledgeEntry(execution.promptVersionId)}
                    >
                      {promptVersion?.title ?? "Queued execution"} →
                    </button>
                    {" · "}
                    {execution.provider} · {formatDate(candidate.createdAt)}
                  </p>

                  {candidate.filePath ? (
                    <div className="candidate-playback">
                      <div className="candidate-playback-controls">
                        {isThisPlaying ? (
                          <button className="secondary candidate-play-btn" onClick={pause}>
                            ⏸ Pause
                          </button>
                        ) : (
                          <button
                            className="secondary candidate-play-btn"
                            onClick={() => play(candidate)}
                          >
                            ▶ Play
                          </button>
                        )}
                        <button className="secondary candidate-play-btn" onClick={stop}>
                          ■ Stop
                        </button>
                      </div>
                      {isActive && (
                        <p className="candidate-playback-progress">
                          {formatTime(currentTime)} / {formatTime(duration)}
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="candidate-preview-placeholder">🎵 Preview not available</div>
                  )}

                  {candidate.status === "Pending Review" && (
                    <div className="candidate-actions">
                      <button className="secondary" onClick={() => onRejectCandidate(candidate.id)}>
                        ✕ Reject
                      </button>
                      <button onClick={() => onApproveCandidate(candidate)}>✓ Approve</button>
                    </div>
                  )}
                  {candidate.status === "Approved" && candidate.approvedAssetId && (
                    <button
                      className="secondary candidate-approved-link"
                      onClick={() => onOpenAsset(candidate.approvedAssetId as string)}
                    >
                      🎧 View Approved Audio →
                    </button>
                  )}
                  {candidate.status === "Approved" && (
                    <CandidatePromotionPanel
                      candidate={candidate}
                      onSetCurrentBest={onSetCurrentBest}
                      onSetAlbumVersion={onSetAlbumVersion}
                    />
                  )}

                  <div className="candidate-notes">
                    <p className="candidate-notes-label">Notes</p>
                    <div className="candidate-notes-input-row">
                      <input
                        type="text"
                        className="candidate-notes-input"
                        placeholder="Add a note…"
                        value={draftNotes[candidate.id] ?? ""}
                        onChange={(e) =>
                          setDraftNotes((curr) => ({ ...curr, [candidate.id]: e.target.value }))
                        }
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            onAddNote(candidate.id, draftNotes[candidate.id] ?? "");
                            setDraftNotes((curr) => ({ ...curr, [candidate.id]: "" }));
                          }
                        }}
                      />
                      <button
                        className="secondary candidate-notes-add-btn"
                        onClick={() => {
                          onAddNote(candidate.id, draftNotes[candidate.id] ?? "");
                          setDraftNotes((curr) => ({ ...curr, [candidate.id]: "" }));
                        }}
                      >
                        Add
                      </button>
                    </div>
                    {candidate.notes.length > 0 && (
                      <ul className="candidate-notes-list">
                        {[...candidate.notes].reverse().map((note) => (
                          <li key={note.id} className="candidate-note-item">
                            <span className="candidate-note-text">"{note.text}"</span>
                            <span className="candidate-note-time">{formatDate(note.createdAt)}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
                {index < comparisonCandidates.length - 1 && (
                  <hr className="candidate-divider" />
                )}
              </Fragment>
            );
          })}
        </div>
      ) : (
        <p className="field-label">
          No candidates yet — generate a take and it will appear here automatically.
        </p>
      )}

      <div className="candidate-add-section">
        <p className="candidate-add-section-label">Add a candidate</p>
        {trackExecutions.map((execution) => {
          const promptVersion = knowledgeEntries.find((e) => e.id === execution.promptVersionId);
          return (
            <div key={execution.id} className="candidate-execution-group">
              <button
                className="candidate-execution-header"
                onClick={() => onOpenKnowledgeEntry(execution.promptVersionId)}
              >
                {promptVersion?.title ?? "Queued execution"} →
              </button>
              <div className="candidate-add-row">
                <input
                  type="text"
                  placeholder="Candidate title (e.g. Take 1)"
                  value={draftTitles[execution.id] ?? ""}
                  onChange={(event) =>
                    setDraftTitles((current) => ({
                      ...current,
                      [execution.id]: event.target.value,
                    }))
                  }
                />
                <button className="secondary" onClick={() => handleAdd(execution.id)}>
                  + Add Candidate
                </button>
              </div>
              {messages[execution.id] && <p className="field-label">{messages[execution.id]}</p>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default CandidateReviewPanel;
