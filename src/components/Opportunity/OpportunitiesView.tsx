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
import { findOpportunities } from "../../hooks/opportunityEngine";
import { resolveObjectRef } from "../../hooks/relationshipDiscovery";
import type { DiscoveryContext } from "../../hooks/relationshipDiscovery";
import OpportunityCard from "./OpportunityCard";
import "./Opportunity.css";

interface OpportunitiesViewProps {
  identities: Identity[];
  projects: Project[];
  knowledgeEntries: KnowledgeEntry[];
  assets: Asset[];
  releases: Release[];
  captures: Capture[];
  relationships: Relationship[];
  onOpenObject: (ref: ObjectRef) => void;
}

// The Opportunity Engine's one exploration surface — deliberately a quiet,
// read-only list, not a dashboard: no priority sort a creator can override,
// no due dates, no checkboxes, nothing to mark done. Everything here is
// recomputed from the active identity's own data on every render (see
// findOpportunities) — nothing is stored, confirmed, or dismissed, the
// same Temporary Truth Principle Discoveries already applies.
function OpportunitiesView({
  identities,
  projects,
  knowledgeEntries,
  assets,
  releases,
  captures,
  relationships,
  onOpenObject,
}: OpportunitiesViewProps) {
  const discoveryContext: DiscoveryContext = {
    identities,
    projects,
    knowledgeEntries,
    assets,
    releases,
    captures,
    relationships,
  };

  const opportunities = findOpportunities(discoveryContext);

  return (
    <section className="section-view">
      <h2 className="section-title">Opportunities</h2>
      <p className="section-subtitle">
        Deterministic openings Forge notices in what you've already built — never a task list, always your call.
      </p>

      {opportunities.length === 0 ? (
        <div className="section-empty">
          <p className="section-empty-title">Nothing stands out yet.</p>
          <p className="section-empty-subtitle">
            As your work grows, Forge will start noticing openings here.
          </p>
        </div>
      ) : (
        <ul className="opportunity-list">
          {opportunities.map((opportunity) => (
            <OpportunityCard
              key={opportunity.id}
              opportunity={opportunity}
              resolve={(ref) => resolveObjectRef(ref, discoveryContext)}
              onOpenObject={onOpenObject}
            />
          ))}
        </ul>
      )}
    </section>
  );
}

export default OpportunitiesView;
