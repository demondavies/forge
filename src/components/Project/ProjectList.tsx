import type { Project } from "../../types";
import ProjectCard from "./ProjectCard";

interface ProjectListProps {
  projects: Project[];
  selectedProjectId: string | null;
  onSelect: (id: string) => void;
  onArchive?: (id: string) => void;
  onUnarchive?: (id: string) => void;
  onDelete?: (id: string) => void;
}

function ProjectList({ projects, selectedProjectId, onSelect, onArchive, onUnarchive, onDelete }: ProjectListProps) {
  return (
    <div className="project-list">
      {projects.map((project) => (
        <ProjectCard
          key={project.id}
          project={project}
          isSelected={project.id === selectedProjectId}
          onSelect={() => onSelect(project.id)}
          onArchive={onArchive ? () => onArchive(project.id) : undefined}
          onUnarchive={onUnarchive ? () => onUnarchive(project.id) : undefined}
          onDelete={onDelete ? () => onDelete(project.id) : undefined}
        />
      ))}
    </div>
  );
}

export default ProjectList;
