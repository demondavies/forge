import type { Project, Release } from "../../types";
import { formatDate } from "../../utils/formatDate";

interface ReleaseCardProps {
  release: Release;
  // The active identity's own projects — used only to look up the name of
  // whichever project this release belongs to.
  projects: Project[];
  isSelected: boolean;
  onSelect: () => void;
}

// A single release, shown in the release list. Rendered as a <button> (like
// ProjectCard/AssetCard/KnowledgeCard) so clicking it opens ReleaseDetail —
// Forge's "Context Everywhere" surface for this release.
function ReleaseCard({ release, projects, isSelected, onSelect }: ReleaseCardProps) {
  // Resolves the id reference into the actual project, the same way
  // AssetCard resolves its projectId.
  const project = projects.find((candidate) => candidate.id === release.projectId) ?? null;

  // "Apple Music" has a space, which isn't valid in a CSS class name as
  // typed — turn it into "apple-music" for platform-${slug} below.
  const platformSlug = release.platform.toLowerCase().replace(/\s+/g, "-");

  return (
    <button
      className={`release-card${isSelected ? " selected" : ""}`}
      onClick={onSelect}
      aria-pressed={isSelected}
    >
      <div className="release-card-header">
        <h3 className="release-title">{release.title}</h3>
        <span className="release-date">{formatDate(release.releaseDate)}</span>
      </div>

      <p className="release-description">
        {release.description || "No description yet."}
      </p>

      <div className="release-badges">
        {/* The platform/status text also becomes part of the CSS class
            name (e.g. "platform-spotify") so each one can have its own
            colour in Release.css without a lookup table in JS. */}
        <span className={`badge platform-badge platform-${platformSlug}`}>
          {release.platform}
        </span>
        <span
          className={`badge release-status-badge release-status-${release.status.toLowerCase()}`}
        >
          {release.status}
        </span>
        {project && <span className="badge project-badge">{project.name}</span>}
      </div>
    </button>
  );
}

export default ReleaseCard;
