import type { Capture } from "../../types";
import InboxCard from "./InboxCard";

interface InboxListProps {
  captures: Capture[];
  selectedCaptureId: string | null;
  onSelect: (id: string) => void;
}

// Renders one InboxCard per capture. Kept separate from InboxView so the
// "list of cards" concern doesn't get tangled up with the empty state or
// the toolbar (mirrors AssetList/KnowledgeList/ReleaseList).
function InboxList({ captures, selectedCaptureId, onSelect }: InboxListProps) {
  return (
    <div className="inbox-list">
      {/* .map() turns the captures array into one InboxCard per item. Each
          needs a stable "key" so React can track it correctly across
          re-renders (e.g. when a new capture is added). Order comes from
          useCaptures(), which already sorts newest first. */}
      {captures.map((capture) => (
        <InboxCard
          key={capture.id}
          capture={capture}
          isSelected={capture.id === selectedCaptureId}
          onSelect={() => onSelect(capture.id)}
        />
      ))}
    </div>
  );
}

export default InboxList;
