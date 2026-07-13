import { useEffect } from "react";
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
import { formatDate } from "../../utils/formatDate";
import { resolveObjectRef } from "../../hooks/relationshipDiscovery";
import type { DiscoveryContext } from "../../hooks/relationshipDiscovery";
import { buildCreativeHistory } from "../../hooks/creativeHistory";
import RelatedSection from "../Relationships/RelatedSection";
import CreativeHistorySection from "../History/CreativeHistorySection";

interface AssetDetailProps {
  asset: Asset;
  projects: Project[];
  identities: Identity[];
  knowledgeEntries: KnowledgeEntry[];
  assets: Asset[];
  releases: Release[];
  captures: Capture[];
  activities: Activity[];
  onBack: () => void;
  onOpenProject: (id: string) => void;
  getRelationshipsFor: (ref: ObjectRef) => Relationship[];
  onDiscoverRelationships: (ref: ObjectRef, context: DiscoveryContext) => void;
  onConfirmRelationship: (id: string) => void;
  onDismissRelationship: (id: string) => void;
  onConnectTo: (ref: ObjectRef, label: string) => void;
}

// Forge's "Context Everywhere" surface for a single asset — reached by
// clicking its card. Mirrors KnowledgeDetail exactly in shape; unlike a
// knowledge entry, an asset always belongs to exactly one project, so the
// project link here is never conditional.
function AssetDetail({
  asset,
  projects,
  identities,
  knowledgeEntries,
  assets,
  releases,
  captures,
  activities,
  onBack,
  onOpenProject,
  getRelationshipsFor,
  onDiscoverRelationships,
  onConfirmRelationship,
  onDismissRelationship,
  onConnectTo,
}: AssetDetailProps) {
  const project = projects.find((candidate) => candidate.id === asset.projectId) ?? null;

  const assetRef: ObjectRef = { type: "asset", id: asset.id };

  const discoveryContext: DiscoveryContext = {
    identities,
    projects,
    knowledgeEntries,
    assets,
    releases,
    captures,
  };

  useEffect(() => {
    onDiscoverRelationships(assetRef, discoveryContext);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    asset.id,
    identities.length,
    projects.length,
    knowledgeEntries.length,
    assets.length,
    releases.length,
    captures.length,
    onDiscoverRelationships,
  ]);

  const assetRelationships = getRelationshipsFor(assetRef);

  // See KnowledgeDetail's identical comment — an asset has no children of
  // its own, so relatedRefs is always empty here.
  const assetHistory = buildCreativeHistory(
    assetRef,
    [],
    activities,
    assetRelationships,
    (ref) => resolveObjectRef(ref, discoveryContext),
  );

  return (
    <div className="detail-view">
      <button className="back-btn" onClick={onBack}>
        ← Back to Assets
      </button>

      <header className="detail-header">
        <div className="detail-title-row">
          <h2 className="detail-title">{asset.name}</h2>
          <span className={`badge type-badge type-${asset.type.toLowerCase()}`}>
            {asset.type}
          </span>
        </div>

        <p className="detail-meta">Added {formatDate(asset.createdAt)}</p>

        <p className="detail-description">{asset.description || "No description yet."}</p>

        {project && (
          <button className="detail-project-link" onClick={() => onOpenProject(project.id)}>
            Part of {project.name} →
          </button>
        )}
      </header>

      <RelatedSection
        subjectRef={assetRef}
        subjectLabel={asset.name}
        relationships={assetRelationships}
        resolve={(ref) => resolveObjectRef(ref, discoveryContext)}
        onConfirm={onConfirmRelationship}
        onDismiss={onDismissRelationship}
        onConnectTo={onConnectTo}
      />

      <CreativeHistorySection entries={assetHistory} />
    </div>
  );
}

export default AssetDetail;
