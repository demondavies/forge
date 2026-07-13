import { useState } from "react";
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
} from "../../types";
import type { DiscoveryContext } from "../../hooks/relationshipDiscovery";
import { resolveObjectRef } from "../../hooks/relationshipDiscovery";
import { buildTrackWorkspace } from "../../hooks/trackWorkspace";
import { analyzeTrack } from "../../hooks/producerCompanion";
import type { QueueExecutionInput, QueueExecutionResult } from "../../hooks/useStudioQueue";
import { formatDate } from "../../utils/formatDate";
import AssetList from "../Asset/AssetList";
import KnowledgeList from "../Knowledge/KnowledgeList";
import CreativeHistorySection from "../History/CreativeHistorySection";
import OpportunityCard from "../Opportunity/OpportunityCard";
import ProducerCompanionPanel from "./ProducerCompanionPanel";
import StudioLibraryPanel from "./StudioLibraryPanel";
import "./TrackWorkspace.css";

interface TrackWorkspaceViewProps {
  track: PlannedTrack;
  project: Project;
  identity: Identity;
  knowledgeEntries: KnowledgeEntry[];
  assets: Asset[];
  releases: Release[];
  captures: Capture[];
  relationships: Relationship[];
  activities: Activity[];
  executions: CreativeExecution[];
  candidates: Candidate[];
  attributions: PromptAttribution[];
  onOpenAsset: (id: string) => void;
  onOpenKnowledgeEntry: (id: string) => void;
  onOpenObject: (ref: ObjectRef) => void;
  onOpenPromptStudio: (projectId: string) => void;
  onBeginSession: (projectId: string) => void;
  onCaptureKnowledge: () => void;
  onImportAudio: () => void;
  studioResources: StudioResource[];
  onDeleteStudioResource: (id: string) => void;
  onRevealInExplorer: (filePath: string) => void;
  onQueueExecution: (input: QueueExecutionInput) => QueueExecutionResult;
  onBack: () => void;
}

