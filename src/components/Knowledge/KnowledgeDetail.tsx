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

interface KnowledgeDetailProps {
  entry: KnowledgeEntry;
  // The active identity's full data — needed whole (not just this entry) as
  // context for relationship discovery/resolution, exactly like
  // ProjectWorkspace's own discoveryContext.
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
  onRemoveEntry: (id: string) => void;
}

// Forge's "Context Everywhere" surface for a single knowledge entry —
// reached by clicking its card. Not a tabbed workspace like Project (there's
// nothing further to drill into from here), just: the entry itself in full,
// which project (if any) it belongs to, what it's related to, and what's
// happened around it. Mirrors ProjectWorkspace's Overview tab in spirit,
// scaled down to what a single entry actually needs.
function KnowledgeDetail({
  entry,
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
  onRemoveEntry,
}: KnowledgeDetailProps) {
  const project = entry.projectId
    ? (projects.find((candidate) => candidate.id === entry.projectId) ?? null)
    : null;

  const entryRef: ObjectRef = { type: "knowledge", id: entry.id };

  const discoveryContext: DiscoveryContext = {
    identities,
    projects,
    knowledgeEntries,
    assets,
    releases,
    captures,
  };

  // Re-runs discovery whenever the identity's broader dataset changes shape
  // — a knowledge entry's matches (matchSimilarTitle, matchReference, ...)
  // can come from anywhere, not just its own project. Mirrors
  // ProjectWorkspace's own discovery effect.
  useEffect(() => {
    onDiscoverRelationships(entryRef, discoveryContext);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    entry.id,
    identities.length,
    projects.length,
    knowledgeEntries.length,
    assets.length,
    releases.length,
    captures.length,
    onDiscoverRelationships,
  ]);

  const entryRelationships = getRelationshipsFor(entryRef);

  // Creative History merges this entry's own activity with every connection
  // it has formed, in the order it actually happened — see
  // creativeHistory.ts. A knowledge entry has no children of its own (only
  // Project does), so relatedRefs is always empty here.
  const entryHistory = buildCreativeHistory(
    entryRef,
    [],
    activities,
    entryRelationships,
    (ref) => resolveObjectRef(ref, discoveryContext),
  );

  return (
    <div className="detail-view">
      <div className="detail-nav-row">
        <button className="back-btn" onClick={onBack}>
          ← Back to Knowledge
        </button>
        <button
          className="detail-remove-btn"
          onClick={() => { onRemoveEntry(entry.id); onBack(); }}
        >
          Remove
        </button>
      </div>

      <header className="detail-header">
        <div className="detail-title-row">
          <h2 className="detail-title">{entry.title}</h2>
          <span className={`badge source-badge source-${entry.source.toLowerCase()}`}>
            {entry.source}
          </span>
        </div>

        <p className="detail-meta">Captured {formatDate(entry.createdAt)}</p>

        <p className="detail-description">{entry.insight}</p>

        {project ? (
          <button className="detail-project-link" onClick={() => onOpenProject(project.id)}>
            Part of {project.name} →
          </button>
        ) : (
          <p className="detail-meta">Not attached to a project.</p>
        )}
      </header>

      <RelatedSection
        subjectRef={entryRef}
        subjectLabel={entry.title}
        relationships={entryRelationships}
        resolve={(ref) => resolveObjectRef(ref, discoveryContext)}
        onConfirm={onConfirmRelationship}
        onDismiss={onDismissRelationship}
        onConnectTo={onConnectTo}
      />

      <CreativeHistorySection entries={entryHistory} />
    </div>
  );
}

export default KnowledgeDetail;
