import { useState } from "react";
import type { PlannedTrack } from "../../types";
import "./GenerationRequest.css";

export interface GenerateResult {
  queued: boolean;
  message: string;
}

interface GenerateTrackPanelProps {
  track: PlannedTrack;
  onGenerateTrack: (track: PlannedTrack) => GenerateResult;
}

// Generation Request Engine's one entry point inside Track Workspace —
// rendered as a sibling beside TrackWorkspaceView/CandidateReviewPanel,
// rather than inside either of them: Track Workspace is off-limits to
// modify this sprint. A creator only ever sees one button and, after
// clicking it, one honest sentence about what happened — never a
// provider picker. Which prompt version gets queued and which provider
// would fulfil it are both resolved behind this button (see App.tsx's
// handleGenerateTrack), never chosen here.
function GenerateTrackPanel({ track, onGenerateTrack }: GenerateTrackPanelProps) {
  const [message, setMessage] = useState<string | null>(null);

  function handleClick() {
    const result = onGenerateTrack(track);
    setMessage(result.message);
  }

  return (
    <div className="generation-request">
      <button className="generation-request-btn" onClick={handleClick}>
        🎬 Generate Track
      </button>
      {message && <p className="field-label">{message}</p>}
    </div>
  );
}

export default GenerateTrackPanel;
