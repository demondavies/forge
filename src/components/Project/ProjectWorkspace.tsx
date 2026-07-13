import { useEffect, useState } from "react";
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
import { formatDate } from "../../utils/formatDate";
import { resolveObjectRef } from "../../hooks/relationshipDiscovery";
import type { DiscoveryContext } from "../../hooks/relationshipDiscovery";
import { buildCreativeHistory } from "../../hooks/creativeHistory";
import SummaryCard from "./SummaryCard";
import ProjectTabs from "./ProjectTabs";
import type { ProjectTabId } from "./ProjectTabs";
import AssetList from "../Asset/AssetList";
import KnowledgeList from "../Knowledge/KnowledgeList";
import ReleaseList from "../Release/ReleaseList";
import RelatedSection from "../Relationships/RelatedSection";
import CreativeHistorySection from "../History/CreativeHistorySection";

interface ProjectWorkspaceProps {
  project: Project;
  // The active identity's full project/asset/knowledge/release/capture
  // lists. Most are filtered down to just this project below; `projects`
  // and `captures` are also needed whole, as context for relationship
  // discovery and resolution (see the useEffect and RelatedItemsList below).
  projects: Project[];
  assets: Asset[];
  knowledgeEntries: KnowledgeEntry[];
  releases: Release[];
  captures: Capture[];
  identities: Identity[];
  // The active identity's full activity log — buildCreativeHistory narrows
  // this down to just the project's own story (its own activity, plus its
  // assets'/knowledge's/releases' — see the `relatedRefs` passed to it
  // below), so nothing here needs pre-filtering by the caller.
  activities: Activity[];
  onBack: () => void;
  // Opens the same global "Create X" modals App.tsx already owns — clicking
  // these buttons from inside a project's tab reuses that exact flow rather
  // than duplicating it.
  onAddAsset: () => void;
  onCaptureKnowledge: () => void;
  onCreateRelease: () => void;
  // The Relationship Engine — a query (closes over React state, so it's
  // passed down as a callback like everything else here), a discovery
  // trigger, and the two actions a creator can take on a suggestion.
  getRelationshipsFor: (ref: ObjectRef) => Relationship[];
  onDiscoverRelationships: (ref: ObjectRef, context: DiscoveryContext) => void;
  onConfirmRelationship: (id: string) => void;
  onDismissRelationship: (id: string) => void;
  // Opens ConnectToModal (owned by App.tsx) with this project as the
  // source — the label is passed alongside the ref so App.tsx doesn't need
  // to re-resolve something already known here.
  onConnectTo: (ref: ObjectRef, label: string) => void;
  // Clicking an asset/knowledge/release card from inside this project's own
  // tabs jumps out to that object's own detail view (the same
  // "Context Everywhere" surface reached from the top-level Assets/
  // Knowledge/Releases sections) rather than trying to show it nested a
  // third level deep inside a project. Reuses the exact callbacks App.tsx
  // already built for that top-level navigation.
  onOpenAsset: (id: string) => void;
  onOpenKnowledgeEntry: (id: string) => void;
  onOpenRelease: (id: string) => void;
  // Opens CreativeSessionView for this project (owned by Workspace.tsx —
  // see App.tsx's beginSession). A session is entered from here, not from
  // a permanent sidebar destination, since it's always about one specific
  // project a creator has already chosen to work on.
  onBeginSession: () => void;
  // Opens MusicWorkspaceView for this project (owned by Workspace.tsx —
  // see App.tsx's openMusicWorkspace). Same contextual entry-point pattern
  // as onBeginSession — a specialised composition, entered from the
  // specific project it's about.
  onOpenMusicWorkspace: () => void;
}

