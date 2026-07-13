import type { HistoryEntry } from "../../hooks/creativeHistory";
import HistoryEntryItem from "./HistoryEntryItem";
import "./History.css";

interface HistoryTimelineProps {
  entries: HistoryEntry[];
}

// Renders a Creative History as a connected, oldest-first timeline rather
// than a flat feed — the vertical line between dots (History.css) is what
// makes it read as one continuous story instead of a list of unrelated rows.
function HistoryTimeline({ entries }: HistoryTimelineProps) {
  return (
    <ul className="history-timeline">
      {entries.map((entry) => (
        <HistoryEntryItem key={entry.id} entry={entry} />
      ))}
    </ul>
  );
}

export default HistoryTimeline;
