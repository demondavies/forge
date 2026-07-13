import type { ReactNode } from "react";
import type {
  Activity,
  Asset,
  Capture,
  Identity,
  KnowledgeEntry,
  Project,
  Relationship,
  Release,
} from "../../types";
import type { DiscoveryContext } from "../../hooks/relationshipDiscovery";
import { buildReleaseManifest } from "../../hooks/releaseManifest";
import type { ManifestFieldStatus } from "../../hooks/releaseManifest";
import { formatDate } from "../../utils/formatDate";
import AssetList from "../Asset/AssetList";
import KnowledgeList from "../Knowledge/KnowledgeList";
import "./ReleaseManifest.css";

interface ReleaseManifestViewProps {
  release: Release;
  project: Project;
  identity: Identity;
  knowledgeEntries: KnowledgeEntry[];
  assets: Asset[];
  releases: Release[];
  captures: Capture[];
  relationships: Relationship[];
  activities: Activity[];
  onOpenProject: (id: string) => void;
  onOpenAsset: (id: string) => void;
  onOpenKnowledgeEntry: (id: string) => void;
  onBack: () => void;
}

// One field, however it's rendered — a label, a status pill, and whatever
// content the field actually has. Every field on the manifest passes
// through this same shell, which is what lets Artist (plain text), Track
// List (a list of Assets), and Release Notes (a list of Knowledge) all
// read as clearly part of one manifest rather than four different mini
// components improvising their own layout.
function ManifestField({
  label,
  status,
  children,
}: {
  label: string;
  status: ManifestFieldStatus;
  children: ReactNode;
}) {
  return (
    <div className="manifest-field">
      <div className="manifest-field-header">
        <h3 className="manifest-field-label">{label}</h3>
        <span className={`badge manifest-status-badge manifest-status-${status}`}>
          {status === "complete" ? "Complete" : "Missing"}
        </span>
      </div>
      <div className="manifest-field-body">{children}</div>
    </div>
  );
}

// Forge's own canonical view of a release, generated on demand from
// systems that already exist — never a second place any of this data
// lives. Deleting every future distributor integration would leave this
// screen exactly as useful as it is today, because nothing here is built
// for a distributor; it's built to show a creator what Forge itself
// already understands about their release, and what it still doesn't.
function ReleaseManifestView({
  release,
  project,
  identity,
  knowledgeEntries,
  assets,
  releases,
  captures,
  relationships,
  activities,
  onOpenProject,
  onOpenAsset,
  onOpenKnowledgeEntry,
  onBack,
}: ReleaseManifestViewProps) {
  const discoveryContext: DiscoveryContext = {
    identities: [identity],
    projects: [project],
    knowledgeEntries,
    assets,
    releases,
    captures,
    relationships,
  };

  const manifest = buildReleaseManifest(release, project, identity, discoveryContext, activities);

  return (
    <section className="section-view release-manifest">
      <button className="back-btn" onClick={onBack}>
        ← Back to {release.title}
      </button>

      <div>
        <h2 className="section-title">📄 Release Manifest</h2>
        <p className="section-subtitle">
          {project.name} — Forge's own canonical representation of this release.
        </p>
      </div>

      <div className={`manifest-completeness-banner manifest-completeness-${manifest.completeness}`}>
        {manifest.completeness === "complete"
          ? "Complete — every field Forge could compose from this release is present."
          : `${manifest.completeFieldCount} of ${manifest.totalFieldCount} fields complete.`}
      </div>

      <ManifestField label={manifest.artist.label} status={manifest.artist.status}>
        <p className="manifest-text-value">{manifest.artist.value || "No artist name yet."}</p>
      </ManifestField>

      <ManifestField label={manifest.releaseTitle.label} status={manifest.releaseTitle.status}>
        <p className="manifest-text-value">{manifest.releaseTitle.value || "No release title yet."}</p>
      </ManifestField>

      <ManifestField label={manifest.description.label} status={manifest.description.status}>
        <p className="manifest-text-value">{manifest.description.value || "No description yet."}</p>
      </ManifestField>

      <ManifestField label={manifest.trackList.label} status={manifest.trackList.status}>
        {manifest.trackList.value.length > 0 ? (
          <AssetList
            assets={manifest.trackList.value}
            projects={[project]}
            selectedAssetId={null}
            onSelect={onOpenAsset}
          />
        ) : (
          <p className="manifest-text-value">No tracks added to this project yet.</p>
        )}
      </ManifestField>

      <ManifestField label={manifest.artwork.label} status={manifest.artwork.status}>
        {manifest.artwork.value.length > 0 ? (
          <AssetList
            assets={manifest.artwork.value}
            projects={[project]}
            selectedAssetId={null}
            onSelect={onOpenAsset}
          />
        ) : (
          <p className="manifest-text-value">No artwork added to this project yet.</p>
        )}
      </ManifestField>

      <ManifestField label={manifest.soundAndStyle.label} status={manifest.soundAndStyle.status}>
        <p className="manifest-text-value manifest-sound-style-value">
          {manifest.soundAndStyle.value || "No production prompt saved for this project yet."}
        </p>
      </ManifestField>

      <ManifestField label={manifest.releaseNotes.label} status={manifest.releaseNotes.status}>
        {manifest.releaseNotes.value.length > 0 ? (
          <KnowledgeList
            entries={manifest.releaseNotes.value}
            projects={[project]}
            selectedEntryId={null}
            onSelect={onOpenKnowledgeEntry}
          />
        ) : (
          <p className="manifest-text-value">No release notes captured yet.</p>
        )}
      </ManifestField>

      <ManifestField label={manifest.copyright.label} status={manifest.copyright.status}>
        <p className="manifest-text-value">{manifest.copyright.value || "No copyright line yet."}</p>
      </ManifestField>

      <button className="detail-project-link" onClick={() => onOpenProject(project.id)}>
        Part of {project.name} →
      </button>

      <p className="manifest-generated-at">Generated {formatDate(new Date())}</p>
    </section>
  );
}

export default ReleaseManifestView;
