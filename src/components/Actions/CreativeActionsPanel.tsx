import type { CreativeAction } from "../../hooks/creativeActions";
import "./CreativeActions.css";

interface CreativeActionsPanelProps {
  actions: CreativeAction[];
}

// The one presentation surface Creative Actions has — a calm row of
// buttons, not a dashboard and not a task list. This component knows
// nothing about Music Workspace, or any other workspace: it only knows
// how to render whatever CreativeAction[] it's handed, which is exactly
// what lets a future workspace contribute its own contextual actions
// without this file, or the Creative Action architecture behind it, ever
// needing to change. Nothing here decides *which* actions to show or
// *what* they do — see Workspace.tsx's own "music" section for that.
function CreativeActionsPanel({ actions }: CreativeActionsPanelProps) {
  if (actions.length === 0) return null;

  return (
    <div className="creative-actions-panel">
      {actions.map((action) => (
        <button
          key={action.id}
          className="creative-action-btn"
          title={action.description}
          onClick={action.run}
        >
          <span className="creative-action-icon">{action.icon}</span>
          {action.label}
        </button>
      ))}
    </div>
  );
}

export default CreativeActionsPanel;
