import { useState } from "react";
import type { Asset, Candidate, CreativeExecution, KnowledgeEntry, PlannedTrack, Project } from "../../types";
import type { CaptureKnowledgeInput, CaptureKnowledgeResult } from "../../hooks/useKnowledge";
import type { AttributePromptInput, AttributePromptResult } from "../../hooks/usePromptAttributions";
import {
  composePromptText,
  emptyPromptDraft,
  isPromptVersion,
  nextPromptVersionTitle,
  PROMPT_FIELD_LABELS,
  PROMPT_FIELD_ORDER,
} from "../../hooks/promptComposition";
import type { PromptDraft } from "../../hooks/promptComposition";
import { analyzeCreativeHistory } from "../../hooks/promptCoach";
import PromptCoachPanel from "../PromptCoach/PromptCoachPanel";
import "./PromptStudio.css";

interface PromptStudioViewProps {
  project: Project;
  knowledgeEntries: KnowledgeEntry[];
  assets: Asset[];
  onOpenKnowledgeEntry: (id: string) => void;
  // The real capture function (App.tsx's handleCaptureKnowledge) rather
  // than a "open the generic modal" trigger — the same direct-write access
  // ImportModal/FolderImportModal already have, reused here for the same
  // reason: a prompt version's title and content are already fully known
  // the moment "Save as Prompt Version" is clicked, so routing back through
  // a blank modal would just make a creator retype what this view already
  // composed.
  onSaveKnowledge: (input: CaptureKnowledgeInput) => CaptureKnowledgeResult;
  // Prompt Attribution's own two additions — a creator's own Planned
  // Tracks to choose from, and the real callback that records their
  // choice. Both optional callbacks a creator never has to use: leaving
  // "Target Track" as "Album-wide Prompt" saves exactly the same
  // KnowledgeEntry Prompt Studio has always produced, with nothing new
  // written anywhere.
  plannedTracks: PlannedTrack[];
  onAttributePrompt: (input: AttributePromptInput) => AttributePromptResult;
  getAttributedTrackId: (promptVersionId: string) => string | null;
  // Prompt Coach's two inputs — the identity's full candidate list and
  // execution list, not filtered by project, so the Coach observes patterns
  // across the creator's entire body of work rather than one album.
  candidates: Candidate[];
  executions: CreativeExecution[];
  onBack: () => void;
}

