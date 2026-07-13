import type { Activity } from "../../types";
import ActivityItem from "./ActivityItem";
import "./Activity.css";

interface ActivityListProps {
  activities: Activity[];
}

// Renders one ActivityItem per entry. The list is already filtered and
// sorted newest-first by useActivity() — this component just renders
// whatever order it's given, same as every other List component here.
function ActivityList({ activities }: ActivityListProps) {
  return (
    <ul className="activity-list">
      {activities.map((activity) => (
        <ActivityItem key={activity.id} activity={activity} />
      ))}
    </ul>
  );
}

export default ActivityList;
