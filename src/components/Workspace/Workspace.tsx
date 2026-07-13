import "./Workspace.css";
import type {
  Activity,
  Asset,
  Candidate,
  Capture,
  CreativeExecution,
  Identity,
  KnowledgeEntry,
  ObjectRef,
  PlannedTrack,
  Project,
  PromptAttribution,
  Relationship,
  Release,
  StudioResource,
  WorkspaceSection,
} from "../../types";
import { WORKSPACE_SURFACE_DEFINITIONS } from "../../types";
import type { DiscoveryContext } from "../../hooks/relationshipDiscovery";
import ProjectsView from "../Project/ProjectsView";
import KnowledgeView from "../Knowledge/KnowledgeView";
import AssetView from "../Asset/AssetView";
import ReleaseView from "../Release/ReleaseView";
import InboxView from "../Inbox/InboxView";
import CompanionsView from "../Companion/CompanionsView";
import DiscoveriesView from "../Discovery/DiscoveriesView";
import ChiefView from "../Chief/ChiefView";
import OpportunitiesView from "../Opportunity/OpportunitiesView";
import CreativeSessionView from "../Session/CreativeSessionView";
import MusicWorkspaceView from "../Music/MusicWorkspaceView";
import CreativeActionsPanel from "../Actions/CreativeActionsPanel";
import { bindCreativeAction } from "../../hooks/creativeActions";
import { applyActionEmphasis } from "../../hooks/blueprints";
import type { BlueprintDefinition } from "../../hooks/blueprints";
import BlueprintWelcome from "../Blueprint/BlueprintWelcome";
import PromptStudioView from "../PromptStudio/PromptStudioView";
import CreativePipelineView from "../Pipeline/CreativePipelineView";
import StudioQueueView from "../StudioQueue/StudioQueueView";
import ExecutionProviderStatusView from "../ExecutionProviders/ExecutionProviderStatusView";
import RegisteredProvidersView from "../Providers/RegisteredProvidersView";
import type { QueueExecutionInput, QueueExecutionResult } from "../../hooks/useStudioQueue";
import AlbumProductionView from "../Album/AlbumProductionView";
import type { PlanTrackInput, PlanTrackResult } from "../../hooks/usePlannedTracks";
import TrackWorkspaceView from "../TrackWorkspace/TrackWorkspaceView";
import AttributedPromptsPanel from "../PromptAttribution/AttributedPromptsPanel";
import QueueTrackGroupsView from "../TrackQueueAttribution/QueueTrackGroupsView";
import TrackExecutionsPanel from "../TrackQueueAttribution/TrackExecutionsPanel";
import CandidateReviewPanel from "../CandidateReview/CandidateReviewPanel";
import type { AddCandidateInput, AddCandidateResult } from "../../hooks/useCandidates";
import CandidateImportPanel, { type ImportCandidatesResult } from "../CandidateImport/CandidateImportPanel";
import type { AttributePromptInput, AttributePromptResult } from "../../hooks/usePromptAttributions";
import ReleaseManifestView from "../ReleaseManifest/ReleaseManifestView";
import ReleaseTranslationView from "../Translation/ReleaseTranslationView";
import MorningBriefingView from "../MorningBriefing/MorningBriefingView";
import type { CaptureKnowledgeInput, CaptureKnowledgeResult } from "../../hooks/useKnowledge";
import ProviderSettingsView from "../Settings/ProviderSettingsView";
import UpdaterPanel from "../Settings/UpdaterPanel";
import BrowserAutomationStatusView from "../BrowserAutomation/BrowserAutomationStatusView";
import BrowserSessionResolverView from "../BrowserSessionResolver/BrowserSessionResolverView";
import GenerateTrackPanel, { type GenerateResult } from "../GenerationRequest/GenerateTrackPanel";
import GenerateAlbumPanel from "../GenerationRequest/GenerateAlbumPanel";
import TrackWorkspaceSplitView from "../WorkspaceSurface/TrackWorkspaceSplitView";
import WorkspaceSurfaceLauncher from "../WorkspaceSurface/WorkspaceSurfaceLauncher";
import ProductionConsoleView from "../ProductionConsole/ProductionConsoleView";

