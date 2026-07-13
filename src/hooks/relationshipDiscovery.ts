// Deterministic relationship discovery — the "how" behind the Relationship
// Engine. Nothing in this file touches React state; it only reads plain
// data and returns plain data, so it's trivial to reason about, test, and
// eventually swap or extend (e.g. with an AI-assisted rule) without
// touching useRelationships.ts or any component.
import type {
  Asset,
  Capture,
  Identity,
  KnowledgeEntry,
  ObjectRef,
  Project,
  Relationship,
  Release,
  RelationshipType,
} from "../types";
import { truncateText } from "../utils/truncateText";
import { OBJECT_TYPE_ICONS } from "../utils/objectTypeIcons";

// Everything discovery (and resolving a Relationship back into something
// displayable) needs to see. Always the *active identity's own* data —
// relationships never span identities, the same way every other entity
// here is scoped to one. Shared by both discovery mechanisms Forge has —
// relationship matching (this file) and the Discovery Engine
// (discoveryEngine.ts), which is why `relationships` below is optional:
// relationship matching never reads it, only the Discovery Engine does.
export interface DiscoveryContext {
  identities: Identity[];
  projects: Project[];
  knowledgeEntries: KnowledgeEntry[];
  assets: Asset[];
  releases: Release[];
  captures: Capture[];
  relationships?: Relationship[];
}

// A normalized view of "any first-class object" that the matching rules
// below (and the Discovery Engine's own rules) can compare without caring
// which concrete entity it came from. Exported so discoveryEngine.ts can
// reuse this exact enumeration instead of re-deriving it.
export interface DiscoverableObject {
  ref: ObjectRef;
  label: string;
  textContent: string;
  projectId: string | null;
  createdAt: Date;
}

interface RuleMatch {
  relationshipType: RelationshipType;
  confidence: number;
  reason: string;
}

export interface CandidateRelationship {
  target: ObjectRef;
  relationshipType: RelationshipType;
  confidence: number;
  reason: string;
}

const MIN_MATCH_LENGTH = 4;
const RECENT_ACTIVITY_WINDOW_MS = 30 * 60 * 1000; // 30 minutes
const MAX_SUGGESTIONS_PER_OBJECT = 5;

export function collectDiscoverableObjects(context: DiscoveryContext): DiscoverableObject[] {
  const objects: DiscoverableObject[] = [];

  for (const project of context.projects) {
    objects.push({
      ref: { type: "project", id: project.id },
      label: project.name,
      textContent: `${project.name} ${project.description}`,
      projectId: null,
      createdAt: project.createdAt,
    });
  }

  for (const entry of context.knowledgeEntries) {
    objects.push({
      ref: { type: "knowledge", id: entry.id },
      label: entry.title,
      textContent: `${entry.title} ${entry.insight}`,
      projectId: entry.projectId,
      createdAt: entry.createdAt,
    });
  }

  for (const asset of context.assets) {
    objects.push({
      ref: { type: "asset", id: asset.id },
      label: asset.name,
      textContent: `${asset.name} ${asset.description}`,
      projectId: asset.projectId,
      createdAt: asset.createdAt,
    });
  }

  for (const release of context.releases) {
    objects.push({
      ref: { type: "release", id: release.id },
      label: release.title,
      textContent: `${release.title} ${release.description}`,
      projectId: release.projectId,
      createdAt: release.createdAt,
    });
  }

  for (const capture of context.captures) {
    objects.push({
      ref: { type: "capture", id: capture.id },
      label: truncateText(capture.content, 60),
      textContent: capture.content,
      projectId: null,
      createdAt: capture.createdAt,
    });
  }

  return objects;
}

// ---- Deterministic matching rules ----
// Each rule answers one narrow question about a pair of objects and, if it
// applies, returns exactly why. Every suggestion Forge ever makes traces
// back to one of these — there is no learned weight or probabilistic score
// anywhere in this file, only fixed constants describing how strong each
// *kind* of signal is.

