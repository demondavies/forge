import type { ProducerCompanionAnalysis } from "../../hooks/producerCompanion";
import "./TrackWorkspace.css";

interface ProducerCompanionPanelProps {
  analysis: ProducerCompanionAnalysis;
  trackTitle: string;
}

function StatRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="producer-companion-stat">
      <span className="producer-companion-stat-value">{value}</span>
      <span className="producer-companion-stat-label">{label}</span>
    </div>
  );
}

function ProducerCompanionPanel({ analysis, trackTitle }: ProducerCompanionPanelProps) {
  const {
    hasAttributedData,
    trackPromptVersionCount,
    trackGenerationCount,
    totalCandidates,
    approvedCandidates,
    rejectedCandidates,
    pendingCandidates,
    noteThemes,
    approvedPhrases,
    rejectedPhrases,
    observations,
    suggestions,
    hasData,
  } = analysis;

  return (
    <div className="producer-companion">
      <div className="producer-companion-header">
        <h3 className="producer-companion-title">🎚️ Producer</h3>
        <p className="producer-companion-subtitle">
          Everything tried for {trackTitle} — observed, not judged.
        </p>
      </div>

      {!hasData ? (
        <p className="producer-companion-empty">
          Attribute a prompt version to this track in Prompt Studio using the Target Track picker.
          The Producer will begin observing from there.
        </p>
      ) : (
        <div className="producer-companion-body">

          {hasAttributedData && (
            <>
              <div className="producer-companion-section">
                <p className="producer-companion-section-label">Track History</p>
                <div className="producer-companion-stats">
                  <StatRow label="Prompts" value={trackPromptVersionCount} />
                  <StatRow label="Generations" value={trackGenerationCount} />
                  <StatRow label="Candidates" value={totalCandidates} />
                  <StatRow label="Approved" value={approvedCandidates} />
                  <StatRow label="Rejected" value={rejectedCandidates} />
                  <StatRow label="Pending" value={pendingCandidates} />
                </div>
              </div>

              {(noteThemes.length > 0 || approvedPhrases.length > 0 || rejectedPhrases.length > 0) && (
                <>
                  <div className="producer-companion-divider" />
                  <div className="producer-companion-section">
                    <p className="producer-companion-section-label">Creative Patterns</p>

                    {noteThemes.length > 0 && (
                      <div className="producer-companion-pattern-block">
                        <p className="producer-companion-pattern-label">Recurring note themes</p>
                        <ul className="producer-companion-list">
                          {noteThemes.map((theme) => (
                            <li key={theme} className="producer-companion-item producer-companion-item--notes">
                              {theme}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {approvedPhrases.length > 0 && (
                      <div className="producer-companion-pattern-block">
                        <p className="producer-companion-pattern-label">Phrases in approved takes</p>
                        <ul className="producer-companion-list">
                          {approvedPhrases.map((phrase) => (
                            <li key={phrase} className="producer-companion-item producer-companion-item--approved">
                              {phrase}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {rejectedPhrases.length > 0 && (
                      <div className="producer-companion-pattern-block">
                        <p className="producer-companion-pattern-label">Phrases in rejected takes</p>
                        <ul className="producer-companion-list">
                          {rejectedPhrases.map((phrase) => (
                            <li key={phrase} className="producer-companion-item producer-companion-item--rejected">
                              {phrase}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </>
              )}
            </>
          )}

          {observations.length > 0 && (
            <>
              <div className="producer-companion-divider" />
              <div className="producer-companion-section">
                <p className="producer-companion-section-label">Observations</p>
                <ul className="producer-companion-list">
                  {observations.map((obs) => (
                    <li key={obs} className="producer-companion-item producer-companion-item--observation">
                      {obs}
                    </li>
                  ))}
                </ul>
              </div>
            </>
          )}

          {suggestions.length > 0 && (
            <>
              <div className="producer-companion-divider" />
              <div className="producer-companion-section">
                <p className="producer-companion-section-label">Suggestions</p>
                <ul className="producer-companion-list">
                  {suggestions.map((sug) => (
                    <li key={sug} className="producer-companion-item producer-companion-item--suggestion">
                      {sug}
                    </li>
                  ))}
                </ul>
              </div>
            </>
          )}

        </div>
      )}
    </div>
  );
}

export default ProducerCompanionPanel;
