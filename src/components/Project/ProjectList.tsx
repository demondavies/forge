import type { Project } from "../../types";
import ProjectCard from "./ProjectCard";

interface ProjectListProps {
  projects: Project[];
  selectedProjectId: string | null;
  onSelect: (id: string) => void;
}

// Renders one ProjectCard per project. Kept separate from ProjectsView so
// the "list of cards" concern doesn't get tangled up with the empty state
// or the toolbar (mirrors how IdentityList is kept separate from Sidebar).
function ProjectList({ projects, selectedProjectId, onSelect }: ProjectListProps) {
  return (
    <div className="project-list">
      {/* .map() turns the projects array into one ProjectCard per item.
          Each needs a stable "key" so React can track it correctly across
          re-renders (e.g. when a new project is added). */}
      {projects.map((project) => (
        <ProjectCard
          key={project.id}
          project={project}
          isSelected={project.id === selectedProjectId}
          onSelect={() => onSelect(project.id)}
        />
      ))}
    </div>
  );
}

export default ProjectList;
