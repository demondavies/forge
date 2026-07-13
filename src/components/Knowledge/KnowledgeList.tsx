import type { KnowledgeEntry, Project } from "../../types";
import KnowledgeCard from "./KnowledgeCard";

interface KnowledgeListProps {
  entries: KnowledgeEntry[];
  projects: Project[];
  selectedEntryId: string | null;
  onSelect: (id: string) => void;
}

// Renders one KnowledgeCard per entry. Kept separate from KnowledgeView so
// the "list of cards" concern doesn't get tangled up with the empty state
// or the toolbar (mirrors ProjectList/IdentityList).
function KnowledgeList({ entries, projects, selectedEntryId, onSelect }: KnowledgeListProps) {
  return (
    <div className="knowledge-list">
      {/* .map() turns the entries array into one KnowledgeCard per item.
          Each needs a stable "key" so React can track it correctly across
          re-renders (e.g. when a new entry is captured). */}
      {entries.map((entry) => (
        <KnowledgeCard
          key={entry.id}
          entry={entry}
          projects={projects}
          isSelected={entry.id === selectedEntryId}
          onSelect={() => onSelect(entry.id)}
        />
      ))}
    </div>
  );
}

export default KnowledgeList;
