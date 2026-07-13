import { useRef, useState, type ReactNode } from "react";
import type { WorkspaceSurfaceDefinition } from "../../types";
import WorkspaceSurface from "./WorkspaceSurface";
import "./WorkspaceSurface.css";

interface TrackWorkspaceSplitViewProps {
  mainContent: ReactNode;
  openDefinition: WorkspaceSurfaceDefinition | null;
  onCloseSurface: () => void;
}

const MIN_SURFACE_PERCENT = 25;
const MAX_SURFACE_PERCENT = 65;
const DEFAULT_SURFACE_PERCENT = 42;

// "Split view beside Track Workspace" — rendered around Track Workspace's
// own existing panels (passed through untouched as `mainContent`) rather
// than inside any of them: Track Workspace is off-limits to modify this
// sprint, the same reason every other off-limits-host sprint's addition
// has lived in Workspace.tsx instead. When no surface is open, this is a
// pure passthrough (Graceful Disappearance) — Track Workspace looks
// exactly as it did before this sprint.
//
// The divider is a plain pointer-drag width in this component's own
// local state, not anything "remembered" — this sprint's own Behaviour
// only asks Forge to remember which surface was last opened, not the
// exact width a creator last dragged it to.
function TrackWorkspaceSplitView({ mainContent, openDefinition, onCloseSurface }: TrackWorkspaceSplitViewProps) {
  const [surfacePercent, setSurfacePercent] = useState(DEFAULT_SURFACE_PERCENT);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  function handlePointerDown(event: React.PointerEvent) {
    event.preventDefault();
    setIsDragging(true);

    function handlePointerMove(moveEvent: PointerEvent) {
      const container = containerRef.current;
      if (!container) return;

      const rect = container.getBoundingClientRect();
      const percentFromRight = ((rect.right - moveEvent.clientX) / rect.width) * 100;
      const clamped = Math.min(MAX_SURFACE_PERCENT, Math.max(MIN_SURFACE_PERCENT, percentFromRight));
      setSurfacePercent(clamped);
    }

    function handlePointerUp() {
      setIsDragging(false);
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    }

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
  }

  if (!openDefinition) {
    return <>{mainContent}</>;
  }

  return (
    <div className="track-workspace-split" ref={containerRef}>
      <div className="track-workspace-split-main" style={{ width: `${100 - surfacePercent}%` }}>
        {mainContent}
      </div>
      <div
        className={`track-workspace-split-divider${isDragging ? " dragging" : ""}`}
        onPointerDown={handlePointerDown}
      />
      <div className="track-workspace-split-surface" style={{ width: `${surfacePercent}%` }}>
        <WorkspaceSurface definition={openDefinition} onClose={onCloseSurface} />
      </div>
    </div>
  );
}

export default TrackWorkspaceSplitView;
