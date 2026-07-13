import { WORKSPACE_SURFACE_DEFINITIONS } from "../../types";
import "./WorkspaceSurface.css";

interface WorkspaceSurfaceLauncherProps {
  openSurfaceId: string | null;
  lastOpenedSurfaceId: string | null;
  onOpenSurface: (id: string) => void;
  onCloseSurface: () => void;
}

// The one entry point into every Workspace Surface Forge currently knows
// how to host — a plain list over WORKSPACE_SURFACE_DEFINITIONS, generic
// the same way RegisteredProvidersView lists whatever
// listExecutionProviders() returns. A second real definition (Suno
// Studio, Ableton, MusicalSEO, YouTube Studio) would appear here
// identically, with zero changes to this file.
function WorkspaceSurfaceLauncher({
  openSurfaceId,
  lastOpenedSurfaceId,
  onOpenSurface,
  onCloseSurface,
}: WorkspaceSurfaceLauncherProps) {
  return (
    <div className="workspace-surface-launcher">
      <h3 className="workspace-surface-launcher-title">🖥️ Workspace Surfaces</h3>
      <p className="workspace-surface-launcher-subtitle">
        Host an external creative tool alongside this track, without leaving Forge.
      </p>
      {WORKSPACE_SURFACE_DEFINITIONS.map((definition) => {
        const isOpen = openSurfaceId === definition.id;
        return (
          <div key={definition.id} className="workspace-surface-launcher-row">
            <div className="workspace-surface-launcher-info">
              <span className="workspace-surface-launcher-name">
                {definition.icon} {definition.displayName}
              </span>
              <p className="field-label">
                {definition.description}
                {!isOpen && lastOpenedSurfaceId === definition.id ? " — last opened this session." : ""}
              </p>
            </div>
            <button
              className="secondary workspace-surface-launcher-btn"
              onClick={() => (isOpen ? onCloseSurface() : onOpenSurface(definition.id))}
            >
              {isOpen ? "✕ Close" : "▶ Open"}
            </button>
          </div>
        );
      })}
    </div>
  );
}

export default WorkspaceSurfaceLauncher;
