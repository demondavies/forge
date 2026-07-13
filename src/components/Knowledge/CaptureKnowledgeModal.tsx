import { useState } from "react";
import Modal from "../Modal/Modal";
import { KNOWLEDGE_SOURCES } from "../../types";
import type { KnowledgeSource, Project } from "../../types";
import type { CaptureKnowledgeInput, CaptureKnowledgeResult } from "../../hooks/useKnowledge";

interface CaptureKnowledgeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (input: CaptureKnowledgeInput) => CaptureKnowledgeResult;
  // Already filtered to the active identity by App.tsx (via useProjects) —
  // this modal never needs to know about any other identity's projects.
  projects: Project[];
}

const DEFAULT_SOURCE: KnowledgeSource = KNOWLEDGE_SOURCES[0];

function CaptureKnowledgeModal({
  isOpen,
  onClose,
  onCapture,
  projects,
}: CaptureKnowledgeModalProps) {
  // Form fields live here, as "local" state, because nothing outside this
  // modal needs to know what the user is typing until they press Capture.
  const [title, setTitle] = useState("");
  const [insight, setInsight] = useState("");
  const [source, setSource] = useState<KnowledgeSource>(DEFAULT_SOURCE);
  // Whether the "Attach to a Project" option is chosen. When false, this
  // knowledge belongs only to the identity, with no project reference.
  const [attachToProject, setAttachToProject] = useState(false);
  const [projectId, setProjectId] = useState("");
  const [error, setError] = useState<string | null>(null);

  function resetForm() {
    setTitle("");
    setInsight("");
    setSource(DEFAULT_SOURCE);
    setAttachToProject(false);
    setProjectId("");
    setError(null);
  }

  // Cancel, ESC, and clicking outside all end up here (see Modal's onClose).
  // None of them should leave behind any typed text for next time.
  function handleClose() {
    resetForm();
    onClose();
  }

  function handleCapture() {
    const result = onCapture({
      title,
      insight,
      source,
      // Only send a real project id when the user chose to attach one and
      // actually picked something — otherwise this is identity-only knowledge.
      projectId: attachToProject && projectId ? projectId : null,
    });

    if (result.error) {
      setError(result.error);
      return; // Keep the modal open so the user can fix the problem.
    }

    resetForm();
    onClose();
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose}>
      <h3 className="modal-title">Capture Knowledge</h3>

      <div className="field">
        <label className="field-label" htmlFor="knowledge-title">
          Title
        </label>
        <input
          id="knowledge-title"
          type="text"
          placeholder="e.g. Punchier kick improved energy."
          value={title}
          onChange={(event) => {
            setTitle(event.target.value);
            if (error) setError(null); // Clear the message once they start fixing it.
          }}
          autoFocus
        />
      </div>

      <div className="field">
        <label className="field-label" htmlFor="knowledge-insight">
          Insight
        </label>
        <textarea
          id="knowledge-insight"
          placeholder="What did you learn?"
          value={insight}
          onChange={(event) => {
            setInsight(event.target.value);
            if (error) setError(null);
          }}
          rows={4}
        />
      </div>

      <div className="field">
        <label className="field-label" htmlFor="knowledge-source">
          Source
        </label>
        {/* A native <select> needs no extra library and is fully
            keyboard-accessible out of the box. Looping over
            KNOWLEDGE_SOURCES (instead of writing each <option> by hand) is
            what makes adding a new source later a one-line change. */}
        <select
          id="knowledge-source"
          value={source}
          onChange={(event) => setSource(event.target.value as KnowledgeSource)}
        >
          {KNOWLEDGE_SOURCES.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </div>

      <div className="field">
        <span className="field-label">Relationship</span>
        <div className="pill-toggle">
          <button
            className={`pill-option${!attachToProject ? " selected" : ""}`}
            onClick={() => setAttachToProject(false)}
          >
            Identity Knowledge
          </button>
          <button
            className={`pill-option${attachToProject ? " selected" : ""}`}
            onClick={() => setAttachToProject(true)}
          >
            Attach to a Project
          </button>
        </div>
      </div>

      {/* Only shown once "Attach to a Project" is chosen — the dropdown is
          already scoped to this identity's own projects via the `projects` prop. */}
      {attachToProject && (
        <div className="field">
          <label className="field-label" htmlFor="knowledge-project">
            Project
          </label>
          <select
            id="knowledge-project"
            value={projectId}
            onChange={(event) => setProjectId(event.target.value)}
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
      )}

      {error && <p className="field-error">{error}</p>}

      <div className="modal-actions">
        <button className="secondary" onClick={handleClose}>
          Cancel
        </button>
        <button onClick={handleCapture}>Capture</button>
      </div>
    </Modal>
  );
}

export default CaptureKnowledgeModal;
