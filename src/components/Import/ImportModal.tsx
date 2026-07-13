import { useState } from "react";
import Modal from "../Modal/Modal";
import { parseText, buildImportPlan } from "../../hooks/importFramework";
import { parseMarkdown } from "../../hooks/markdownImport";
import type { DiscoveryContext } from "../../hooks/relationshipDiscovery";
import ImportItemPreview, { suggestionKey } from "./ImportItemPreview";
import type {
  Asset,
  Capture,
  Identity,
  KnowledgeEntry,
  ObjectRef,
  Project,
  RelationshipType,
  Release,
} from "../../types";
import type { CaptureKnowledgeInput, CaptureKnowledgeResult } from "../../hooks/useKnowledge";
import type { CreateManualRelationshipResult } from "../../hooks/useRelationships";
import "./Import.css";

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  // Reuses the exact same wrapper App.tsx already gives CaptureKnowledgeModal
  // — Import doesn't get its own creation path, it calls the one that
  // already exists and already logs Activity.
  onCaptureKnowledge: (input: CaptureKnowledgeInput) => CaptureKnowledgeResult;
  onCreateManualRelationship: (
    source: ObjectRef,
    target: ObjectRef,
    relationshipType: RelationshipType,
  ) => CreateManualRelationshipResult;
  activeIdentityId: string;
  identities: Identity[];
  projects: Project[];
  knowledgeEntries: KnowledgeEntry[];
  assets: Asset[];
  releases: Release[];
  captures: Capture[];
}

type ImportFormat = "text" | "markdown";

// The two Parse stages the Import Framework currently ships — plain text
// (no real parsing needed) and Markdown (the first real one). Picking a
// format only ever decides which function turns rawText into an
// ImportableItem; everything below this point (buildImportPlan, the
// preview, creation) has no idea which one ran.
const PLACEHOLDER_BY_FORMAT: Record<ImportFormat, string> = {
  text: "A title on the first line, then the rest of the content…",
  markdown: "# A Title\n\nSome **content**, maybe a [link](https://example.com) or:\n- a bullet\n- or two",
};

// The one concrete proof of the Import Framework this sprint ships: plain
// pasted or typed text (or now, Markdown), previewed and turned into a real
// Knowledge entry. Every question the mission requires stays answerable
// before anything is created — what will be imported (the textarea
// itself), how Forge interpreted it (the title + warnings below), which
// relationships were inferred (the checklist, reusing the exact same
// Relationship Engine any other new object already gets), and what
// couldn't be understood (the warnings list, never blocking). Nothing is
// written until "Import" is pressed. See FolderImportModal for the same
// pipeline run across several items at once — this modal and that one
// share ImportItemPreview so a single item is never treated differently
// from one item inside a batch.
function ImportModal({
  isOpen,
  onClose,
  onCaptureKnowledge,
  onCreateManualRelationship,
  activeIdentityId,
  identities,
  projects,
  knowledgeEntries,
  assets,
  releases,
  captures,
}: ImportModalProps) {
  const [rawText, setRawText] = useState("");
  const [format, setFormat] = useState<ImportFormat>("text");
  const [attachToProject, setAttachToProject] = useState(false);
  const [projectId, setProjectId] = useState("");
  const [selectedSuggestions, setSelectedSuggestions] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  function resetForm() {
    setRawText("");
    setFormat("text");
    setAttachToProject(false);
    setProjectId("");
    setSelectedSuggestions(new Set());
    setError(null);
  }

  function handleClose() {
    resetForm();
    onClose();
  }

  const discoveryContext: DiscoveryContext = {
    identities,
    projects,
    knowledgeEntries,
    assets,
    releases,
    captures,
  };

  // Recomputed on every keystroke — buildImportPlan is pure and cheap, so
  // there's no separate "generate preview" step; the preview simply always
  // reflects whatever is currently typed. Only this one line changes based
  // on the chosen format — which Parse function runs — buildImportPlan
  // itself never branches on format.
  const trimmed = rawText.trim();
  const item = format === "markdown" ? parseMarkdown(rawText) : parseText(rawText);
  const plan = trimmed ? buildImportPlan(item, activeIdentityId, discoveryContext) : null;

  function toggleSuggestion(key: string) {
    setSelectedSuggestions((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function handleImport() {
    if (!plan) return;

    const result = onCaptureKnowledge({
      title: plan.entry.title,
      insight: plan.entry.insight,
      source: plan.entry.source,
      projectId: attachToProject && projectId ? projectId : null,
    });

    if (result.error || !result.entry) {
      setError(result.error ?? "Something went wrong importing this.");
      return;
    }

    const newEntryRef: ObjectRef = { type: "knowledge", id: result.entry.id };

    // Only the suggestions the creator actually checked become real,
    // already-confirmed connections — the rest remain available through
    // ordinary discovery the next time this entry (or its match) is
    // viewed. Forge suggests here too; the creator still decides.
    for (const candidate of plan.suggestedRelationships) {
      const key = suggestionKey(candidate.target, candidate.relationshipType);
      if (selectedSuggestions.has(key)) {
        onCreateManualRelationship(newEntryRef, candidate.target, candidate.relationshipType);
      }
    }

    resetForm();
    onClose();
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} panelClassName="command-palette-panel">
      <h3 className="modal-title">Import</h3>

      <div className="field">
        <span className="field-label">Format</span>
        <div className="pill-toggle">
          <button
            className={`pill-option${format === "text" ? " selected" : ""}`}
            onClick={() => setFormat("text")}
          >
            Plain Text
          </button>
          <button
            className={`pill-option${format === "markdown" ? " selected" : ""}`}
            onClick={() => setFormat("markdown")}
          >
            Markdown
          </button>
        </div>
      </div>

      <div className="field">
        <label className="field-label" htmlFor="import-raw-text">
          Paste or type what you'd like Forge to understand
        </label>
        <textarea
          id="import-raw-text"
          placeholder={PLACEHOLDER_BY_FORMAT[format]}
          value={rawText}
          onChange={(event) => {
            setRawText(event.target.value);
            if (error) setError(null);
          }}
          rows={6}
          autoFocus
        />
      </div>

      {plan && (
        <ImportItemPreview
          idPrefix="import"
          plan={plan}
          discoveryContext={discoveryContext}
          selectedSuggestions={selectedSuggestions}
          onToggleSuggestion={toggleSuggestion}
          attachToProject={attachToProject}
          onSetAttachToProject={setAttachToProject}
          projectId={projectId}
          onSetProjectId={setProjectId}
          projects={projects}
        />
      )}

      {error && <p className="field-error">{error}</p>}

      <div className="modal-actions">
        <button className="secondary" onClick={handleClose}>
          Cancel
        </button>
        <button onClick={handleImport} disabled={!plan}>
          Import
        </button>
      </div>
    </Modal>
  );
}

export default ImportModal;
