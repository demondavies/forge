import type { ObjectRef, Relationship } from "../../types";
import { isSameRef } from "../../hooks/relationshipDiscovery";
import RelatedItemCard from "./RelatedItemCard";
import "./Relationships.css";

interface RelatedItemsListProps {
  relationships: Relationship[];
  subjectRef: ObjectRef;
  resolve: (ref: ObjectRef) => { label: string; icon: string } | null;
  onConfirm: (id: string) => void;
  onDismiss: (id: string) => void;
}

// Shows every non-dismissed relationship touching one object. Deliberately
// renders nothing at all when there's nothing to show — the list itself
// stays quiet until it has something useful to say. The surrounding
// "Related" heading/toolbar (with its "+ Connect To…" button) is always
// visible regardless, so it lives in the caller (ProjectWorkspace) rather
// than here — that's the one thing that changed once manual connections
// meant there needed to always be a way to start the very first one.
function RelatedItemsList({ relationships, subjectRef, resolve, onConfirm, onDismiss }: RelatedItemsListProps) {
  const visible = relationships.filter((relationship) => relationship.status !== "dismissed");

  if (visible.length === 0) return null;

  return (
    <ul className="related-items-list">
      {visible.map((relationship) => {
        // A relationship doesn't know which side is "this" object — flip
        // to whichever side isn't the one we're viewing.
        const otherRef = isSameRef(relationship.source, subjectRef)
          ? relationship.target
          : relationship.source;
        const resolved = resolve(otherRef);
        // The other object couldn't be resolved (e.g. deleted in a future
        // version) — skip it quietly rather than showing a broken row.
        if (!resolved) return null;

        return (
          <RelatedItemCard
            key={relationship.id}
            relationship={relationship}
            label={resolved.label}
            icon={resolved.icon}
            onConfirm={() => onConfirm(relationship.id)}
            onDismiss={() => onDismiss(relationship.id)}
          />
        );
      })}
    </ul>
  );
}

export default RelatedItemsList;