// One structured field: a label and a single-line input. Kept intentionally
// plain (no validation, no required fields) — Composition Over
// Configuration means every field is an optional idea a creator can fill
// in whatever order makes sense to them, not a form they must complete.
function PromptField({
  field,
  value,
  onChange,
}: {
  field: keyof PromptDraft;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="field prompt-field">
      <label className="field-label" htmlFor={`prompt-${field}`}>
        {PROMPT_FIELD_LABELS[field]}
      </label>
      <input
        id={`prompt-${field}`}
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}

// A place to think, not a form to fill in. Every structured field composes
// live into one plain, portable block of text — Genre/Mood/Energy/... are
// simply a more natural way to arrive at that text than one large box,
// never a second representation of it. Nothing here is specific to any
// future AI music service: the finished prompt is just text, copyable
// anywhere, and "Save as Prompt Version" only ever produces an ordinary
// KnowledgeEntry — the same kind of record every other captured lesson in
// Forge already is, which is what lets Creative History, Creative
// Sessions, and Music Workspace's own Notes section all narrate a
// prompt's evolution without any of them needing to change.
function PromptStudioView({
  project,
  knowledgeEntries,
  assets,
  onOpenKnowledgeEntry,
  onSaveKnowledge,
  plannedTracks,
  onAttributePrompt,
  getAttributedTrackId,
  candidates,
  executions,
  onBack,
}: PromptStudioViewProps) {
  const coachAnalysis = analyzeCreativeHistory(candidates, executions, knowledgeEntries);
  const [draft, setDraft] = useState<PromptDraft>(emptyPromptDraft());
  const [finalText, setFinalText] = useState("");
  const [finalTextDirty, setFinalTextDirty] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [copyMessage, setCopyMessage] = useState<string | null>(null);
  // "" means Album-wide Prompt — the honest default: no track is ever
  // pre-selected or guessed, since Canonical Truth requires an explicit
  // creator choice before any attribution exists.
  const [targetTrackId, setTargetTrackId] = useState("");

  function updateField(field: keyof PromptDraft, value: string) {
    const nextDraft = { ...draft, [field]: value };
    setDraft(nextDraft);
    // The live composition only ever overwrites the final prompt while a
    // creator hasn't chosen to take it over by hand — the moment they
    // type directly into it below, their words are never silently replaced.
    if (!finalTextDirty) setFinalText(composePromptText(nextDraft));
  }

  function recomposeFromFields() {
    setFinalText(composePromptText(draft));
    setFinalTextDirty(false);
  }

  const projectAudioAssets = assets.filter((asset) => asset.projectId === project.id && asset.type === "Audio");

  function addReference(name: string) {
    const current = draft.references.trim();
    const next = current ? `${current}, ${name}` : name;
    updateField("references", next);
  }

  const projectKnowledge = knowledgeEntries.filter((entry) => entry.projectId === project.id);
  const promptVersions = projectKnowledge.filter(isPromptVersion);
  const projectTracks = plannedTracks.filter((track) => track.projectId === project.id);

  function handleSave() {
    if (!finalText.trim()) return;

    const title = nextPromptVersionTitle(promptVersions);
    const result = onSaveKnowledge({
      title,
      insight: finalText,
      source: "Experiment",
      projectId: project.id,
    });

    if (result.error || !result.entry) {
      setSaveMessage(result.error);
      return;
    }

    // Prompt Attribution only ever happens here, as one explicit extra
    // step right after the prompt itself is saved — never inferred from
    // the title/text this view already composed. Leaving "Target Track"
    // on "Album-wide Prompt" (targetTrackId === "") means this branch
    // simply never runs, and nothing changes from how Prompt Studio
    // already behaved before this sprint.
    const targetTrack = projectTracks.find((track) => track.id === targetTrackId);
    if (targetTrack) {
      onAttributePrompt({ promptVersionId: result.entry.id, trackId: targetTrack.id });
    }

    setSaveMessage(targetTrack ? `Saved as "${title}" for "${targetTrack.title}".` : `Saved as "${title}" (album-wide).`);
  }

  async function handleCopy() {
    if (!finalText.trim()) return;
    await navigator.clipboard.writeText(finalText);
    setCopyMessage("Copied to clipboard.");
    setTimeout(() => setCopyMessage(null), 2000);
  }

  return (
    <section className="section-view prompt-studio">
      <button className="back-btn" onClick={onBack}>
        ← Back to Music Workspace
      </button>

      <div>
        <h2 className="section-title">🎛️ Prompt Studio</h2>
        <p className="section-subtitle">
          {project.name} — build a production prompt field by field, or write it directly below.
        </p>
      </div>

      <div className="prompt-fields-grid">
        {PROMPT_FIELD_ORDER.map((field) => (
          <PromptField key={field} field={field} value={draft[field]} onChange={(value) => updateField(field, value)} />
        ))}
      </div>

      {projectAudioAssets.length > 0 && (
        <div className="field">
          <span className="field-label">Reference tracks already in this project</span>
          <div className="prompt-reference-chips">
            {projectAudioAssets.map((asset) => (
              <button key={asset.id} className="prompt-reference-chip" onClick={() => addReference(asset.name)}>
                🎧 {asset.name}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="field">
        <label className="field-label" htmlFor="prompt-final-text">
          Final Prompt {finalTextDirty && "(edited directly)"}
        </label>
        <textarea
          id="prompt-final-text"
          value={finalText}
          onChange={(event) => {
            setFinalText(event.target.value);
            setFinalTextDirty(true);
          }}
          rows={8}
          placeholder="Fill in a field above, or write your prompt here directly."
        />
        {finalTextDirty && (
          <button className="secondary prompt-recompose-btn" onClick={recomposeFromFields}>
            ↻ Recompose from fields above
          </button>
        )}
      </div>

      {/* Prompt Attribution's one piece of UI: a creator's own explicit
          choice, made once, right before saving — never a default, never
          inferred from anything this view already knows about the draft. */}
      <div className="field">
        <label className="field-label" htmlFor="prompt-target-track">
          Target Track
        </label>
        <select
          id="prompt-target-track"
          value={targetTrackId}
          onChange={(event) => setTargetTrackId(event.target.value)}
        >
          <option value="">Album-wide Prompt</option>
          {projectTracks.map((track) => (
            <option key={track.id} value={track.id}>
              {track.title}
            </option>
          ))}
        </select>
      </div>

      <div className="prompt-actions">
        <button className="secondary" onClick={handleCopy} disabled={!finalText.trim()}>
          📋 Copy Prompt
        </button>
        <button onClick={handleSave} disabled={!finalText.trim()}>
          💾 Save as Prompt Version
        </button>
      </div>
      {copyMessage && <p className="field-label">{copyMessage}</p>}
      {saveMessage && <p className="field-label">{saveMessage}</p>}

      <div className="prompt-versions-section">
        <h3 className="prompt-versions-title">Prompt Versions</h3>
        {promptVersions.length === 0 ? (
          <p className="field-label">No prompt versions saved yet.</p>
        ) : (
          // Custom rows here, rather than reusing KnowledgeList, purely so
          // each version can show which track (if any) it was explicitly
          // written for — KnowledgeCard's own presentation has no room for
          // that, and is off-limits to modify this sprint (Creative
          // Knowledge Engine). Everything else about a version — its
          // title, clicking through to its own detail view — behaves
          // exactly as it always has.
          <div className="prompt-version-list">
            {promptVersions.map((entry) => {
              const attributedTrackId = getAttributedTrackId(entry.id);
              const attributedTrack = projectTracks.find((track) => track.id === attributedTrackId);
              return (
                <button
                  key={entry.id}
                  className="prompt-version-row"
                  onClick={() => onOpenKnowledgeEntry(entry.id)}
                >
                  <span className="prompt-version-title">{entry.title}</span>
                  <span
                    className={`badge prompt-version-target-badge ${attributedTrack ? "prompt-version-target-track" : "prompt-version-target-album"}`}
                  >
                    {attributedTrack ? `🎯 ${attributedTrack.title}` : "Album-wide"}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <PromptCoachPanel analysis={coachAnalysis} />
    </section>
  );
}

export default PromptStudioView;
