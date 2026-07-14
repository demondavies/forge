import { useState, useEffect, useRef, useMemo } from "react";
import type {
  Candidate,
  CreativeExecution,
  Identity,
  KnowledgeEntry,
  PlannedTrack,
  Project,
  PromptAttribution,
  SunoPrompt,
} from "../../types";
import { DEFAULT_SUNO_PROMPT, parseSunoPrompt, serializeSunoPrompt } from "../../types";
import SunoPromptEditor from "./SunoPromptEditor";
import type { PlanTrackInput, PlanTrackResult } from "../../hooks/usePlannedTracks";
import type { CaptureKnowledgeInput, CaptureKnowledgeResult } from "../../hooks/useKnowledge";
import type { AttributePromptInput, AttributePromptResult } from "../../hooks/usePromptAttributions";
import { isPromptVersion } from "../../hooks/promptComposition";
import { analyzeTrack } from "../../hooks/producerCompanion";
import { buildLyricPromptSuggestions } from "../../hooks/lyricPromptSuggestions";
import { useCandidatePlayback } from "../../hooks/useCandidatePlayback";
import type { AlbumCompanionAnalysis } from "../../hooks/albumCompanion";
import AlbumCompanionPanel from "./AlbumCompanionPanel";
import ProducerCompanionPanel from "../TrackWorkspace/ProducerCompanionPanel";
import CandidateImportPanel from "../CandidateImport/CandidateImportPanel";
import type { ImportCandidatesResult } from "../CandidateImport/CandidateImportPanel";
import "./ProjectStudio.css";

export type SaveAndGenerateResult = { queued: boolean; message: string };

interface ProjectStudioViewProps {
  project: Project;
  identity: Identity;
  plannedTracks: PlannedTrack[];
  attributions: PromptAttribution[];
  knowledgeEntries: KnowledgeEntry[];
  executions: CreativeExecution[];
  candidates: Candidate[];
  onPlanTrack: (input: PlanTrackInput) => PlanTrackResult;
  onUpdateTrack: (id: string, updates: { title?: string; description?: string }) => void;
  onRemoveTrack: (id: string) => void;
  onFinishTrack: (id: string) => void;
  onReopenTrack: (id: string) => void;
  onSaveKnowledge: (input: CaptureKnowledgeInput) => CaptureKnowledgeResult;
  onAttributePrompt: (input: AttributePromptInput) => AttributePromptResult;
  getAttributedTrackId: (promptVersionId: string) => string | null;
  onApproveCandidate: (candidate: Candidate) => void;
  onRejectCandidate: (id: string) => void;
  onSetCurrentBest: (candidateId: string) => void;
  onSetAlbumVersion: (candidateId: string) => void;
  onAddNote: (candidateId: string, text: string) => void;
  onSaveAndGenerateTrack: (track: PlannedTrack, prompt: SunoPrompt) => SaveAndGenerateResult;
  onImportCandidates: (execution: CreativeExecution) => Promise<ImportCandidatesResult>;
  onAddCandidateFromFile: (track: PlannedTrack) => void;
  albumAnalysis?: AlbumCompanionAnalysis;
  consoleMessages: string[];
  onClearConsole: () => void;
  onLog: (message: string) => void;
  onBack: () => void;
}

