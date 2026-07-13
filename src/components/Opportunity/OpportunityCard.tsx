import type { Opportunity } from "../../hooks/opportunityEngine";
import { OPPORTUNITY_TYPE_META } from "../../hooks/opportunityEngine";
import type { ObjectRef } from "../../types";

interface OpportunityCardProps {
  opportunity: Opportunity;
  resolve: (ref: ObjectRef) => { label: string; icon: string } | null;
  onOpenObject: (ref: ObjectRef) => void;
}

// One opportunity, answering every question the mission requires: what was
// noticed (observation), why it matters (rationale), which objects are
// involved (the clickable links below, reusing the exact same "Context
// Everywhere" navigation every other object surface already has), and
// which rule produced it (the type badge). Deliberately does not offer a
// way to dismiss, complete, or snooze anything — an Opportunity isn't a
// task, so there's nothing here to mark done. No Companion-perspective
// picker either (unlike DiscoveryCard) — Companion coaching is explicitly
// future work this sprint doesn't implement.
function OpportunityCard({ opportunity, resolve, onOpenObject }: OpportunityCardProps) {
  const meta = OPPORTUNITY_TYPE_META[opportunity.type];

  return (
    <li className="placeholder-card opportunity-card">
      <span className={`badge opportunity-type-badge opportunity-type-${opportunity.type}`}>
        {meta.icon} {meta.label}
      </span>

      <p className="opportunity-observation">{opportunity.observation}</p>
      <p className="opportunity-rationale">{opportunity.rationale}</p>

      <div className="opportunity-objects">
        {opportunity.objects.map((ref) => {
          const resolved = resolve(ref);
          // Same convention as Discovery/Related — skip quietly rather
          // than show a broken link if the object no longer exists.
          if (!resolved) return null;

          return (
            <button
              key={`${ref.type}-${ref.id}`}
              className="opportunity-object-link"
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

export default OpportunityCard;
