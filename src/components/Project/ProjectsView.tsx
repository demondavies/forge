import type {
  Activity,
  Asset,
  Capture,
  Identity,
  KnowledgeEntry,
  ObjectRef,
  Project,
  Relationship,
  Release,
} from "../../types";
import type { DiscoveryContext } from "../../hooks/relationshipDiscovery";
import ProjectList from "./ProjectList";
import ProjectWorkspace from "./ProjectWorkspace";
import "./Project.css";

interface ProjectsViewProps {
  projects: Project[];
  selectedProjectId: string | null;
  onSelectProject: (id: string | null) => void;
  onCreateProject: () => void;
  // Passed straight through to ProjectWorkspace so it can compute
  // per-project counts and its Assets/Knowledge/Releases/Overview tabs —
  // see ProjectWorkspace.tsx.
  assets: Asset[];
  knowledgeEntries: KnowledgeEntry[];
  releases: Release[];
  captures: Capture[];
  identities: Identity[];
  activities: Activity[];
  onAddAsset: () => void;
  onCaptureKnowledge: () => void;
  onCreateRelease: () => void;
  getRelationshipsFor: (ref: ObjectRef) => Relationship[];
  onDiscoverRelationships: (ref: ObjectRef, context: DiscoveryContext) => void;
  onConfirmRelationship: (id: string) => void;
  onDismissRelationship: (id: string) => void;
  onConnectTo: (ref: ObjectRef, label: string) => void;
  onOpenAsset: (id: string) => void;
  onOpenKnowledgeEntry: (id: string) => void;
  onOpenRelease: (id: string) => void;
  onBeginSession: (id: string) => void;
  onOpenMusicWorkspace: (id: string) => void;
}

// The whole "Projects" section of the workspace. Normally this is a
// toolbar with the "Create Project" button plus either a grid of project
// cards or a friendly empty state — but as soon as a project is selected,
// it's replaced entirely by that project's dedicated ProjectWorkspace.
function ProjectsView({
  projects,
  selectedProjectId,
  onSelectProject,
  onCreateProject,
  assets,
  knowledgeEntries,
  releases,
  captures,
  identities,
  activities,
  onAddAsset,
  onCaptureKnowledge,
  onCreateRelease,
  getRelationshipsFor,
  onDiscoverRelationships,
  onConfirmRelationship,
  onDismissRelationship,
  onConnectTo,
  onOpenAsset,
  onOpenKnowledgeEntry,
  onOpenRelease,
  onBeginSession,
  onOpenMusicWorkspace,
}: ProjectsViewProps) {
  const selectedProject = projects.find((project) => project.id === selectedProjectId) ?? null;

  // Selecting a project now means "open its workspace" rather than just
  // highlighting a row — so the list itself doesn't even render while one
  // is selected.
  if (selectedProject) {
    return (
      // key={selectedProject.id} forces a fresh ProjectWorkspace instance
      // (and a fresh "overview" tab) whenever a *different* project becomes
      // selected — otherwise, jumping straight from one project to another
      // (e.g. via the Command Palette, without visiting "Back to Projects"
      // in between) would keep the previous project's active tab.
      <ProjectWorkspace
        key={selectedProject.id}
        project={selectedProject}
        projects={projects}
        assets={assets}
        knowledgeEntries={knowledgeEntries}
        releases={releases}
        captures={captures}
        identities={identities}
        activities={activities}
        onBack={() => onSelectProject(null)}
        onAddAsset={onAddAsset}
        onCaptureKnowledge={onCaptureKnowledge}
        onCreateRelease={onCreateRelease}
        getRelationshipsFor={getRelationshipsFor}
        onDiscoverRelationships={onDiscoverRelationships}
        onConfirmRelationship={onConfirmRelationship}
        onDismissRelationship={onDismissRelationship}
        onConnectTo={onConnectTo}
        onOpenAsset={onOpenAsset}
        onOpenKnowledgeEntry={onOpenKnowledgeEntry}
        onOpenRelease={onOpenRelease}
        onBeginSession={() => onBeginSession(selectedProject.id)}
        onOpenMusicWorkspace={() => onOpenMusicWorkspace(selectedProject.id)}
      />
    );
  }

  return (
    <section className="section-view">
      <div className="section-toolbar">
        <h2 className="section-title">Projects</h2>
        <button className="section-action-btn" onClick={onCreateProject}>
          + Create Project
        </button>
      </div>

      {/* Conditional rendering: show the empty state OR the list, never
          both — there's nothing useful to show alongside zero projects. */}
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
          selectedProjectId={selectedProjectId}
          onSelect={onSelectProject}
        />
      )}
    </section>
  );
}

export default ProjectsView;
