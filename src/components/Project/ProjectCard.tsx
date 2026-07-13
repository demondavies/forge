import type { Project } from "../../types";
import { formatDate } from "../../utils/formatDate";

interface ProjectCardProps {
  project: Project;
  isSelected: boolean;
  onSelect: () => void;
}

// A single project card, shown in the project list. Rendered as a <button>
// (like IdentityCard) so it's clickable and focusable for free, and to
// leave room for a "selected project" concept later without extra work.
function ProjectCard({ project, isSelected, onSelect }: ProjectCardProps) {
  return (
    <button
      className={`project-card${isSelected ? " selected" : ""}`}
      onClick={onSelect}
      aria-pressed={isSelected}
    >
      <div className="project-card-header">
        <h3 className="project-name">{project.name}</h3>
        {/* The status text also becomes part of the CSS class name
            (e.g. "status-released") so each stage can have its own colour
            in Project.css without a lookup table in JS. */}
        <span className={`badge status-badge status-${project.status.toLowerCase()}`}>
          {project.status}
        </span>
      </div>

      <div className="project-meta">
        <span className="project-type">{project.type}</span>
        <span className="project-created">Created {formatDate(project.createdAt)}</span>
      </div>

      <p className="project-description">
        {project.description || "No description yet."}
      </p>
    </button>
  );
}

export default ProjectCard;
