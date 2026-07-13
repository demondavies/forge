import { useState } from "react";
import Modal from "../Modal/Modal";
import { buildBatchDiscoveryContext, buildImportBatch, IMPORT_SOURCE_FORMAT_LABELS } from "../../hooks/folderImport";
import type { ImportSource } from "../../hooks/folderImport";
import type { NativeFolderPickOutcome } from "../../native/nativeFolderSource";
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

interface FolderImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  // What this instance is for — Native Folder Access and Obsidian Vault
  // Import share this whole component (see the doc comment on
  // FolderImportModal below); these three props are the entire difference
  // between them. Nothing else in this file ever names either provider.
  title: string;
  description: string;
  pickSources: () => Promise<NativeFolderPickOutcome | null>;
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

// Everything about one queued file that lives only in this modal's own UI —
// which suggestions are checked, whether it's approved, where it attaches.
// buildImportBatch (folderImport.ts) never sees or needs any of this; it
// only produces the ImportPlan each of these states is layered on top of.
interface ItemState {
  approved: boolean;
  selectedSuggestions: Set<string>;
  attachToProject: boolean;
  projectId: string;
}

function defaultItemState(): ItemState {
  // Approved by default — adding a file to the batch already was the
  // creator's own decision to include it; excluding one afterward is the
  // exception, not the rule. Relationship suggestions default the other
  // way (see ImportItemPreview/ImportModal) — forming a connection is a
  // stronger action than simply bringing in a note.
  return { approved: true, selectedSuggestions: new Set(), attachToProject: false, projectId: "" };
}

