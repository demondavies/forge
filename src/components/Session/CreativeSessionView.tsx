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
import { DISCOVERY_TYPE_META } from "../../hooks/discoveryEngine";
import { OPPORTUNITY_TYPE_META } from "../../hooks/opportunityEngine";
import type { ChiefObservation } from "../../hooks/chief";
import { buildCreativeSession } from "../../hooks/creativeSession";
import type { DiscoveryContext } from "../../hooks/relationshipDiscovery";
import { resolveObjectRef } from "../../hooks/relationshipDiscovery";
import CreativeHistorySection from "../History/CreativeHistorySection";
import KnowledgeList from "../Knowledge/KnowledgeList";
import OpportunityCard from "../Opportunity/OpportunityCard";
import "./CreativeSession.css";

interface CreativeSessionViewProps {
  project: Project;
  identities: Identity[];
  projects: Project[];
  knowledgeEntries: KnowledgeEntry[];
  assets: Asset[];
  releases: Release[];
  captures: Capture[];
  relationships: Relationship[];
  activities: Activity[];
  onOpenObject: (ref: ObjectRef) => void;
  onOpenKnowledgeEntry: (id: string) => void;
  // Reuses whatever navigation already opened this project's own workspace
  // (see Workspace.tsx) — there is no separate "end session" action; this
  // is the same "← Back to X" a creator would use anywhere else in Forge.
  onEndSession: () => void;
}

// One ChiefObservation, rendered locally rather than through a shared
// component. ChiefView.tsx and MorningBriefingView.tsx already render this
// same union — normally a third occurrence like this is exactly when the
// Playbook says to extract a shared component, but doing so would mean
// editing those two files, and this sprint's mission explicitly puts Chief
// and Morning Briefings off-limits. So this duplicates the *rendering*,
// not the *reasoning* (buildChiefObservations/buildPerspective are still
// called completely unmodified in creativeSession.ts) — a deliberate,
// narrower duplication than the Playbook would normally accept, flagged
// here as the clear next-sprint refactor once Chief's presentation layer
// can be touched again. Reuses the exact same CSS classes Chief already
// defined (chief-kind-badge, discovery-object-link, ...) so it looks
// identical without needing to import or modify chief.ts/ChiefView.tsx.
function SessionObservation({
  observation,
  discoveryContext,
  onOpenObject,
}: {
  observation: ChiefObservation;
  discoveryContext: DiscoveryContext;
  onOpenObject: (ref: ObjectRef) => void;
}) {
  if (observation.kind === "discovery") {
    const { discovery, perspective } = observation;
    const meta = DISCOVERY_TYPE_META[discovery.type];

    return (
      <li className="placeholder-card chief-observation">
        <div className="chief-observation-meta">
          <span className="badge chief-kind-badge chief-kind-discovery">Understanding</span>
          <span className={`badge discovery-type-badge discovery-type-${discovery.type}`}>
            {meta.icon} {meta.label}
          </span>
        </div>
        <p className="chief-observation-text">{perspective.text}</p>
        <div className="discovery-objects">
          {discovery.objects.map((ref) => {
            const resolved = resolveObjectRef(ref, discoveryContext);
            if (!resolved) return null;
            return (
              <button key={`${ref.type}-${ref.id}`} className="discovery-object-link" onClick={() => onOpenObject(ref)}>
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
    <li className="placeholder-card chief-observation">
      <div className="chief-observation-meta">
        <span className="badge chief-kind-badge chief-kind-opportunity">Possibility</span>
        <span className={`badge opportunity-type-badge opportunity-type-${opportunity.type}`}>
          {meta.icon} {meta.label}
        </span>
      </div>
      <p className="chief-observation-text">{text}</p>
      <div className="discovery-objects">
        {opportunity.objects.map((ref) => {
          const resolved = resolveObjectRef(ref, discoveryContext);
          if (!resolved) return null;
          return (
            <button key={`${ref.type}-${ref.id}`} className="discovery-object-link" onClick={() => onOpenObject(ref)}>
              {resolved.icon} {resolved.label}
            </button>
          );
        })}
      </div>
    </li>
  );
}

// A temporary, focused workspace assembled the moment a creator begins it —
// not a project view (ProjectWorkspace's own tabs, with their full lists
// and creation buttons, are one click away via "Back to Project" but never
// duplicated here), not a dashboard, not a task list. Every section is a
// read-time slice of an engine that already exists and is already correct;
// nothing here is stored, and nothing here is created except by following
// an object link out of the session entirely. Sections that have nothing
// to show simply don't render — a quiet session is a true one, not a
// broken one.
function CreativeSessionView({
  project,
  identities,
  projects,
  knowledgeEntries,
  assets,
  releases,
  captures,
  relationships,
  activities,
  onOpenObject,
  onOpenKnowledgeEntry,
  onEndSession,
}: CreativeSessionViewProps) {
  const discoveryContext: DiscoveryContext = {
    identities,
    projects,
    knowledgeEntries,
    assets,
    releases,
    captures,
    relationships,
  };

  const session = buildCreativeSession(project, discoveryContext, activities);

  return (
    <section className="section-view creative-session">
      <button className="back-btn" onClick={onEndSession}>
        ← Back to {project.name}
      </button>

      <div className="creative-session-header">
        <h2 className="section-title">Creative Session</h2>
        <p className="section-subtitle">
          {project.name} — assembled from what Forge already understands about this project, right now.
        </p>
      </div>

      {session.chiefObservations.length > 0 && (
        <div className="creative-session-section">
          <h3 className="creative-session-section-title">🧭 Chief&apos;s Coaching</h3>
          <ul className="chief-observations">
            {session.chiefObservations.map((observation) => (
              <SessionObservation
                key={observation.kind === "discovery" ? observation.perspective.id : `opportunity:${observation.opportunity.id}`}
                observation={observation}
                discoveryContext={discoveryContext}
                onOpenObject={onOpenObject}
              />
            ))}
          </ul>
        </div>
      )}

      {session.opportunities.length > 0 && (
        <div className="creative-session-section">
          <h3 className="creative-session-section-title">🌱 Current Opportunities</h3>
          <ul className="opportunity-list">
            {session.opportunities.map((opportunity) => (
              <OpportunityCard
                key={opportunity.id}
                opportunity={opportunity}
                resolve={(ref) => resolveObjectRef(ref, discoveryContext)}
                onOpenObject={onOpenObject}
              />
            ))}
          </ul>
        </div>
      )}

      {session.relatedKnowledge.length > 0 && (
        <div className="creative-session-section">
          <h3 className="creative-session-section-title">🧠 Related Knowledge</h3>
          <KnowledgeList
            entries={session.relatedKnowledge}
            projects={[project]}
            selectedEntryId={null}
            onSelect={onOpenKnowledgeEntry}
          />
        </div>
      )}

      {/* CreativeHistorySection renders its own "History" title already
          (see History.css) — no extra heading wrapper here, to avoid
          showing two titles for one section. */}
      {session.history.length > 0 && (
        <div className="creative-session-section">
          <CreativeHistorySection entries={session.history} />
        </div>
      )}

      {session.chiefObservations.length === 0 &&
        session.opportunities.length === 0 &&
        session.relatedKnowledge.length === 0 &&
        session.history.length === 0 && (
          <div className="section-empty">
            <p className="section-empty-title">A quiet start.</p>
            <p className="section-empty-subtitle">
              As you capture, connect, and build within this project, this space will begin to reflect it.
            </p>
          </div>
        )}
    </section>
  );
}

export default CreativeSessionView;
