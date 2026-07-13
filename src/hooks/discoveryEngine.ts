// The Discovery Engine — deterministic rules that notice patterns across
// the whole Creative Knowledge Engine, not just between one pair of
// objects. Like relationshipDiscovery.ts, this file touches no React
// state; it only reads plain data and returns plain data, computed fresh
// every time it's called rather than written anywhere. Discovery and
// presentation are separate concerns: nothing here renders, confirms,
// dismisses, or explains itself to a creator — DiscoveriesView does that,
// reading whatever this returns.
//
// A Discovery is not a Relationship: a Relationship always joins exactly
// two objects with a type describing how they relate. A Discovery is a
// rule's finding about one or more objects — sometimes just one (an
// isolated Knowledge entry), sometimes several — so it needed its own
// (small) shape rather than being forced into Relationship's source/target
// pair. It reuses ObjectRef, exactly like Relationship and Activity already
// do, rather than inventing a new way to point at something.
import type { ObjectRef } from "../types";
import type { DiscoveryContext } from "./relationshipDiscovery";
import { collectDiscoverableObjects, isSameRef, refKey } from "./relationshipDiscovery";

// The categories of pattern this first implementation actually looks for.
// Like RelationshipType, each value doubles as both "what was found" and
// "which rule found it" — the deterministic rules below are the same thing
// as the categories they produce. Only three of the mission's example
// categories are implemented (isolated objects, missing context, dense
// clusters); the rest (stalled projects, timeline anomalies, ...) are
// deliberately left for later — adding one is a one-line addition to this
// union plus one more rule function below, not an architecture change.
export type DiscoveryType = "isolated-object" | "missing-context" | "dense-cluster";

// A short label + icon per type, purely presentational — mirrors
// RELATIONSHIP_TYPE_LABELS' role for RelationshipType.
export const DISCOVERY_TYPE_META: Record<DiscoveryType, { label: string; icon: string }> = {
  "isolated-object": { label: "Isolated", icon: "🧩" },
  "missing-context": { label: "Missing Context", icon: "📝" },
  "dense-cluster": { label: "Dense Cluster", icon: "🕸️" },
};

// One finding. `objects` is an array (not a fixed pair) because a
// discovery can be about just one object (most of this sprint's rules) or
// several (room for a future rule like "these three keep getting
// discussed together") without needing a different shape per rule.
export interface Discovery {
  id: string;
  type: DiscoveryType;
  confidence: number;
  reason: string;
  objects: ObjectRef[];
}

const MAX_DISCOVERIES = 20;

// Confidence is a fixed constant per rule here too — never a learned or
// probabilistic score, for the same reason Relationship's confidence isn't:
// every discovery needs to be traceable back to the one deterministic rule
// that produced it, not to a model's opinion.
const ISOLATED_OBJECT_CONFIDENCE = 0.6;
const MISSING_CONTEXT_CONFIDENCE = 0.4;
const DENSE_CLUSTER_CONFIDENCE = 0.5;

// A relationship "counts" toward these rules once it's actually part of
// the graph as the creator or discovery understands it — a dismissed
// relationship was explicitly rejected, so it shouldn't make something
// look connected, or make a hub look busier than it is.
function activeRelationshipCount(objectRef: ObjectRef, context: DiscoveryContext): number {
  const relationships = context.relationships ?? [];
  return relationships.filter(
    (relationship) =>
      relationship.status !== "dismissed" &&
      (isSameRef(relationship.source, objectRef) || isSameRef(relationship.target, objectRef)),
  ).length;
}

// Every first-class object that has zero connections to anything else —
// the plainest possible answer to "what's been captured but never tied
// into the rest of the work." Doesn't apply to Identity (nothing here
// enumerates identities as connectable objects) or Companion (Companions
// aren't part of the Relationship Engine — see Companion Framework's own
// "do not implement Companion observations yet").
function findIsolatedObjects(context: DiscoveryContext): Discovery[] {
  return collectDiscoverableObjects(context)
    .filter((object) => activeRelationshipCount(object.ref, context) === 0)
    .map((object) => ({
      id: `isolated-object:${refKey(object.ref)}`,
      type: "isolated-object",
      confidence: ISOLATED_OBJECT_CONFIDENCE,
      reason: `"${object.label}" has no connections to anything else yet.`,
      objects: [object.ref],
    }));
}

// Project/Asset/Release each carry an optional, free-text `description` —
// Knowledge's `insight` and Capture's `content` are required at creation,
// so only these three can genuinely be "missing" context this way.
function findMissingContext(context: DiscoveryContext): Discovery[] {
  const discoveries: Discovery[] = [];

  for (const project of context.projects) {
    if (!project.description.trim()) {
      discoveries.push({
        id: `missing-context:project:${project.id}`,
        type: "missing-context",
        confidence: MISSING_CONTEXT_CONFIDENCE,
        reason: `"${project.name}" has no description yet.`,
        objects: [{ type: "project", id: project.id }],
      });
    }
  }

  for (const asset of context.assets) {
    if (!asset.description.trim()) {
      discoveries.push({
        id: `missing-context:asset:${asset.id}`,
        type: "missing-context",
        confidence: MISSING_CONTEXT_CONFIDENCE,
        reason: `"${asset.name}" has no description yet.`,
        objects: [{ type: "asset", id: asset.id }],
      });
    }
  }

  for (const release of context.releases) {
    if (!release.description.trim()) {
      discoveries.push({
        id: `missing-context:release:${release.id}`,
        type: "missing-context",
        confidence: MISSING_CONTEXT_CONFIDENCE,
        reason: `"${release.title}" has no description yet.`,
        objects: [{ type: "release", id: release.id }],
      });
    }
  }

  return discoveries;
}

// The opposite signal from an isolated object: something connected to
// well above the identity's own average, once there's enough of a graph
// for "average" to mean anything. MIN_COUNT keeps this quiet on small or
// early identities where two or three connections would otherwise look
// artificially "dense" just because everything else has none yet.
function findDenseClusters(context: DiscoveryContext): Discovery[] {
  const MIN_COUNT = 3;
  const THRESHOLD_MULTIPLIER = 2;

  const objects = collectDiscoverableObjects(context);
  if (objects.length === 0) return [];

  const counted = objects.map((object) => ({
    object,
    count: activeRelationshipCount(object.ref, context),
  }));

  const totalConnections = counted.reduce((sum, entry) => sum + entry.count, 0);
  if (totalConnections === 0) return [];

  const average = totalConnections / counted.length;

  return counted
    .filter(({ count }) => count >= MIN_COUNT && count >= average * THRESHOLD_MULTIPLIER)
    .map(({ object, count }) => ({
      id: `dense-cluster:${refKey(object.ref)}`,
      type: "dense-cluster" as const,
      confidence: DENSE_CLUSTER_CONFIDENCE,
      reason: `"${object.label}" is connected to ${count} other things — well above the identity's average of ${average.toFixed(1)}.`,
      objects: [object.ref],
    }));
}

// The one entry point everything else calls — mirrors
// findCandidateRelationships's role for the Relationship Engine. Pure and
// synchronous, safe to call on every render; results are capped and sorted
// so a creator sees the most notable findings first rather than however
// the rules happened to run.
export function findDiscoveries(context: DiscoveryContext): Discovery[] {
  const discoveries = [
    ...findIsolatedObjects(context),
    ...findMissingContext(context),
    ...findDenseClusters(context),
  ];

  return discoveries.sort((a, b) => b.confidence - a.confidence).slice(0, MAX_DISCOVERIES);
}
