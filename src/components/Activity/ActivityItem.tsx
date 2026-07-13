import type { Activity } from "../../types";

interface ActivityItemProps {
  activity: Activity;
}

// One icon per activity type — purely presentational, so it lives here
// rather than in types.ts (which is reserved for the domain model itself).
// Exported so Creative History (creativeHistory.ts) can reuse the exact same
// icon per event instead of keeping a second map in sync.
export const ACTIVITY_ICONS: Record<Activity["type"], string> = {
  "Identity Created": "✨",
  "Project Created": "📁",
  "Knowledge Captured": "🧠",
  "Asset Added": "🎨",
  "Release Planned": "🎵",
  "Item Captured": "📥",
};

// Formats a timestamp as a short relative time ("just now", "5m ago",
// "3h ago", "2d ago") without pulling in a date library. Exported for the
// same reason as ACTIVITY_ICONS above — Creative History's timeline entries
// use this exact formatting too.
export function formatRelativeTime(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);

  if (seconds < 60) return "just now";

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

// A single row in the activity feed. Reuses the existing .placeholder-card
// shell (Workspace.css) — the same trick SummaryCard already uses — so no
// box styling is redefined here, only the icon/title/time layout inside it.
function ActivityItem({ activity }: ActivityItemProps) {
  return (
    <li className="placeholder-card activity-item">
      <span className="activity-icon">{ACTIVITY_ICONS[activity.type]}</span>
      <span className="activity-title">{activity.title}</span>
      <span className="activity-time">{formatRelativeTime(activity.timestamp)}</span>
    </li>
  );
}

export default ActivityItem;