// Direction matters here in a way it doesn't for the other rules below: "A
// mentions B" is a different fact from "B mentions A". Discovery is always
// run *from* one specific object's point of view (see
// findCandidateRelationships), so both directions must be checked here —
// otherwise the very same pair produces a "reference" relationship when
// discovered from A's workspace but a different relationship type when
// later discovered from B's, instead of one consistent answer either way.
function matchReference(subject: DiscoverableObject, candidate: DiscoverableObject): RuleMatch | null {
  const subjectLabel = subject.label.trim();
  const candidateLabel = candidate.label.trim();

  if (
    candidateLabel.length >= MIN_MATCH_LENGTH &&
    subject.textContent.toLowerCase().includes(candidateLabel.toLowerCase())
  ) {
    return {
      relationshipType: "reference",
      confidence: 0.8,
      reason: `Mentions "${candidateLabel}" directly.`,
    };
  }

  if (
    subjectLabel.length >= MIN_MATCH_LENGTH &&
    candidate.textContent.toLowerCase().includes(subjectLabel.toLowerCase())
  ) {
    return {
      relationshipType: "reference",
      confidence: 0.8,
      reason: `Is mentioned directly in "${candidate.label}".`,
    };
  }

  return null;
}

function matchSharedFilename(subject: DiscoverableObject, candidate: DiscoverableObject): RuleMatch | null {
  // Only meaningful between two Assets — that's the one type whose "name"
  // is filename-like today (there's no real filesystem integration yet).
  if (subject.ref.type !== "asset" || candidate.ref.type !== "asset") return null;

  const a = subject.label.trim().toLowerCase();
  const b = candidate.label.trim().toLowerCase();
  if (a && a === b) {
    return {
      relationshipType: "shared-filename",
      confidence: 0.7,
      reason: `Both assets are named "${subject.label}".`,
    };
  }
  return null;
}

function matchSimilarTitle(subject: DiscoverableObject, candidate: DiscoverableObject): RuleMatch | null {
  const a = subject.label.trim().toLowerCase();
  const b = candidate.label.trim().toLowerCase();
  if (!a || !b) return null;

  if (a === b) {
    return {
      relationshipType: "similar-title",
      confidence: 0.9,
      reason: `Both are named "${subject.label}".`,
    };
  }

  if (a.length >= MIN_MATCH_LENGTH && b.length >= MIN_MATCH_LENGTH && (a.includes(b) || b.includes(a))) {
    return {
      relationshipType: "similar-title",
      confidence: 0.6,
      reason: `Titles overlap closely ("${subject.label}" / "${candidate.label}").`,
    };
  }

  return null;
}

function matchSharedProject(
  subject: DiscoverableObject,
  candidate: DiscoverableObject,
  context: DiscoveryContext,
): RuleMatch | null {
  if (!subject.projectId || subject.projectId !== candidate.projectId) return null;

  const projectName = context.projects.find((project) => project.id === subject.projectId)?.name ?? "the same project";
  return {
    relationshipType: "shared-project",
    confidence: 0.5,
    reason: `Both are part of project "${projectName}".`,
  };
}

function matchRecentActivity(subject: DiscoverableObject, candidate: DiscoverableObject): RuleMatch | null {
  const diffMs = Math.abs(subject.createdAt.getTime() - candidate.createdAt.getTime());
  if (diffMs > RECENT_ACTIVITY_WINDOW_MS) return null;

  return {
    relationshipType: "recent-activity",
    confidence: 0.3,
    reason: "Created within the same half hour.",
  };
}

function matchSharedIdentity(subject: DiscoverableObject, candidate: DiscoverableObject): RuleMatch | null {
  // Only meaningful for otherwise-unclassified content (no project of its
  // own) — everything in scope already shares an identity by construction,
  // so this rule would be pure noise for anything with a stronger
  // (shared-project) signal available.
  if (subject.projectId || candidate.projectId) return null;

  return {
    relationshipType: "shared-identity",
    confidence: 0.3,
    reason: "Both are unclassified items in this identity.",
  };
}

