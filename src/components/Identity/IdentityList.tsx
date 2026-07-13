import type { Identity } from "../../types";
import IdentityCard from "./IdentityCard";

interface IdentityListProps {
  identities: Identity[];
  selectedId: string;
  onSelect: (id: string) => void;
}

// Renders one IdentityCard per identity. Kept separate from Sidebar so the
// "list of identities" concern doesn't get tangled up with the rest of the
// sidebar's layout (brand header, nav links, etc).
function IdentityList({ identities, selectedId, onSelect }: IdentityListProps) {
  return (
    <div className="identity-list">
      {/* .map() turns the identities array into one IdentityCard per item.
          Each needs a stable "key" prop so React can track it correctly
          across re-renders (e.g. when a new identity is added). */}
      {identities.map((identity) => (
        <IdentityCard
          key={identity.id}
          identity={identity}
          isSelected={identity.id === selectedId}
          onSelect={() => onSelect(identity.id)}
        />
      ))}
    </div>
  );
}

export default IdentityList;