interface WorkspaceProps {
  identity: Identity | null;
  // The full, unfiltered-by-selection list — distinct from `identity`
  // above (the *currently selected* one) — needed only to resolve
  // relationship endpoints that might point at an Identity.
  identities: Identity[];
  section: WorkspaceSection;
  projects: Project[];
  selectedProjectId: string | null;
  onSelectProject: (id: string | null) => void;
  onCreateProject: () => void;
  knowledgeEntries: KnowledgeEntry[];
  onCaptureKnowledge: () => void;
  selectedKnowledgeEntry: KnowledgeEntry | null;
  onSelectKnowledgeEntry: (id: string | null) => void;
  assets: Asset[];
  onAddAsset: () => void;
  onImportAudio: () => void;
  studioResources: StudioResource[];
  onDeleteStudioResource: (id: string) => void;
  onRevealInExplorer: (filePath: string) => void;
  selectedAsset: Asset | null;
  onSelectAsset: (id: string | null) => void;
  releases: Release[];
  onCreateRelease: () => void;
  selectedRelease: Release | null;
  onSelectRelease: (id: string | null) => void;
  activities: Activity[];
  captures: Capture[];
  onQuickCapture: () => void;
  selectedCapture: Capture | null;
  onSelectCapture: (id: string | null) => void;
  getRelationshipsFor: (ref: ObjectRef) => Relationship[];
  onDiscoverRelationships: (ref: ObjectRef, context: DiscoveryContext) => void;
  onConfirmRelationship: (id: string) => void;
  onDismissRelationship: (id: string) => void;
  onConnectTo: (ref: ObjectRef, label: string) => void;
  // "Context Everywhere": jumps straight to a specific object's own detail
  // view (switching section + selecting it in one step), reused by every
  // detail view's "Part of <Project>" link and by ProjectWorkspace's own
  // tabs when a creator drills into one of its assets/knowledge/releases.
  onOpenProject: (id: string) => void;
  onOpenAsset: (id: string) => void;
  onOpenKnowledgeEntry: (id: string) => void;
  onOpenRelease: (id: string) => void;
  // The Discovery Engine reads the identity's whole relationship graph
  // (not just one object's own, like getRelationshipsFor above), and its
  // findings can point at any object type — onOpenObject dispatches to
  // whichever openX helper matches a given ObjectRef's type.
  relationships: Relationship[];
  onOpenObject: (ref: ObjectRef) => void;
  // Chief's card in the Companions roster is the one click-through
  // destination among them (see CompanionsView) — this just switches
  // section, mirroring every other "open a section" callback here.
  onOpenChief: () => void;
  // Opens ImportModal (owned by App.tsx) — see KnowledgeView's "+ Import"
  // button.
  onImport: () => void;
  // Opens FolderImportModal (owned by App.tsx) — see KnowledgeView's
  // "+ Import Folder" button.
  onImportFolder: () => void;
  // Opens the same FolderImportModal component, configured for Obsidian
  // Vault Import instead (owned by App.tsx) — see KnowledgeView's
  // "+ Import Vault" button.
  onImportVault: () => void;
  // Begins a Creative Session for one project (owned by App.tsx) — see
  // ProjectWorkspace's "Begin Creative Session" button. Takes a project id
  // rather than being a plain () => void like onOpenChief, since a session
  // is always about one specific project chosen from wherever it's opened.
  onBeginSession: (id: string) => void;
  // Opens Music Workspace for one project (owned by App.tsx) — see
  // ProjectWorkspace's "Open Music Workspace" button. Same shape as
  // onBeginSession, for the same reason.
  onOpenMusicWorkspace: (id: string) => void;
  // Set only during the transient first visit after creating a project
  // from a Blueprint with a preferred workspace (see App.tsx's
  // firstBlueprintVisit) — null the rest of the time, including every
  // ordinary return visit. This is the entire surface Blueprint
  // Composition adds to Workspace.tsx: one optional piece of data, read
  // only inside the "music" section below, that this file remains
  // completely functional without.
  activeBlueprint: BlueprintDefinition | null;
  // Opens Prompt Studio for one project (owned by App.tsx) — see the
  // "Open Prompt Studio" button rendered alongside Music Workspace below.
  // Same shape as onBeginSession/onOpenMusicWorkspace, for the same reason.
  onOpenPromptStudio: (id: string) => void;
  // The real capture function (App.tsx's handleCaptureKnowledge), not the
  // "open the generic modal" trigger onCaptureKnowledge already is —
  // Prompt Studio needs to write a fully-composed Knowledge entry directly,
  // the same direct-write access Import already has. Additive: every
  // existing consumer of onCaptureKnowledge (the modal-opening one) is
  // completely unaffected.
  onSaveKnowledge: (input: CaptureKnowledgeInput) => CaptureKnowledgeResult;
  // Opens the Release Manifest for one release (owned by App.tsx) — see
  // the "Generate Release Manifest" button rendered alongside ReleaseView
  // below. Same shape as onOpenPromptStudio/onOpenMusicWorkspace, just
  // keyed by a release id rather than a project id, since a manifest is
  // always about one specific release.
  onOpenReleaseManifest: (id: string) => void;
  // Opens the Translation Engine's own view for one release (owned by
  // App.tsx) — see the "Export as release.json" button rendered alongside
  // ReleaseManifestView above. Same shape as onOpenReleaseManifest, one
  // layer further down the reasoning stack.
  onOpenReleaseTranslation: (id: string) => void;
  // Studio Queue's own state (owned by App.tsx's useStudioQueue) — passed
  // straight through, the same way onOpenX/onCreateX callbacks already
  // are. `executions` is already filtered to the active identity by the
  // hook; StudioQueueView itself filters further, down to one project.
  executions: CreativeExecution[];
  onQueueExecution: (input: QueueExecutionInput) => QueueExecutionResult;
  onRemoveExecution: (id: string) => void;
  // Album Production's own state (owned by App.tsx's usePlannedTracks) —
  // passed straight through, the same way Studio Queue's executions
  // already are. `plannedTracks` is already filtered to the active
  // identity by the hook; AlbumProductionView itself filters further, down
  // to one project.
  plannedTracks: PlannedTrack[];
  onPlanTrack: (input: PlanTrackInput) => PlanTrackResult;
  onRemoveTrack: (id: string) => void;
  // Opens Album Production for one project (owned by App.tsx) — see the
  // "Open Album Production" button rendered alongside Music Workspace
  // below. Same shape as onOpenPromptStudio/onOpenMusicWorkspace.
  onOpenAlbumProduction: (id: string) => void;
  // Which planned track Track Workspace is currently open for (owned by
  // App.tsx) — null the rest of the time, including every ordinary visit
  // to any other section. A project can have many planned tracks, so this
  // can't be implied by selectedProjectId alone the way a single Release
  // Manifest destination can be implied by selectedRelease.
  selectedTrackId: string | null;
  // Opens Track Workspace for one planned track (owned by App.tsx) — see
  // the "Track Workspaces" entry list rendered alongside Album Production
  // below. Takes the whole PlannedTrack (not just an id) since every call
  // site already has the real object in hand from `plannedTracks`.
  onOpenTrackWorkspace: (track: PlannedTrack) => void;
  // Prompt Attribution's own state (owned by App.tsx's
  // usePromptAttributions) — passed straight through to Prompt Studio (to
  // record a creator's "Target Track" choice) and to Track Workspace's own
  // sibling proof panel (to discover what's already been declared).
  // `attributions` is already filtered to the active identity by the hook.
  attributions: PromptAttribution[];
  onAttributePrompt: (input: AttributePromptInput) => AttributePromptResult;
  getAttributedTrackId: (promptVersionId: string) => string | null;
  // Candidate Review's own state (owned by App.tsx's useCandidates) —
  // passed straight through to Track Workspace's own sibling proof panel.
  // `candidates` is already filtered to the active identity by the hook.
  // onApproveCandidate is the already-composed callback (App.tsx's
  // handleApproveCandidate) that creates the real Audio Asset via the
  // existing, unmodified asset workflow and only then marks the candidate
  // approved — this component never talks to useAssets.ts directly.
  candidates: Candidate[];
  onAddCandidate: (input: AddCandidateInput) => AddCandidateResult;
  onAddNote: (candidateId: string, text: string) => void;
  onApproveCandidate: (candidate: Candidate) => void;
  onRejectCandidate: (id: string) => void;
  onSetCurrentBest: (candidateId: string) => void;
  onSetAlbumVersion: (candidateId: string) => void;
  // Candidate Import's own composition (App.tsx's handleImportCandidates)
  // — asks the Execution Provider Framework what a given execution's
  // provider has produced, then adds one Candidate per reported output via
  // the same onAddCandidate already wired above. This component never
  // talks to executionProviders.ts or useCandidates.ts directly.
  onImportCandidates: (execution: CreativeExecution) => Promise<ImportCandidatesResult>;
  // Generation Request Engine's own composition (App.tsx's
  // handleGenerateTrack/handleGenerateAlbum) — resolves which prompt
  // version to queue and which provider would fulfil the request, then
  // calls Studio Queue's own, completely unmodified queueExecution.
  // Neither of these components talks to useStudioQueue.ts or
  // executionProviders.ts directly.
  onGenerateTrack: (track: PlannedTrack) => GenerateResult;
  onGenerateAlbum: (projectId: string) => GenerateResult;
  // Workspace Surface's own session state (owned by App.tsx's
  // useWorkspaceSurface) — passed straight through to Track Workspace's
  // split view and launcher. Neither of those components ever imports
  // useWorkspaceSurface.ts directly.
  workspaceSurfaceOpenId: string | null;
  workspaceSurfaceLastOpenedId: string | null;
  onOpenWorkspaceSurface: (id: string) => void;
  onCloseWorkspaceSurface: () => void;
  // Production Console: session-only string[] fed by the Prompt Delivery
  // Engine whenever Generate Track or Generate Album fires. Rendered as a
  // sibling below each generate panel — visible exactly where the action
  // was taken, without any new WorkspaceSection or navigation.
  consoleMessages: string[];
  onClearConsole: () => void;
  onLog: (message: string) => void;
}

