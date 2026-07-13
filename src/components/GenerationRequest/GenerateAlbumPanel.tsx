import { useState } from "react";
import type { Project } from "../../types";
import type { GenerateResult } from "./GenerateTrackPanel";
import "./GenerationRequest.css";

interface GenerateAlbumPanelProps {
  project: Project;
  onGenerateAlbum: (projectId: string) => GenerateResult;
}

// Generation Request Engine's Album counterpart to GenerateTrackPanel —
// rendered as a sibling beside AlbumProductionView's own Track Workspaces
// entry list, rather than inside it: Album Production Engine is
// off-limits to modify this sprint. One button, queuing generation for
// every planned track that already has its own attributed prompt version
// (see App.tsx's handleGenerateAlbum) — never a provider picker, and
// never guessing a prompt for a track that hasn't been written yet.
function GenerateAlbumPanel({ project, onGenerateAlbum }: GenerateAlbumPanelProps) {
  const [message, setMessage] = useState<string | null>(null);

  function handleClick() {
    const result = onGenerateAlbum(project.id);
    setMessage(result.message);
  }

  return (
    <div className="generation-request">
      <button className="generation-request-btn" onClick={handleClick}>
        🎬 Generate Album
      </button>
      {message && <p className="field-label">{message}</p>}
    </div>
  );
}

export default GenerateAlbumPanel;
