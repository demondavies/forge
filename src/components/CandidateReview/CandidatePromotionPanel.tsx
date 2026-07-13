import type { Candidate } from "../../types";
import "./CandidateReview.css";

interface CandidatePromotionPanelProps {
  candidate: Candidate;
  onSetCurrentBest: (candidateId: string) => void;
  onSetAlbumVersion: (candidateId: string) => void;
}

function CandidatePromotionPanel({ candidate, onSetCurrentBest, onSetAlbumVersion }: CandidatePromotionPanelProps) {
  return (
    <div className="candidate-promotion">
      <p className="candidate-promotion-label">Promotion</p>
      <div className="candidate-promotion-actions">
        <button
          className={`secondary candidate-promotion-btn${candidate.isCurrentBest ? " candidate-promotion-btn--best" : ""}`}
          onClick={() => onSetCurrentBest(candidate.id)}
        >
          ⭐ {candidate.isCurrentBest ? "Current Best" : "Set as Current Best"}
        </button>
        <button
          className={`secondary candidate-promotion-btn${candidate.isAlbumVersion ? " candidate-promotion-btn--album" : ""}`}
          onClick={() => onSetAlbumVersion(candidate.id)}
        >
          🎵 {candidate.isAlbumVersion ? "Album Version" : "Set as Album Version"}
        </button>
      </div>
      {!candidate.isCurrentBest && !candidate.isAlbumVersion && (
        <p className="candidate-promotion-exploring">
          🔄 Still exploring — approval means you like it, not that you're finished.
        </p>
      )}
    </div>
  );
}

export default CandidatePromotionPanel;
