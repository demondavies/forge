import type {
  Activity,
  Asset,
  Capture,
  Identity,
  KnowledgeEntry,
  ObjectRef,
  Project,
  Relationship,
  Release,
} from "../../types";
import type { DiscoveryContext } from "../../hooks/relationshipDiscovery";
import KnowledgeList from "./KnowledgeList";
import KnowledgeDetail from "./KnowledgeDetail";
import "./Knowledge.css";

interface KnowledgeViewProps {
  entries: KnowledgeEntry[];
  projects: Project[];
  onCaptureKnowledge: () => void;
  onImport: () => void;
  onImportFolder: () => void;
  onImportVault: () => void;
  selectedEntry: KnowledgeEntry | null;
  onSelectEntry: (id: string | null) => void;
  // Needed whole (not just `entries`/`projects` above) as context for
  // KnowledgeDetail's relationship discovery/resolution and Recent Activity
  // — see KnowledgeDetail.tsx.
  identities: Identity[];
  assets: Asset[];
  releases: Release[];
  captures: Capture[];
  activities: Activity[];
  onOpenProject: (id: string) => void;
  getRelationshipsFor: (ref: ObjectRef) => Relationship[];
  onDiscoverRelationships: (ref: ObjectRef, context: DiscoveryContext) => void;
  onConfirmRelationship: (id: string) => void;
  onDismissRelationship: (id: string) => void;
  onConnectTo: (ref: ObjectRef, label: string) => void;
  onRemoveEntry: (id: string) => void;
}

// The whole "Knowledge" section of the workspace: a toolbar with the
// "Capture Knowledge" button, plus either a grid of knowledge cards or a
// friendly empty state — whichever applies to the currently selected
// identity's knowledge. Mirrors ProjectsView: as soon as an entry is
// selected, it's replaced entirely by that entry's dedicated
// KnowledgeDetail, same as a project card opening ProjectWorkspace.
function KnowledgeView({
  entries,
  projects,
  onCaptureKnowledge,
  onImport,
  onImportFolder,
  onImportVault,
  selectedEntry,
  onSelectEntry,
  identities,
  assets,
  releases,
  captures,
  activities,
  onOpenProject,
  getRelationshipsFor,
  onDiscoverRelationships,
  onConfirmRelationship,
  onDismissRelationship,
  onConnectTo,
  onRemoveEntry,
}: KnowledgeViewProps) {
  if (selectedEntry) {
    return (
      <KnowledgeDetail
        key={selectedEntry.id}
        entry={selectedEntry}
        projects={projects}
        identities={identities}
        knowledgeEntries={entries}
        assets={assets}
        releases={releases}
        captures={captures}
        activities={activities}
        onBack={() => onSelectEntry(null)}
        onOpenProject={onOpenProject}
        getRelationshipsFor={getRelationshipsFor}
        onDiscoverRelationships={onDiscoverRelationships}
        onConfirmRelationship={onConfirmRelationship}
        onDismissRelationship={onDismissRelationship}
        onConnectTo={onConnectTo}
        onRemoveEntry={onRemoveEntry}
      />
    );
  }

  return (
    <section className="section-view">
      <div className="section-toolbar">
        <h2 className="section-title">Knowledge</h2>
        <div className="section-toolbar-actions">
          {/* Import, Import Folder, and Import Vault are just other ways a
              Knowledge entry comes to exist — they sit beside Capture
              Knowledge rather than somewhere separate, since once created
              there's no difference between any of them. Import Vault reuses
              the exact same FolderImportModal as Import Folder (see
              App.tsx) — Obsidian is a label on this button, nothing more. */}
          <button className="section-action-btn secondary" onClick={onImportVault}>
            + Import Vault
          </button>
          <button className="section-action-btn secondary" onClick={onImportFolder}>
            + Import Folder
          </button>
          <button className="section-action-btn secondary" onClick={onImport}>
            + Import
          </button>
          <button className="section-action-btn" onClick={onCaptureKnowledge}>
            + Capture Knowledge
          </button>
        </div>
      </div>

      {/* Conditional rendering: show the empty state OR the list, never
          both — there's nothing useful to show alongside zero entries. */}
      {entries.length === 0 ? (
        <div className="section-empty">
          <p className="section-empty-title">No knowledge captured yet.</p>
          <p className="section-empty-subtitle">
            Small lessons become great experience.
          </p>
        </div>
      ) : (
        <KnowledgeList
          entries={entries}
          projects={projects}
          selectedEntryId={null}
          onSelect={onSelectEntry}
        />
      )}
    </section>
  );
}

export default KnowledgeView;
