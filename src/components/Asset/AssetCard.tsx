import type { Asset, Project } from "../../types";
import { formatDate } from "../../utils/formatDate";

interface AssetCardProps {
  asset: Asset;
  // The active identity's own projects — used only to look up the name of
  // whichever project this asset belongs to.
  projects: Project[];
  isSelected: boolean;
  onSelect: () => void;
}

// A single asset, shown in the asset list. Rendered as a <button> (like
// ProjectCard/KnowledgeCard) so clicking it opens AssetDetail — Forge's
// "Context Everywhere" surface for this asset.
function AssetCard({ asset, projects, isSelected, onSelect }: AssetCardProps) {
  // Resolves the id reference into the actual project, the same way
  // KnowledgeCard resolves its optional projectId.
  const project = projects.find((candidate) => candidate.id === asset.projectId) ?? null;

  return (
    <button
      className={`asset-card${isSelected ? " selected" : ""}`}
      onClick={onSelect}
      aria-pressed={isSelected}
    >
      <div className="asset-card-header">
        <h3 className="asset-name">{asset.name}</h3>
        <span className="asset-created">{formatDate(asset.createdAt)}</span>
      </div>

      <p className="asset-description">{asset.description || "No description yet."}</p>

      <div className="asset-badges">
        {/* The type text also becomes part of the CSS class name
            (e.g. "type-audio") so each type can have its own colour in
            Asset.css without a lookup table in JS. */}
        <span className={`badge type-badge type-${asset.type.toLowerCase()}`}>
          {asset.type}
        </span>
        {project && <span className="badge project-badge">{project.name}</span>}
      </div>
    </button>
  );
}

export default AssetCard;
