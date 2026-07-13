import type { KeyboardEvent } from "react";
import Modal from "../Modal/Modal";
import CommandResult from "./CommandResult";
import type { CommandResultData, CommandResultType } from "../../hooks/useCommandPalette";
import "./CommandPalette.css";

interface CommandPaletteProps {
  isOpen: boolean;
  query: string;
  onQueryChange: (value: string) => void;
  results: CommandResultData[];
  selectedIndex: number;
  onMoveSelection: (delta: number) => void;
  onClose: () => void;
  onActivate: (result: CommandResultData) => void;
}

// Display order for grouping — also the order results are searched in, so
// this doubles as the palette's "priority" (Quick Capture actions first,
// since typing "capture"/"new" is a clear statement of intent).
const GROUPS: { type: CommandResultType; label: string }[] = [
  { type: "action", label: "Quick Capture" },
  { type: "identity", label: "Identities" },
  { type: "project", label: "Projects" },
  { type: "knowledge", label: "Knowledge" },
  { type: "asset", label: "Assets" },
  { type: "release", label: "Releases" },
  { type: "capture", label: "Inbox" },
  { type: "companion", label: "Companions" },
];

// The Ctrl/Cmd+K search overlay. Built on the generic Modal (so ESC and
// outside-click "just work" the same as every other dialog in Forge) with
// a wider panel and its own results list on top.
function CommandPalette({
  isOpen,
  query,
  onQueryChange,
  results,
  selectedIndex,
  onMoveSelection,
  onClose,
  onActivate,
}: CommandPaletteProps) {
  // Pairs each result with its position in the flat `results` array so
  // arrow-key navigation (which moves through that flat order) lines up
  // with the grouped display below, without a second sort/filter pass.
  const indexedResults = results.map((result, index) => ({ result, index }));

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      onMoveSelection(1);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      onMoveSelection(-1);
    } else if (event.key === "Enter") {
      event.preventDefault();
      const selected = results[selectedIndex];
      if (selected) onActivate(selected);
    }
    // ESC isn't handled here — Modal already closes on Escape globally.
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} panelClassName="command-palette-panel">
      <input
        type="text"
        className="command-palette-input"
        placeholder="Search Forge, or type “capture” to jot something down…"
        value={query}
        onChange={(event) => onQueryChange(event.target.value)}
        onKeyDown={handleKeyDown}
        autoFocus
      />

      <div className="command-palette-results">
        {query.trim() === "" ? (
          <p className="command-palette-hint">Start typing to search Forge.</p>
        ) : results.length === 0 ? (
          <p className="command-palette-hint">No results for &quot;{query}&quot;.</p>
        ) : (
          GROUPS.map((group) => {
            const groupResults = indexedResults.filter(({ result }) => result.type === group.type);
            if (groupResults.length === 0) return null;

            return (
              <div key={group.type} className="command-palette-group">
                <h4 className="command-palette-group-label">{group.label}</h4>
                {groupResults.map(({ result, index }) => (
                  <CommandResult
                    key={`${result.type}-${result.id}`}
                    result={result}
                    isSelected={index === selectedIndex}
                    onSelect={() => onActivate(result)}
                  />
                ))}
              </div>
            );
          })
        )}
      </div>
    </Modal>
  );
}

export default CommandPalette;