// Checked in priority order — the first rule to match a given pair wins, so
// each pair gets exactly one, clearest explanation instead of several
// overlapping ones.
const RULES: Array<
  (subject: DiscoverableObject, candidate: DiscoverableObject, context: DiscoveryContext) => RuleMatch | null
> = [
  matchReference,
  matchSharedFilename,
  matchSimilarTitle,
  matchSharedProject,
  matchRecentActivity,
  matchSharedIdentity,
];

// The one entry point useRelationships calls. Pure and synchronous — no
// I/O, no randomness — so it's safe to call as often as needed; the
// results are capped and sorted so a single object's suggestions stay
// skimmable rather than overwhelming.
export function findCandidateRelationships(
  subjectRef: ObjectRef,
  context: DiscoveryContext,
): CandidateRelationship[] {
  const allObjects = collectDiscoverableObjects(context);
  const subject = allObjects.find(
    (candidate) => candidate.ref.type === subjectRef.type && candidate.ref.id === subjectRef.id,
  );
  if (!subject) return [];

  const matches: CandidateRelationship[] = [];

  for (const candidate of allObjects) {
    if (candidate.ref.type === subject.ref.type && candidate.ref.id === subject.ref.id) continue;

    for (const rule of RULES) {
      const match = rule(subject, candidate, context);
      if (match) {
        matches.push({ target: candidate.ref, ...match });
        break;
      }
    }
  }

  return matches.sort((a, b) => b.confidence - a.confidence).slice(0, MAX_SUGGESTIONS_PER_OBJECT);
}

// Turns either side of a Relationship back into something displayable.
// Returns null if the referenced object can't be found, so a stale
// relationship just quietly drops out of a list instead of crashing the page.
export function resolveObjectRef(
  ref: ObjectRef,
  context: DiscoveryContext,
): { label: string; icon: string } | null {
  switch (ref.type) {
    case "project": {
      const project = context.projects.find((candidate) => candidate.id === ref.id);
      return project ? { label: project.name, icon: OBJECT_TYPE_ICONS.project } : null;
    }
    case "knowledge": {
      const entry = context.knowledgeEntries.find((candidate) => candidate.id === ref.id);
      return entry ? { label: entry.title, icon: OBJECT_TYPE_ICONS.knowledge } : null;
    }
    case "asset": {
      const asset = context.assets.find((candidate) => candidate.id === ref.id);
      return asset ? { label: asset.name, icon: OBJECT_TYPE_ICONS.asset } : null;
    }
    case "release": {
      const release = context.releases.find((candidate) => candidate.id === ref.id);
      return release ? { label: release.title, icon: OBJECT_TYPE_ICONS.release } : null;
    }
    case "capture": {
      const capture = context.captures.find((candidate) => candidate.id === ref.id);
      return capture ? { label: truncateText(capture.content, 60), icon: OBJECT_TYPE_ICONS.capture } : null;
    }
    case "identity": {
      const identity = context.identities.find((candidate) => candidate.id === ref.id);
      return identity ? { label: identity.name, icon: OBJECT_TYPE_ICONS.identity } : null;
    }
    default:
      return null;
  }
}

// Exported so discoveryEngine.ts can build the same kind of stable,
// deterministic id for a Discovery (derived from the objects it's about)
// instead of a fresh random one every time it's recomputed.
export function refKey(ref: ObjectRef): string {
  return `${ref.type}:${ref.id}`;
}

// Order-independent identity for a (source, target, type) triple, so
// re-running discovery never creates a duplicate of a relationship that
// already exists in either direction.
export function relationshipKey(a: ObjectRef, b: ObjectRef, relationshipType: RelationshipType): string {
  const [first, second] = [refKey(a), refKey(b)].sort();
  return `${first}|${second}|${relationshipType}`;
}

export function isSameRef(a: ObjectRef, b: ObjectRef): boolean {
  return a.type === b.type && a.id === b.id;
}
