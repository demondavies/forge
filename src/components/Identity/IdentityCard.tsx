import type { Identity } from "../../types";
import { ACCENT_COLORS } from "../../types";

interface IdentityCardProps {
  identity: Identity;
  isSelected: boolean;
  onSelect: () => void;
}

// A single selectable identity card shown in the sidebar.
// Rendered as a <button> (not a <div>) so it's clickable and focusable
// with a keyboard for free, without us having to add extra handlers.
function IdentityCard({ identity, isSelected, onSelect }: IdentityCardProps) {
  const color = ACCENT_COLORS.find((option) => option.id === identity.accentColor);

  return (
    <button
      className={`identity-card${isSelected ? " selected" : ""}`}
      // The selected card's border is tinted with this identity's own
      // accent colour, set inline since the exact colour is data (it comes
      // from state), not something CSS alone can know ahead of time.
      style={isSelected && color ? { borderColor: color.hex } : undefined}
      onClick={onSelect}
      // aria-pressed tells assistive tech this button represents an on/off
      // (in this case, selected/unselected) state, not a one-off action.
      aria-pressed={isSelected}
    >
      <span className="identity-dot" style={{ backgroundColor: color?.hex }} />
      <span className="identity-name">{identity.name}</span>
    </button>
  );
}

export default IdentityCard;
