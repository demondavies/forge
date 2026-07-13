import type { HistoryEntry } from "../../hooks/creativeHistory";
import HistoryTimeline from "./HistoryTimeline";

interface CreativeHistorySectionProps {
  entries: HistoryEntry[];
}

// The "History" section every object surface now shows — reused across
// Project/Knowledge/Asset/Release/Capture the same way RelatedSection is.
// Renders nothing until there's a story to tell; unlike RelatedSection,
// there's no always-visible toolbar here, since nothing is *created* from
// this section — History only ever narrates what already happened.
function CreativeHistorySection({ entries }: CreativeHistorySectionProps) {
  if (entries.length === 0) return null;

  return (
    <section className="section-view">
      <h3 className="section-title">History</h3>
      <HistoryTimeline entries={entries} />
    </section>
  );
}

export default CreativeHistorySection;