// The main content area to the right of the sidebar. Always shows a header
// for whichever identity is currently selected; below that, the "section"
// prop decides what's shown — the Morning Briefing ("overview" — also the
// session's starting section), or the Projects, Knowledge, Assets, or
// Releases list — depending on which sidebar link was clicked.
function Workspace({
  identity,
  identities,
  section,
  projects,
  selectedProjectId,
  onSelectProject,
  onCreateProject,
  knowledgeEntries,
  onCaptureKnowledge,
  selectedKnowledgeEntry,
  onSelectKnowledgeEntry,
  assets,
  onAddAsset,
  onImportAudio,
  studioResources,
  onDeleteStudioResource,
  onRevealInExplorer,
  selectedAsset,
  onSelectAsset,
  releases,
  onCreateRelease,
  selectedRelease,
  onSelectRelease,
  activities,
  captures,
  onQuickCapture,
  selectedCapture,
  onSelectCapture,
  getRelationshipsFor,
  onDiscoverRelationships,
  onConfirmRelationship,
  onDismissRelationship,
  onConnectTo,
  onOpenProject,
  onOpenAsset,
  onOpenKnowledgeEntry,
  onOpenRelease,
  relationships,
  onOpenObject,
  onOpenChief,
  onImport,
  onImportFolder,
  onImportVault,
  onBeginSession,
  onOpenMusicWorkspace,
  activeBlueprint,
  onOpenPromptStudio,
  onSaveKnowledge,
  onOpenReleaseManifest,
  onOpenReleaseTranslation,
  executions,
  onQueueExecution,
  onRemoveExecution,
  plannedTracks,
  onPlanTrack,
  onRemoveTrack,
  onOpenAlbumProduction,
  selectedTrackId,
  onOpenTrackWorkspace,
  attributions,
  onAttributePrompt,
  getAttributedTrackId,
  candidates,
  onAddCandidate,
  onAddNote,
  onApproveCandidate,
  onRejectCandidate,
  onSetCurrentBest,
  onSetAlbumVersion,
  onImportCandidates,
  onGenerateTrack,
  onGenerateAlbum,
  workspaceSurfaceOpenId,
  workspaceSurfaceLastOpenedId,
  onOpenWorkspaceSurface,
  onCloseWorkspaceSurface,
  consoleMessages,
  onClearConsole,
  onLog,
}: WorkspaceProps) {
  // There's always a selected identity in normal use, but this guards the
  // edge case cleanly (e.g. the identity list is ever empty) instead of
  // crashing on identity.name below.
  if (!identity) {
    return (
      <main className="workspace">
        <p className="workspace-empty">No identity selected.</p>
      </main>
    );
  }

  return (
    <main className="workspace">
      <header className="workspace-header">
        <h1 className="workspace-title">{identity.name}</h1>
        {/* Falls back to a friendly default when the identity was created
            without a description (it's optional — see CreateIdentityModal). */}
        <p className="workspace-subtitle">
          {identity.description || "Your creative workspace."}
        </p>
      </header>

      {section === "projects" && (
        <ProjectsView
          projects={projects}
          selectedProjectId={selectedProjectId}
          onSelectProject={onSelectProject}
          onCreateProject={onCreateProject}
          assets={assets}
          knowledgeEntries={knowledgeEntries}
          releases={releases}
          captures={captures}
          identities={identities}
          activities={activities}
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
          onBeginSession={onBeginSession}
          onOpenMusicWorkspace={onOpenMusicWorkspace}
        />
      )}

      {/* selectedProjectId is guaranteed set here — beginSession (App.tsx)
          always selects the project before switching to this section, the
          same "select + switch section in one step" pattern every other
          Context Everywhere destination already uses. Falls through to
          nothing (rather than a crash) in the never-expected case it isn't. */}
      {section === "session" &&
        (() => {
          const sessionProject = projects.find((candidate) => candidate.id === selectedProjectId);
          if (!sessionProject) return null;

          return (
            <CreativeSessionView
              project={sessionProject}
              identities={identities}
              projects={projects}
              knowledgeEntries={knowledgeEntries}
              assets={assets}
              releases={releases}
              captures={captures}
              relationships={relationships}
              activities={activities}
              onOpenObject={onOpenObject}
              onOpenKnowledgeEntry={onOpenKnowledgeEntry}
              onEndSession={() => onOpenProject(sessionProject.id)}
            />
          );
        })()}

      {/* Same guard and "select + switch section" contract as "session"
          above — openMusicWorkspace (App.tsx) always selects the project
          first. The Creative Actions panel is rendered here, as a sibling
          above MusicWorkspaceView, rather than inside it — Music Workspace
          itself is off-limits to modify this sprint, so every action below
          is bound entirely with callbacks Workspace.tsx already had. */}
      {section === "music" &&
        (() => {
          const musicProject = projects.find((candidate) => candidate.id === selectedProjectId);
          if (!musicProject) return null;

          // The first real binding of Creative Actions to Existing Forge
          // Systems — six labels, six already-existing callbacks, nothing
          // new underneath any of them. "Generate Production Prompt" and
          // "Import Audio" (two of the mission's own examples) are
          // deliberately absent: Forge has no existing capability that
          // honestly backs either one yet (no AI to generate a prompt, no
          // audio-file-import workflow distinct from creating an Asset by
          // hand) — see this sprint's own report.
          const musicActions = applyActionEmphasis(
            [
              bindCreativeAction("capture-lyric", onAddAsset),
              bindCreativeAction("capture-production-note", onCaptureKnowledge),
              bindCreativeAction("import-notes", onImport),
              bindCreativeAction("add-artwork", onAddAsset),
              bindCreativeAction("create-release", onCreateRelease),
              bindCreativeAction("begin-creative-session", () => onBeginSession(musicProject.id)),
            ],
            // Purely a re-ordering of the exact same six actions above —
            // absent (activeBlueprint null) on every ordinary visit, which
            // is what makes "no Blueprint" and "Blueprint's preference
            // happens to be empty" behave identically: applyActionEmphasis
            // returns its input unchanged when there's nothing to emphasise.
            activeBlueprint?.emphasizedActionIds ?? [],
          );

          return (
            <>
              {/* Front-Loaded Guidance: shown only for the one transient
                  render this first visit lasts — see App.tsx's
                  firstBlueprintVisit and its own clearing effect. Gone
                  entirely on every return visit, and gone entirely if a
                  project was never created from a Blueprint at all. */}
              {activeBlueprint && (
                <BlueprintWelcome
                  blueprint={activeBlueprint}
                  onBeginSession={() => onBeginSession(musicProject.id)}
                />
              )}
              {/* Creative Pipeline — rendered here, as a sibling above
                  Creative Actions, for the same reason Prompt Studio's own
                  entry point is: Music Workspace is off-limits to modify
                  this sprint. This is the entire integration surface the
                  Pipeline needs — one inline block, no new
                  WorkspaceSection, no new navigation. Deleting this one
                  line (and its import above) leaves every prop and every
                  other line in this section exactly as it already was. */}
              <CreativePipelineView
                project={musicProject}
                identity={identity}
                knowledgeEntries={knowledgeEntries}
                assets={assets}
                releases={releases}
                captures={captures}
                relationships={relationships}
                activities={activities}
                onCaptureKnowledge={onCaptureKnowledge}
                onAddAsset={onAddAsset}
                onCreateRelease={onCreateRelease}
                onOpenPromptStudio={onOpenPromptStudio}
                onOpenReleaseManifest={onOpenReleaseManifest}
                onOpenReleaseTranslation={onOpenReleaseTranslation}
              />
              <CreativeActionsPanel actions={musicActions} />
              {/* Prompt Studio's one entry point — rendered here, beside
                  Creative Actions, rather than added to creativeActions.ts
                  or MusicWorkspaceView.tsx, both off-limits this sprint.
                  Reuses the .creative-action-btn look without being one of
                  the bound CreativeAction[] items above. */}
              <button className="creative-action-btn prompt-studio-entry-btn" onClick={() => onOpenPromptStudio(musicProject.id)}>
                <span className="creative-action-icon">🎛️</span>
                Open Prompt Studio
              </button>
              {/* Album Production's one entry point — only shown for
                  multi-track projects (Album/EP), since a Single already
                  is one track and Music Workspace's own single-track view
                  already covers it. Rendered here for the same reason
                  every other off-limits-host sprint's entry point is:
                  Music Workspace itself is off-limits to modify. */}
              {musicProject.type !== "Single" && (
                <button
                  className="creative-action-btn album-production-entry-btn"
                  onClick={() => onOpenAlbumProduction(musicProject.id)}
                >
                  <span className="creative-action-icon">💿</span>
                  Open Album Production
                </button>
              )}
              {/* Studio Queue — rendered here for the same reason Creative
                  Pipeline and Prompt Studio's entry point both are: Music
                  Workspace is off-limits to modify this sprint. One inline
                  block, no new WorkspaceSection, no new navigation. */}
              <StudioQueueView
                project={musicProject}
                knowledgeEntries={knowledgeEntries}
                executions={executions}
                onQueueExecution={onQueueExecution}
                onRemoveExecution={onRemoveExecution}
                onOpenKnowledgeEntry={onOpenKnowledgeEntry}
                onOpenPromptStudio={onOpenPromptStudio}
              />
              {/* Track Queue Attribution's own proof surface — rendered as
                  a sibling below Studio Queue's own display rather than
                  inside it, since Studio Queue is off-limits to modify
                  this sprint. Reuses props this section already has; no
                  new WorkspaceProps, no new App.tsx wiring. */}
              <QueueTrackGroupsView
                project={musicProject}
                executions={executions}
                plannedTracks={plannedTracks}
                knowledgeEntries={knowledgeEntries}
                getAttributedTrackId={getAttributedTrackId}
                onOpenKnowledgeEntry={onOpenKnowledgeEntry}
              />
              {/* Execution Provider Framework's one visible surface —
                  rendered as a sibling below Studio Queue's own display
                  rather than inside it, since Studio Queue is off-limits
                  to modify this sprint. Needs nothing beyond props this
                  section already has — no new WorkspaceProps, no new
                  App.tsx wiring. */}
              <ExecutionProviderStatusView
                project={musicProject}
                executions={executions}
                knowledgeEntries={knowledgeEntries}
              />
              {/* Suno Service Adapter's one visible surface — rendered as
                  a sibling below Execution Provider Status rather than
                  inside it, since that file is off-limits to modify this
                  sprint. Reuses props this section already has; no new
                  WorkspaceProps, no new App.tsx wiring beyond the one
                  side-effect import that registers the adapter. */}
              <RegisteredProvidersView
                project={musicProject}
                executions={executions}
                knowledgeEntries={knowledgeEntries}
              />
              <MusicWorkspaceView
                project={musicProject}
                identities={identities}
                projects={projects}
                knowledgeEntries={knowledgeEntries}
                assets={assets}
                releases={releases}
                captures={captures}
                relationships={relationships}
                activities={activities}
                onOpenObject={onOpenObject}
                onOpenKnowledgeEntry={onOpenKnowledgeEntry}
                onOpenAsset={onOpenAsset}
                onOpenRelease={onOpenRelease}
                onAddAsset={onAddAsset}
                onCaptureKnowledge={onCaptureKnowledge}
                onCreateRelease={onCreateRelease}
                onBack={() => onOpenProject(musicProject.id)}
              />
            </>
          );
        })()}

      {/* Same guard and contract as "session"/"music" above —
          openPromptStudio (App.tsx) always selects the project first. */}
      {section === "prompt-studio" &&
        (() => {
          const promptProject = projects.find((candidate) => candidate.id === selectedProjectId);
          if (!promptProject) return null;

          return (
            <PromptStudioView
              project={promptProject}
              knowledgeEntries={knowledgeEntries}
              assets={assets}
              onOpenKnowledgeEntry={onOpenKnowledgeEntry}
              onSaveKnowledge={onSaveKnowledge}
              plannedTracks={plannedTracks}
              onAttributePrompt={onAttributePrompt}
              getAttributedTrackId={getAttributedTrackId}
              candidates={candidates}
              executions={executions}
              onBack={() => onOpenMusicWorkspace(promptProject.id)}
            />
          );
        })()}

      {/* Same guard shape as "prompt-studio" above — openAlbumProduction
          (App.tsx) always selects the project first. */}
      {section === "album-production" &&
        (() => {
          const albumProject = projects.find((candidate) => candidate.id === selectedProjectId);
          if (!albumProject) return null;

          const albumTracks = plannedTracks.filter((candidate) => candidate.projectId === albumProject.id);

          return (
            <>
              <AlbumProductionView
                project={albumProject}
                identity={identity}
                knowledgeEntries={knowledgeEntries}
                assets={assets}
                releases={releases}
                captures={captures}
                relationships={relationships}
                activities={activities}
                executions={executions}
                plannedTracks={plannedTracks}
                candidates={candidates}
                attributions={attributions}
                onPlanTrack={onPlanTrack}
                onRemoveTrack={onRemoveTrack}
                onQueueExecution={onQueueExecution}
                onOpenPromptStudio={onOpenPromptStudio}
                onBeginSession={onBeginSession}
                onCaptureKnowledge={onCaptureKnowledge}
                onOpenAsset={onOpenAsset}
                onOpenKnowledgeEntry={onOpenKnowledgeEntry}
                onCreateRelease={onCreateRelease}
                onOpenReleaseManifest={onOpenReleaseManifest}
                onBack={() => onOpenMusicWorkspace(albumProject.id)}
              />
              {/* Generation Request Engine's Album entry point — rendered
                  here, as a sibling below AlbumProductionView, for the
                  same off-limits-host reason as the Track Workspaces
                  entry list just below it. */}
              <GenerateAlbumPanel project={albumProject} onGenerateAlbum={onGenerateAlbum} />
              <ProductionConsoleView messages={consoleMessages} onClear={onClearConsole} />
              {/* Track Workspace's one entry point — rendered here, as a
                  sibling below AlbumProductionView, rather than making
                  each track card inside it clickable directly: Album
                  Production Engine (its hook and its view) is off-limits
                  to modify this sprint, the same reason every other
                  off-limits-host sprint's entry point lives in
                  Workspace.tsx instead. Deliberately minimal — just a
                  title and a button per track — so this never becomes a
                  second place a track's own facts are shown; that's
                  entirely Album Production's and Track Workspace's own
                  job. */}
              {albumTracks.length > 0 && (
                <div className="track-workspace-entry-list">
                  <h4 className="track-workspace-entry-list-title">🎵 Track Workspaces</h4>
                  {albumTracks.map((track) => (
                    <button
                      key={track.id}
                      className="secondary track-workspace-entry-btn"
                      onClick={() => onOpenTrackWorkspace(track)}
                    >
                      {track.title} →
                    </button>
                  ))}
                </div>
              )}
            </>
          );
        })()}

      {/* Same guard shape as "prompt-studio" above, but keyed off
          selectedTrackId (App.tsx) rather than being implied by the
          project alone — a project can have many planned tracks, so
          openTrackWorkspace (App.tsx) selects both the project and the
          specific track.

          Every existing track-workspace panel (TrackWorkspaceView and
          every sibling proof surface built alongside it in prior sprints)
          is combined into one `mainContent` fragment here, completely
          unchanged internally, and handed to TrackWorkspaceSplitView —
          this sprint's own "split view beside Track Workspace"
          requirement. When no Workspace Surface is open,
          TrackWorkspaceSplitView is a pure passthrough, so this looks
          exactly as it did before this sprint. */}
      {section === "track-workspace" &&
        (() => {
          const trackProject = projects.find((candidate) => candidate.id === selectedProjectId);
          const track = plannedTracks.find((candidate) => candidate.id === selectedTrackId);
          if (!trackProject || !track) return null;

          const openDefinition =
            WORKSPACE_SURFACE_DEFINITIONS.find((definition) => definition.id === workspaceSurfaceOpenId) ?? null;

          return (
            <TrackWorkspaceSplitView
              openDefinition={openDefinition}
              onCloseSurface={onCloseWorkspaceSurface}
              mainContent={
                <>
                  <TrackWorkspaceView
                    track={track}
                    project={trackProject}
                    identity={identity}
                    knowledgeEntries={knowledgeEntries}
                    assets={assets}
                    releases={releases}
                    captures={captures}
                    relationships={relationships}
                    activities={activities}
                    executions={executions}
                    candidates={candidates}
                    attributions={attributions}
                    onOpenAsset={onOpenAsset}
                    onOpenKnowledgeEntry={onOpenKnowledgeEntry}
                    onOpenObject={onOpenObject}
                    onOpenPromptStudio={onOpenPromptStudio}
                    onBeginSession={onBeginSession}
                    onCaptureKnowledge={onCaptureKnowledge}
                    onImportAudio={onImportAudio}
                    studioResources={studioResources}
                    onDeleteStudioResource={onDeleteStudioResource}
                    onRevealInExplorer={onRevealInExplorer}
                    onQueueExecution={onQueueExecution}
                    onBack={() => onOpenAlbumProduction(trackProject.id)}
                  />
                  <GenerateTrackPanel track={track} onGenerateTrack={onGenerateTrack} />
                  <ProductionConsoleView messages={consoleMessages} onClear={onClearConsole} />
                  <AttributedPromptsPanel
                    track={track}
                    project={trackProject}
                    knowledgeEntries={knowledgeEntries}
                    attributions={attributions}
                    onOpenKnowledgeEntry={onOpenKnowledgeEntry}
                  />
                  <TrackExecutionsPanel
                    track={track}
                    executions={executions}
                    plannedTracks={plannedTracks}
                    knowledgeEntries={knowledgeEntries}
                    getAttributedTrackId={getAttributedTrackId}
                    onOpenKnowledgeEntry={onOpenKnowledgeEntry}
                  />
                  <WorkspaceSurfaceLauncher
                    openSurfaceId={workspaceSurfaceOpenId}
                    lastOpenedSurfaceId={workspaceSurfaceLastOpenedId}
                    onOpenSurface={onOpenWorkspaceSurface}
                    onCloseSurface={onCloseWorkspaceSurface}
                  />
                  <CandidateImportPanel
                    track={track}
                    executions={executions}
                    plannedTracks={plannedTracks}
                    knowledgeEntries={knowledgeEntries}
                    getAttributedTrackId={getAttributedTrackId}
                    onImportCandidates={onImportCandidates}
                  />
                  <CandidateReviewPanel
                    track={track}
                    executions={executions}
                    plannedTracks={plannedTracks}
                    knowledgeEntries={knowledgeEntries}
                    candidates={candidates}
                    getAttributedTrackId={getAttributedTrackId}
                    onAddCandidate={onAddCandidate}
                    onAddNote={onAddNote}
                    onApproveCandidate={onApproveCandidate}
                    onRejectCandidate={onRejectCandidate}
                    onSetCurrentBest={onSetCurrentBest}
                    onSetAlbumVersion={onSetAlbumVersion}
                    onOpenKnowledgeEntry={onOpenKnowledgeEntry}
                    onOpenAsset={onOpenAsset}
                    onLog={onLog}
                  />
                </>
              }
            />
          );
        })()}

      {/* Same guard shape as "session"/"music"/"prompt-studio" above, but
          keyed off selectedRelease (already a Workspace.tsx prop) rather
          than selectedProjectId — openReleaseManifest (App.tsx) always
          selects the release first. The release's own project is looked
          up the same way ReleaseDetail already does. */}
      {section === "release-manifest" &&
        (() => {
          if (!selectedRelease) return null;
          const manifestProject = projects.find((candidate) => candidate.id === selectedRelease.projectId);
          if (!manifestProject) return null;

          return (
            <>
              <ReleaseManifestView
                release={selectedRelease}
                project={manifestProject}
                identity={identity}
                knowledgeEntries={knowledgeEntries}
                assets={assets}
                releases={releases}
                captures={captures}
                relationships={relationships}
                activities={activities}
                onOpenProject={onOpenProject}
                onOpenAsset={onOpenAsset}
                onOpenKnowledgeEntry={onOpenKnowledgeEntry}
                onBack={() => onOpenRelease(selectedRelease.id)}
              />
              {/* Translation Engine's one entry point — rendered here, as a
                  sibling below ReleaseManifestView, rather than inside it:
                  the Release Manifest Engine is off-limits to modify this
                  sprint, the same reason Release Manifest's own entry point
                  lives beside ReleaseView rather than inside ReleaseDetail. */}
              <button
                className="section-action-btn release-translation-entry-btn"
                onClick={() => onOpenReleaseTranslation(selectedRelease.id)}
              >
                🔁 Export as release.json
              </button>
            </>
          );
        })()}

      {/* Same guard shape as "release-manifest" above — openReleaseTranslation
          (App.tsx) always selects the release first. */}
      {section === "release-translation" &&
        (() => {
          if (!selectedRelease) return null;
          const translationProject = projects.find((candidate) => candidate.id === selectedRelease.projectId);
          if (!translationProject) return null;

          return (
            <ReleaseTranslationView
              release={selectedRelease}
              project={translationProject}
              identity={identity}
              knowledgeEntries={knowledgeEntries}
              assets={assets}
              releases={releases}
              captures={captures}
              relationships={relationships}
              activities={activities}
              onBack={() => onOpenReleaseManifest(selectedRelease.id)}
            />
          );
        })()}

      {section === "knowledge" && (
        <KnowledgeView
          entries={knowledgeEntries}
          projects={projects}
          onCaptureKnowledge={onCaptureKnowledge}
          onImport={onImport}
          onImportFolder={onImportFolder}
          onImportVault={onImportVault}
          selectedEntry={selectedKnowledgeEntry}
          onSelectEntry={onSelectKnowledgeEntry}
          identities={identities}
          assets={assets}
          releases={releases}
          captures={captures}
          activities={activities}
          onOpenProject={onOpenProject}
          getRelationshipsFor={getRelationshipsFor}
          onDiscoverRelationships={onDiscoverRelationships}
          onConfirmRelationship={onConfirmRelationship}
          onDismissRelationship={onDismissRelationship}
          onConnectTo={onConnectTo}
        />
      )}

      {section === "assets" && (
        <AssetView
          assets={assets}
          projects={projects}
          onAddAsset={onAddAsset}
          selectedAsset={selectedAsset}
          onSelectAsset={onSelectAsset}
          identities={identities}
          knowledgeEntries={knowledgeEntries}
          releases={releases}
          captures={captures}
          activities={activities}
          onOpenProject={onOpenProject}
          getRelationshipsFor={getRelationshipsFor}
          onDiscoverRelationships={onDiscoverRelationships}
          onConfirmRelationship={onConfirmRelationship}
          onDismissRelationship={onDismissRelationship}
          onConnectTo={onConnectTo}
        />
      )}

      {section === "releases" && (
        <>
          <ReleaseView
            releases={releases}
            projects={projects}
            onCreateRelease={onCreateRelease}
            selectedRelease={selectedRelease}
            onSelectRelease={onSelectRelease}
            identities={identities}
            knowledgeEntries={knowledgeEntries}
            assets={assets}
            captures={captures}
            activities={activities}
            onOpenProject={onOpenProject}
            getRelationshipsFor={getRelationshipsFor}
            onDiscoverRelationships={onDiscoverRelationships}
            onConfirmRelationship={onConfirmRelationship}
            onDismissRelationship={onDismissRelationship}
            onConnectTo={onConnectTo}
          />
          {/* Release Manifest's one entry point — rendered here, as a
              sibling below ReleaseView, rather than inside ReleaseDetail
              itself: ReleaseDetail is part of the Creative Knowledge
              Engine, off-limits this sprint. Only shown once a specific
              release is open (selectedRelease), since a manifest is always
              generated for one release, never for the whole list. */}
          {selectedRelease && (
            <button
              className="section-action-btn release-manifest-entry-btn"
              onClick={() => onOpenReleaseManifest(selectedRelease.id)}
            >
              📄 Generate Release Manifest
            </button>
          )}
        </>
      )}

      {section === "inbox" && (
        <InboxView
          captures={captures}
          onQuickCapture={onQuickCapture}
          selectedCapture={selectedCapture}
          onSelectCapture={onSelectCapture}
          identities={identities}
          projects={projects}
          knowledgeEntries={knowledgeEntries}
          assets={assets}
          releases={releases}
          activities={activities}
          getRelationshipsFor={getRelationshipsFor}
          onDiscoverRelationships={onDiscoverRelationships}
          onConfirmRelationship={onConfirmRelationship}
          onDismissRelationship={onDismissRelationship}
          onConnectTo={onConnectTo}
        />
      )}

      {section === "discoveries" && (
        <DiscoveriesView
          identities={identities}
          projects={projects}
          knowledgeEntries={knowledgeEntries}
          assets={assets}
          releases={releases}
          captures={captures}
          relationships={relationships}
          onOpenObject={onOpenObject}
        />
      )}

      {section === "chief" && (
        <ChiefView
          identities={identities}
          projects={projects}
          knowledgeEntries={knowledgeEntries}
          assets={assets}
          releases={releases}
          captures={captures}
          relationships={relationships}
          onOpenObject={onOpenObject}
        />
      )}

      {section === "opportunities" && (
        <OpportunitiesView
          identities={identities}
          projects={projects}
          knowledgeEntries={knowledgeEntries}
          assets={assets}
          releases={releases}
          captures={captures}
          relationships={relationships}
          onOpenObject={onOpenObject}
        />
      )}

      {section === "companions" && <CompanionsView onOpenChief={onOpenChief} />}

      {/* Provider Settings needs nothing from Workspace.tsx's own props —
          every registered provider and its configuration state is read
          straight from the Execution Provider Framework's own registry,
          the same generic call Registered Providers already makes. */}
      {section === "settings" && (
        <>
          <ProviderSettingsView />
          {/* Browser Automation Framework's own proof surface — rendered
              as a sibling below Provider Settings, the same reason:
              neither browsers nor providers are scoped to any one
              project or identity. */}
          <BrowserAutomationStatusView />
          {/* Browser Session Resolver's own proof surface — rendered as
              a sibling below Browser Automation Status, the same
              reason: the Browser Automation Framework (including its own
              Settings view) is off-limits to modify this sprint. */}
          <BrowserSessionResolverView />
          <UpdaterPanel />
        </>
      )}

      {section === "overview" && (
        <MorningBriefingView
          identities={identities}
          projects={projects}
          knowledgeEntries={knowledgeEntries}
          assets={assets}
          releases={releases}
          captures={captures}
          relationships={relationships}
          activities={activities}
          onOpenObject={onOpenObject}
        />
      )}
    </main>
  );
}

export default Workspace;
