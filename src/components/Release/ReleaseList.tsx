import type { Project, Release } from "../../types";
import ReleaseCard from "./ReleaseCard";

interface ReleaseListProps {
  releases: Release[];
  projects: Project[];
  selectedReleaseId: string | null;
  onSelect: (id: string) => void;
}

// Renders one ReleaseCard per release. Kept separate from ReleaseView so
// the "list of cards" concern doesn't get tangled up with the empty state
// or the toolbar (mirrors AssetList/KnowledgeList/ProjectList).
function ReleaseList({ releases, projects, selectedReleaseId, onSelect }: ReleaseListProps) {
  return (
    <div className="release-list">
      {/* .map() turns the releases array into one ReleaseCard per item.
          Each needs a stable "key" so React can track it correctly across
          re-renders (e.g. when a new release is created). Order comes from
          useReleases(), which already sorts newest release date first. */}
      {releases.map((release) => (
        <ReleaseCard
          key={release.id}
          release={release}
          projects={projects}
          isSelected={release.id === selectedReleaseId}
          onSelect={() => onSelect(release.id)}
        />
      ))}
    </div>
  );
}

export default ReleaseList;
