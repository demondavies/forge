import { useState } from "react";
import Modal from "./Modal";
import { PROJECT_TYPES } from "../../types";
import type { ProjectType } from "../../types";
import type { CreateProjectInput, CreateProjectResult } from "../../hooks/useProjects";
import { BLUEPRINT_DEFINITIONS, BLUEPRINT_IDS } from "../../hooks/blueprints";
import type { BlueprintId } from "../../hooks/blueprints";
// No dedicated CSS file needed here — the shared modal/field/button styles
// already live in Modal.css, and every "Create X" modal reuses them; the
// new Blueprint grid's own styles were added there too, for the same reason.

interface CreateProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (input: CreateProjectInput) => CreateProjectResult;
  // Reports what just happened — a new project, and which Blueprint (if
  // any) produced it — without this modal making any navigation decision
  // itself. App.tsx already owns every navigation helper (openProject,
  // openMusicWorkspace, ...); deciding what a Blueprint's preferred
  // workspace should do belongs there, not duplicated here.
  onProjectCreated: (projectId: string, blueprintId: BlueprintId | null) => void;
}

const DEFAULT_TYPE: ProjectType = PROJECT_TYPES[0].id;

// Project creation now has two steps: choose a Blueprint, then the exact
// same name/type/description form this modal has always had. A Blueprint
// only ever pre-fills that existing form's own `type` field and decides
// where to land afterward — it never adds a field, never locks one, and
// "blank-project" leaves both completely alone, so creating a project
// without caring about Blueprints at all behaves exactly as it did before
// this sprint.
function CreateProjectModal({ isOpen, onClose, onCreate, onProjectCreated }: CreateProjectModalProps) {
  const [step, setStep] = useState<"blueprint" | "details">("blueprint");
  const [blueprintId, setBlueprintId] = useState<BlueprintId | null>(null);

  // Form fields live here, as "local" state, because nothing outside this
  // modal needs to know what the user is typing until they press Create.
  const [name, setName] = useState("");
  const [type, setType] = useState<ProjectType>(DEFAULT_TYPE);
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);

  function resetForm() {
    setStep("blueprint");
    setBlueprintId(null);
    setName("");
    setType(DEFAULT_TYPE);
    setDescription("");
    setError(null);
  }

  // Cancel, ESC, and clicking outside all end up here (see Modal's onClose).
  // None of them should leave behind any typed text, or a stale step, for
  // next time.
  function handleClose() {
    resetForm();
    onClose();
  }

  function chooseBlueprint(id: BlueprintId) {
    const blueprint = BLUEPRINT_DEFINITIONS[id];
    setBlueprintId(id);
    if (blueprint.suggestedProjectType) setType(blueprint.suggestedProjectType);
    setStep("details");
  }

  function handleCreate() {
    const result = onCreate({ name, type, description });

    if (result.error) {
      setError(result.error);
      return; // Keep the modal open so the user can fix the problem.
    }

    const createdProjectId = result.project?.id;
    resetForm();
    onClose();

    // This modal's only remaining job: say what happened. App.tsx decides
    // what — if anything — a Blueprint's preferences should do about it.
    if (createdProjectId) {
      onProjectCreated(createdProjectId, blueprintId);
    }
  }

  if (step === "blueprint") {
    return (
      <Modal isOpen={isOpen} onClose={handleClose} panelClassName="blueprint-picker-panel">
        <h3 className="modal-title">Choose a Blueprint</h3>
        <p className="field-label">
          Blueprints compose Forge into an experience suited to what you're making — every project
          underneath is exactly the same kind of Forge Project either way.
        </p>

        <div className="blueprint-grid">
          {BLUEPRINT_IDS.map((id) => {
            const blueprint = BLUEPRINT_DEFINITIONS[id];
            return (
              <button key={id} className="blueprint-card" onClick={() => chooseBlueprint(id)}>
                <span className="blueprint-card-icon">{blueprint.icon}</span>
                <span className="blueprint-card-label">{blueprint.label}</span>
                <span className="blueprint-card-description">{blueprint.description}</span>
              </button>
            );
          })}
        </div>

        <div className="modal-actions">
          <button className="secondary" onClick={handleClose}>
            Cancel
          </button>
        </div>
      </Modal>
    );
  }

  const blueprint = blueprintId ? BLUEPRINT_DEFINITIONS[blueprintId] : null;

  return (
    <Modal isOpen={isOpen} onClose={handleClose}>
      <button className="back-btn" onClick={() => setStep("blueprint")}>
        ← Change Blueprint
      </button>

      <h3 className="modal-title">Create Project</h3>
      {blueprint && (
        <p className="field-label">
          {blueprint.icon} {blueprint.label}
        </p>
      )}

      <div className="field">
        <label className="field-label" htmlFor="project-name">
          Project Name
        </label>
        <input
          id="project-name"
          type="text"
          placeholder="e.g. Midnight Sessions"
          value={name}
          onChange={(event) => {
            setName(event.target.value);
            if (error) setError(null); // Clear the message once they start fixing it.
          }}
          autoFocus
        />
      </div>

      <div className="field">
        <label className="field-label" htmlFor="project-type">
          Project Type
        </label>
        {/* A native <select> needs no extra library and is fully
            keyboard-accessible out of the box. Looping over PROJECT_TYPES
            (instead of writing each <option> by hand) is what makes adding
            a new type later a one-line change in types.ts. Pre-filled by
            the chosen Blueprint above, but never locked — a creator can
            still change it here exactly as before this sprint. */}
        <select
          id="project-type"
          value={type}
          onChange={(event) => setType(event.target.value as ProjectType)}
        >
          {PROJECT_TYPES.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div className="field">
        <label className="field-label" htmlFor="project-description">
          Description <span className="field-optional">(optional)</span>
        </label>
        <textarea
          id="project-description"
          placeholder="What is this project about?"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          rows={3}
        />
      </div>

      {error && <p className="field-error">{error}</p>}

      <div className="modal-actions">
        <button className="secondary" onClick={handleClose}>
          Cancel
        </button>
        <button onClick={handleCreate}>Create</button>
      </div>
    </Modal>
  );
}

export default CreateProjectModal;
