import "./Sidebar.css";
import "../Identity/Identity.css";
import type { Identity, WorkspaceSection } from "../../types";
import IdentityList from "../Identity/IdentityList";
import CreateIdentityButton from "../Identity/CreateIdentityButton";
import NavItem from "./NavItem";

interface SidebarProps {
  identities: Identity[];
  selectedId: string;
  onSelect: (id: string) => void;
  onCreateIdentity: () => void;
  activeSection: WorkspaceSection;
  onSelectSection: (section: WorkspaceSection) => void;
}

// Static list of navigation links. Only entries listed in SECTION_BY_LABEL
// below actually switch the workspace section — the rest render inert, and
// are here so the sidebar layout is complete and ready to wire up as those
// features are built. Today sits first — it's the Morning Briefing (the
// "overview" section, and the session's starting point), and until now
// there was no way back to it once a creator navigated elsewhere; adding
// it here fixes that rather than leaving Overview a one-time-only screen.
// Inbox sits right after — the most frequently visited working section,
// where anything captured without a home safely waits to be organized.
// Discoveries, Chief, and Opportunities sit with the other identity-scoped
// sections (in the same order data actually flows — Discovery Engine, then
// Chief, who consumes it, then the Opportunity Engine, which reuses
// Discovery's own findings alongside fresh rules of its own), since all
// three read that same identity's own data; Companions sits near Settings
// instead — like Companions themselves, it isn't scoped to any one identity.
const navItems = [
  "Today",
  "Inbox",
  "Projects",
  "Knowledge",
  "Assets",
  "Releases",
  "🎧 Studio Library",
  "Discoveries",
  "Chief",
  "Opportunities",
  "Companions",
  "Settings",
];

// Which workspace section each nav label corresponds to. Adding a new
// wired-up nav item later is just one more entry here.
const SECTION_BY_LABEL: Partial<Record<string, WorkspaceSection>> = {
  Today: "overview",
  Inbox: "inbox",
  Projects: "projects",
  Knowledge: "knowledge",
  Assets: "assets",
  Releases: "releases",
  Discoveries: "discoveries",
  Chief: "chief",
  Opportunities: "opportunities",
  Companions: "companions",
  Settings: "settings",
  "🎧 Studio Library": "studio-library",
};

// The permanent left sidebar: brand header, identity switcher, and nav links.
function Sidebar({
  identities,
  selectedId,
  onSelect,
  onCreateIdentity,
  activeSection,
  onSelectSection,
}: SidebarProps) {
  return (
    <aside className="sidebar">
      {/* Brand header */}
      <div className="sidebar-header">
        <div className="logo-placeholder">F</div>
        <span className="brand-name">Forge</span>
      </div>

      <div className="divider" />

      <h2 className="section-heading">Identities</h2>

      <IdentityList identities={identities} selectedId={selectedId} onSelect={onSelect} />

      <CreateIdentityButton onClick={onCreateIdentity} />

      <div className="divider" />

      <nav className="nav-list">
        {navItems.map((label) => {
          const section = SECTION_BY_LABEL[label];
          return (
            <NavItem
              key={label}
              label={label}
              isActive={section !== undefined && section === activeSection}
              onClick={section ? () => onSelectSection(section) : undefined}
            />
          );
        })}
      </nav>
    </aside>
  );
}

export default Sidebar;
