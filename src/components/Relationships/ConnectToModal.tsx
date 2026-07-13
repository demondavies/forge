import { useState } from "react";
import type { KeyboardEvent } from "react";
import Modal from "../Modal/Modal";
import CommandResult from "../CommandPalette/CommandResult";
import { buildResults } from "../../hooks/useCommandPalette";
import type { CommandPaletteData, CommandResultData } from "../../hooks/useCommandPalette";
import { isSameRef } from "../../hooks/relationshipDiscovery";
import type { ObjectRef, RelatedObjectType, RelationshipType } from "../../types";
import { RELATIONSHIP_TYPE_LABELS, RELATIONSHIP_TYPES } from "../../types";

interface ConnectToModalProps {
  isOpen: boolean;
  // The object "+ Connect To…" was opened from. Only null while the modal
  // itself is closed — App.tsx keeps isOpen and this in sync.
  sourceRef: ObjectRef | null;
  sourceLabel: string;
  // Identity-scoped data, NOT the Command Palette's cross-identity "all"
  // arrays — a Relationship can't span identities, so this is called with a
  // narrower slice of the exact same CommandPaletteData shape.
  searchData: CommandPaletteData;
  onClose: () => void;
  // Mirrors every other createX(): returns an error to keep the modal open
  // and show it, rather than throwing.
  onConnect: (target: ObjectRef, relationshipType: RelationshipType) => { error: string | null };
}

// Forge's manual connection workflow: choose an object, "Connect To…",
// search for another object, pick a relationship type, save. Two phases of
// one modal — searching for a target, then confirming it with a
// relationship type — rather than a wizard or a dedicated relationship
// screen, so the whole thing stays a few keystrokes and one Enter away from
// done. Reuses buildResults and CommandResult from the Command Palette
// wholesale, and the shared .pill-toggle/.command-palette-* CSS — nothing
// here is bespoke.
function ConnectToModal({
  isOpen,
  sourceRef,
  sourceLabel,
  searchData,
  onClose,
  onConnect,
}: ConnectToModalProps) {
  const [query, setQuery] = useState("");
  const [target, setTarget] = useState<CommandResultData | null>(null);
  const [relationshipType, setRelationshipType] = useState<RelationshipType>("manual");
  const [error, setError] = useState<string | null>(null);

  function resetForm() {
    setQuery("");
    setTarget(null);
    setRelationshipType("manual");
    setError(null);
  }

  function handleClose() {
    resetForm();
    onClose();
  }

  // Reuses the Command Palette's own matching logic exactly — the only
  // difference is *which* data it's called with (see searchData's doc
  // comment above). "action" results (Quick Capture) don't point at a real
  // object, "identity" isn't something a Relationship connects to directly,
  // and the source obviously can't be connected to itself.
  const results = query.trim()
    ? buildResults(query, searchData).filter((result) => {
        if (result.type === "action" || result.type === "identity") return false;
        if (!sourceRef) return true;
        return !isSameRef(sourceRef, { type: result.type as RelatedObjectType, id: result.id });
      })
    : [];

  function chooseTarget(result: CommandResultData) {
    setTarget(result);
    setError(null);
  }

  function handleSave() {
    if (!sourceRef || !target) return;

    const result = onConnect({ type: target.type as RelatedObjectType, id: target.id }, relationshipType);
    if (result.error) {
      setError(result.error);
      return; // Keep the modal open so the creator can fix the problem.
    }

    resetForm();
    onClose();
  }

  function handleSearchKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter" && results.length > 0) {
      event.preventDefault();
      chooseTarget(results[0]);
    }
  }

  // Ctrl/Cmd+Enter saves once a target is chosen — the same shortcut every
  // other Forge modal uses to finish without reaching for the mouse.
  function handleConfirmKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
      event.preventDefault();
      handleSave();
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} panelClassName="command-palette-panel">
      <h3 className="modal-title">Connect &quot;{sourceLabel}&quot; to…</h3>

      {target ? (
        <div className="field" onKeyDown={handleConfirmKeyDown}>
          <span className="field-label">Connecting to</span>
          <div className="command-palette-results">
            <CommandResult result={target} isSelected onSelect={() => setTarget(null)} />
          </div>
          <p className="command-palette-hint">Click it to search for something else.</p>

          <span className="field-label">How are these connected?</span>
          <div className="pill-toggle">
            {RELATIONSHIP_TYPES.map((option) => (
              <button
                key={option}
                className={`pill-option${relationshipType === option ? " selected" : ""}`}
                onClick={() => setRelationshipType(option)}
              >
                {RELATIONSHIP_TYPE_LABELS[option]}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="field">
          <input
            type="text"
            placeholder="Search for a project, knowledge entry, asset…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={handleSearchKeyDown}
            autoFocus
          />

          <div className="command-palette-results">
            {query.trim() === "" ? (
              <p className="command-palette-hint">Start typing to find what to connect this to.</p>
            ) : results.length === 0 ? (
              <p className="command-palette-hint">No matches for &quot;{query}&quot;.</p>
            ) : (
              results.map((result) => (
                <CommandResult
                  key={`${result.type}-${result.id}`}
                  result={result}
                  isSelected={false}
                  onSelect={() => chooseTarget(result)}
                />
              ))
            )}
          </div>
        </div>
      )}

      {error && <p className="field-error">{error}</p>}

      <div className="modal-actions">
        <button className="secondary" onClick={handleClose}>
          Cancel
        </button>
        <button onClick={handleSave} disabled={!target}>
          Save
        </button>
      </div>
    </Modal>
  );
}

export default ConnectToModal;