// The operating system — a plain folder, or now a whole Obsidian vault —
// is just another provider of ImportSource[] (see
// native/nativeFolderSource.ts, the only file that knows Tauri's dialog/fs
// APIs exist). This modal is deliberately provider-agnostic: title,
// description, and pickSources are its only awareness that "Import a
// Folder" and "Import an Obsidian Vault" are two different creator-facing
// actions — App.tsx supplies both, once each, from the two native picker
// functions. Everything else here — the batch list, per-item approve/
// exclude, ImportItemPreview, handleImportAll — is the exact same code
// regardless of which one opened it, because every source still runs
// through the identical Parse -> Interpret pipeline a single pasted import
// already uses (buildImportBatch is the same unmodified loop over
// buildImportPlan it always was). Nothing in this file ever names
// "Obsidian" — that's the point.
function FolderImportModal({
  isOpen,
  onClose,
  title,
  description,
  pickSources,
  onCaptureKnowledge,
  onCreateManualRelationship,
  activeIdentityId,
  identities,
  projects,
  knowledgeEntries,
  assets,
  releases,
  captures,
}: FolderImportModalProps) {
  const [sources, setSources] = useState<ImportSource[]>([]);
  const [itemStates, setItemStates] = useState<Record<string, ItemState>>({});
  const [folderPath, setFolderPath] = useState<string | null>(null);
  const [skipped, setSkipped] = useState<{ files: number; folders: number } | null>(null);
  const [isPicking, setIsPicking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function resetForm() {
    setSources([]);
    setItemStates({});
    setFolderPath(null);
    setSkipped(null);
    setIsPicking(false);
    setError(null);
  }

  function handleClose() {
    resetForm();
    onClose();
  }

  // A fresh pick replaces the batch outright — the queue represents "what's
  // currently in this folder," not an accumulation across multiple picks.
  async function handlePickFolder() {
    setError(null);
    setIsPicking(true);
    try {
      const outcome = await pickSources();
      if (!outcome) return; // Creator cancelled the native dialog.

      setSources(outcome.sources);
      setItemStates(Object.fromEntries(outcome.sources.map((source) => [source.id, defaultItemState()])));
      setFolderPath(outcome.folderPath);
      setSkipped({ files: outcome.skippedFiles, folders: outcome.skippedFolders });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not read that folder.");
    } finally {
      setIsPicking(false);
    }
  }

  function removeSource(id: string) {
    setSources((current) => current.filter((source) => source.id !== id));
    setItemStates((current) => {
      const next = { ...current };
      delete next[id];
      return next;
    });
  }

  function updateItemState(id: string, patch: Partial<ItemState>) {
    setItemStates((current) => ({
      ...current,
      [id]: { ...(current[id] ?? defaultItemState()), ...patch },
    }));
  }

  function toggleSuggestion(id: string, key: string) {
    const state = itemStates[id] ?? defaultItemState();
    const next = new Set(state.selectedSuggestions);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    updateItemState(id, { selectedSuggestions: next });
  }

  const discoveryContext: DiscoveryContext = {
    identities,
    projects,
    knowledgeEntries,
    assets,
    releases,
    captures,
  };

  // Recomputed on every change — buildImportBatch is pure and cheap, just
  // like buildImportPlan is for a single item. Each source in it was
  // parsed and interpreted completely independently of the others, though
  // (Batch Relationship Resolution) each one's own discovery now also sees
  // every other queued source's temporary preview alongside real knowledge.
  const batch = buildImportBatch(sources, activeIdentityId, discoveryContext);

  // The same merged context buildImportBatch used internally to discover
  // relationships — rebuilt here (not threaded out through ImportBatchItem)
  // so ImportItemPreview's resolveObjectRef call can turn a suggestion
  // pointing at a batch sibling back into a readable label, exactly the way
  // it already resolves a suggestion pointing at real knowledge. Passing
  // the plain (non-batch) discoveryContext here instead would make every
  // cross-batch suggestion silently vanish from the preview — resolved to
  // nothing, since a sibling's preview wouldn't exist in that view.
  const batchDiscoveryContext = buildBatchDiscoveryContext(sources, activeIdentityId, discoveryContext);

  // Which knowledge-typed ids are "still just a queued source in this
  // batch," not a real Knowledge entry yet — used both to badge a
  // suggestion as "Awaiting Import" (ImportItemPreview) and, below, to
  // translate such a suggestion's target into the real id capture assigns
  // it, once (and only if) that sibling is actually approved and created.
  const batchSourceIds = new Set(sources.map((source) => source.id));

  function handleImportAll() {
    const failures: string[] = [];

    // Pass 1: create every approved item first. A relationship can only
    // ever point at a real object's real id — never a source's own
    // temporary id — so every sibling that's going to exist needs its real
    // id known before pass 2 tries to connect anything to it.
    const createdRefBySourceId = new Map<string, ObjectRef>();
    const created: { source: (typeof batch)[number]["source"]; plan: (typeof batch)[number]["plan"]; entryRef: ObjectRef }[] = [];

    for (const { source, plan } of batch) {
      const state = itemStates[source.id] ?? defaultItemState();
      if (!state.approved) continue;

      const result = onCaptureKnowledge({
        title: plan.entry.title,
        insight: plan.entry.insight,
        source: plan.entry.source,
        projectId: state.attachToProject && state.projectId ? state.projectId : null,
      });

      if (result.error || !result.entry) {
        failures.push(`"${source.label}": ${result.error ?? "something went wrong"}`);
        continue; // One file failing shouldn't stop the rest of the batch.
      }

      const entryRef: ObjectRef = { type: "knowledge", id: result.entry.id };
      createdRefBySourceId.set(source.id, entryRef);
      created.push({ source, plan, entryRef });
    }

    // Pass 2: create only the relationships the creator actually checked.
    // The Translation Principle, applied concretely: a suggestion's target
    // is translated from the batch's own temporary reference (a source id)
    // into the real reference capture just assigned it, right here — the
    // one and only place a batch-internal id ever needs to become a real
    // one. Nothing downstream (createManualRelationship, the Relationship
    // Engine, the Creative Knowledge Engine) ever sees a temporary id.
    for (const { source, plan, entryRef } of created) {
      const state = itemStates[source.id] ?? defaultItemState();

      for (const candidate of plan.suggestedRelationships) {
        const key = suggestionKey(candidate.target, candidate.relationshipType);
        if (!state.selectedSuggestions.has(key)) continue;

        const isBatchSibling = candidate.target.type === "knowledge" && batchSourceIds.has(candidate.target.id);
        const target = isBatchSibling ? createdRefBySourceId.get(candidate.target.id) : candidate.target;

        if (!target) {
          // The suggestion pointed at a sibling the creator didn't approve
          // (or that failed to create) — there is truthfully nothing to
          // connect to, so this is reported, not silently skipped.
          const targetLabel = sources.find((candidateSource) => candidateSource.id === candidate.target.id)?.label;
          failures.push(
            `"${source.label}": couldn't connect to "${targetLabel ?? "an item"}" — it wasn't imported.`,
          );
          continue;
        }

        onCreateManualRelationship(entryRef, target, candidate.relationshipType);
      }
    }

    if (failures.length > 0) {
      setError(failures.join(" "));
      return; // Leave the modal open so the creator can see and fix what failed.
    }

    resetForm();
    onClose();
  }

  const approvedCount = batch.filter((item) => (itemStates[item.source.id] ?? defaultItemState()).approved).length;

  return (
    <Modal isOpen={isOpen} onClose={handleClose} panelClassName="command-palette-panel">
      <h3 className="modal-title">{title}</h3>
      <p className="field-label">{description}</p>

      <div className="import-batch-add">
        <div className="modal-actions">
          <button className="secondary" onClick={handlePickFolder} disabled={isPicking}>
            {isPicking ? "Reading folder…" : "Choose Folder…"}
          </button>
        </div>

        {folderPath && (
          <p className="field-label">
            Folder: {folderPath}
            {skipped && (skipped.files > 0 || skipped.folders > 0) && (
              <>
                {" — "}
                {skipped.files > 0 && `${skipped.files} unrecognised file${skipped.files === 1 ? "" : "s"} skipped`}
                {skipped.files > 0 && skipped.folders > 0 && ", "}
                {skipped.folders > 0 && `${skipped.folders} subfolder${skipped.folders === 1 ? "" : "s"} not read`}
              </>
            )}
          </p>
        )}
      </div>

      {batch.length > 0 && (
        <div className="import-batch-list">
          <span className="field-label">
            {approvedCount} of {batch.length} file{batch.length === 1 ? "" : "s"} will be imported
          </span>

          {batch.map(({ source, plan }) => {
            const state = itemStates[source.id] ?? defaultItemState();

            return (
              <div key={source.id} className="import-batch-item">
                <div className="import-batch-item-header">
                  <label className="import-batch-item-approve">
                    <input
                      type="checkbox"
                      checked={state.approved}
                      onChange={() => updateItemState(source.id, { approved: !state.approved })}
                    />
                    <span className="import-batch-item-label">{source.label}</span>
                    <span className="badge project-badge">{IMPORT_SOURCE_FORMAT_LABELS[source.format]}</span>
                  </label>
                  <button className="import-batch-item-remove" onClick={() => removeSource(source.id)}>
                    Remove
                  </button>
                </div>

                {state.approved && (
                  <ImportItemPreview
                    idPrefix={`folder-${source.id}`}
                    plan={plan}
                    discoveryContext={batchDiscoveryContext}
                    selectedSuggestions={state.selectedSuggestions}
                    onToggleSuggestion={(key) => toggleSuggestion(source.id, key)}
                    attachToProject={state.attachToProject}
                    onSetAttachToProject={(value) => updateItemState(source.id, { attachToProject: value })}
                    projectId={state.projectId}
                    onSetProjectId={(id) => updateItemState(source.id, { projectId: id })}
                    projects={projects}
                    pendingBatchIds={batchSourceIds}
                  />
                )}
              </div>
            );
          })}
        </div>
      )}

      {error && <p className="field-error">{error}</p>}

      <div className="modal-actions">
        <button className="secondary" onClick={handleClose}>
          Cancel
        </button>
        <button onClick={handleImportAll} disabled={approvedCount === 0}>
          Import {approvedCount > 0 ? approvedCount : ""} File{approvedCount === 1 ? "" : "s"}
        </button>
      </div>
    </Modal>
  );
}

export default FolderImportModal;
