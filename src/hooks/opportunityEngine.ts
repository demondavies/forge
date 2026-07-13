// The Opportunity Engine — Forge's first attempt at answering "given what
// exists, what could reasonably happen next?" rather than Discovery's own
// "what exists?". Like discoveryEngine.ts and relationshipDiscovery.ts,
// this file touches no React state and calls no AI: it only reads plain
// data (the same DiscoveryContext Discovery/Relationship matching already
// use — see relationshipDiscovery.ts) and returns plain data, recomputed
// fresh on every call. The Temporary Truth Principle, applied directly:
// nothing here is ever written to state or persisted — an Opportunity is
// only ever a read-time interpretation of whatever the Creative Knowledge
// Engine currently contains, and stops existing the moment the underlying
// data no longer implies it.
//
// Engine First Principle: this file defines the rules and their shape
// completely on its own, with zero knowledge that OpportunitiesView or
// OpportunityCard exist. Presentation reads this; this never reads
// presentation.
//
// An Opportunity is not a Discovery (a fact about what's there), not a
// Relationship (a connection between two things), and not a task (nothing
// here is ever "done" or "assigned") — it's the smallest new shape that
// could honestly hold "what was noticed, why it matters, which objects,
// which rule," reusing ObjectRef (like every other first-class reference
// in the app) rather than inventing a new way to point at something.
import type { ObjectRef } from "../types";
import type { DiscoveryContext } from "./relationshipDiscovery";
import { findDiscoveries } from "./discoveryEngine";
import type { Discovery } from "./discoveryEngine";

// The categories this first implementation looks for. Like DiscoveryType/
// RelationshipType before it, each value doubles as both "what was found"
// and "which rule found it." Only three of the mission's five example
// categories are implemented — "projects with significant knowledge but
// few assets" and "recently active projects lacking a release" are
// deliberately left for later, exactly as the mission asked: this is a
// reusable architecture for opportunity rules, not an exhaustive list of
// them. Adding one is a one-line addition to this union plus one more rule
// function below, not an architecture change.
export type OpportunityType = "unclassified-knowledge" | "release-missing-artwork" | "isolated-work";

// A short label + icon per type, purely presentational — mirrors
// DISCOVERY_TYPE_META/RELATIONSHIP_TYPE_LABELS' same role for their types.
export const OPPORTUNITY_TYPE_META: Record<OpportunityType, { label: string; icon: string }> = {
  "unclassified-knowledge": { label: "Unclassified Knowledge", icon: "🗂️" },
  "release-missing-artwork": { label: "Missing Artwork", icon: "🖼️" },
  "isolated-work": { label: "Isolated Work", icon: "🧩" },
};

// Every question the mission requires an Opportunity to answer, as its own
// field rather than one blended string: `observation` is the plain fact
// Forge noticed (never invented — always traceable to real data below),
// `rationale` is why that fact matters (always phrased against a Forge
// principle already stated elsewhere — Knowledge compounds, Automation
// removes friction — never a new piece of advice invented for this
// sprint), `objects` is what it's about, and `type` is which rule produced
// it. Deliberately not named "confidence" like Discovery/Relationship use:
// those numbers describe how *sure* Forge is a fact is true; every fact an
// Opportunity rule below notices is already 100% certain (a release either
// has an Artwork asset or it doesn't) — what varies is how *notable* the
// opportunity is, which is a different question with a different name.
export interface Opportunity {
  id: string;
  type: OpportunityType;
  significance: number;
  observation: string;
  rationale: string;
  objects: ObjectRef[];
}

const MAX_OPPORTUNITIES = 20;

// Fixed constants per rule, exactly like Discovery's confidence values —
// never learned, never probabilistic. Every Opportunity traces back to one
// deterministic rule, not to a model's opinion of how significant it is.
const UNCLASSIFIED_KNOWLEDGE_SIGNIFICANCE = 0.5;
const RELEASE_MISSING_ARTWORK_SIGNIFICANCE = 0.6;
const ISOLATED_WORK_SIGNIFICANCE = 0.5;

