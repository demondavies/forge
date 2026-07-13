import type { ObjectRef, Relationship } from "../../types";
import RelatedItemsList from "./RelatedItemsList";

interface RelatedSectionProps {
  subjectRef: ObjectRef;
  // The subject's own display label — passed straight through to
  // onConnectTo so the caller (ConnectToModal, via App.tsx) doesn't need to
  // re-resolve something the caller here already knows directly.
  subjectLabel: string;
  relationships: Relationship[];
  resolve: (ref: ObjectRef) => { label: string; icon: string } | null;
  onConfirm: (id: string) => void;
  onDismiss: (id: string) => void;
  onConnectTo: (ref: ObjectRef, label: string) => void;
}

// The "Related" toolbar + list, exactly as first built for ProjectWorkspace
// — extracted here so every other object surface (Knowledge/Asset/Release/
// Capture detail views) can show the same always-visible "+ Connect To…"
// entry point without re-typing this JSX per object type. The toolbar is
// always rendered (matching every other section's toolbar); RelatedItemsList
// itself still renders nothing until there's something to show.
function RelatedSection({
  subjectRef,
  subjectLabel,
  relationships,
  resolve,
  onConfirm,
  onDismiss,
  onConnectTo,
}: RelatedSectionProps) {
  return (
    <section className="section-view">
      <div className="section-toolbar">
        <h3 className="section-title">Related</h3>
        <button className="section-action-btn" onClick={() => onConnectTo(subjectRef, subjectLabel)}>
          + Connect To…
        </button>
      </div>

      <RelatedItemsList
        relationships={relationships}
        subjectRef={subjectRef}
        resolve={resolve}
        onConfirm={onConfirm}
        onDismiss={onDismiss}
      />
    </section>
  );
}

export default RelatedSection;
