import { useState } from "react";
import type { Activity, ActivityType, RelatedObjectType } from "../types";

// The details needed to log one activity. There's no "input form" for this
// like every other hook has, because nothing ever creates an Activity by
// hand — see recordActivity below.
export interface RecordActivityInput {
  identityId: string;
  type: ActivityType;
  title: string;
  relatedObjectType: RelatedObjectType;
  relatedObjectId: string;
}

// Mirrors every other hook here (useProjects, useKnowledge, ...): one hook
// owns all activity state, filtered to whichever identity is currently
// active. The one difference is there's no createX() called from a modal —
// recordActivity() is only ever invoked by App.tsx right after
// createIdentity/createProject/captureKnowledge/createAsset/createRelease
// succeeds. That's what "activity is derived, not user-created" means in
// practice: this hook exposes no form, no validation, no way for a
// component to add an entry on its own.
export function useActivity(activeIdentityId: string | null) {
  const [activities, setActivities] = useState<Activity[]>([]);

  // Only the activity for the currently selected identity, newest first.
  const activitiesForActiveIdentity = activities
    .filter((activity) => activity.identityId === activeIdentityId)
    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

  function recordActivity(input: RecordActivityInput) {
    const newActivity: Activity = {
      id: crypto.randomUUID(),
      identityId: input.identityId,
      type: input.type,
      title: input.title,
      timestamp: new Date(),
      relatedObjectType: input.relatedObjectType,
      relatedObjectId: input.relatedObjectId,
    };

    setActivities((current) => [...current, newActivity]);
  }

  return { activities: activitiesForActiveIdentity, recordActivity };
}
