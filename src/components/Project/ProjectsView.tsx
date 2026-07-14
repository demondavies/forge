import type { Project } from "../../types";
import ProjectList from "./ProjectList";
import "./Project.css";

interface ProjectsViewProps {
  projects: Project[];
  onSelectProject: (id: string | null) => void;
  onCreateProject: () => void;
}

function ProjectsView({ projects, onSelectProject, onCreateProject }: ProjectsViewProps) {
  return (
    <section className="section-view">
      <div className="section-toolbar">
        <h2 className="section-title">Projects</h2>
        <button className="section-action-btn" onClick={onCreateProject}>
          + Create Project
        </button>
      </div>

      {projects.length === 0 ? (
        <div className="section-empty">
          <p className="section-empty-title">No projects yet.</p>
          <p className="section-empty-subtitle">
            Every masterpiece begins with a first project.
          </p>
        </div>
      ) : (
        <ProjectList
          projects={projects}
          selectedProjectId={null}
          onSelect={onSelectProject}
        />
      )}
    </section>
  );
}

export default ProjectsView;
