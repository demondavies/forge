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

interface ReleaseDetailProps {
  release: Release;
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

// Forge's "Context Everywhere" surface for a single release — reached by
// clicking its card. Mirrors AssetDetail/KnowledgeDetail exactly in shape.
function ReleaseDetail({
  release,
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
}: ReleaseDetailProps) {
  const project = projects.find((candidate) => candidate.id === release.projectId) ?? null;

  const releaseRef: ObjectRef = { type: "release", id: release.id };

  const discoveryContext: DiscoveryContext = {
    identities,
    projects,
    knowledgeEntries,
    assets,
    releases,
    captures,
  };

  useEffect(() => {
    onDiscoverRelationships(releaseRef, discoveryContext);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    release.id,
    identities.length,
    projects.length,
    knowledgeEntries.length,
    assets.length,
    releases.length,
    captures.length,
    onDiscoverRelationships,
  ]);

  const releaseRelationships = getRelationshipsFor(releaseRef);

  // See KnowledgeDetail's identical comment — a release has no children of
  // its own, so relatedRefs is always empty here.
  const releaseHistory = buildCreativeHistory(
    releaseRef,
    [],
    activities,
    releaseRelationships,
    (ref) => resolveObjectRef(ref, discoveryContext),
  );

  // "Apple Music" has a space, which isn't valid in a CSS class name as
  // typed — turn it into "apple-music" for platform-${slug} below (same
  // trick as ReleaseCard).
  const platformSlug = release.platform.toLowerCase().replace(/\s+/g, "-");

  return (
    <div className="detail-view">
      <button className="back-btn" onClick={onBack}>
        ← Back to Releases
      </button>

      <header className="detail-header">
        <div className="detail-title-row">
          <h2 className="detail-title">{release.title}</h2>
          <span className={`badge platform-badge platform-${platformSlug}`}>
            {release.platform}
          </span>
          <span
            className={`badge release-status-badge release-status-${release.status.toLowerCase()}`}
          >
            {release.status}
          </span>
        </div>

        <p className="detail-meta">
          Releasing {formatDate(release.releaseDate)} · Added {formatDate(release.createdAt)}
        </p>

        <p className="detail-description">{release.description || "No description yet."}</p>

        {project && (
          <button className="detail-project-link" onClick={() => onOpenProject(project.id)}>
            Part of {project.name} →
          </button>
        )}
      </header>

      <RelatedSection
        subjectRef={releaseRef}
        subjectLabel={release.title}
        relationships={releaseRelationships}
        resolve={(ref) => resolveObjectRef(ref, discoveryContext)}
        onConfirm={onConfirmRelationship}
        onDismiss={onDismissRelationship}
        onConnectTo={onConnectTo}
      />

      <CreativeHistorySection entries={releaseHistory} />
    </div>
  );
}

export default ReleaseDetail;
