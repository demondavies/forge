import type { AlbumCompanionAnalysis } from "../../hooks/albumCompanion";
import "./AlbumProduction.css";

interface AlbumCompanionPanelProps {
  analysis: AlbumCompanionAnalysis;
}

function StatRow({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="album-companion-stat">
      <span className="album-companion-stat-value">{value}</span>
      <span className="album-companion-stat-label">{label}</span>
    </div>
  );
}

function AlbumCompanionPanel({ analysis }: AlbumCompanionPanelProps) {
  const { progress, activity, memory, observations, suggestions, hasData } = analysis;

  return (
    <div className="album-companion">
      <div className="album-companion-header">
        <h3 className="album-companion-title">🧠 Album Companion</h3>
        <p className="album-companion-subtitle">
          An evidence-based view of where this album stands — grounded entirely in what Forge already knows.
        </p>
      </div>

      {!hasData ? (
        <p className="album-companion-empty">
          Plan some tracks and save a prompt version to start seeing observations here. The Companion
          reports only what has already happened — nothing is invented.
        </p>
      ) : (
        <div className="album-companion-body">

          <div className="album-companion-section">
            <p className="album-companion-section-label">Production Progress</p>
            <div className="album-companion-stats">
              <StatRow label="Planned" value={progress.plannedCount} />
              <StatRow label="With Audio" value={progress.tracksWithAudio} />
              <StatRow label="Generated" value={progress.tracksGenerated} />
              <StatRow label="Approved" value={progress.tracksWithApprovedCandidates} />
              <StatRow label="Awaiting Review" value={progress.tracksAwaitingReview} />
              <StatRow label="Current Best ⭐" value={progress.tracksWithCurrentBest} />
              <StatRow label="Album Version 🎵" value={progress.tracksWithAlbumVersion} />
              <StatRow label="Finished ✓" value={progress.tracksFinished} />
              <StatRow label="Remaining" value={progress.plannedCount - progress.tracksFinished} />
            </div>
            {progress.tracksGenerated === 0 && (
              <p className="album-companion-note">
                Track-level counts require a prompt to be attributed to each track via Prompt Studio's Target Track picker.
              </p>
            )}
          </div>

          <div className="album-companion-divider" />

          <div className="album-companion-section">
            <p className="album-companion-section-label">Creative Activity</p>
            <div className="album-companion-stats">
              <StatRow label="Prompt Versions" value={activity.totalPromptVersions} />
              <StatRow label="Generations" value={activity.totalGenerations} />
              <StatRow label="Candidates" value={activity.totalCandidates} />
              <StatRow label="Approved" value={activity.approvedCandidates} />
              <StatRow label="Rejected" value={activity.rejectedCandidates} />
            </div>
          </div>

          {(memory.noteThemes.length > 0 || memory.approvedPhrases.length > 0 || memory.rejectedPhrases.length > 0) && (
            <>
              <div className="album-companion-divider" />
              <div className="album-companion-section">
                <p className="album-companion-section-label">Creative Memory</p>

                {memory.noteThemes.length > 0 && (
                  <div className="album-companion-memory-block">
                    <p className="album-companion-memory-label">Common note themes</p>
                    <ul className="album-companion-list">
                      {memory.noteThemes.map((theme) => (
                        <li key={theme} className="album-companion-item album-companion-item--notes">
                          {theme}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {memory.approvedPhrases.length > 0 && (
                  <div className="album-companion-memory-block">
                    <p className="album-companion-memory-label">Frequently approved phrases</p>
                    <ul className="album-companion-list">
                      {memory.approvedPhrases.map((phrase) => (
                        <li key={phrase} className="album-companion-item album-companion-item--approved">
                          {phrase}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {memory.rejectedPhrases.length > 0 && (
                  <div className="album-companion-memory-block">
                    <p className="album-companion-memory-label">Frequently rejected phrases</p>
                    <ul className="album-companion-list">
                      {memory.rejectedPhrases.map((phrase) => (
                        <li key={phrase} className="album-companion-item album-companion-item--rejected">
                          {phrase}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </>
          )}

          {observations.length > 0 && (
            <>
              <div className="album-companion-divider" />
              <div className="album-companion-section">
                <p className="album-companion-section-label">Observations</p>
                <ul className="album-companion-list">
                  {observations.map((obs) => (
                    <li key={obs} className="album-companion-item album-companion-item--observation">
                      {obs}
                    </li>
                  ))}
                </ul>
              </div>
            </>
          )}

          {suggestions.length > 0 && (
            <>
              <div className="album-companion-divider" />
              <div className="album-companion-section">
                <p className="album-companion-section-label">Suggestions</p>
                <ul className="album-companion-list">
                  {suggestions.map((sug) => (
                    <li key={sug} className="album-companion-item album-companion-item--suggestion">
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

export default AlbumCompanionPanel;
