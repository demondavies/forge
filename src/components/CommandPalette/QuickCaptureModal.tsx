import { useState } from "react";
import type { KeyboardEvent } from "react";
import Modal from "../Modal/Modal";
import { truncateText } from "../../utils/truncateText";
import type { QuickCaptureType } from "../../hooks/useCommandPalette";
import type { CreateCaptureInput, CreateCaptureResult } from "../../hooks/useCaptures";
import type { CaptureKnowledgeInput, CaptureKnowledgeResult } from "../../hooks/useKnowledge";

interface QuickCaptureModalProps {
  isOpen: boolean;
  // Which type the palette action (or the Inbox's own button) opened this
  // with — the type picker below still lets the creator change their mind
  // before saving, since a quick keystroke shouldn't lock them in.
  initialType: QuickCaptureType;
  onClose: () => void;
  // Everything except "Knowledge" is a plain Capture. "Knowledge" reuses
  // the real Knowledge system directly instead of being modeled twice —
  // see handleCapture below.
  onCaptureGeneric: (input: CreateCaptureInput) => CreateCaptureResult;
  onCaptureKnowledge: (input: CaptureKnowledgeInput) => CaptureKnowledgeResult;
}

// Order matches the mission's own example list. "Knowledge" sits alongside
// the real Capture types here even though it's backed by a different
// system under the hood — from the creator's point of view it's just
// another kind of thing to jot down.
const QUICK_CAPTURE_TYPES: QuickCaptureType[] = [
  "Idea",
  "Knowledge",
  "Prompt",
  "Task",
  "Link",
  "Release Note",
];

const TYPE_ICONS: Record<QuickCaptureType, string> = {
  Idea: "💡",
  Knowledge: "🧠",
  Prompt: "✨",
  Task: "✅",
  Link: "🔗",
  "Release Note": "🎵",
};

// A short, type-specific prompt so the single textarea below still feels
// like it's asking the right question, without turning into a multi-field form.
const TYPE_PROMPTS: Record<QuickCaptureType, string> = {
  Idea: "What's the idea?",
  Knowledge: "What did you learn?",
  Prompt: "What's the prompt?",
  Task: "What needs doing?",
  Link: "Paste the link — add a note if it helps.",
  "Release Note": "What's the release note?",
};

// A quick-capture form is deliberately just one field: a single block of
// text. Reuses the generic Modal (ESC/outside-click/overlay) and the
// shared .pill-toggle for the type picker — nothing here is bespoke CSS.
function QuickCaptureModal({
  isOpen,
  initialType,
  onClose,
  onCaptureGeneric,
  onCaptureKnowledge,
}: QuickCaptureModalProps) {
  const [type, setType] = useState<QuickCaptureType>(initialType);
  const [content, setContent] = useState("");
  const [error, setError] = useState<string | null>(null);

  function resetForm() {
    setType(initialType);
    setContent("");
    setError(null);
  }

  // Cancel, ESC, and clicking outside all end up here (see Modal's onClose).
  // None of them should leave behind any typed text for next time.
  function handleClose() {
    resetForm();
    onClose();
  }

  function handleCapture() {
    // "Knowledge" routes through the real Knowledge system — a title is
    // required there, so one is derived from the same text the creator
    // already typed instead of asking for it separately.
    const result =
      type === "Knowledge"
        ? onCaptureKnowledge({
            title: truncateText(content, 60),
            insight: content,
            source: "Observation",
            projectId: null,
          })
        : onCaptureGeneric({ type, content });

    if (result.error) {
      setError(result.error);
      return; // Keep the modal open so the creator can fix the problem.
    }

    resetForm();
    onClose();
  }

  // A power-user shortcut: Ctrl/Cmd+Enter submits immediately, so a capture
  // never has to end with reaching for the mouse.
  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
      event.preventDefault();
      handleCapture();
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose}>
      <h3 className="modal-title">Quick Capture</h3>

      <div className="field">
        <span className="field-label">Type</span>
        <div className="pill-toggle">
          {QUICK_CAPTURE_TYPES.map((option) => (
            <button
              key={option}
              className={`pill-option${type === option ? " selected" : ""}`}
              onClick={() => {
                setType(option);
                if (error) setError(null);
              }}
            >
              {TYPE_ICONS[option]} {option}
            </button>
          ))}
        </div>
      </div>

      <div className="field">
        <label className="field-label" htmlFor="quick-capture-content">
          {TYPE_PROMPTS[type]}
        </label>
        <textarea
          id="quick-capture-content"
          value={content}
          onChange={(event) => {
            setContent(event.target.value);
            if (error) setError(null);
          }}
          onKeyDown={handleKeyDown}
          rows={4}
          autoFocus
        />
      </div>

      {error && <p className="field-error">{error}</p>}

      <div className="modal-actions">
        <button className="secondary" onClick={handleClose}>
          Cancel
        </button>
        <button onClick={handleCapture}>Capture</button>
      </div>
    </Modal>
  );
}

export default QuickCaptureModal;
