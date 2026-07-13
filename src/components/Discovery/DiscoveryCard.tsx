import { useState } from "react";
import type { Discovery } from "../../hooks/discoveryEngine";
import { DISCOVERY_TYPE_META } from "../../hooks/discoveryEngine";
import { buildPerspective } from "../../hooks/perspectiveLayer";
import type { ObjectRef } from "../../types";
import { COMPANION_ROLES } from "../../types";

interface DiscoveryCardProps {
  discovery: Discovery;
  resolve: (ref: ObjectRef) => { label: string; icon: string } | null;
  onOpenObject: (ref: ObjectRef) => void;
}

// One finding, answering every question the mission requires: what (the
// type badge + reason), why (the reason text itself), which objects (the
// clickable links below, reusing the exact same "Context Everywhere"
// navigation every other object surface already has), how confident
// (shown plainly, not hidden — Relationship's own confidence has never
// been surfaced in the UI before this), and — new this sprint — how each
// Companion would frame this same discovery, toggled open on demand rather
// than shown all at once.
function DiscoveryCard({ discovery, resolve, onOpenObject }: DiscoveryCardProps) {
  const meta = DISCOVERY_TYPE_META[discovery.type];

  // Which Companions' perspectives are currently expanded on this one
  // discovery — purely local, ephemeral UI state (which lens is open right
  // now), not data. The Perspective Layer itself never tracks this; it's
  // recomputed fresh from `discovery` + whichever Companion is toggled.
  const [expandedCompanionIds, setExpandedCompanionIds] = useState<Set<string>>(new Set());

  function toggleCompanion(id: string) {
    setExpandedCompanionIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <li className="placeholder-card discovery-card">
      <div className="discovery-card-header">
        <span className={`badge discovery-type-badge discovery-type-${discovery.type}`}>
          {meta.icon} {meta.label}
        </span>
        <span className="discovery-confidence">
          {Math.round(discovery.confidence * 100)}% confidence
        </span>
      </div>

      <p className="discovery-reason">{discovery.reason}</p>

      <div className="discovery-objects">
        {discovery.objects.map((ref) => {
          const resolved = resolve(ref);
          // The object could theoretically be deleted between when a
          // discovery is computed and rendered — skip it quietly rather
          // than showing a broken link, same convention as RelatedItemsList.
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

      <div className="discovery-perspectives">
        <span className="field-label">See this from a Companion's perspective</span>
        <div className="pill-toggle">
          {COMPANION_ROLES.map((companion) => (
            <button
              key={companion.id}
              className={`pill-option${expandedCompanionIds.has(companion.id) ? " selected" : ""}`}
              onClick={() => toggleCompanion(companion.id)}
            >
              {companion.icon} {companion.name}
            </button>
          ))}
        </div>

        {COMPANION_ROLES.filter((companion) => expandedCompanionIds.has(companion.id)).map(
          (companion) => {
            const perspective = buildPerspective(companion, discovery);
            return (
              <div key={perspective.id} className="perspective-block">
                <span className="perspective-companion">
                  {companion.icon} {companion.name}&apos;s perspective
                </span>
                <p className="perspective-text">{perspective.text}</p>
              </div>
            );
          },
        )}
      </div>
    </li>
  );
}

export default DiscoveryCard;
