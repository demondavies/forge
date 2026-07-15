import { useState } from "react";
import type { Project } from "../../types";
import ProjectList from "./ProjectList";
import "./Project.css";

interface ProjectsViewProps {
  projects: Project[];
  archivedProjects: Project[];
  onSelectProject: (id: string | null) => void;
  onCreateProject: () => void;
  onArchiveProject: (id: string) => void;
  onUnarchiveProject: (id: string) => void;
  onDeleteProject: (id: string) => void;
}

function ProjectsView({
  projects,
  archivedProjects,
  onSelectProject,
  onCreateProject,
  onArchiveProject,
  onUnarchiveProject,
  onDeleteProject,
}: ProjectsViewProps) {
  const [showArchived, setShowArchived] = useState(false);

  return (
    <section className="section-view">
      <div className="section-toolbar">
        <h2 className="section-title">Projects</h2>
        <button className="section-action-btn" onClick={onCreateProject}>
          + Create Project
        </button>
      </div>

      {projects.length === 0 && archivedProjects.length === 0 ? (
        <div className="section-empty">
          <p className="section-empty-title">No projects yet.</p>
          <p className="section-empty-subtitle">
            Every masterpiece begins with a first project.
          </p>
        </div>
      ) : projects.length === 0 ? (
        <div className="section-empty">
          <p className="section-empty-title">No active projects.</p>
          <p className="section-empty-subtitle">
            Create a project, or unarchive one below.
          </p>
        </div>
      ) : (
        <ProjectList
          projects={projects}
          selectedProjectId={null}
          onSelect={onSelectProject}
          onArchive={onArchiveProject}
        />
      )}

      {archivedProjects.length > 0 && (
        <div className="archived-projects-section">
          <button
            className="archived-projects-toggle"
            onClick={() => setShowArchived((v) => !v)}
          >
            {showArchived ? "▾" : "▸"} Archived ({archivedProjects.length})
          </button>
          {showArchived && (
            <ProjectList
              projects={archivedProjects}
              selectedProjectId={null}
              onSelect={onSelectProject}
              onUnarchive={onUnarchiveProject}
              onDelete={onDeleteProject}
            />
          )}
        </div>
      )}
    </section>
  );
}

export default ProjectsView;
