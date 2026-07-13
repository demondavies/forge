import { COMPANION_ROLES } from "../../types";
import type { BlueprintDefinition } from "../../hooks/blueprints";
import "./BlueprintWelcome.css";

interface BlueprintWelcomeProps {
  blueprint: BlueprintDefinition;
}

// Front-Loaded Guidance, literally: the one thing a Blueprint adds that a
// plain project never had — a first, transient greeting composed entirely
// from data that already existed (the Blueprint's own label/icon, and a
// Companion's own focus text from COMPANION_ROLES, untouched). Shown only
// during the first visit after creating a project from a Blueprint with a
// preferred workspace (see Workspace.tsx/App.tsx) — never persisted,
// never shown again once a creator navigates on, and entirely absent for
// "Blank Project" or for any ordinary return visit. Removing this
// component entirely would leave Music Workspace and Creative Actions
// exactly as capable as they are today; it adds a welcome, not a capability.
function BlueprintWelcome({ blueprint }: BlueprintWelcomeProps) {
  const companion = blueprint.emphasizedCompanionId
    ? COMPANION_ROLES.find((candidate) => candidate.id === blueprint.emphasizedCompanionId) ?? null
    : null;

  return (
    <div className="placeholder-card blueprint-welcome">
      <p className="blueprint-welcome-title">
        {blueprint.icon} Set up for a {blueprint.label}.
      </p>

      {companion && (
        <p className="blueprint-welcome-companion">
          {companion.icon} <strong>{companion.name}</strong> — {companion.focus}
        </p>
      )}

    </div>
  );
}

export default BlueprintWelcome;