// A KnowledgeEntry with no project isn't necessarily "imported" — Forge
// deliberately never records where a KnowledgeEntry came from (see the
// Import Framework's own doc comment: "an imported KnowledgeEntry is
// indistinguishable from one a creator typed by hand"), so a rule claiming
// to detect "imported" knowledge would be inventing a fact Forge cannot
// truthfully know. This rule notices the one thing that actually is true —
// the entry isn't attached to a project — which is the honest version of
// the mission's own "unattached imported knowledge" example.
function findUnclassifiedKnowledgeOpportunities(context: DiscoveryContext): Opportunity[] {
  return context.knowledgeEntries
    .filter((entry) => entry.projectId === null)
    .map((entry) => ({
      id: `unclassified-knowledge:${entry.id}`,
      type: "unclassified-knowledge" as const,
      significance: UNCLASSIFIED_KNOWLEDGE_SIGNIFICANCE,
      observation: `"${entry.title}" isn't attached to any project.`,
      rationale: "Knowledge compounds fastest when it's connected to the work it came from.",
      objects: [{ type: "knowledge", id: entry.id }],
    }));
}

// A Release has no direct link to an Asset — both simply share a
// projectId, the same way every other project-scoped pair in Forge relates
// — so "this release has artwork" is read straight from that shared field,
// not from a new relationship or a guess. Reads Project only to name it in
// the observation and to give the creator somewhere to jump straight to
// (where a new Asset would actually be added).
function findReleaseMissingArtworkOpportunities(context: DiscoveryContext): Opportunity[] {
  const opportunities: Opportunity[] = [];

  for (const release of context.releases) {
    const hasArtwork = context.assets.some(
      (asset) => asset.projectId === release.projectId && asset.type === "Artwork",
    );
    if (hasArtwork) continue;

    const project = context.projects.find((candidate) => candidate.id === release.projectId);
    const objects: ObjectRef[] = [{ type: "release", id: release.id }];
    if (project) objects.push({ type: "project", id: project.id });

    opportunities.push({
      id: `release-missing-artwork:${release.id}`,
      type: "release-missing-artwork",
      significance: RELEASE_MISSING_ARTWORK_SIGNIFICANCE,
      observation: `"${release.title}" doesn't have an Artwork asset yet${project ? ` in "${project.name}"` : ""}.`,
      rationale: "A release without artwork is harder to finish and ship.",
      objects,
    });
  }

  return opportunities;
}

// The one rule this sprint reuses rather than reimplements: the mission's
// own "isolated work that could benefit from context" example is, in
// substance, the Discovery Engine's existing isolated-object rule, just
// asked from a different angle ("what could happen next" instead of "what
// exists"). Rather than re-deriving isolation from
// collectDiscoverableObjects/activeRelationshipCount a second time — which
// would be exactly the duplication the mission rules out — this takes
// findDiscoveries' own, already-computed output and reframes it. Discovery
// itself is never modified; this only reads what it already produced.
function findIsolatedWorkOpportunities(discoveries: Discovery[]): Opportunity[] {
  return discoveries
    .filter((discovery) => discovery.type === "isolated-object")
    .map((discovery) => ({
      id: `isolated-work:${discovery.id}`,
      type: "isolated-work" as const,
      significance: ISOLATED_WORK_SIGNIFICANCE,
      observation: discovery.reason,
      rationale: "Isolated work becomes easier to build on once it's connected to something else.",
      objects: discovery.objects,
    }));
}

// The one entry point everything else calls — mirrors findDiscoveries' own
// role for the Discovery Engine, and findCandidateRelationships' for the
// Relationship Engine. Pure and synchronous, safe to call on every render;
// results are capped and sorted so a creator sees the most notable
// openings first, never an unbounded list.
export function findOpportunities(context: DiscoveryContext): Opportunity[] {
  const discoveries = findDiscoveries(context);

  const opportunities = [
    ...findUnclassifiedKnowledgeOpportunities(context),
    ...findReleaseMissingArtworkOpportunities(context),
    ...findIsolatedWorkOpportunities(discoveries),
  ];

  return opportunities.sort((a, b) => b.significance - a.significance).slice(0, MAX_OPPORTUNITIES);
}