// "Everything currently known about this track" — and, true to this
// sprint's own success criteria, almost no business logic of its own.
// Every fact rendered here comes straight from buildTrackWorkspace (itself
// just a thin composition over engines that already exist and are already
// correct). Deleting this whole folder would leave Album Production,
// Prompt Studio, Studio Queue, Creative Pipeline, and every other creative
// system exactly as they are — none of them know this view exists, or
// that a Planned Track exists at all.
function TrackWorkspaceView({
  track,
  project,
  identity,
  knowledgeEntries,
  assets,
  releases,
  captures,
  relationships,
  activities,
  executions,
  candidates,
  attributions,
  onOpenAsset,
  onOpenKnowledgeEntry,
  onOpenObject,
  onOpenPromptStudio,
  onBeginSession,
  onCaptureKnowledge,
  onImportAudio,
  studioResources,
  onDeleteStudioResource,
  onRevealInExplorer,
  onQueueExecution,
  onBack,
}: TrackWorkspaceViewProps) {
  const [queueMessage, setQueueMessage] = useState<string | null>(null);

  const discoveryContext: DiscoveryContext = {
    identities: [identity],
    projects: [project],
    knowledgeEntries,
    assets,
    releases,
    captures,
    relationships,
  };

  const composition = buildTrackWorkspace(track, project, discoveryContext, activities, executions);
  const producerAnalysis = analyzeTrack(track, project, executions, candidates, knowledgeEntries, attributions);

  // "Queue Latest Prompt" queues the album's own most recent prompt
  // version, honestly labelled as album-wide — the same choice Album
  // Production's own recommended action already made, for the same reason
  // (see hooks/trackWorkspace.ts's own opening comment).
  const latestAlbumPrompt =
    [...composition.albumPromptVersions].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0] ?? null;

  function handleQueueLatestPrompt() {
    if (!latestAlbumPrompt) return;
    const result = onQueueExecution({ projectId: project.id, promptVersionId: latestAlbumPrompt.id });
    setQueueMessage(result.error ?? `Queued "${latestAlbumPrompt.title}".`);
  }

  return (
    <section className="section-view track-workspace">
      <button className="back-btn" onClick={onBack}>
        ← Back to Album Production
      </button>

      <div>
        <h2 className="section-title">🎵 {track.title}</h2>
        <p className="section-subtitle">Part of {project.name} — everything currently known about this track.</p>
        <p className="track-workspace-planned-meta">Planned {formatDate(track.createdAt)}</p>
      </div>

      <div className="track-workspace-facts">
        <span className="badge track-fact-badge track-fact-true">Planned</span>
        <span className={`badge track-fact-badge ${composition.hasAudio ? "track-fact-true" : "track-fact-false"}`}>
          {composition.hasAudio ? "Audio Available" : "No Audio Yet"}
        </span>
        <span className={`badge track-fact-badge ${composition.hasNotes ? "track-fact-true" : "track-fact-false"}`}>
          {composition.hasNotes ? "Notes Available" : "No Notes Yet"}
        </span>
        <span
          className={`badge track-fact-badge ${composition.hasAlbumPrompt ? "track-fact-true" : "track-fact-false"}`}
        >
          {composition.hasAlbumPrompt ? "Prompt Available (album)" : "No Prompt Yet"}
        </span>
        <span className={`badge track-fact-badge ${composition.hasQueued ? "track-fact-true" : "track-fact-false"}`}>
          {composition.hasQueued ? "Queued (album)" : "Not Queued"}
        </span>
        <span
          className={`badge track-fact-badge ${composition.hasCompletedExecution ? "track-fact-true" : "track-fact-false"}`}
        >
          {composition.hasCompletedExecution ? "Ready for Review" : "Not Ready Yet"}
        </span>
      </div>

      <div className="track-workspace-actions">
        <button className="secondary" onClick={() => onOpenPromptStudio(project.id)}>
          🎛️ Open Prompt Studio
        </button>
        <button className="secondary" disabled={!latestAlbumPrompt} onClick={handleQueueLatestPrompt}>
          🎼 Queue Latest Prompt
        </button>
        <button className="secondary" onClick={() => onBeginSession(project.id)}>
          🎨 Begin Creative Session
        </button>
        <button className="secondary" onClick={onCaptureKnowledge}>
          📝 Capture Knowledge
        </button>
        <button className="secondary" onClick={onImportAudio}>
          ⬇ Import Audio
        </button>
      </div>
      {queueMessage && <p className="field-label">{queueMessage}</p>}

      <div className="track-workspace-section">
        <h3 className="track-workspace-section-title">🎧 Related Audio</h3>
        {composition.matchedAudio.length > 0 ? (
          <AssetList
            assets={composition.matchedAudio}
            projects={[project]}
            selectedAssetId={null}
            onSelect={onOpenAsset}
          />
        ) : (
          <p className="field-label">
            No audio matched to this track yet — assets whose name mentions "{track.title}" will appear here.
          </p>
        )}
      </div>

      <div className="track-workspace-section">
        <h3 className="track-workspace-section-title">🧠 Related Knowledge</h3>
        {composition.matchedNotes.length > 0 ? (
          <KnowledgeList
            entries={composition.matchedNotes}
            projects={[project]}
            selectedEntryId={null}
            onSelect={onOpenKnowledgeEntry}
          />
        ) : (
          <p className="field-label">
            No notes matched to this track yet — notes whose title mentions "{track.title}" will appear here.
          </p>
        )}
      </div>

      <div className="track-workspace-section">
        <h3 className="track-workspace-section-title">🎼 Album-Level Prompt Versions</h3>
        <p className="track-workspace-attribution-note">
          Prompt Studio saves every version under one shared, project-wide name, so Forge can't yet tell which
          track a saved prompt belongs to — these are this album's own prompt versions, not proven to be this
          track's specifically.
        </p>
        {composition.albumPromptVersions.length > 0 ? (
          <KnowledgeList
            entries={composition.albumPromptVersions}
            projects={[project]}
            selectedEntryId={null}
            onSelect={onOpenKnowledgeEntry}
          />
        ) : (
          <p className="field-label">No prompt versions saved for this album yet.</p>
        )}
      </div>

      {composition.albumExecutions.length > 0 && (
        <div className="track-workspace-section">
          <h3 className="track-workspace-section-title">⚙️ Album-Level Studio Queue</h3>
          <p className="track-workspace-attribution-note">
            {composition.albumExecutions.length} execution(s) queued for this album — not attributable to one
            track.
          </p>
        </div>
      )}

      <CreativeHistorySection entries={composition.history} />

      {composition.opportunities.length > 0 && (
        <div className="track-workspace-section">
          <h3 className="track-workspace-section-title">💡 Opportunities</h3>
          <ul className="track-workspace-opportunity-list">
            {composition.opportunities.map((opportunity) => (
              <OpportunityCard
                key={opportunity.id}
                opportunity={opportunity}
                resolve={(ref) => resolveObjectRef(ref, discoveryContext)}
                onOpenObject={onOpenObject}
              />
            ))}
          </ul>
        </div>
      )}

      {composition.chiefObservations.length > 0 && (
        <div className="track-workspace-section">
          <h3 className="track-workspace-section-title">🧭 Chief's Observations</h3>
          {composition.chiefObservations.map((observation) => (
            <div
              key={observation.kind === "discovery" ? observation.discovery.id : observation.opportunity.id}
              className="track-chief-observation"
            >
              <span className={`badge track-chief-kind-badge track-chief-kind-${observation.kind}`}>
                {observation.kind === "discovery" ? "Understanding" : "Possibility"}
              </span>
              <p className="track-chief-text">
                {observation.kind === "discovery" ? observation.perspective.text : observation.text}
              </p>
            </div>
          ))}
        </div>
      )}

      <StudioLibraryPanel
        resources={studioResources}
        onDelete={onDeleteStudioResource}
        onRevealInExplorer={onRevealInExplorer}
      />

      <ProducerCompanionPanel analysis={producerAnalysis} trackTitle={track.title} />
    </section>
  );
}

export default TrackWorkspaceView;
