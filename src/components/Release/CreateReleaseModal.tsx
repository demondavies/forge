import { useState } from "react";
import Modal from "../Modal/Modal";
import { DEFAULT_RELEASE_STATUS, RELEASE_PLATFORMS, RELEASE_STATUSES } from "../../types";
import type { Project, ReleasePlatform, ReleaseStatus } from "../../types";
import type { CreateReleaseInput, CreateReleaseResult } from "../../hooks/useReleases";

interface CreateReleaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (input: CreateReleaseInput) => CreateReleaseResult;
  // Already filtered to the active identity by App.tsx (via useProjects) —
  // this modal never needs to know about any other identity's projects.
  projects: Project[];
}

const DEFAULT_PLATFORM: ReleasePlatform = RELEASE_PLATFORMS[0];

function CreateReleaseModal({ isOpen, onClose, onCreate, projects }: CreateReleaseModalProps) {
  // Form fields live here, as "local" state, because nothing outside this
  // modal needs to know what the user is entering until they press Create.
  const [title, setTitle] = useState("");
  // Left blank by default (rather than defaulting to the first project) so
  // the user always makes an explicit choice for this required field.
  const [projectId, setProjectId] = useState("");
  const [platform, setPlatform] = useState<ReleasePlatform>(DEFAULT_PLATFORM);
  const [status, setStatus] = useState<ReleaseStatus>(DEFAULT_RELEASE_STATUS);
  // A native <input type="date"> always works with plain "YYYY-MM-DD"
  // strings, so there's no need for a Date object until useReleases parses
  // this on submit.
  const [releaseDate, setReleaseDate] = useState("");
  const [description, setDescription] = useState("");
  const [genre, setGenre] = useState("");
  const [subgenre, setSubgenre] = useState("");
  const [explicit, setExplicit] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function resetForm() {
    setTitle("");
    setProjectId("");
    setPlatform(DEFAULT_PLATFORM);
    setStatus(DEFAULT_RELEASE_STATUS);
    setReleaseDate("");
    setDescription("");
    setGenre("");
    setSubgenre("");
    setExplicit(false);
    setError(null);
  }

  // Cancel, ESC, and clicking outside all end up here (see Modal's onClose).
  // None of them should leave behind any typed text for next time.
  function handleClose() {
    resetForm();
    onClose();
  }

  function handleCreate() {
    const result = onCreate({ title, projectId, platform, status, releaseDate, description, genre, subgenre, explicit });

    if (result.error) {
      setError(result.error);
      return; // Keep the modal open so the user can fix the problem.
    }

    resetForm();
    onClose();
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose}>
      <h3 className="modal-title">Create Release</h3>

      <div className="field">
        <label className="field-label" htmlFor="release-title">
          Title
        </label>
        <input
          id="release-title"
          type="text"
          placeholder="e.g. Debut Album"
          value={title}
          onChange={(event) => {
            setTitle(event.target.value);
            if (error) setError(null); // Clear the message once they start fixing it.
          }}
          autoFocus
        />
      </div>

      <div className="field">
        <label className="field-label" htmlFor="release-project">
          Project
        </label>
        <select
          id="release-project"
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
        <label className="field-label" htmlFor="release-platform">
          Platform
        </label>
        {/* A native <select> needs no extra library and is fully
            keyboard-accessible out of the box. Looping over
            RELEASE_PLATFORMS (instead of writing each <option> by hand) is
            what makes adding a new platform later a one-line change. */}
        <select
          id="release-platform"
          value={platform}
          onChange={(event) => setPlatform(event.target.value as ReleasePlatform)}
        >
          {RELEASE_PLATFORMS.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </div>

      <div className="field">
        <label className="field-label" htmlFor="release-status">
          Status
        </label>
        <select
          id="release-status"
          value={status}
          onChange={(event) => setStatus(event.target.value as ReleaseStatus)}
        >
          {RELEASE_STATUSES.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </div>

      <div className="field">
        <label className="field-label" htmlFor="release-date">
          Release Date
        </label>
        <input
          id="release-date"
          type="date"
          value={releaseDate}
          onChange={(event) => {
            setReleaseDate(event.target.value);
            if (error) setError(null);
          }}
        />
      </div>

      <div className="field">
        <label className="field-label" htmlFor="release-description">
          Description <span className="field-optional">(optional)</span>
        </label>
        <textarea
          id="release-description"
          placeholder="What is this release?"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          rows={3}
        />
      </div>

      <div className="field">
        <label className="field-label" htmlFor="release-genre">
          Genre <span className="field-optional">(optional)</span>
        </label>
        <input
          id="release-genre"
          type="text"
          placeholder="e.g. R&B/Soul"
          value={genre}
          onChange={(e) => setGenre(e.target.value)}
        />
      </div>

      <div className="field">
        <label className="field-label" htmlFor="release-subgenre">
          Subgenre <span className="field-optional">(optional)</span>
        </label>
        <input
          id="release-subgenre"
          type="text"
          placeholder="e.g. Contemporary R&B"
          value={subgenre}
          onChange={(e) => setSubgenre(e.target.value)}
        />
      </div>

      <div className="field field-checkbox">
        <input
          id="release-explicit"
          type="checkbox"
          checked={explicit}
          onChange={(e) => setExplicit(e.target.checked)}
        />
        <label htmlFor="release-explicit">Explicit content</label>
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

export default CreateReleaseModal;
