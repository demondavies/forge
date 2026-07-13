import { COMPANION_ROLES } from "../../types";
import PlaceholderCard from "../Workspace/PlaceholderCard";

interface CompanionsViewProps {
  // Chief now has a real destination — this is the only Companion card
  // rendered as a click-through; the rest stay exactly as before (a quiet,
  // read-only roster, nothing to click, nothing to manage).
  onOpenChief: () => void;
}

// Establishes where Companions belong inside Forge — not what they
// eventually say. Deliberately not a workspace or a chat: just a quiet,
// read-only roster of the perspectives Forge can host, reusing the exact
// same "coming soon" card already used for the Overview section's own
// teaser cards.
function CompanionsView({ onOpenChief }: CompanionsViewProps) {
  return (
    <section className="section-view">
      <h2 className="section-title">Companions</h2>
      <p className="section-subtitle">
        Specialist perspectives over your Creative Knowledge Engine.
      </p>

      <div className="card-grid">
        {COMPANION_ROLES.map((companion) =>
          companion.id === "chief" ? (
            <PlaceholderCard
              key={companion.id}
              icon={companion.icon}
              title={companion.name}
              description={`${companion.focus} Open Chief →`}
              onClick={onOpenChief}
            />
          ) : (
            <PlaceholderCard
              key={companion.id}
              icon={companion.icon}
              title={companion.name}
              description={companion.focus}
            />
          ),
        )}
      </div>
    </section>
  );
}

export default CompanionsView;
