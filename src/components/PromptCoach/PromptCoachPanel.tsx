import type { PromptCoachAnalysis } from "../../hooks/promptCoach";
import "./PromptCoach.css";

interface PromptCoachPanelProps {
  analysis: PromptCoachAnalysis;
}

// Prompt Coach: the first place Forge reflects a creator's own creative
// journey back to them. Every observation here is derived from their own
// approved and rejected Candidates and listening Notes — never invented,
// never generic. The Coach shows what it found (or didn't find) and offers
// one grounded suggestion; the creator decides what to do with it.
function PromptCoachPanel({ analysis }: PromptCoachPanelProps) {
  const { approvedPhrases, rejectedPhrases, noteThemes, suggestion, hasEnoughData } = analysis;

  return (
    <div className="prompt-coach">
      <div className="prompt-coach-header">
        <h3 className="prompt-coach-title">🧠 Prompt Coach</h3>
        <p className="prompt-coach-subtitle">
          Observations from your own creative history — no inference, no invention.
        </p>
      </div>

      {!hasEnoughData ? (
        <p className="prompt-coach-empty">
          Approve or reject some Candidates to start seeing patterns here. The Coach learns
          from what you've already decided, nothing else.
        </p>
      ) : (
        <div className="prompt-coach-body">
          {approvedPhrases.length > 0 && (
            <div className="prompt-coach-section">
              <p className="prompt-coach-section-label">Your approved work frequently includes:</p>
              <ul className="prompt-coach-list">
                {approvedPhrases.map((phrase) => (
                  <li key={phrase} className="prompt-coach-item prompt-coach-item--approved">
                    {phrase}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {rejectedPhrases.length > 0 && (
            <div className="prompt-coach-section">
              <p className="prompt-coach-section-label">Your rejected work frequently includes:</p>
              <ul className="prompt-coach-list">
                {rejectedPhrases.map((phrase) => (
                  <li key={phrase} className="prompt-coach-item prompt-coach-item--rejected">
                    {phrase}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {noteThemes.length > 0 && (
            <div className="prompt-coach-section">
              <p className="prompt-coach-section-label">Recurring themes from your listening notes:</p>
              <ul className="prompt-coach-list">
                {noteThemes.map((theme) => (
                  <li key={theme} className="prompt-coach-item prompt-coach-item--notes">
                    {theme}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {suggestion && (
            <div className="prompt-coach-suggestion">
              <p className="prompt-coach-suggestion-label">Suggestion</p>
              <p className="prompt-coach-suggestion-text">{suggestion}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default PromptCoachPanel;
