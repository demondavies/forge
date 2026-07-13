import type { HistoryEntry } from "../../hooks/creativeHistory";
import { formatDate } from "../../utils/formatDate";

interface HistoryEntryItemProps {
  entry: HistoryEntry;
}

// One moment in an object's story. A milestone gets a slightly larger,
// accent-coloured dot and a bolder title — everything else about the row
// (icon, title, date) is identical, so the timeline stays legible without
// needing a second visual language for "important" vs "ordinary".
function HistoryEntryItem({ entry }: HistoryEntryItemProps) {
  return (
    <li className={`history-entry${entry.isMilestone ? " milestone" : ""}`}>
      <span className="history-entry-dot">{entry.icon}</span>
      <div className="history-entry-content">
        <span className="history-entry-title">{entry.title}</span>
        <span className="history-entry-date">{formatDate(entry.timestamp)}</span>
      </div>
    </li>
  );
}

export default HistoryEntryItem;
