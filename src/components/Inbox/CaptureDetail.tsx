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
import { truncateText } from "../../utils/truncateText";

interface CaptureDetailProps {
  capture: Capture;
  projects: Project[];
  identities: Identity[];
  knowledgeEntries: KnowledgeEntry[];
  assets: Asset[];
  releases: Release[];
  captures: Capture[];
  activities: Activity[];
  onBack: () => void;
  getRelationshipsFor: (ref: ObjectRef) => Relationship[];
  onDiscoverRelationships: (ref: ObjectRef, context: DiscoveryContext) => void;
  onConfirmRelationship: (id: string) => void;
  onDismissRelationship: (id: string) => void;
  onConnectTo: (ref: ObjectRef, label: string) => void;
}

// Forge's "Context Everywhere" surface for a single capture — reached by
// clicking its card in the Inbox. A Capture never has a project (see
// types.ts — it's deliberately unclassified), so there's no project-context
// line here, unlike Knowledge/Asset/Release's detail views.
function CaptureDetail({
  capture,
  projects,
  identities,
  knowledgeEntries,
  assets,
  releases,
  captures,
  activities,
  onBack,
  getRelationshipsFor,
  onDiscoverRelationships,
  onConfirmRelationship,
  onDismissRelationship,
  onConnectTo,
}: CaptureDetailProps) {
  const captureRef: ObjectRef = { type: "capture", id: capture.id };

  const discoveryContext: DiscoveryContext = {
    identities,
    projects,
    knowledgeEntries,
    assets,
    releases,
    captures,
  };

  useEffect(() => {
    onDiscoverRelationships(captureRef, discoveryContext);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    capture.id,
    identities.length,
    projects.length,
    knowledgeEntries.length,
    assets.length,
    releases.length,
    captures.length,
    onDiscoverRelationships,
  ]);

  const captureRelationships = getRelationshipsFor(captureRef);

  // See KnowledgeDetail's identical comment — a capture has no children of
  // its own, so relatedRefs is always empty here.
  const captureHistory = buildCreativeHistory(
    captureRef,
    [],
    activities,
    captureRelationships,
    (ref) => resolveObjectRef(ref, discoveryContext),
  );

  // "Release Note" has a space, which isn't valid in a CSS class name as
  // typed — turn it into "release-note" for capture-type-${slug} below
  // (same trick as InboxCard).
  const typeSlug = capture.type.toLowerCase().replace(/\s+/g, "-");

  return (
    <div className="detail-view">
      <button className="back-btn" onClick={onBack}>
        ← Back to Inbox
      </button>

      <header className="detail-header">
        <div className="detail-title-row">
          <span className={`badge capture-type-badge capture-type-${typeSlug}`}>
            {capture.type}
          </span>
        </div>

        <p className="detail-meta">Captured {formatDate(capture.createdAt)}</p>

        <p className="detail-description">{capture.content}</p>
      </header>

      <RelatedSection
        subjectRef={captureRef}
        subjectLabel={truncateText(capture.content, 60)}
        relationships={captureRelationships}
        resolve={(ref) => resolveObjectRef(ref, discoveryContext)}
        onConfirm={onConfirmRelationship}
        onDismiss={onDismissRelationship}
        onConnectTo={onConnectTo}
      />

      <CreativeHistorySection entries={captureHistory} />
    </div>
  );
}

export default CaptureDetail;
