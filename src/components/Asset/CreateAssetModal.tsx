import { useState } from "react";
import Modal from "../Modal/Modal";
import { ASSET_TYPES } from "../../types";
import type { AssetType, Project } from "../../types";
import type { CreateAssetInput, CreateAssetResult } from "../../hooks/useAssets";

interface CreateAssetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (input: CreateAssetInput) => CreateAssetResult;
  // Already filtered to the active identity by App.tsx (via useProjects) —
  // this modal never needs to know about any other identity's projects.
  projects: Project[];
}

const DEFAULT_TYPE: AssetType = ASSET_TYPES[0];

function CreateAssetModal({ isOpen, onClose, onCreate, projects }: CreateAssetModalProps) {
  // Form fields live here, as "local" state, because nothing outside this
  // modal needs to know what the user is typing until they press Create.
  const [name, setName] = useState("");
  const [type, setType] = useState<AssetType>(DEFAULT_TYPE);
  // Left blank by default (rather than defaulting to the first project) so
  // the user always makes an explicit choice for this required field.
  const [projectId, setProjectId] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);

  function resetForm() {
    setName("");
    setType(DEFAULT_TYPE);
    setProjectId("");
    setDescription("");
    setError(null);
  }

  // Cancel, ESC, and clicking outside all end up here (see Modal's onClose).
  // None of them should leave behind any typed text for next time.
  function handleClose() {
    resetForm();
    onClose();
  }

  function handleCreate() {
    const result = onCreate({ name, type, projectId, description });

    if (result.error) {
      setError(result.error);
      return; // Keep the modal open so the user can fix the problem.
    }

    resetForm();
    onClose();
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose}>
      <h3 className="modal-title">Add Asset</h3>

      <div className="field">
        <label className="field-label" htmlFor="asset-name">
          Name
        </label>
        <input
          id="asset-name"
          type="text"
          placeholder="e.g. Final Mix v3"
          value={name}
          onChange={(event) => {
            setName(event.target.value);
            if (error) setError(null); // Clear the message once they start fixing it.
          }}
          autoFocus
        />
      </div>

      <div className="field">
        <label className="field-label" htmlFor="asset-type">
          Asset Type
        </label>
        {/* A native <select> needs no extra library and is fully
            keyboard-accessible out of the box. Looping over ASSET_TYPES
            (instead of writing each <option> by hand) is what makes adding
            a new type later a one-line change. */}
        <select
          id="asset-type"
          value={type}
          onChange={(event) => setType(event.target.value as AssetType)}
        >
          {ASSET_TYPES.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </div>

      <div className="field">
        <label className="field-label" htmlFor="asset-project">
          Project
        </label>
        <select
          id="asset-project"
          value={projectId}
          onChange={(event) => {
            setProjectId(event.target.value);
            if (error) setError(null);
          }}
        >
          <option value="">
            {projects.length === 0 ? "No projects yet" : "Select a project…"}
          </option>
          {projects.map((project) => (
            <option key={project.id} value={project.id}>
              {project.name}
            </option>
          ))}
        </select>
      </div>

      <div className="field">
        <label className="field-label" htmlFor="asset-description">
          Description <span className="field-optional">(optional)</span>
        </label>
        <textarea
          id="asset-description"
          placeholder="What is this asset?"
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

export default CreateAssetModal;
