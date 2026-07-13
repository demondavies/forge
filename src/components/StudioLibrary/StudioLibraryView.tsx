import { useState, useEffect, useRef } from "react";
import { convertFileSrc } from "@tauri-apps/api/core";
import type { StudioResource, StudioResourceAttachment, Project, PlannedTrack } from "../../types";
import "./StudioLibrary.css";

interface StudioLibraryViewProps {
  resources: StudioResource[];
  attachments: StudioResourceAttachment[];
  projects: Project[];
  plannedTracks: PlannedTrack[];
  onImportAudio: () => void;
  onDeleteStudioResource: (id: string) => void;
  onRevealInExplorer: (filePath: string) => void;
  onRenameStudioResource: (id: string, name: string) => void;
  onAttachResource: (resourceId: string, trackId: string) => void;
  onDetachResource: (resourceId: string, trackId: string) => void;
}

function formatAdded(date: Date): string {
  const diffMs = Date.now() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return "Added today";
  if (diffDays === 1) return "Added yesterday";
  return `Added ${diffDays} days ago`;
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function StudioLibraryView({
  resources,
  attachments,
  projects,
  plannedTracks,
  onImportAudio,
  onDeleteStudioResource,
  onRevealInExplorer,
  onRenameStudioResource,
  onAttachResource,
  onDetachResource,
}: StudioLibraryViewProps) {
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [attachingId, setAttachingId] = useState<string | null>(null);
  const [attachingProjectId, setAttachingProjectId] = useState<string | null>(null);
  const [durations, setDurations] = useState<Record<string, number>>({});
  const renameRef = useRef<HTMLInputElement>(null);

  // Load audio durations lazily
  useEffect(() => {
    resources.forEach((resource) => {
      if (resource.id in durations) return;
      try {
        const audio = new Audio(convertFileSrc(resource.filePath));
        audio.addEventListener("loadedmetadata", () => {
          if (isFinite(audio.duration)) {
            setDurations((prev) => ({ ...prev, [resource.id]: audio.duration }));
          }
        });
        audio.load();
      } catch {
        // file unreachable — skip
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resources.length]);

  useEffect(() => {
    if (renamingId && renameRef.current) {
      renameRef.current.focus();
      renameRef.current.select();
    }
  }, [renamingId]);

  function commitRename(id: string) {
    const trimmed = renameValue.trim();
    if (trimmed) onRenameStudioResource(id, trimmed);
    setRenamingId(null);
  }

  function togglePlay(id: string) {
    setPlayingId((current) => (current === id ? null : id));
  }

  function openAttach(resourceId: string) {
    if (attachingId === resourceId) {
      setAttachingId(null);
      setAttachingProjectId(null);
    } else {
      setAttachingId(resourceId);
      setAttachingProjectId(null);
    }
  }

  function handleTrackClick(resourceId: string, trackId: string, isAttached: boolean) {
    if (isAttached) {
      onDetachResource(resourceId, trackId);
    } else {
      onAttachResource(resourceId, trackId);
    }
  }

  const projectsWithTracks = projects.filter((p) =>
    plannedTracks.some((t) => t.projectId === p.id),
  );

  const attachingProjectTracks = attachingProjectId
    ? plannedTracks.filter((t) => t.projectId === attachingProjectId)
    : [];

  return (
    <div className="studio-library-view">
      <div className="studio-library-header">
        <h2 className="studio-library-title">🎧 Studio Library</h2>
        <button className="secondary studio-library-import-btn" onClick={onImportAudio}>
          ⬇ Import Audio
        </button>
      </div>

      {resources.length === 0 ? (
        <p className="studio-library-empty">
          No audio yet — click ⬇ Import Audio to bring files into your library.
        </p>
      ) : (
        <ul className="studio-library-list">
          {resources.map((resource) => {
            const isPlaying = playingId === resource.id;
            const isRenaming = renamingId === resource.id;
            const isDeleteConfirm = deleteConfirmId === resource.id;
            const isAttachOpen = attachingId === resource.id;
            const duration = durations[resource.id];
            const attachCount = attachments.filter((a) => a.resourceId === resource.id).length;

            return (
              <li key={resource.id} className="studio-library-item">
                <div className="studio-library-item-header">
                  <div className="studio-library-item-left">
                    <span className="studio-library-icon">🎵</span>
                    {isRenaming ? (
                      <input
                        ref={renameRef}
                        className="studio-library-rename-input"
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") commitRename(resource.id);
                          if (e.key === "Escape") setRenamingId(null);
                        }}
                        onBlur={() => commitRename(resource.id)}
                      />
                    ) : (
                      <span className="studio-library-name" title={resource.filePath}>
                        {resource.name}
                      </span>
                    )}
                  </div>

                  <span className="studio-library-meta">
                    {duration !== undefined && `${formatDuration(duration)} · `}
                    {formatAdded(resource.createdAt)}
                    {attachCount > 0 && ` · ${attachCount} track${attachCount !== 1 ? "s" : ""}`}
                  </span>

                  {isDeleteConfirm ? (
                    <div className="sl-delete-confirm">
                      <span className="sl-delete-label">Remove from Forge?</span>
                      <button
                        className="sl-btn sl-btn--confirm"
                        onClick={() => {
                          onDeleteStudioResource(resource.id);
                          setDeleteConfirmId(null);
                          if (playingId === resource.id) setPlayingId(null);
                        }}
                      >
                        Remove
                      </button>
                      <button className="sl-btn" onClick={() => setDeleteConfirmId(null)}>
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div className="studio-library-actions">
                      <button
                        className="sl-btn"
                        onClick={() => togglePlay(resource.id)}
                      >
                        {isPlaying ? "⏹ Stop" : "▶ Play"}
                      </button>
                      <button
                        className="sl-btn"
                        onClick={() => onRevealInExplorer(resource.filePath)}
                      >
                        Reveal
                      </button>
                      <button
                        className="sl-btn"
                        onClick={() => {
                          setRenamingId(resource.id);
                          setRenameValue(resource.name);
                        }}
                      >
                        Rename
                      </button>
                      <button
                        className="sl-btn"
                        onClick={() => openAttach(resource.id)}
                      >
                        {isAttachOpen ? "Close" : "Attach to Track…"}
                      </button>
                      <button
                        className="sl-btn sl-btn--danger"
                        onClick={() => setDeleteConfirmId(resource.id)}
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </div>

                {isPlaying && (
                  <audio
                    key={resource.id}
                    src={convertFileSrc(resource.filePath)}
                    controls
                    autoPlay
                    className="studio-library-player"
                    onEnded={() => setPlayingId(null)}
                  />
                )}

                {isAttachOpen && (
                  <div className="studio-library-attach-picker">
                    {!attachingProjectId ? (
                      <>
                        <span className="sl-picker-label">Pick a project</span>
                        {projectsWithTracks.length === 0 ? (
                          <p className="sl-picker-empty">No projects with planned tracks yet.</p>
                        ) : (
                          <ul className="sl-picker-list">
                            {projectsWithTracks.map((project) => (
                              <li key={project.id}>
                                <button
                                  className="sl-picker-project"
                                  onClick={() => setAttachingProjectId(project.id)}
                                >
                                  📁 {project.name}
                                </button>
                              </li>
                            ))}
                          </ul>
                        )}
                      </>
                    ) : (
                      <>
                        <div>
                          <button
                            className="sl-picker-back"
                            onClick={() => setAttachingProjectId(null)}
                          >
                            ← Back to projects
                          </button>
                        </div>
                        <span className="sl-picker-label">Pick a track</span>
                        <ul className="sl-picker-list">
                          {attachingProjectTracks.map((track) => {
                            const attached = attachments.some(
                              (a) => a.resourceId === resource.id && a.trackId === track.id,
                            );
                            return (
                              <li
                                key={track.id}
                                className={`sl-picker-item ${attached ? "sl-picker-item--attached" : ""}`}
                                onClick={() => handleTrackClick(resource.id, track.id, attached)}
                              >
                                <span>🎵 {track.title}</span>
                                {attached && <span className="sl-picker-check">✓ Attached</span>}
                              </li>
                            );
                          })}
                        </ul>
                      </>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export default StudioLibraryView;