// Default track counts per project type — auto-populated on first open.
const DEFAULT_TRACK_TITLES: Record<string, string[]> = {
  Single: ["Track 1"],
  EP: ["Track 1", "Track 2", "Track 3"],
  Album: ["Track 1", "Track 2", "Track 3", "Track 4", "Track 5", "Track 6", "Track 7", "Track 8"],
};

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function TrackStatusBadge({
  track,
  executions,
  candidates,
  attributions,
  projectId,
}: {
  track: PlannedTrack;
  executions: CreativeExecution[];
  candidates: Candidate[];
  attributions: PromptAttribution[];
  projectId: string;
}) {
  if (track.completedAt) return <span className="ps-track-badge ps-track-badge--done">Done</span>;

  const trackAttributions = attributions.filter((a) => a.trackId === track.id);
  const attributedVersionIds = new Set(trackAttributions.map((a) => a.promptVersionId));
  const trackExecs = executions.filter(
    (e) => e.projectId === projectId && attributedVersionIds.has(e.promptVersionId),
  );
  const trackExecIds = new Set(trackExecs.map((e) => e.id));
  const trackCandidates = candidates.filter(
    (c) => trackExecIds.has(c.executionId) || c.trackId === track.id,
  );

  if (trackCandidates.some((c) => c.status === "Approved")) {
    return <span className="ps-track-badge ps-track-badge--approved">Approved</span>;
  }
  if (trackCandidates.some((c) => c.status === "Pending Review")) {
    return <span className="ps-track-badge ps-track-badge--review">Review</span>;
  }
  if (trackExecs.some((e) => e.status === "Queued" || e.status === "Running")) {
    return <span className="ps-track-badge ps-track-badge--generating">Generating</span>;
  }
  if (trackAttributions.length > 0) {
    return <span className="ps-track-badge ps-track-badge--prompted">Prompted</span>;
  }
  return <span className="ps-track-badge ps-track-badge--pending">Pending</span>;
}

