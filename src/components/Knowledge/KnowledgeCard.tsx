import type { KnowledgeEntry, Project } from "../../types";
import { formatDate } from "../../utils/formatDate";

interface KnowledgeCardProps {
  entry: KnowledgeEntry;
  // The active identity's own projects — used only to look up the name of
  // whichever project (if any) this entry is attached to.
  projects: Project[];
  isSelected: boolean;
  onSelect: () => void;
}

// A single knowledge entry, shown in the knowledge list. Rendered as a
// <button> (like ProjectCard/IdentityCard) so clicking it opens
// KnowledgeDetail — Forge's "Context Everywhere" surface for this entry.
function KnowledgeCard({ entry, projects, isSelected, onSelect }: KnowledgeCardProps) {
  // Resolves the id reference into the actual project, the same way
  // IdentityCard resolves accentColor into an ACCENT_COLORS entry.
  const project = entry.projectId
    ? (projects.find((candidate) => candidate.id === entry.projectId) ?? null)
    : null;

  return (
    <button
      className={`knowledge-card${isSelected ? " selected" : ""}`}
      onClick={onSelect}
      aria-pressed={isSelected}
    >
      <div className="knowledge-card-header">
        <h3 className="knowledge-title">{entry.title}</h3>
        <span className="knowledge-created">{formatDate(entry.createdAt)}</span>
      </div>

      <p className="knowledge-insight">{entry.insight}</p>

      <div className="knowledge-badges">
        {/* The source text also becomes part of the CSS class name
            (e.g. "source-research") so each source can have its own colour
            in Knowledge.css without a lookup table in JS. */}
        <span className={`badge source-badge source-${entry.source.toLowerCase()}`}>
          {entry.source}
        </span>
        {project && <span className="badge project-badge">{project.name}</span>}
      </div>
    </button>
  );
}

export default KnowledgeCard;
