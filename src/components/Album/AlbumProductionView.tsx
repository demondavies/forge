import { useState } from "react";
import type {
  Activity,
  Asset,
  Candidate,
  Capture,
  CreativeExecution,
  Identity,
  KnowledgeEntry,
  PlannedTrack,
  Project,
  PromptAttribution,
  Relationship,
  Release,
} from "../../types";
import type { DiscoveryContext } from "../../hooks/relationshipDiscovery";
import { buildAlbumProduction } from "../../hooks/albumProduction";
import { analyzeAlbum } from "../../hooks/albumCompanion";
import { isPromptVersion } from "../../hooks/promptComposition";
import type { QueueExecutionInput, QueueExecutionResult } from "../../hooks/useStudioQueue";
import type { PlanTrackInput, PlanTrackResult } from "../../hooks/usePlannedTracks";
import { formatDate } from "../../utils/formatDate";
import AlbumCompanionPanel from "./AlbumCompanionPanel";
import "./AlbumProduction.css";

interface AlbumProductionViewProps {
  project: Project;
  identity: Identity;
  knowledgeEntries: KnowledgeEntry[];
  assets: Asset[];
  releases: Release[];
  captures: Capture[];
  relationships: Relationship[];
  activities: Activity[];
  executions: CreativeExecution[];
  plannedTracks: PlannedTrack[];
  candidates: Candidate[];
  attributions: PromptAttribution[];
  onPlanTrack: (input: PlanTrackInput) => PlanTrackResult;
  onRemoveTrack: (id: string) => void;
  onQueueExecution: (input: QueueExecutionInput) => QueueExecutionResult;
  onOpenPromptStudio: (projectId: string) => void;
  onBeginSession: (projectId: string) => void;
  onCaptureKnowledge: () => void;
  onOpenAsset: (id: string) => void;
  onOpenKnowledgeEntry: (id: string) => void;
  onCreateRelease: () => void;
  onOpenReleaseManifest: (releaseId: string) => void;
  onBack: () => void;
}

