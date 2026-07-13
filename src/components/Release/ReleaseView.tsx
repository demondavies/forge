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
import ReleaseList from "./ReleaseList";
import ReleaseDetail from "./ReleaseDetail";
import "./Release.css";

interface ReleaseViewProps {
  releases: Release[];
  projects: Project[];
  onCreateRelease: () => void;
  selectedRelease: Release | null;
  onSelectRelease: (id: string | null) => void;
  identities: Identity[];
  knowledgeEntries: KnowledgeEntry[];
  assets: Asset[];
  captures: Capture[];
  activities: Activity[];
  onOpenProject: (id: string) => void;
  getRelationshipsFor: (ref: ObjectRef) => Relationship[];
  onDiscoverRelationships: (ref: ObjectRef, context: DiscoveryContext) => void;
  onConfirmRelationship: (id: string) => void;
  onDismissRelationship: (id: string) => void;
  onConnectTo: (ref: ObjectRef, label: string) => void;
}

// The whole "Releases" section of the workspace: a toolbar with the
// "Create Release" button, plus either a grid of release cards or a
// friendly empty state — whichever applies to the currently selected
// identity's releases. Mirrors AssetView/KnowledgeView: selecting a release
// replaces the list with its own ReleaseDetail.
function ReleaseView({
  releases,
  projects,
  onCreateRelease,
  selectedRelease,
  onSelectRelease,
  identities,
  knowledgeEntries,
  assets,
  captures,
  activities,
  onOpenProject,
  getRelationshipsFor,
  onDiscoverRelationships,
  onConfirmRelationship,
  onDismissRelationship,
  onConnectTo,
}: ReleaseViewProps) {
  if (selectedRelease) {
    return (
      <ReleaseDetail
        key={selectedRelease.id}
        release={selectedRelease}
        projects={projects}
        identities={identities}
        knowledgeEntries={knowledgeEntries}
        assets={assets}
        releases={releases}
        captures={captures}
        activities={activities}
        onBack={() => onSelectRelease(null)}
        onOpenProject={onOpenProject}
        getRelationshipsFor={getRelationshipsFor}
        onDiscoverRelationships={onDiscoverRelationships}
        onConfirmRelationship={onConfirmRelationship}
        onDismissRelationship={onDismissRelationship}
        onConnectTo={onConnectTo}
      />
    );
  }

  return (
    <section className="section-view">
      <div className="section-toolbar">
        <h2 className="section-title">Releases</h2>
        <button className="section-action-btn" onClick={onCreateRelease}>
          + Create Release
        </button>
      </div>

      {/* Conditional rendering: show the empty state OR the list, never
          both — there's nothing useful to show alongside zero releases. */}
      {releases.length === 0 ? (
        <div className="section-empty">
          <p className="section-empty-title">No releases yet.</p>
          <p className="section-empty-subtitle">
            Every finished project deserves to be shared.
          </p>
        </div>
      ) : (
        <ReleaseList
          releases={releases}
          projects={projects}
          selectedReleaseId={null}
          onSelect={onSelectRelease}
        />
      )}
    </section>
  );
}

export default ReleaseView;
