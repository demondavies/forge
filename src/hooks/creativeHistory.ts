// Creative History — the chronological dimension of the Creative Knowledge
// Engine. Like relationshipDiscovery.ts, this file touches no React state;
// it only reads plain data (Activity + Relationship, both systems that
// already exist) and returns a plain, ordered list. Nothing here is a new
// kind of record — it's a read-time projection over data Forge already
// collects, which is what "reuse the existing Activity system, do not
// introduce a separate history architecture" means in practice.
import type { Activity, ObjectRef, Relationship } from "../types";
import { ACTIVITY_ICONS } from "../components/Activity/ActivityItem";
import { isSameRef } from "./relationshipDiscovery";

// One row in an object's Creative History. `isMilestone` distinguishes a
// handful of especially meaningful moments (right now: the very first thing
// that ever happened, and the first connection ever formed) from ordinary
// entries — see buildCreativeHistory's own comments for exactly which.
export interface HistoryEntry {
  id: string;
  timestamp: Date;
  icon: string;
  title: string;
  isMilestone: boolean;
}

// Builds one object's story in the order it actually happened — oldest
// first, unlike the "Recent Activity" feed elsewhere in Forge (which reads
// newest-first, because that's a status update, not a narrative). Two
// existing systems feed this: Activity (what was created, exactly as
// recorded by useActivity) and Relationship (when this object was first
// connected to something else, exactly as recorded by useRelationships) —
// there is no third system, no new entity, and no extra fields anywhere
// else in the app just to support this.
//
// `relatedRefs` lets a container object (currently only Project) fold its
// children's own creation moments into its own story — "first asset added",
// "first knowledge captured" naturally fall out of this instead of needing
// dedicated milestone detection, since they're just activity entries whose
// relatedObjectId happens to belong to one of the project's own objects.
// Every other object type passes an empty array here, since nothing belongs
// to a Knowledge entry/Asset/Release/Capture the way children belong to a
// Project.
export function buildCreativeHistory(
  subjectRef: ObjectRef,
  relatedRefs: ObjectRef[],
  activities: Activity[],
  relationships: Relationship[],
  resolve: (ref: ObjectRef) => { label: string; icon: string } | null,
): HistoryEntry[] {
  const ownRefs = [subjectRef, ...relatedRefs];
  const relevantActivities = activities.filter((activity) =>
    ownRefs.some(
      (ref) => activity.relatedObjectType === ref.type && activity.relatedObjectId === ref.id,
    ),
  );

  const activityEntries: HistoryEntry[] = relevantActivities.map((activity) => ({
    id: activity.id,
    timestamp: activity.timestamp,
    icon: ACTIVITY_ICONS[activity.type],
    title: activity.title,
    isMilestone: false,
  }));

  // Only *confirmed* connections belong in History — a still-"suggested"
  // relationship is a possibility Forge is offering, not something that has
  // actually happened yet ("Forge suggests. The creator decides."). It
  // becomes part of the story the moment it's confirmed (whether that's a
  // manual "+ Connect To…" connection, which is created already-confirmed,
  // or an accepted suggestion), not before.
  const relevantRelationships = relationships.filter((relationship) => relationship.status === "confirmed");

  const relationshipEntries: HistoryEntry[] = relevantRelationships.map((relationship) => {
    const otherRef = isSameRef(relationship.source, subjectRef)
      ? relationship.target
      : relationship.source;
    const resolved = resolve(otherRef);
    return {
      id: relationship.id,
      timestamp: relationship.createdAt,
      icon: "🔗",
      title: resolved ? `Connected to "${resolved.label}"` : "Connected to another object",
      isMilestone: false,
    };
  });

  // The earliest connection this object ever formed is a genuine
  // milestone — "when did this first become part of the wider web" — even
  // if Forge found it automatically rather than the creator making it by
  // hand. Mutating in place before the merge below is deliberate: these are
  // the same objects that end up in `combined`, so marking one here is all
  // that's needed.
  if (relationshipEntries.length > 0) {
    const earliestConnection = relationshipEntries.reduce((earliest, entry) =>
      entry.timestamp < earliest.timestamp ? entry : earliest,
    );
    earliestConnection.isMilestone = true;
  }

  const combined = [...activityEntries, ...relationshipEntries].sort(
    (a, b) => a.timestamp.getTime() - b.timestamp.getTime(),
  );

  // However this object's story begins — its own creation, or (an edge
  // case) a connection recorded before any activity did — that first entry
  // is always a milestone: it's the answer to "how did this begin?".
  if (combined.length > 0) {
    combined[0].isMilestone = true;
  }

  return combined;
}