// Forge's first album-level orchestration view — and, true to this
// sprint's own success criteria, almost no business logic of its own.
// Every fact rendered here comes straight from buildAlbumProduction
// (itself just a thin composition over buildMusicWorkspace/isPromptVersion
// /buildReleaseManifest, all three untouched) or from PlannedTrack, the
// one new concept this sprint adds. Deleting this whole folder would leave
// Prompt Studio, Studio Queue, Creative Pipeline, and Release Manifest
// exactly as they are — none of them know this view exists.
function AlbumProductionView({
  project,
  identity,
  knowledgeEntries,
  assets,
  releases,
  captures,
  relationships,
  activities,
  executions,
  plannedTracks,
  candidates,
  attributions,
  onPlanTrack,
  onRemoveTrack,
  onQueueExecution,
  onOpenPromptStudio,
  onBeginSession,
  onCaptureKnowledge,
  onOpenAsset,
  onOpenKnowledgeEntry,
  onCreateRelease,
  onOpenReleaseManifest,
  onBack,
}: AlbumProductionViewProps) {
  const [newTrackTitle, setNewTrackTitle] = useState("");
  const [planMessage, setPlanMessage] = useState<string | null>(null);
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

  const album = buildAlbumProduction(project, plannedTracks, executions, identity, discoveryContext, activities);
  const companionAnalysis = analyzeAlbum(album, executions, candidates, knowledgeEntries, attributions);
  const latestRelease = album.latestRelease;

  // "Queue Latest Prompt" deliberately queues the album's own most recent
  // prompt version, honestly labelled as album-wide — not a fabricated
  // claim that this particular saved prompt was written for this
  // particular track (see this file's own composition's opening comment
  // for why that attribution can't be made honestly).
  const latestPromptVersion = knowledgeEntries
    .filter((entry) => entry.projectId === project.id && isPromptVersion(entry))
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0] ?? null;

  function handlePlanTrack() {
    const result = onPlanTrack({ projectId: project.id, title: newTrackTitle });
    setPlanMessage(result.error);
    if (!result.error) setNewTrackTitle("");
  }

  function handleQueueLatestPrompt() {
    if (!latestPromptVersion) return;
    const result = onQueueExecution({ projectId: project.id, promptVersionId: latestPromptVersion.id });
    setQueueMessage(result.error ?? `Queued "${latestPromptVersion.title}".`);
  }

  return (
    <section className="section-view album-production">
      <button className="back-btn" onClick={onBack}>
        ← Back to {project.name}
      </button>

      <div>
        <h2 className="section-title">💿 Album Production</h2>
        <p className="section-subtitle">{project.name} — how is this album progressing?</p>
      </div>

      <div className="album-summary">
        <div className="album-summary-fact">
          <span className="field-label">Prompt Ready</span>
          <span className={`badge album-fact-badge ${album.promptVersionCount > 0 ? "album-fact-true" : "album-fact-false"}`}>
            {album.promptVersionCount > 0 ? `${album.promptVersionCount} saved` : "None yet"}
          </span>
        </div>
        <div className="album-summary-fact">
          <span className="field-label">Queued</span>
          <span
            className={`badge album-fact-badge ${album.queuedExecutionCount > 0 ? "album-fact-true" : "album-fact-false"}`}
          >
            {album.queuedExecutionCount > 0 ? `${album.queuedExecutionCount} queued` : "None yet"}
          </span>
        </div>
        <div className="album-summary-fact">
          <span className="field-label">Ready for Review</span>
          <span
            className={`badge album-fact-badge ${album.completedExecutionCount > 0 ? "album-fact-true" : "album-fact-false"}`}
          >
            {album.completedExecutionCount > 0 ? `${album.completedExecutionCount} completed` : "None yet"}
          </span>
        </div>
        <div className="album-summary-fact">
          <span className="field-label">Release Readiness</span>
          {latestRelease && album.releaseManifestCompleteness ? (
            <button className="album-fact-link" onClick={() => onOpenReleaseManifest(latestRelease.id)}>
              {album.releaseManifestCompleteness.completeFieldCount} of{" "}
              {album.releaseManifestCompleteness.totalFieldCount} manifest fields complete →
            </button>
          ) : (
            <button className="album-fact-link" onClick={onCreateRelease}>
              No release planned yet — Create Release →
            </button>
          )}
        </div>
      </div>

      <p className="album-attribution-note">
        This album has {album.promptVersionCount} saved prompt version(s) and {album.queuedExecutionCount} queued
        execution(s). Prompt Studio saves every version under one shared, project-wide name, so Forge can't yet tell
        which track a saved prompt belongs to — that's why prompt and queue facts are shown above, at the album
        level, rather than guessed per track below.
      </p>

      <div className="album-plan-track">
        <input
          className="album-plan-track-input"
          type="text"
          placeholder="Track title (e.g. Midnight Drive)"
          value={newTrackTitle}
          onChange={(event) => setNewTrackTitle(event.target.value)}
        />
        <button onClick={handlePlanTrack}>+ Plan Track</button>
      </div>
      {planMessage && <p className="field-label">{planMessage}</p>}

      {album.tracks.length === 0 ? (
        <p className="field-label">No tracks planned yet. Plan the album's first track above.</p>
      ) : (
        <div className="album-track-list">
          {album.tracks.map(({ track, matchedAudio, matchedNotes, hasAudio, hasNotes }) => (
            <div key={track.id} className="album-track-card">
              <div className="album-track-header">
                <h3 className="album-track-title">{track.title}</h3>
                <button className="album-track-remove-btn" onClick={() => onRemoveTrack(track.id)}>
                  ✕ Remove
                </button>
              </div>
              <p className="album-track-planned-meta">Planned {formatDate(track.createdAt)}</p>

              <div className="album-track-facts">
                <span className="badge album-fact-badge album-fact-true">Planned</span>
                <span className={`badge album-fact-badge ${hasAudio ? "album-fact-true" : "album-fact-false"}`}>
                  {hasAudio ? "Audio Available" : "No Audio Yet"}
                </span>
                <span className={`badge album-fact-badge ${hasNotes ? "album-fact-true" : "album-fact-false"}`}>
                  {hasNotes ? "Notes Captured" : "No Notes Yet"}
                </span>
              </div>

              {matchedAudio.length > 0 && (
                <div className="album-track-matches">
                  <span className="field-label">Matched audio (by name):</span>
                  {matchedAudio.map((asset) => (
                    <button key={asset.id} className="album-track-match-btn" onClick={() => onOpenAsset(asset.id)}>
                      🎧 {asset.name}
                    </button>
                  ))}
                  <span className="album-track-release-note">✓ Included in this album's Release Manifest track list.</span>
                </div>
              )}

              {matchedNotes.length > 0 && (
                <div className="album-track-matches">
                  <span className="field-label">Matched notes (by title):</span>
                  {matchedNotes.map((entry) => (
                    <button
                      key={entry.id}
                      className="album-track-match-btn"
                      onClick={() => onOpenKnowledgeEntry(entry.id)}
                    >
                      🧠 {entry.title}
                    </button>
                  ))}
                </div>
              )}

              <div className="album-track-actions">
                <button className="secondary" onClick={() => onOpenPromptStudio(project.id)}>
                  🎛️ Open Prompt Studio
                </button>
                <button className="secondary" disabled={!latestPromptVersion} onClick={handleQueueLatestPrompt}>
                  🎼 Queue Latest Prompt
                </button>
                <button className="secondary" onClick={() => onBeginSession(project.id)}>
                  🎨 Begin Creative Session
                </button>
                <button className="secondary" onClick={onCaptureKnowledge}>
                  📝 Capture Knowledge
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      {queueMessage && <p className="field-label">{queueMessage}</p>}

      <AlbumCompanionPanel analysis={companionAnalysis} />
    </section>
  );
}

export default AlbumProductionView;