function ProjectStudioView({
  project,
  identity,
  plannedTracks,
  attributions,
  knowledgeEntries,
  executions,
  candidates,
  onPlanTrack,
  onUpdateTrack,
  onRemoveTrack,
  onFinishTrack,
  onReopenTrack,
  onSaveKnowledge,
  onAttributePrompt,
  getAttributedTrackId,
  onApproveCandidate,
  onRejectCandidate,
  onSetCurrentBest,
  onSetAlbumVersion,
  onAddNote,
  onSaveAndGenerateTrack,
  onImportCandidates,
  onAddCandidateFromFile,
  albumAnalysis,
  consoleMessages,
  onClearConsole,
  onLog,
  onBack,
}: ProjectStudioViewProps) {
  const projectTracks = plannedTracks
    .filter((t) => t.projectId === project.id)
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

  const [activeTrackId, setActiveTrackId] = useState<string | null>(null);
  const [albumMode, setAlbumMode] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState("");
  const [descDraft, setDescDraft] = useState("");
  const [sunoPrompt, setSunoPrompt] = useState<SunoPrompt>(DEFAULT_SUNO_PROMPT);
  const [generateMessage, setGenerateMessage] = useState<string | null>(null);
  const [promptTitle, setPromptTitle] = useState("");
  const [albumSunoPrompt, setAlbumSunoPrompt] = useState<SunoPrompt>(DEFAULT_SUNO_PROMPT);
  const [albumPromptTitle, setAlbumPromptTitle] = useState("");
  const [albumGenerateMessage, setAlbumGenerateMessage] = useState<string | null>(null);
  const [showConsole, setShowConsole] = useState(false);
  const [companionOpen, setCompanionOpen] = useState(true);
  const [draftNotes, setDraftNotes] = useState<Record<string, string>>({});
  const populatedRef = useRef(false);

  // Auto-populate tracks on first open if the project has none.
  useEffect(() => {
    if (populatedRef.current) return;
    populatedRef.current = true;
    if (projectTracks.length > 0) return;
    const titles = DEFAULT_TRACK_TITLES[project.type] ?? ["Track 1"];
    titles.forEach((title) => {
      onPlanTrack({ projectId: project.id, title });
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Select the first track automatically once tracks exist.
  useEffect(() => {
    if (!activeTrackId && projectTracks.length > 0) {
      setActiveTrackId(projectTracks[0].id);
    }
  }, [projectTracks.length, activeTrackId]);

  const activeTrack = projectTracks.find((t) => t.id === activeTrackId) ?? null;

  const lyricSuggestions = useMemo(
    () =>
      activeTrack
        ? buildLyricPromptSuggestions(
            activeTrack,
            project,
            projectTracks,
            knowledgeEntries,
            sunoPrompt.styles,
          )
        : [],
    [activeTrack, project, projectTracks, knowledgeEntries, sunoPrompt.styles],
  );

  // Sync edit drafts when switching tracks.
  useEffect(() => {
    if (activeTrack) {
      setTitleDraft(activeTrack.title);
      setDescDraft(activeTrack.description ?? "");
      setEditingTitle(false);
      setSunoPrompt(DEFAULT_SUNO_PROMPT);
      setPromptTitle("");
    }
  }, [activeTrackId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Prompt versions attributed to the active track — used for version counting only.
  const trackPromptVersions = activeTrack
    ? knowledgeEntries
        .filter(
          (e) =>
            e.projectId === project.id &&
            isPromptVersion(e) &&
            getAttributedTrackId(e.id) === activeTrack.id,
        )
        .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
    : [];

  // All saved prompts for the project — both PromptStudio versions and prompts
  // saved directly from ProjectStudio (attributed to any track in this project).
  const projectTrackIds = new Set(projectTracks.map((t) => t.id));
  const allProjectPrompts = knowledgeEntries
    .filter((e) => {
      if (e.projectId === project.id && isPromptVersion(e)) return true;
      const attrId = getAttributedTrackId(e.id);
      return attrId !== null && projectTrackIds.has(attrId);
    })
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

  // Candidates for the active track via attribution chain.
  const trackAttributions = activeTrack
    ? attributions.filter((a) => a.trackId === activeTrack.id)
    : [];
  const attributedVersionIds = new Set(trackAttributions.map((a) => a.promptVersionId));
  const trackExecs = activeTrack
    ? executions.filter(
        (e) => e.projectId === project.id && attributedVersionIds.has(e.promptVersionId),
      )
    : [];
  const trackExecIds = new Set(trackExecs.map((e) => e.id));
  const trackCandidates = candidates
    .filter((c) => trackExecIds.has(c.executionId) || c.trackId === activeTrack?.id)
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

  const { activeCandidateId, isPlaying, currentTime, duration, play, pause, stop } =
    useCandidatePlayback(onLog);

  // Producer Companion analysis for the active track.
  const producerAnalysis = activeTrack
    ? analyzeTrack(activeTrack, project, executions, candidates, knowledgeEntries, attributions)
    : null;

  function handleSelectTrack(id: string) {
    setActiveTrackId(id);
    setAlbumMode(false);
    setGenerateMessage(null);
    setShowConsole(false);
    onClearConsole();
  }

  function handleAlbumMode() {
    setAlbumMode(true);
    setActiveTrackId(null);
    setAlbumGenerateMessage(null);
    setShowConsole(false);
    onClearConsole();
  }

  function handleSaveAlbumPrompt() {
    const autoTitle = `${project.name} - Album Prompt`;
    const title = albumPromptTitle.trim() || autoTitle;
    const saveResult = onSaveKnowledge({
      title,
      insight: serializeSunoPrompt(albumSunoPrompt),
      source: "Experiment",
      projectId: project.id,
    });
    if (saveResult.entry) {
      setAlbumGenerateMessage(`Saved as "${title}".`);
      setAlbumPromptTitle("");
    } else {
      setAlbumGenerateMessage(saveResult.error ?? "Could not save.");
    }
  }

  function handleGenerateAll() {
    const pendingTracks = projectTracks.filter((t) => !t.completedAt);
    if (pendingTracks.length === 0) return;
    let queued = 0;
    for (const track of pendingTracks) {
      const result = onSaveAndGenerateTrack(track, albumSunoPrompt);
      if (result.queued) queued++;
    }
    setAlbumGenerateMessage(
      `Queued ${queued} of ${pendingTracks.length} track${pendingTracks.length !== 1 ? "s" : ""}.`,
    );
    setShowConsole(true);
  }

  function handleTitleSave() {
    if (!activeTrack || !titleDraft.trim()) return;
    onUpdateTrack(activeTrack.id, { title: titleDraft.trim() });
    setEditingTitle(false);
  }

  function handleDescSave() {
    if (!activeTrack) return;
    onUpdateTrack(activeTrack.id, { description: descDraft });
  }

  function handleLoadVersion(versionId: string) {
    const version = knowledgeEntries.find((e) => e.id === versionId);
    if (version) setSunoPrompt(parseSunoPrompt(version.insight));
  }

  function handleGenerate() {
    if (!activeTrack) return;
    if (!sunoPrompt.styles.trim() && sunoPrompt.lyricsMode === "Instrumental") {
      setGenerateMessage("Add at least one style tag first.");
      return;
    }
    const result = onSaveAndGenerateTrack(activeTrack, sunoPrompt);
    setGenerateMessage(result.message);
    setShowConsole(true);
  }

  function handleSavePromptOnly() {
    if (!activeTrack) return;
    const autoTitle = `${activeTrack.title} - Prompt v${trackPromptVersions.length + 1}`;
    const title = promptTitle.trim() || autoTitle;
    const saveResult = onSaveKnowledge({
      title,
      insight: serializeSunoPrompt(sunoPrompt),
      source: "Experiment",
      projectId: project.id,
    });
    if (saveResult.entry) {
      onAttributePrompt({ promptVersionId: saveResult.entry.id, trackId: activeTrack.id });
      setGenerateMessage(`Saved as "${title}".`);
      setPromptTitle("");
    } else {
      setGenerateMessage(saveResult.error ?? "Could not save.");
    }
  }

  function handleAddTrack() {
    const n = projectTracks.length + 1;
    const result = onPlanTrack({ projectId: project.id, title: `Track ${n}` });
    if (result.track) setActiveTrackId(result.track.id);
  }

  function canFinishTrack(track: PlannedTrack): boolean {
    const ta = attributions.filter((a) => a.trackId === track.id);
    const vids = new Set(ta.map((a) => a.promptVersionId));
    const execs = executions.filter((e) => e.projectId === project.id && vids.has(e.promptVersionId));
    const eids = new Set(execs.map((e) => e.id));
    const cands = candidates.filter((c) => eids.has(c.executionId) || c.trackId === track.id);
    return cands.some((c) => c.isAlbumVersion) && cands.some((c) => c.status === "Approved");
  }

  void identity; // identity prop reserved for future use

  return (
    <div className="ps-root">
      <div className="ps-topbar">
        <button className="back-btn ps-back" onClick={onBack}>
          ← Back to Projects
        </button>
        <h2 className="ps-project-title">{project.name}</h2>
        <span className="ps-project-type">{project.type}</span>
      </div>

      <div className="ps-layout">
        {/* LEFT — track list */}
        <aside className="ps-left">
          <button
            className={`ps-album-btn${albumMode ? " ps-album-btn--active" : ""}`}
            onClick={handleAlbumMode}
          >
            <span className="ps-album-btn-icon">⚡</span>
            <span className="ps-album-btn-label">Album Prompt</span>
            <span className="ps-album-btn-count">{projectTracks.filter((t) => !t.completedAt).length}</span>
          </button>
          <div className="ps-tracklist">
            {projectTracks.map((track, index) => (
              <button
                key={track.id}
                className={`ps-track-item${track.id === activeTrackId && !albumMode ? " ps-track-item--active" : ""}${track.completedAt ? " ps-track-item--done" : ""}`}
                onClick={() => handleSelectTrack(track.id)}
              >
                <span className="ps-track-number">{index + 1}</span>
                <span className="ps-track-name">{track.title}</span>
                <TrackStatusBadge
                  track={track}
                  executions={executions}
                  candidates={candidates}
                  attributions={attributions}
                  projectId={project.id}
                />
              </button>
            ))}
          </div>
          <button className="ps-add-track-btn" onClick={handleAddTrack}>
            + Add Track
          </button>
        </aside>

        {/* CENTRE — active track editor or album prompt */}
        <main className="ps-center">
          {albumMode ? (
            <>
              <div className="ps-album-header">
                <h2 className="ps-album-title">⚡ Album Prompt</h2>
                <p className="ps-album-subtitle">
                  Write one prompt and generate all tracks in <strong>{project.name}</strong>.
                </p>
              </div>

              {/* Prompt composer */}
              <div className="ps-prompt-section">
                <div className="ps-prompt-header">
                  <h3 className="ps-section-title">Prompt</h3>
                  {allProjectPrompts.length > 0 && (
                    <select
                      className="ps-version-select"
                      defaultValue=""
                      onChange={(e) => {
                        if (e.target.value) {
                          const entry = knowledgeEntries.find((k) => k.id === e.target.value);
                          if (entry) setAlbumSunoPrompt(parseSunoPrompt(entry.insight));
                        }
                        e.target.value = "";
                      }}
                    >
                      <option value="">Load saved…</option>
                      {[...allProjectPrompts].reverse().map((v) => (
                        <option key={v.id} value={v.id}>{v.title}</option>
                      ))}
                    </select>
                  )}
                </div>
                <input
                  className="ps-prompt-title-input"
                  type="text"
                  placeholder="Prompt name (optional)…"
                  value={albumPromptTitle}
                  onChange={(e) => setAlbumPromptTitle(e.target.value)}
                />
                <SunoPromptEditor value={albumSunoPrompt} onChange={setAlbumSunoPrompt} />
                <div className="ps-prompt-actions">
                  <button className="secondary" onClick={handleSaveAlbumPrompt}>
                    💾 Save
                  </button>
                  <button
                    className="ps-generate-btn ps-generate-all-btn"
                    onClick={handleGenerateAll}
                    disabled={projectTracks.filter((t) => !t.completedAt).length === 0}
                  >
                    ⚡ Generate All ({projectTracks.filter((t) => !t.completedAt).length} tracks)
                  </button>
                </div>
                {albumGenerateMessage && (
                  <p className="ps-generate-message">{albumGenerateMessage}</p>
                )}
              </div>

              {/* Generation log */}
              {showConsole && consoleMessages.length > 0 && (
                <div className="ps-console">
                  <div className="ps-console-header">
                    <span className="ps-console-label">Generation Log</span>
                    <button className="secondary ps-console-clear" onClick={() => { onClearConsole(); setShowConsole(false); }}>
                      Clear
                    </button>
                  </div>
                  <div className="ps-console-messages">
                    {consoleMessages.map((msg, i) => (
                      <p key={i} className="ps-console-line">{msg}</p>
                    ))}
                  </div>
                </div>
              )}

              {/* Per-track status summary */}
              <div className="ps-album-tracks-summary">
                <h3 className="ps-section-title">Track Status</h3>
                {projectTracks.map((track, index) => (
                  <div key={track.id} className="ps-album-track-row">
                    <span className="ps-track-number">{index + 1}</span>
                    <span className="ps-track-name">{track.title}</span>
                    <TrackStatusBadge
                      track={track}
                      executions={executions}
                      candidates={candidates}
                      attributions={attributions}
                      projectId={project.id}
                    />
                  </div>
                ))}
              </div>

              {/* Per-track import panels — each self-hides if no executions exist yet */}
              {projectTracks.map((track) => (
                <CandidateImportPanel
                  key={track.id}
                  track={track}
                  executions={executions}
                  plannedTracks={projectTracks}
                  knowledgeEntries={knowledgeEntries}
                  getAttributedTrackId={getAttributedTrackId}
                  onImportCandidates={onImportCandidates}
                />
              ))}

              {albumAnalysis && <AlbumCompanionPanel analysis={albumAnalysis} />}
            </>
          ) : !activeTrack ? (
            <p className="ps-empty">Select a track to start working.</p>
          ) : (
            <>
              {/* Track header */}
              <div className="ps-track-header">
                {editingTitle ? (
                  <div className="ps-title-edit-row">
                    <input
                      className="ps-title-input"
                      value={titleDraft}
                      autoFocus
                      onChange={(e) => setTitleDraft(e.target.value)}
                      onBlur={handleTitleSave}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleTitleSave();
                        if (e.key === "Escape") {
                          setTitleDraft(activeTrack.title);
                          setEditingTitle(false);
                        }
                      }}
                    />
                  </div>
                ) : (
                  <button className="ps-track-title-btn" onClick={() => setEditingTitle(true)}>
                    {activeTrack.title}
                    <span className="ps-edit-hint"> ✎</span>
                  </button>
                )}

                <div className="ps-track-actions">
                  {activeTrack.completedAt ? (
                    <button className="secondary ps-finish-btn" onClick={() => onReopenTrack(activeTrack.id)}>
                      ↩ Reopen
                    </button>
                  ) : canFinishTrack(activeTrack) ? (
                    <button className="ps-finish-btn" onClick={() => onFinishTrack(activeTrack.id)}>
                      ✓ Mark Done
                    </button>
                  ) : null}
                  <button
                    className="secondary ps-remove-btn"
                    onClick={() => {
                      onRemoveTrack(activeTrack.id);
                      setActiveTrackId(projectTracks.find((t) => t.id !== activeTrack.id)?.id ?? null);
                    }}
                  >
                    Remove
                  </button>
                </div>
              </div>

              {/* Description */}
              <div className="ps-desc-row">
                <textarea
                  className="ps-desc-textarea"
                  placeholder="Add a description or notes for this track…"
                  value={descDraft}
                  rows={2}
                  onChange={(e) => setDescDraft(e.target.value)}
                  onBlur={handleDescSave}
                />
              </div>

              {/* Prompt composer */}
              <div className="ps-prompt-section">
                <div className="ps-prompt-header">
                  <h3 className="ps-section-title">Prompt</h3>
                  {allProjectPrompts.length > 0 && (
                    <select
                      className="ps-version-select"
                      defaultValue=""
                      onChange={(e) => {
                        if (e.target.value) handleLoadVersion(e.target.value);
                        e.target.value = "";
                      }}
                    >
                      <option value="">Load saved…</option>
                      {[...allProjectPrompts].reverse().map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.title}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
                <input
                  className="ps-prompt-title-input"
                  type="text"
                  placeholder="Prompt name (optional)…"
                  value={promptTitle}
                  onChange={(e) => setPromptTitle(e.target.value)}
                />
                <SunoPromptEditor
                  value={sunoPrompt}
                  onChange={setSunoPrompt}
                  suggestions={lyricSuggestions}
                  onUseSuggestion={(text) => setSunoPrompt({ ...sunoPrompt, lyrics: text })}
                />
                <div className="ps-prompt-actions">
                  <button className="secondary" onClick={handleSavePromptOnly}>
                    💾 Save
                  </button>
                  <button className="ps-generate-btn" onClick={handleGenerate}>
                    ⚡ Generate
                  </button>
                </div>
                {generateMessage && (
                  <p className="ps-generate-message">{generateMessage}</p>
                )}
              </div>

              {/* Candidate import — surfaces once executions exist for this track */}
              <CandidateImportPanel
                track={activeTrack}
                executions={executions}
                plannedTracks={projectTracks}
                knowledgeEntries={knowledgeEntries}
                getAttributedTrackId={getAttributedTrackId}
                onImportCandidates={onImportCandidates}
              />

              {/* Production console */}
              {showConsole && consoleMessages.length > 0 && (
                <div className="ps-console">
                  <div className="ps-console-header">
                    <span className="ps-console-label">Generation Log</span>
                    <button className="secondary ps-console-clear" onClick={() => { onClearConsole(); setShowConsole(false); }}>
                      Clear
                    </button>
                  </div>
                  <div className="ps-console-messages">
                    {consoleMessages.map((msg, i) => (
                      <p key={i} className="ps-console-line">{msg}</p>
                    ))}
                  </div>
                </div>
              )}

              {/* Candidates — Listening Room */}
              {(trackCandidates.length > 0 || activeTrack) && (
                <div className="ps-candidates">
                  <div className="ps-prompt-header">
                    <h3 className="ps-section-title">Listening Room</h3>
                    <button
                      className="secondary"
                      onClick={() => activeTrack && onAddCandidateFromFile(activeTrack)}
                    >
                      + Add from file
                    </button>
                  </div>
                  {trackCandidates.map((candidate) => {
                    const isActive = activeCandidateId === candidate.id;
                    const isThisPlaying = isActive && isPlaying;
                    return (
                      <div
                        key={candidate.id}
                        className={`ps-candidate${isActive ? " ps-candidate--active" : ""}`}
                      >
                        <div className="ps-candidate-header">
                          <span className="ps-candidate-title">{candidate.title}</span>
                          <span className={`badge ps-candidate-badge--${candidate.status.toLowerCase().replace(" ", "-")}`}>
                            {candidate.status}
                          </span>
                        </div>

                        {candidate.filePath ? (
                          <div className="ps-candidate-playback">
                            {isThisPlaying ? (
                              <button className="secondary" onClick={pause}>⏸ Pause</button>
                            ) : (
                              <button className="secondary" onClick={() => play(candidate)}>▶ Play</button>
                            )}
                            <button className="secondary" onClick={stop}>■ Stop</button>
                            {isActive && (
                              <span className="ps-candidate-time">
                                {formatTime(currentTime)} / {formatTime(duration)}
                              </span>
                            )}
                          </div>
                        ) : (
                          <p className="ps-candidate-no-file">Preview not available</p>
                        )}

                        {candidate.status === "Pending Review" && (
                          <div className="ps-candidate-actions">
                            <button className="secondary" onClick={() => onRejectCandidate(candidate.id)}>
                              ✕ Reject
                            </button>
                            <button onClick={() => onApproveCandidate(candidate)}>
                              ✓ Approve
                            </button>
                          </div>
                        )}

                        {candidate.status === "Approved" && (
                          <div className="ps-candidate-promotions">
                            <label className="ps-promotion-label">
                              <input
                                type="checkbox"
                                checked={candidate.isCurrentBest}
                                onChange={() => onSetCurrentBest(candidate.id)}
                              />
                              Current Best
                            </label>
                            <label className="ps-promotion-label">
                              <input
                                type="checkbox"
                                checked={candidate.isAlbumVersion}
                                onChange={() => onSetAlbumVersion(candidate.id)}
                              />
                              Album Version
                            </label>
                          </div>
                        )}

                        <div className="ps-candidate-notes">
                          <input
                            type="text"
                            placeholder="Add a note…"
                            className="ps-note-input"
                            value={draftNotes[candidate.id] ?? ""}
                            onChange={(e) =>
                              setDraftNotes((curr) => ({ ...curr, [candidate.id]: e.target.value }))
                            }
                            onKeyDown={(e) => {
                              if (e.key === "Enter" && draftNotes[candidate.id]?.trim()) {
                                onAddNote(candidate.id, draftNotes[candidate.id].trim());
                                setDraftNotes((curr) => ({ ...curr, [candidate.id]: "" }));
                              }
                            }}
                          />
                          {candidate.notes.length > 0 && (
                            <ul className="ps-notes-list">
                              {[...candidate.notes].reverse().map((note) => (
                                <li key={note.id} className="ps-note-item">"{note.text}"</li>
                              ))}
                            </ul>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

            </>
          )}
        </main>

        {/* RIGHT — Producer Companion */}
        <aside className="ps-right">
          <button
            className="ps-companion-toggle"
            onClick={() => setCompanionOpen((o) => !o)}
          >
            🎚️ Producer {companionOpen ? "▾" : "▸"}
          </button>
          {companionOpen && activeTrack && producerAnalysis && (
            <ProducerCompanionPanel analysis={producerAnalysis} trackTitle={activeTrack.title} />
          )}
          {companionOpen && !activeTrack && (
            <p className="ps-companion-empty">Select a track to see the Producer's observations.</p>
          )}
        </aside>
      </div>
    </div>
  );
}

export default ProjectStudioView;
