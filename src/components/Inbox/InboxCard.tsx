import type { Capture } from "../../types";
import { formatDate } from "../../utils/formatDate";

interface InboxCardProps {
  capture: Capture;
  isSelected: boolean;
  onSelect: () => void;
}

// A single captured thought, shown in the Inbox. Rendered as a <button>
// (like ProjectCard/KnowledgeCard) so clicking it opens CaptureDetail —
// Forge's "Context Everywhere" surface for this capture.
function InboxCard({ capture, isSelected, onSelect }: InboxCardProps) {
  // "Release Note" has a space, which isn't valid in a CSS class name as
  // typed — turn it into "release-note" for capture-type-${slug} below.
  const typeSlug = capture.type.toLowerCase().replace(/\s+/g, "-");

  return (
    <button
      className={`inbox-card${isSelected ? " selected" : ""}`}
      onClick={onSelect}
      aria-pressed={isSelected}
    >
      <div className="inbox-card-header">
        <span className={`badge capture-type-badge capture-type-${typeSlug}`}>
          {capture.type}
        </span>
        <span className="inbox-created">{formatDate(capture.createdAt)}</span>
      </div>

      <p className="inbox-content">{capture.content}</p>
    </button>
  );
}

export default InboxCard;