// A dedicated workspace for a single project — what you see after clicking
// a project card, instead of just a row getting highlighted in the list.
// Below the project header sits a tab bar (Overview/Assets/Knowledge/
// Releases); switching tabs only swaps the content below it, never the
// sidebar. Nothing here creates or mutates any entity; it only reads from
// the existing Project/Asset/Knowledge/Release/Relationship systems
// already owned by App.tsx.
function ProjectWorkspace({
  project,
  projects,
  assets,
  knowledgeEntries,
  releases,
  captures,
  identities,
  activities,
  onBack,
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
}: ProjectWorkspaceProps) {
  // Which tab is showing. Lives here (not lifted to App.tsx) because it's
  // purely local navigation inside a single project — nothing outside this
  // component needs to know about it, and a fresh ProjectWorkspace mount
  // (i.e. opening a different project) naturally resets it back to "overview".
  const [activeTab, setActiveTab] = useState<ProjectTabId>("overview");

  // Computed once and reused by both the Overview counts and the matching
  // tab's list below — no duplicated filtering logic. Assets and Releases
  // always belong to exactly one project; Knowledge only counts here when
  // it's explicitly attached to this one (identity-level knowledge, with a
  // null projectId, is deliberately excluded).
  const projectAssets = assets.filter((asset) => asset.projectId === project.id);
  const projectKnowledge = knowledgeEntries.filter((entry) => entry.projectId === project.id);
  const projectReleases = releases.filter((release) => release.projectId === project.id);

  const projectRef: ObjectRef = { type: "project", id: project.id };

  // The same shape of data every discovery rule and ref-resolution needs —
  // built once so both the effect below and the render below it stay
  // trivially in sync.
  const discoveryContext: DiscoveryContext = {
    identities,
    projects,
    knowledgeEntries,
    assets,
    releases,
    captures,
  };

  // Re-runs deterministic discovery for this project whenever its own data
  // changes shape (a new asset/knowledge entry/release appears) — cheap,
  // idempotent, and the only thing that ever writes a "suggested"
  // relationship. onDiscoverRelationships is stable (see useRelationships'
  // useCallback), so this doesn't fire on unrelated re-renders.
  useEffect(() => {
    onDiscoverRelationships(projectRef, discoveryContext);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    project.id,
    projectAssets.length,
    projectKnowledge.length,
    projectReleases.length,
    onDiscoverRelationships,
  ]);

  const projectRelationships = getRelationshipsFor(projectRef);

  // Unlike Knowledge/Asset/Release/Capture, a Project has children — its
  // history should include when *they* were created too ("first asset
  // added" falls naturally out of this, with no dedicated milestone
  // detection needed), not just events about the project record itself.
  // See creativeHistory.ts's own comment on `relatedRefs`.
  const projectChildRefs: ObjectRef[] = [
    ...projectAssets.map((asset): ObjectRef => ({ type: "asset", id: asset.id })),
    ...projectKnowledge.map((entry): ObjectRef => ({ type: "knowledge", id: entry.id })),
    ...projectReleases.map((release): ObjectRef => ({ type: "release", id: release.id })),
  ];
  const projectHistory = buildCreativeHistory(
    projectRef,
    projectChildRefs,
    activities,
    projectRelationships,
    (ref) => resolveObjectRef(ref, discoveryContext),
  );

  return (
    <div className="project-workspace">
      <button className="back-btn" onClick={onBack}>
        ← Back to Projects
      </button>

      <header className="project-workspace-header">
        <div className="project-workspace-title-row">
          <h2 className="project-workspace-title">{project.name}</h2>
          <span className={`badge status-badge status-${project.status.toLowerCase()}`}>
            {project.status}
          </span>
          {/* Entering a Creative Session or a Music Workspace is a
              project-level action, not tied to any one tab — sits beside
              the title for the same reason "+ Connect To…" sits beside a
              Related section's own title, rather than being buried inside
              Overview. Both are specialised compositions over this exact
              Project, available to any project regardless of type —
              Forge's own ProjectType values (Single/EP/Album) are already
              music-shaped, so there's no separate "is this a song" check
              gating the second button. */}
          <div className="project-workspace-actions">
            <button className="section-action-btn secondary" onClick={onOpenMusicWorkspace}>
              🎸 Open Music Workspace
            </button>
            <button className="section-action-btn" onClick={onBeginSession}>
              🎨 Begin Creative Session
            </button>
          </div>
        </div>

        <p className="project-workspace-meta">
          {project.type} · Created {formatDate(project.createdAt)}
        </p>

        <p className="project-workspace-description">
          {project.description || "No description yet."}
        </p>
      </header>

      <ProjectTabs activeTab={activeTab} onSelectTab={setActiveTab} />

      {activeTab === "overview" && (
        <>
          {/* Reuses .card-grid (Workspace.css) — the same responsive grid
              already used for the identity overview cards. */}
          <div className="card-grid">
            <SummaryCard
              title="Assets"
              count={projectAssets.length}
              description="Files and media for this project."
              onOpen={() => setActiveTab("assets")}
            />
            <SummaryCard
              title="Knowledge"
              count={projectKnowledge.length}
              description="Lessons learned while making this."
              onOpen={() => setActiveTab("knowledge")}
            />
            <SummaryCard
              title="Releases"
              count={projectReleases.length}
              description="Where this project has shipped."
              onOpen={() => setActiveTab("releases")}
            />
          </div>

          {/* See RelatedSection's own doc comment — this is the same
              always-visible "Related" toolbar + list every object surface
              now uses. */}
          <RelatedSection
            subjectRef={projectRef}
            subjectLabel={project.name}
            relationships={projectRelationships}
            resolve={(ref) => resolveObjectRef(ref, discoveryContext)}
            onConfirm={onConfirmRelationship}
            onDismiss={onDismissRelationship}
            onConnectTo={onConnectTo}
          />

          {/* Creative History replaces the old whole-identity Recent
              Activity feed — this project's own story now, not a dump of
              everything that happened across every project. */}
          <CreativeHistorySection entries={projectHistory} />
        </>
      )}

      {activeTab === "assets" && (
        <section className="section-view">
          <div className="section-toolbar">
            <h2 className="section-title">Assets</h2>
            <button className="section-action-btn" onClick={onAddAsset}>
              + Add Asset
            </button>
          </div>

          {/* Reuses AssetList exactly as-is — passing just this project in
              a single-item array is enough for AssetCard to resolve its
              project badge, with no need for the identity's full list. */}
          {projectAssets.length === 0 ? (
            <div className="section-empty">
              <p className="section-empty-title">No assets for this project yet.</p>
            </div>
          ) : (
            <AssetList
              assets={projectAssets}
              projects={[project]}
              selectedAssetId={null}
              onSelect={onOpenAsset}
            />
          )}
        </section>
      )}

      {activeTab === "knowledge" && (
        <section className="section-view">
          <div className="section-toolbar">
            <h2 className="section-title">Knowledge</h2>
            <button className="section-action-btn" onClick={onCaptureKnowledge}>
              + Capture Knowledge
            </button>
          </div>

          {projectKnowledge.length === 0 ? (
            <div className="section-empty">
              <p className="section-empty-title">No knowledge captured for this project.</p>
            </div>
          ) : (
            <KnowledgeList
              entries={projectKnowledge}
              projects={[project]}
              selectedEntryId={null}
              onSelect={onOpenKnowledgeEntry}
            />
          )}
        </section>
      )}

      {activeTab === "releases" && (
        <section className="section-view">
          <div className="section-toolbar">
            <h2 className="section-title">Releases</h2>
            <button className="section-action-btn" onClick={onCreateRelease}>
              + Plan Release
            </button>
          </div>

          {projectReleases.length === 0 ? (
            <div className="section-empty">
              <p className="section-empty-title">No releases planned.</p>
            </div>
          ) : (
            <ReleaseList
              releases={projectReleases}
              projects={[project]}
              selectedReleaseId={null}
              onSelect={onOpenRelease}
            />
          )}
        </section>
      )}
    </div>
  );
}

export default ProjectWorkspace;
