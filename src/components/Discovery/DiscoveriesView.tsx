import type {
  Asset,
  Capture,
  Identity,
  KnowledgeEntry,
  ObjectRef,
  Project,
  Relationship,
  Release,
} from "../../types";
import { findDiscoveries } from "../../hooks/discoveryEngine";
import { resolveObjectRef } from "../../hooks/relationshipDiscovery";
import type { DiscoveryContext } from "../../hooks/relationshipDiscovery";
import DiscoveryCard from "./DiscoveryCard";
import "./Discovery.css";

interface DiscoveriesViewProps {
  identities: Identity[];
  projects: Project[];
  knowledgeEntries: KnowledgeEntry[];
  assets: Asset[];
  releases: Release[];
  captures: Capture[];
  relationships: Relationship[];
  onOpenObject: (ref: ObjectRef) => void;
}

// The Discovery Engine's one exploration surface: a quiet, read-only list,
// not a dashboard. Everything here is recomputed from the active identity's
// own data on every render (see findDiscoveries) — nothing is stored,
// confirmed, or dismissed; that's deliberately left for a future sprint
// once Companions exist to communicate these findings.
function DiscoveriesView({
  identities,
  projects,
  knowledgeEntries,
  assets,
  releases,
  captures,
  relationships,
  onOpenObject,
}: DiscoveriesViewProps) {
  const discoveryContext: DiscoveryContext = {
    identities,
    projects,
    knowledgeEntries,
    assets,
    releases,
    captures,
    relationships,
  };

  const discoveries = findDiscoveries(discoveryContext);

  return (
    <section className="section-view">
      <h2 className="section-title">Discoveries</h2>
      <p className="section-subtitle">
        Deterministic patterns Forge has noticed across your Creative Knowledge Engine.
      </p>

      {discoveries.length === 0 ? (
        <div className="section-empty">
          <p className="section-empty-title">Nothing to report yet.</p>
          <p className="section-empty-subtitle">
            As you capture, connect, and build, Forge will start noticing patterns here.
          </p>
        </div>
      ) : (
        <ul className="discovery-list">
          {discoveries.map((discovery) => (
            <DiscoveryCard
              key={discovery.id}
              discovery={discovery}
              resolve={(ref) => resolveObjectRef(ref, discoveryContext)}
              onOpenObject={onOpenObject}
            />
          ))}
        </ul>
      )}
    </section>
  );
}

export default DiscoveriesView;
