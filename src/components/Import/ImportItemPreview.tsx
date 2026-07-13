import type { ImportPlan } from "../../hooks/importFramework";
import { resolveObjectRef } from "../../hooks/relationshipDiscovery";
import type { DiscoveryContext } from "../../hooks/relationshipDiscovery";
import { RELATIONSHIP_TYPE_LABELS } from "../../types";
import type { ObjectRef, Project, RelationshipType } from "../../types";

interface ImportItemPreviewProps {
  // Namespaces this instance's <label htmlFor>/<select id> pair so several
  // of these can render at once (see FolderImportModal) without colliding —
  // the only reason this prop exists at all.
  idPrefix: string;
  plan: ImportPlan;
  discoveryContext: DiscoveryContext;
  selectedSuggestions: Set<string>;
  onToggleSuggestion: (key: string) => void;
  attachToProject: boolean;
  onSetAttachToProject: (value: boolean) => void;
  projectId: string;
  onSetProjectId: (id: string) => void;
  projects: Project[];
  // Batch Relationship Resolution: knowledge-typed ids that resolve to
  // *another queued item in this same batch*, not yet a real Knowledge
  // entry — so the creator can tell "this already exists in Forge" apart
  // from "this will only exist if you also approve it below." Undefined
  // for a single-item import, which never has batch siblings.
  pendingBatchIds?: Set<string>;
}

export function suggestionKey(target: ObjectRef, relationshipType: RelationshipType): string {
  return `${target.type}:${target.id}:${relationshipType}`;
}

// The one place an ImportPlan is rendered — reused verbatim by both a
// single pasted import (ImportModal) and every item in a folder's worth of
// them (FolderImportModal). Sharing this component isn't just convenient:
// it's what actually proves "each file is processed exactly as if it had
// been imported individually" — a batch item's preview isn't a scaled-down
// or simplified version of a single item's, it's the identical thing.
function ImportItemPreview({
  idPrefix,
  plan,
  discoveryContext,
  selectedSuggestions,
  onToggleSuggestion,
  attachToProject,
  onSetAttachToProject,
  projectId,
  onSetProjectId,
  projects,
  pendingBatchIds,
}: ImportItemPreviewProps) {
  return (
    <div className="import-preview">
      <div className="field">
        <span className="field-label">Forge will create</span>
        <div className="import-preview-entry">
          <span className="badge source-badge source-observation">{plan.entry.source}</span>
          <span className="import-preview-title">{plan.entry.title}</span>
        </div>
        {/* The cleaned body — showing this (not just the title) is what
            makes a parser's own transformation honest and checkable: the
            creator can see exactly what "understood, not recreated"
            produced before anything is written. */}
        {plan.entry.insight && <p className="import-preview-body">{plan.entry.insight}</p>}
      </div>

      {plan.warnings.length > 0 && (
        <ul className="import-warnings">
          {plan.warnings.map((warning) => (
            <li key={warning} className="import-warning">
              {warning}
            </li>
          ))}
        </ul>
      )}

      {plan.suggestedRelationships.length > 0 && (
        <div className="field">
          <span className="field-label">Related to (pick any to connect right away)</span>
          <ul className="import-suggestions">
            {plan.suggestedRelationships.map((candidate) => {
              const resolved = resolveObjectRef(candidate.target, discoveryContext);
              if (!resolved) return null;
              const key = suggestionKey(candidate.target, candidate.relationshipType);
              // "Existing knowledge" vs "imported knowledge awaiting
              // creation" — the one distinction this sprint's UX requires.
              // A batch sibling resolves here (via the caller's merged
              // discoveryContext, see FolderImportModal) exactly like real
              // knowledge does; this badge is the only thing that tells
              // them apart on screen.
              const isPending = candidate.target.type === "knowledge" && pendingBatchIds?.has(candidate.target.id);

              return (
                <li key={key} className="import-suggestion">
                  <label className="import-suggestion-label">
                    <input
                      type="checkbox"
                      checked={selectedSuggestions.has(key)}
                      onChange={() => onToggleSuggestion(key)}
                    />
                    <span className="import-suggestion-text">
                      {resolved.icon} {resolved.label}
                      {isPending && <span className="badge import-pending-badge">Awaiting Import</span>}
                      <span className="import-suggestion-reason">
                        {" "}
                        — {RELATIONSHIP_TYPE_LABELS[candidate.relationshipType]}: {candidate.reason}
                      </span>
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <div className="field">
        <span className="field-label">Relationship</span>
        <div className="pill-toggle">
          <button
            className={`pill-option${!attachToProject ? " selected" : ""}`}
            onClick={() => onSetAttachToProject(false)}
          >
            Identity Knowledge
          </button>
          <button
            className={`pill-option${attachToProject ? " selected" : ""}`}
            onClick={() => onSetAttachToProject(true)}
          >
            Attach to a Project
          </button>
        </div>
      </div>

      {attachToProject && (
        <div className="field">
          <label className="field-label" htmlFor={`${idPrefix}-project`}>
            Project
          </label>
          <select
            id={`${idPrefix}-project`}
            value={projectId}
            onChange={(event) => onSetProjectId(event.target.value)}
          >
            <option value="">{projects.length === 0 ? "No projects yet" : "Select a project…"}</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}

export default ImportItemPreview;
