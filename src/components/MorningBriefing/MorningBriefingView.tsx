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
import { findDiscoveries } from "../../hooks/discoveryEngine";
import { DISCOVERY_TYPE_META } from "../../hooks/discoveryEngine";
import { findOpportunities } from "../../hooks/opportunityEngine";
import { OPPORTUNITY_TYPE_META } from "../../hooks/opportunityEngine";
import { buildChiefObservations } from "../../hooks/chief";
import { resolveObjectRef } from "../../hooks/relationshipDiscovery";
import type { DiscoveryContext } from "../../hooks/relationshipDiscovery";
import "./MorningBriefing.css";

interface MorningBriefingViewProps {
  identities: Identity[];
  projects: Project[];
  knowledgeEntries: KnowledgeEntry[];
  assets: Asset[];
  releases: Release[];
  captures: Capture[];
  relationships: Relationship[];
  activities: Activity[];
  onOpenObject: (ref: ObjectRef) => void;
}

// "A small number of meaningful observations" (Chief's own limit, unchanged
// — see chief.ts) sets the tone; these two mirror it so no section
// dominates the other and the whole briefing stays a short, calm read.
const RECENT_ACTIVITY_LIMIT = 3;
const RECENT_CONNECTIONS_LIMIT = 3;

// The first thing a creator sees when a session begins — replacing the
// hardcoded "coming soon" Overview cards this section used to show (see
// this file's own history: those were always meant to "eventually come
// from real project/knowledge/release data instead of being hardcoded").
// Nothing here is computed by the briefing itself: Chief's Observations
// come straight from chief.ts, Recent Activity is just useActivity()'s own
// already-sorted list sliced down, and Recent Connections is the existing
// relationships array filtered to what's actually confirmed and sorted by
// its own real createdAt. If the underlying data changes, this view
// changes automatically — there is nothing here to keep in sync by hand.
function MorningBriefingView({
  identities,
  projects,
  knowledgeEntries,
  assets,
  releases,
  captures,
  relationships,
  activities,
  onOpenObject,
}: MorningBriefingViewProps) {
  const discoveryContext: DiscoveryContext = {
    identities,
    projects,
    knowledgeEntries,
    assets,
    releases,
    captures,
    relationships,
  };

  // Chief's own observations, entirely unchanged — the briefing never
  // computes a Discovery, an Opportunity, or a Perspective itself, it only
  // asks for what Chief already has. Chief Coaching's richer, two-source
  // list arrives here automatically the moment Chief itself started
  // producing it — nothing about how the briefing asks for observations
  // needed to change, only how it renders the (now two possible) shapes.
  const observations = buildChiefObservations(
    findDiscoveries(discoveryContext),
    findOpportunities(discoveryContext),
  );

  // Already sorted newest-first by useActivity() — just take the top few.
  const recentActivity = activities.slice(0, RECENT_ACTIVITY_LIMIT);

  // A still-"suggested" relationship hasn't actually happened yet (the
  // same rule Creative History already applies to its own milestones) —
  // a summary of what's real only includes what's been confirmed.
  const recentConnections = [...relationships]
    .filter((relationship) => relationship.status === "confirmed")
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, RECENT_CONNECTIONS_LIMIT);

  const hasAnything =
    observations.length > 0 || recentActivity.length > 0 || recentConnections.length > 0;

  return (
    <section className="section-view">
      <h2 className="section-title">Today</h2>
      <p className="section-subtitle">
        A calm summary of where things stand — built entirely from what Forge already understands.
      </p>

      {!hasAnything ? (
        <div className="section-empty">
          <p className="section-empty-title">A clean start.</p>
          <p className="section-empty-subtitle">
            As you capture, connect, and build, this space will begin to reflect it.
          </p>
        </div>
      ) : (
        <>
          {observations.length > 0 && (
            <div className="briefing-section">
              <h3 className="briefing-section-title">🧭 Chief&apos;s Observations</h3>
              <ul className="briefing-list">
                {observations.map((observation) => {
                  // Same two shapes ChiefView renders, kept just as
                  // distinguishable here — see chief.ts's own doc comment
                  // on why this is a union, never a merged shape.
                  if (observation.kind === "discovery") {
                    const { discovery, perspective } = observation;
                    const meta = DISCOVERY_TYPE_META[discovery.type];

                    return (
                      <li key={perspective.id} className="placeholder-card briefing-item">
                        <div className="chief-observation-meta">
                          <span className="badge chief-kind-badge chief-kind-discovery">Understanding</span>
                          <span className={`badge discovery-type-badge discovery-type-${discovery.type}`}>
                            {meta.icon} {meta.label}
                          </span>
                        </div>
                        <p className="briefing-item-text">{perspective.text}</p>
                        <div className="discovery-objects">
                          {discovery.objects.map((ref) => {
                            const resolved = resolveObjectRef(ref, discoveryContext);
                            if (!resolved) return null;
                            return (
                              <button
                                key={`${ref.type}-${ref.id}`}
                                className="discovery-object-link"
                                onClick={() => onOpenObject(ref)}
                              >
                                {resolved.icon} {resolved.label}
                              </button>
                            );
                          })}
                        </div>
                      </li>
                    );
                  }

                  const { opportunity, text } = observation;
                  const meta = OPPORTUNITY_TYPE_META[opportunity.type];

                  return (
                    <li key={`opportunity:${opportunity.id}`} className="placeholder-card briefing-item">
                      <div className="chief-observation-meta">
                        <span className="badge chief-kind-badge chief-kind-opportunity">Possibility</span>
                        <span className={`badge opportunity-type-badge opportunity-type-${opportunity.type}`}>
                          {meta.icon} {meta.label}
                        </span>
                      </div>
                      <p className="briefing-item-text">{text}</p>
                      <div className="discovery-objects">
                        {opportunity.objects.map((ref) => {
                          const resolved = resolveObjectRef(ref, discoveryContext);
                          if (!resolved) return null;
                          return (
                            <button
                              key={`${ref.type}-${ref.id}`}
                              className="discovery-object-link"
                              onClick={() => onOpenObject(ref)}
                            >
                              {resolved.icon} {resolved.label}
                            </button>
                          );
                        })}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {recentActivity.length > 0 && (
            <div className="briefing-section">
              <h3 className="briefing-section-title">📜 Recent Activity</h3>
              <ul className="briefing-list">
                {recentActivity.map((activity) => {
                  const ref: ObjectRef = {
                    type: activity.relatedObjectType,
                    id: activity.relatedObjectId,
                  };
                  // Identity itself has no "Context Everywhere" page to
                  // jump to — skip the link rather than show one that
                  // silently does nothing.
                  const resolved =
                    ref.type === "identity" ? null : resolveObjectRef(ref, discoveryContext);

                  return (
                    <li key={activity.id} className="placeholder-card briefing-item">
                      <p className="briefing-item-text">{activity.title}</p>
                      {resolved && (
                        <div className="discovery-objects">
                          <button className="discovery-object-link" onClick={() => onOpenObject(ref)}>
                            {resolved.icon} {resolved.label}
                          </button>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {recentConnections.length > 0 && (
            <div className="briefing-section">
              <h3 className="briefing-section-title">🔗 Recent Connections</h3>
              <ul className="briefing-list">
                {recentConnections.map((relationship) => {
                  const sourceResolved = resolveObjectRef(relationship.source, discoveryContext);
                  const targetResolved = resolveObjectRef(relationship.target, discoveryContext);

                  return (
                    <li key={relationship.id} className="placeholder-card briefing-item">
                      <p className="briefing-item-text">{relationship.reason}</p>
                      <div className="discovery-objects">
                        {sourceResolved && (
                          <button
                            className="discovery-object-link"
                            onClick={() => onOpenObject(relationship.source)}
                          >
                            {sourceResolved.icon} {sourceResolved.label}
                          </button>
                        )}
                        {targetResolved && (
                          <button
                            className="discovery-object-link"
                            onClick={() => onOpenObject(relationship.target)}
                          >
                            {targetResolved.icon} {targetResolved.label}
                          </button>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </>
      )}
    </section>
  );
}

export default MorningBriefingView;
