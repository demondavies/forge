import type { Relationship } from "../../types";

interface RelatedItemCardProps {
  relationship: Relationship;
  label: string;
  icon: string;
  onConfirm: () => void;
  onDismiss: () => void;
}

// A single suggested or confirmed connection. Dismissed relationships never
// reach this component at all — RelatedItemsList filters them out before
// rendering, so dismissing something means it's gone, not crossed out.
function RelatedItemCard({ relationship, label, icon, onConfirm, onDismiss }: RelatedItemCardProps) {
  return (
    <li className="placeholder-card related-item">
      <div className="related-item-main">
        <span className="related-item-icon">{icon}</span>
        <div className="related-item-text">
          <span className="related-item-label">{label}</span>
          {/* The one field every relationship must have, however it was
              found: a plain-language answer to "why was this suggested?" */}
          <span className="related-item-reason">{relationship.reason}</span>
        </div>
      </div>

      {relationship.status === "suggested" ? (
        <div className="related-item-actions">
          <button className="related-item-btn" onClick={onDismiss}>
            Dismiss
          </button>
          <button className="related-item-btn confirm" onClick={onConfirm}>
            Confirm
          </button>
        </div>
      ) : (
        <span className="related-item-confirmed">✓ Confirmed</span>
      )}
    </li>
  );
}

export default RelatedItemCard;
