import { useState } from "react";
import type {
  Activity,
  Asset,
  Capture,
  CreativeExecution,
  Identity,
  KnowledgeEntry,
  ObjectRef,
  PlannedTrack,
  Project,
  Relationship,
  Release,
  StudioResource,
  StudioResourceAttachment,
} from "../../types";
import type { DiscoveryContext } from "../../hooks/relationshipDiscovery";
import { resolveObjectRef } from "../../hooks/relationshipDiscovery";
import { buildTrackWorkspace } from "../../hooks/trackWorkspace";
import type { QueueExecutionInput, QueueExecutionResult } from "../../hooks/useStudioQueue";
import { formatDate } from "../../utils/formatDate";
import AssetList from "../Asset/AssetList";
import KnowledgeList from "../Knowledge/KnowledgeList";
import CreativeHistorySection from "../History/CreativeHistorySection";
import OpportunityCard from "../Opportunity/OpportunityCard";
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
  onOpenAsset: (id: string) => void;
  onOpenKnowledgeEntry: (id: string) => void;
  onOpenObject: (ref: ObjectRef) => void;
  onOpenPromptStudio: (projectId: string) => void;
  onCaptureKnowledge: () => void;
  studioResources: StudioResource[];
  attachments: StudioResourceAttachment[];
  onAttachResource: (resourceId: string, trackId: string) => void;
  onDetachResource: (resourceId: string, trackId: string) => void;
  onQueueExecution: (input: QueueExecutionInput) => QueueExecutionResult;
  onBack: () => void;
}

interface TrackFinishProps {
  canFinish: boolean;
  onFinishTrack: () => void;
  onReopenTrack: () => void;
}

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
  onOpenAsset,
  onOpenKnowledgeEntry,
  onOpenObject,
  onOpenPromptStudio,
  onCaptureKnowledge,
  studioResources,
  attachments,
  onAttachResource,
  onDetachResource,
  onQueueExecution,
  onBack,
  canFinish,
  onFinishTrack,
  onReopenTrack,
}: TrackWorkspaceViewProps & TrackFinishProps) {
  const [queueMessage, setQueueMessage] = useState<string | null>(null);
  const [confirmingFinish, setConfirmingFinish] = useState(false);

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

      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="tw-header">
        <h2 className="tw-title">🎵 {track.title}</h2>
        <p className="tw-subtitle">{project.name} · Planned {formatDate(track.createdAt)}</p>
        <div className="tw-status">
          <span className={`badge track-fact-badge ${composition.hasAudio ? "track-fact-true" : "track-fact-false"}`}>
            {composition.hasAudio ? "Audio Available" : "No Audio Yet"}
          </span>
          <span className={`badge track-fact-badge ${composition.hasCompletedExecution ? "track-fact-true" : "track-fact-false"}`}>
            {composition.hasCompletedExecution ? "Ready to Listen" : "Not Generated Yet"}
          </span>
        </div>
      </div>

      {/* ── Finish / Reopen ─────────────────────────────────────────── */}
      {track.completedAt ? (
        <div className="tw-finish-row">
          <span className="badge tw-finished-badge">✓ Finished</span>
          <button className="secondary tw-reopen-btn" onClick={onReopenTrack}>
            Reopen
          </button>
        </div>
      ) : canFinish ? (
        confirmingFinish ? (
          <div className="tw-finish-confirm">
            <p className="tw-finish-confirm-text">
              Finish {track.title}? This marks the track as complete for this album. You can still reopen it later.
            </p>
            <div className="tw-finish-confirm-actions">
              <button className="secondary" onClick={() => setConfirmingFinish(false)}>
                Cancel
              </button>
              <button
                onClick={() => {
                  onFinishTrack();
                  setConfirmingFinish(false);
                }}
              >
                Finish Track
              </button>
            </div>
          </div>
        ) : (
          <button className="tw-finish-btn" onClick={() => setConfirmingFinish(true)}>
            ✅ Finish Track
          </button>
        )
      ) : null}

      {/* ── Studio Library ──────────────────────────────────────────── */}
      <StudioLibraryPanel
        resources={studioResources}
        attachments={attachments}
        trackId={track.id}
        onAttach={onAttachResource}
        onDetach={onDetachResource}
      />

      {/* ── Advanced ────────────────────────────────────────────────── */}
      <details className="tw-advanced">
        <summary className="tw-advanced-toggle">Advanced</summary>
        <div className="tw-advanced-body">

          <div className="tw-adv-section">
            <div className="track-workspace-actions">
              <button className="secondary" onClick={() => onOpenPromptStudio(project.id)}>
                🎛️ Prompt Studio
              </button>
              <button className="secondary" disabled={!latestAlbumPrompt} onClick={handleQueueLatestPrompt}>
                🎼 Queue Latest Prompt
              </button>
              <button className="secondary" onClick={onCaptureKnowledge}>
                📝 Capture Knowledge
              </button>
            </div>
            {queueMessage && <p className="field-label">{queueMessage}</p>}
          </div>

          {composition.matchedAudio.length > 0 && (
            <div className="tw-adv-section">
              <p className="tw-adv-label">Related Audio</p>
              <AssetList
                assets={composition.matchedAudio}
                projects={[project]}
                selectedAssetId={null}
                onSelect={onOpenAsset}
              />
            </div>
          )}

          {composition.matchedNotes.length > 0 && (
            <div className="tw-adv-section">
              <p className="tw-adv-label">Related Knowledge</p>
              <KnowledgeList
                entries={composition.matchedNotes}
                projects={[project]}
                selectedEntryId={null}
                onSelect={onOpenKnowledgeEntry}
              />
            </div>
          )}

          {composition.albumPromptVersions.length > 0 && (
            <div className="tw-adv-section">
              <p className="tw-adv-label">Prompt Versions</p>
              <KnowledgeList
                entries={composition.albumPromptVersions}
                projects={[project]}
                selectedEntryId={null}
                onSelect={onOpenKnowledgeEntry}
              />
            </div>
          )}

          {composition.albumExecutions.length > 0 && (
            <div className="tw-adv-section">
              <p className="tw-adv-label">Queue</p>
              <p className="tw-adv-note">
                {composition.albumExecutions.length} execution(s) queued for this album.
              </p>
            </div>
          )}

          {composition.history.length > 0 && (
            <div className="tw-adv-section">
              <p className="tw-adv-label">Creative History</p>
              <CreativeHistorySection entries={composition.history} />
            </div>
          )}

          {composition.opportunities.length > 0 && (
            <div className="tw-adv-section">
              <p className="tw-adv-label">Opportunities</p>
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
            <div className="tw-adv-section">
              <p className="tw-adv-label">Chief's Observations</p>
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

        </div>
      </details>
    </section>
  );
}

export default TrackWorkspaceView;
