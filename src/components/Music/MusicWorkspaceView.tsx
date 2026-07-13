import type { ReactNode } from "react";
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
import { buildMusicWorkspace } from "../../hooks/musicWorkspace";
import type { DiscoveryContext } from "../../hooks/relationshipDiscovery";
import { resolveObjectRef } from "../../hooks/relationshipDiscovery";
import { formatDate } from "../../utils/formatDate";
import KnowledgeList from "../Knowledge/KnowledgeList";
import AssetList from "../Asset/AssetList";
import ReleaseList from "../Release/ReleaseList";
import OpportunityCard from "../Opportunity/OpportunityCard";
import "./MusicWorkspace.css";

interface MusicWorkspaceViewProps {
  project: Project;
  identities: Identity[];
  projects: Project[];
  knowledgeEntries: KnowledgeEntry[];
  assets: Asset[];
  releases: Release[];
  captures: Capture[];
  relationships: Relationship[];
  activities: Activity[];
  onOpenObject: (ref: ObjectRef) => void;
  onOpenKnowledgeEntry: (id: string) => void;
  onOpenAsset: (id: string) => void;
  onOpenRelease: (id: string) => void;
  onAddAsset: () => void;
  onCaptureKnowledge: () => void;
  onCreateRelease: () => void;
  onBack: () => void;
}

// One section: a music-flavoured title, an "add" action that reuses
// whichever global creation modal ProjectWorkspace already opens (never a
// new one of its own), and either a list or a quiet empty state. The exact
// same shape repeated per section is what keeps this file honest about
// doing nothing but grouping and reuse.
function MusicSection({
  title,
  isEmpty,
  emptyText,
  addLabel,
  onAdd,
  children,
}: {
  title: string;
  isEmpty: boolean;
  emptyText: string;
  addLabel: string;
  onAdd: () => void;
  children: ReactNode;
}) {
  return (
    <div className="music-section">
      <div className="music-section-header">
        <h3 className="music-section-title">{title}</h3>
        <button className="section-action-btn secondary" onClick={onAdd}>
          {addLabel}
        </button>
      </div>
      {isEmpty ? <p className="music-section-empty">{emptyText}</p> : children}
    </div>
  );
}

// A specialised composition over an existing Project — never a second
// project model, never a second place Assets/Knowledge/Releases live.
// Every section below either lists real Assets grouped by their own
// already-existing `type` (Lyrics/Audio/Artwork), real project Knowledge,
// or real project Releases; "+ Add" buttons reuse the exact same creation
// modals ProjectWorkspace's own Assets/Knowledge/Releases tabs already
// open. Nothing here is a music-specific entity — it's music-specific
// *organisation* of entities that would exist identically without this
// view.
function MusicWorkspaceView({
  project,
  identities,
  projects,
  knowledgeEntries,
  assets,
  releases,
  captures,
  relationships,
  activities,
  onOpenObject,
  onOpenKnowledgeEntry,
  onOpenAsset,
  onOpenRelease,
  onAddAsset,
  onCaptureKnowledge,
  onCreateRelease,
  onBack,
}: MusicWorkspaceViewProps) {
  const discoveryContext: DiscoveryContext = {
    identities,
    projects,
    knowledgeEntries,
    assets,
    releases,
    captures,
    relationships,
  };

  const workspace = buildMusicWorkspace(project, discoveryContext, activities);

  return (
    <section className="section-view music-workspace">
      <button className="back-btn" onClick={onBack}>
        ← Back to {project.name}
      </button>

      {/* Song Identity — the project's own fields, nothing new. A Music
          Workspace doesn't own a title, a status, or a description any
          more than Creative Session owns a Project; it just presents the
          same ones with a song's own framing. */}
      <div className="music-workspace-header">
        <h2 className="section-title">🎵 {project.name}</h2>
        <p className="section-subtitle">
          {project.type} · {project.status} · Created {formatDate(project.createdAt)}
        </p>
        <p className="music-workspace-description">
          {project.description || "No description yet."}
        </p>
      </div>

      <MusicSection
        title="🎤 Lyrics"
        isEmpty={workspace.lyrics.length === 0}
        emptyText="No lyrics captured yet."
        addLabel="+ Add Lyrics"
        onAdd={onAddAsset}
      >
        <AssetList assets={workspace.lyrics} projects={[project]} selectedAssetId={null} onSelect={onOpenAsset} />
      </MusicSection>

      <MusicSection
        title="🎧 Audio"
        isEmpty={workspace.audio.length === 0}
        emptyText="No reference tracks, mixes, or versions yet."
        addLabel="+ Add Audio"
        onAdd={onAddAsset}
      >
        <AssetList assets={workspace.audio} projects={[project]} selectedAssetId={null} onSelect={onOpenAsset} />
      </MusicSection>

      <div className="music-section">
        <div className="music-section-header">
          <h3 className="music-section-title">🖼️ Artwork</h3>
          <button className="section-action-btn secondary" onClick={onAddAsset}>
            + Add Artwork
          </button>
        </div>
        {workspace.artwork.length > 0 ? (
          <AssetList assets={workspace.artwork} projects={[project]} selectedAssetId={null} onSelect={onOpenAsset} />
        ) : workspace.missingArtworkOpportunity ? (
          // The same Opportunity a Creative Session would already show for
          // this project — reused verbatim (same component, same data),
          // not a second "you need artwork" message invented here.
          <OpportunityCard
            opportunity={workspace.missingArtworkOpportunity}
            resolve={(ref) => resolveObjectRef(ref, discoveryContext)}
            onOpenObject={onOpenObject}
          />
        ) : (
          <p className="music-section-empty">No artwork yet.</p>
        )}
      </div>

      <MusicSection
        title="📝 Creative & Production Notes"
        isEmpty={workspace.notes.length === 0}
        emptyText="No notes captured for this song yet."
        addLabel="+ Capture Knowledge"
        onAdd={onCaptureKnowledge}
      >
        <KnowledgeList
          entries={workspace.notes}
          projects={[project]}
          selectedEntryId={null}
          onSelect={onOpenKnowledgeEntry}
        />
      </MusicSection>

      <MusicSection
        title="🚀 Releases"
        isEmpty={workspace.releases.length === 0}
        emptyText="No releases planned yet."
        addLabel="+ Plan Release"
        onAdd={onCreateRelease}
      >
        <ReleaseList
          releases={workspace.releases}
          projects={[project]}
          selectedReleaseId={null}
          onSelect={onOpenRelease}
        />
      </MusicSection>
    </section>
  );
}

export default MusicWorkspaceView;
