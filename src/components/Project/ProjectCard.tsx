import { useState } from "react";
import type { Project } from "../../types";
import { formatDate } from "../../utils/formatDate";

interface ProjectCardProps {
  project: Project;
  isSelected: boolean;
  onSelect: () => void;
  onArchive?: () => void;
  onUnarchive?: () => void;
  onDelete?: () => void;
}

function ProjectCard({ project, isSelected, onSelect, onArchive, onUnarchive, onDelete }: ProjectCardProps) {
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  function handleDelete(e: React.MouseEvent) {
    e.stopPropagation();
    if (confirmingDelete) {
      onDelete?.();
    } else {
      setConfirmingDelete(true);
    }
  }

  function handleCancelDelete(e: React.MouseEvent) {
    e.stopPropagation();
    setConfirmingDelete(false);
  }

  function handleArchive(e: React.MouseEvent) {
    e.stopPropagation();
    onArchive?.();
  }

  function handleUnarchive(e: React.MouseEvent) {
    e.stopPropagation();
    onUnarchive?.();
  }

  return (
    <button
      className={`project-card${isSelected ? " selected" : ""}`}
      onClick={onSelect}
      aria-pressed={isSelected}
    >
      <div className="project-card-header">
        <h3 className="project-name">{project.name}</h3>
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

      <div className="project-card-actions">
        {confirmingDelete ? (
          <>
            <span className="project-card-action-label">Delete permanently?</span>
            <button className="project-card-action danger" onClick={handleDelete}>
              Yes, delete
            </button>
            <button className="project-card-action" onClick={handleCancelDelete}>
              Cancel
            </button>
          </>
        ) : (
          <>
            {onArchive && (
              <button className="project-card-action" onClick={handleArchive}>
                Archive
              </button>
            )}
            {onUnarchive && (
              <button className="project-card-action" onClick={handleUnarchive}>
                Unarchive
              </button>
            )}
            {onDelete && (
              <button className="project-card-action danger" onClick={handleDelete}>
                Delete
              </button>
            )}
          </>
        )}
      </div>
    </button>
  );
}

export default ProjectCard;
