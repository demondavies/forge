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
import AssetList from "./AssetList";
import AssetDetail from "./AssetDetail";
import "./Asset.css";

interface AssetViewProps {
  assets: Asset[];
  projects: Project[];
  onAddAsset: () => void;
  selectedAsset: Asset | null;
  onSelectAsset: (id: string | null) => void;
  identities: Identity[];
  knowledgeEntries: KnowledgeEntry[];
  releases: Release[];
  captures: Capture[];
  activities: Activity[];
  onOpenProject: (id: string) => void;
  getRelationshipsFor: (ref: ObjectRef) => Relationship[];
  onDiscoverRelationships: (ref: ObjectRef, context: DiscoveryContext) => void;
  onConfirmRelationship: (id: string) => void;
  onDismissRelationship: (id: string) => void;
  onConnectTo: (ref: ObjectRef, label: string) => void;
}

// The whole "Assets" section of the workspace: a toolbar with the
// "Add Asset" button, plus either a grid of asset cards or a friendly empty
// state — whichever applies to the currently selected identity's assets.
// Mirrors KnowledgeView: selecting an asset replaces the list with its own
// AssetDetail.
function AssetView({
  assets,
  projects,
  onAddAsset,
  selectedAsset,
  onSelectAsset,
  identities,
  knowledgeEntries,
  releases,
  captures,
  activities,
  onOpenProject,
  getRelationshipsFor,
  onDiscoverRelationships,
  onConfirmRelationship,
  onDismissRelationship,
  onConnectTo,
}: AssetViewProps) {
  if (selectedAsset) {
    return (
      <AssetDetail
        key={selectedAsset.id}
        asset={selectedAsset}
        projects={projects}
        identities={identities}
        knowledgeEntries={knowledgeEntries}
        assets={assets}
        releases={releases}
        captures={captures}
        activities={activities}
        onBack={() => onSelectAsset(null)}
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
        <h2 className="section-title">Assets</h2>
        <button className="section-action-btn" onClick={onAddAsset}>
          + Add Asset
        </button>
      </div>

      {/* Conditional rendering: show the empty state OR the list, never
          both — there's nothing useful to show alongside zero assets. */}
      {assets.length === 0 ? (
        <div className="section-empty">
          <p className="section-empty-title">No assets yet.</p>
          <p className="section-empty-subtitle">
            Every project begins with a first asset.
          </p>
        </div>
      ) : (
        <AssetList
          assets={assets}
          projects={projects}
          selectedAssetId={null}
          onSelect={onSelectAsset}
        />
      )}
    </section>
  );
}

export default AssetView;
