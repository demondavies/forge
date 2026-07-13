// Which contextual tab is showing inside a Project Workspace. Kept local to
// the Project feature (rather than in the global types.ts) since it's pure
// UI navigation within a single project, not a domain entity.
export type ProjectTabId = "overview" | "assets" | "knowledge" | "releases";

interface ProjectTab {
  id: ProjectTabId;
  label: string;
}

// The single source of truth for which tabs exist. ProjectWorkspace builds
// its tab bar by looping over this list, so adding a future tab (e.g.
// "Activity") later is a one-line change here — no other code needs to change.
const PROJECT_TABS: ProjectTab[] = [
  { id: "overview", label: "Overview" },
  { id: "assets", label: "Assets" },
  { id: "knowledge", label: "Knowledge" },
  { id: "releases", label: "Releases" },
];

interface ProjectTabsProps {
  activeTab: ProjectTabId;
  onSelectTab: (tab: ProjectTabId) => void;
}

// A small, reusable tab bar for switching between a project's contextual
// sections without leaving the Project Workspace or touching the sidebar.
function ProjectTabs({ activeTab, onSelectTab }: ProjectTabsProps) {
  return (
    <div className="project-tabs">
      {PROJECT_TABS.map((tab) => (
        <button
          key={tab.id}
          className={`project-tab${activeTab === tab.id ? " active" : ""}`}
          onClick={() => onSelectTab(tab.id)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

export default ProjectTabs;
