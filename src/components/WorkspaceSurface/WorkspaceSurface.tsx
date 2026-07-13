import type { WorkspaceSurfaceDefinition } from "../../types";
import "./WorkspaceSurface.css";

interface WorkspaceSurfaceProps {
  definition: WorkspaceSurfaceDefinition;
  onClose: () => void;
}

// The generic host — this file is the one place in the entire mission
// that must never learn Suno's name. Everything it knows about what to
// render comes from `definition`: an icon, a title, a description, and a
// URL to point a plain iframe at. No automation, no scripted navigation,
// no injected script, and no message-passing into the hosted page —
// Forge simply gives a creator a framed window onto a real site and gets
// out of the way (Browser-first, Do Not Build Automation).
//
// Deliberately no `sandbox` attribute: adding one (even a permissive one
// like `allow-scripts allow-forms`) restricts the framed page's own
// storage/cookies more than a plain, unsandboxed iframe does, which would
// work directly against "preserve browser session where the platform
// allows." Whether the hosted site actually agrees to render inside a
// frame at all (many real sites send X-Frame-Options/CSP headers that
// refuse embedding outright) is entirely that site's own decision — a
// Service Boundary this component can observe but never override.
function WorkspaceSurface({ definition, onClose }: WorkspaceSurfaceProps) {
  return (
    <div className="workspace-surface">
      <div className="workspace-surface-header">
        <span className="workspace-surface-title">
          {definition.icon} {definition.displayName}
        </span>
        <button className="secondary workspace-surface-close-btn" onClick={onClose}>
          ✕ Close
        </button>
      </div>
      <iframe
        className="workspace-surface-frame"
        src={definition.url}
        title={definition.displayName}
      />
    </div>
  );
}

export default WorkspaceSurface;
