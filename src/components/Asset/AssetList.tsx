import type { Asset, Project } from "../../types";
import AssetCard from "./AssetCard";

interface AssetListProps {
  assets: Asset[];
  projects: Project[];
  selectedAssetId: string | null;
  onSelect: (id: string) => void;
}

// Renders one AssetCard per asset. Kept separate from AssetView so the
// "list of cards" concern doesn't get tangled up with the empty state or
// the toolbar (mirrors KnowledgeList/ProjectList).
function AssetList({ assets, projects, selectedAssetId, onSelect }: AssetListProps) {
  return (
    <div className="asset-list">
      {/* .map() turns the assets array into one AssetCard per item. Each
          needs a stable "key" so React can track it correctly across
          re-renders (e.g. when a new asset is added). */}
      {assets.map((asset) => (
        <AssetCard
          key={asset.id}
          asset={asset}
          projects={projects}
          isSelected={asset.id === selectedAssetId}
          onSelect={() => onSelect(asset.id)}
        />
      ))}
    </div>
  );
}

export default AssetList;
