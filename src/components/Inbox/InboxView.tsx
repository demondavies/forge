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
import InboxList from "./InboxList";
import CaptureDetail from "./CaptureDetail";
import "./Inbox.css";

interface InboxViewProps {
  captures: Capture[];
  onQuickCapture: () => void;
  selectedCapture: Capture | null;
  onSelectCapture: (id: string | null) => void;
  identities: Identity[];
  projects: Project[];
  knowledgeEntries: KnowledgeEntry[];
  assets: Asset[];
  releases: Release[];
  activities: Activity[];
  getRelationshipsFor: (ref: ObjectRef) => Relationship[];
  onDiscoverRelationships: (ref: ObjectRef, context: DiscoveryContext) => void;
  onConfirmRelationship: (id: string) => void;
  onDismissRelationship: (id: string) => void;
  onConnectTo: (ref: ObjectRef, label: string) => void;
}

// The "Inbox" section of the workspace: a toolbar with the "Quick Capture"
// button, plus either a grid of capture cards or a friendly empty state.
// Mirrors AssetView/KnowledgeView/ReleaseView: selecting a capture replaces
// the list with its own CaptureDetail. This is where anything captured
// without a home (via Ctrl/Cmd+K or this view's own button) safely lives
// until the creator decides to organize it.
function InboxView({
  captures,
  onQuickCapture,
  selectedCapture,
  onSelectCapture,
  identities,
  projects,
  knowledgeEntries,
  assets,
  releases,
  activities,
  getRelationshipsFor,
  onDiscoverRelationships,
  onConfirmRelationship,
  onDismissRelationship,
  onConnectTo,
}: InboxViewProps) {
  if (selectedCapture) {
    return (
      <CaptureDetail
        key={selectedCapture.id}
        capture={selectedCapture}
        projects={projects}
        identities={identities}
        knowledgeEntries={knowledgeEntries}
        assets={assets}
        releases={releases}
        captures={captures}
        activities={activities}
        onBack={() => onSelectCapture(null)}
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
        <h2 className="section-title">Inbox</h2>
        <button className="section-action-btn" onClick={onQuickCapture}>
          + Quick Capture
        </button>
      </div>

      {/* Conditional rendering: show the empty state OR the list, never
          both — there's nothing useful to show alongside zero captures. */}
      {captures.length === 0 ? (
        <div className="section-empty">
          <p className="section-empty-title">Your inbox is empty.</p>
          <p className="section-empty-subtitle">
            Capture a thought — you can organize it later.
          </p>
        </div>
      ) : (
        <InboxList
          captures={captures}
          selectedCaptureId={null}
          onSelect={onSelectCapture}
        />
      )}
    </section>
  );
}

export default InboxView;
