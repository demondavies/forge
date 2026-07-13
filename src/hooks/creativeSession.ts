// Creative Sessions — the top of the reasoning stack, and the first sprint
// that composes rather than reasons. Everything here is a read-time
// projection over engines that already exist and are already correct:
// Creative History, the Relationship Engine (via DiscoveryContext), the
// Discovery Engine, the Opportunity Engine, and Chief. Nothing in this file
// discovers a Discovery, invents an Opportunity, or speaks in Chief's
// voice — it only asks each engine for what it already knows and keeps the
// slice that's actually about one Project. The Context Enrichment
// Principle, applied directly: a session is *richer* context around a
// project, assembled fresh every time, never a new fact Forge remembers.
import type { Activity, ObjectRef, Project } from "../types";
import type { KnowledgeEntry } from "../types";
import type { DiscoveryContext } from "./relationshipDiscovery";
import { isSameRef, refKey, resolveObjectRef } from "./relationshipDiscovery";
import { buildCreativeHistory } from "./creativeHistory";
import type { HistoryEntry } from "./creativeHistory";
import { findDiscoveries } from "./discoveryEngine";
import { findOpportunities } from "./opportunityEngine";
import type { Opportunity } from "./opportunityEngine";
import { buildChiefObservations } from "./chief";
import type { ChiefObservation } from "./chief";

// A creator's temporary, focused view into one Project's current creative
// context — never a new source of truth (see this sprint's own Core
// Principle). No existing type could honestly express this: Project is the
// entity itself, not a moment-in-time bundle of everything currently
// relevant to working on it, and none of HistoryEntry/KnowledgeEntry/
// Opportunity/ChiefObservation individually holds all four together. This
// is the smallest new shape that could truthfully hold "here is what's
// worth seeing before you start working on this, right now" — and it's a
// bundle of references to already-existing data, not a container that
// owns anything new.
export interface CreativeSession {
  project: Project;
  history: HistoryEntry[];
  relatedKnowledge: KnowledgeEntry[];
  opportunities: Opportunity[];
  chiefObservations: ChiefObservation[];
}

// Only the project's own story, trimmed to what's actually recent — a
// session is meant to orient a creator returning to work, not retell the
// whole narrative CreativeHistorySection already tells in the project's
// own workspace. buildCreativeHistory itself is completely unmodified and
// still returns oldest-first; slicing the tail keeps that order (so the
// existing HistoryTimeline component doesn't need to know anything
// session-specific either) while showing only the last few entries.
const RECENT_HISTORY_LIMIT = 5;

function observationObjects(observation: ChiefObservation): ObjectRef[] {
  return observation.kind === "discovery" ? observation.discovery.objects : observation.opportunity.objects;
}

// The one composition this sprint adds. Every input is an engine's own,
// already-correct output — Discovery, Opportunity, and Chief all still run
// exactly as they do everywhere else in the app (identity-wide, unmodified,
// unaware a session even exists); the only new work here is deciding which
// of their findings are actually about this one Project, using the same
// "does this ref belong to the project" question ProjectWorkspace already
// answers for its own Overview tab (projectChildRefs), not a new one.
export function buildCreativeSession(
  project: Project,
  context: DiscoveryContext,
  activities: Activity[],
): CreativeSession {
  const projectRef: ObjectRef = { type: "project", id: project.id };

  const relatedKnowledge = context.knowledgeEntries.filter((entry) => entry.projectId === project.id);
  const projectAssets = context.assets.filter((asset) => asset.projectId === project.id);
  const projectReleases = context.releases.filter((release) => release.projectId === project.id);

  const projectChildRefs: ObjectRef[] = [
    ...projectAssets.map((asset): ObjectRef => ({ type: "asset", id: asset.id })),
    ...relatedKnowledge.map((entry): ObjectRef => ({ type: "knowledge", id: entry.id })),
    ...projectReleases.map((release): ObjectRef => ({ type: "release", id: release.id })),
  ];

  // Mirrors getRelationshipsFor(projectRef) exactly (useRelationships.ts) —
  // a pure function can't call that hook-bound version directly, so this
  // is the same predicate, not a second one.
  const projectRelationships = (context.relationships ?? []).filter(
    (relationship) => isSameRef(relationship.source, projectRef) || isSameRef(relationship.target, projectRef),
  );

  const history = buildCreativeHistory(
    projectRef,
    projectChildRefs,
    activities,
    projectRelationships,
    (ref) => resolveObjectRef(ref, context),
  ).slice(-RECENT_HISTORY_LIMIT);

  // "Does this Opportunity/Discovery/ChiefObservation concern this project
  // or something that belongs to it" — the one predicate both filters
  // below share.
  const projectRefKeys = new Set([projectRef, ...projectChildRefs].map(refKey));
  const involvesProject = (objects: ObjectRef[]) => objects.some((ref) => projectRefKeys.has(refKey(ref)));

  // Both engines still run identity-wide, exactly as Opportunities/Chief's
  // own sections already call them — filtering happens only after, on
  // their already-computed, already-capped output.
  const discoveries = findDiscoveries(context);
  const allOpportunities = findOpportunities(context);

  const opportunities = allOpportunities.filter((opportunity) => involvesProject(opportunity.objects));

  // Deliberately filtered from Chief's *actual* current top observations
  // (already capped identity-wide), not a project-specific re-ranking of
  // Discovery/Opportunity's raw output. If Chief currently has nothing to
  // say about this project — because something elsewhere in the identity
  // is more notable right now — the session honestly shows that, rather
  // than a session-only opinion Chief itself never actually formed.
  const chiefObservations = buildChiefObservations(discoveries, allOpportunities).filter((observation) =>
    involvesProject(observationObjects(observation)),
  );

  return { project, history, relatedKnowledge, opportunities, chiefObservations };
}
