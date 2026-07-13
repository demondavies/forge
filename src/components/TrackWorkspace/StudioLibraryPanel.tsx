import type { StudioResource, StudioResourceAttachment } from "../../types";

interface StudioLibraryPanelProps {
  resources: StudioResource[];
  attachments: StudioResourceAttachment[];
  trackId: string;
  onAttach: (resourceId: string, trackId: string) => void;
  onDetach: (resourceId: string, trackId: string) => void;
}

function StudioLibraryPanel({ resources, attachments, trackId, onAttach, onDetach }: StudioLibraryPanelProps) {
  const attached = resources.filter((r) =>
    attachments.some((a) => a.resourceId === r.id && a.trackId === trackId),
  );
  const unattached = resources.filter(
    (r) => !attachments.some((a) => a.resourceId === r.id && a.trackId === trackId),
  );

  return (
    <div>
      <div className="studio-library-section-header">
        <p className="studio-library-section-label">Studio Library</p>
      </div>

      {resources.length === 0 ? (
        <p className="field-label" style={{ marginTop: 6 }}>
          No audio in your library yet — visit 🎧 Studio Library to import files.
        </p>
      ) : (
        <>
          {attached.length === 0 && (
            <p className="field-label" style={{ marginTop: 6 }}>
              No files attached to this track yet.
            </p>
          )}
          <ul className="studio-library-list" style={{ marginTop: attached.length ? 8 : 4 }}>
            {attached.map((resource) => (
              <li key={resource.id} className="studio-library-item">
                <span className="studio-library-name" title={resource.filePath}>
                  🎵 {resource.name}
                </span>
                <div className="studio-library-actions">
                  <button
                    className="secondary studio-library-btn"
                    onClick={() => onDetach(resource.id, trackId)}
                  >
                    ✓ Detach
                  </button>
                </div>
              </li>
            ))}
            {unattached.map((resource) => (
              <li key={resource.id} className="studio-library-item" style={{ opacity: 0.55 }}>
                <span className="studio-library-name" title={resource.filePath}>
                  🎵 {resource.name}
                </span>
                <div className="studio-library-actions">
                  <button
                    className="secondary studio-library-btn"
                    onClick={() => onAttach(resource.id, trackId)}
                  >
                    Attach
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

export default StudioLibraryPanel;
