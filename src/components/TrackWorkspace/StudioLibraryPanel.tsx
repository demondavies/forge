import { useState } from "react";
import type { StudioResource } from "../../types";

interface StudioLibraryPanelProps {
  resources: StudioResource[];
  onDelete: (id: string) => void;
  onRevealInExplorer: (filePath: string) => void;
}

function StudioLibraryPanel({ resources, onDelete, onRevealInExplorer }: StudioLibraryPanelProps) {
  const [confirmId, setConfirmId] = useState<string | null>(null);

  return (
    <div className="track-workspace-section">
      <h3 className="track-workspace-section-title">🎛️ Studio Library</h3>

      {resources.length === 0 ? (
        <p className="field-label">
          No audio in your studio yet — click ⬇ Import Audio above to bring files in.
        </p>
      ) : (
        <ul className="studio-library-list">
          {resources.map((resource) => (
            <li key={resource.id} className="studio-library-item">
              <span className="studio-library-name" title={resource.filePath}>
                🎵 {resource.name}
              </span>

              <div className="studio-library-actions">
                {confirmId === resource.id ? (
                  <>
                    <span className="studio-library-confirm-label">
                      Remove from studio?
                    </span>
                    <button
                      className="secondary studio-library-btn studio-library-btn--danger"
                      onClick={() => {
                        onDelete(resource.id);
                        setConfirmId(null);
                      }}
                    >
                      Delete
                    </button>
                    <button
                      className="secondary studio-library-btn"
                      onClick={() => setConfirmId(null)}
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      className="secondary studio-library-btn"
                      disabled
                      title="Coming in a future sprint"
                    >
                      Attach to Track
                    </button>
                    <button
                      className="secondary studio-library-btn"
                      disabled
                      title="Coming in a future sprint"
                    >
                      Create Candidate
                    </button>
                    <button
                      className="secondary studio-library-btn"
                      onClick={() => onRevealInExplorer(resource.filePath)}
                    >
                      Reveal in Explorer
                    </button>
                    <button
                      className="secondary studio-library-btn studio-library-btn--danger"
                      onClick={() => setConfirmId(resource.id)}
                    >
                      Delete
                    </button>
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default StudioLibraryPanel;
