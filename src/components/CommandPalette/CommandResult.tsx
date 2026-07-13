import type { CommandResultData } from "../../hooks/useCommandPalette";

interface CommandResultProps {
  result: CommandResultData;
  isSelected: boolean;
  onSelect: () => void;
}

// A single row in the palette's results list. Purely a display + click
// target — the actual "what happens when you pick this" logic lives in
// App.tsx's onActivate handler, not here.
function CommandResult({ result, isSelected, onSelect }: CommandResultProps) {
  return (
    <button
      className={`command-result${isSelected ? " selected" : ""}`}
      onClick={onSelect}
      aria-pressed={isSelected}
    >
      <span className="command-result-icon">{result.icon}</span>
      <span className="command-result-name">{result.name}</span>
      {result.context && <span className="command-result-context">{result.context}</span>}
    </button>
  );
}

export default CommandResult;
