interface SummaryCardProps {
  title: string;
  count: number;
  description: string;
  // Optional and unused for now — "Open" doesn't do anything yet. Once each
  // summary (Assets, Knowledge, Releases, Activity) gets its own drill-down
  // view, wiring it up is just passing a callback here, no structural changes.
  onOpen?: () => void;
}

// A small overview tile shown in the Project Workspace. Reuses the same
// card shell as the workspace overview (.placeholder-card in Workspace.css)
// so it stays visually consistent without redefining that box styling here.
function SummaryCard({ title, count, description, onOpen }: SummaryCardProps) {
  return (
    <div className="placeholder-card summary-card">
      <div className="summary-card-header">
        <h3 className="summary-card-title">{title}</h3>
        <span className="summary-card-count">{count}</span>
      </div>
      <p className="card-description">{description}</p>
      <button className="summary-card-open-btn" onClick={onOpen}>
        Open
      </button>
    </div>
  );
}

export default SummaryCard;
