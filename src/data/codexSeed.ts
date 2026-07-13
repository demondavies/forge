// The Living Codex — Forge's own understanding of itself, represented using
// exactly the Identity / Knowledge / Relationship model every creator's own
// work already uses. Nothing here is a parallel system: this file is pure
// seed data. Remove it (and the three one-line imports that reference it in
// useIdentities.ts/useKnowledge.ts/useRelationships.ts) and Forge returns to
// exactly its current behavior — an empty Knowledge/Relationship array and
// a randomly-id'd "Forge" identity, same as before this sprint.
//
// The "Forge" identity already existed before this sprint (see
// useIdentities.ts's original seed list) and was already described as "The
// home of Forge itself" — the Codex simply populates it, rather than
// introducing a second, Codex-specific identity.
import type { Identity, KnowledgeEntry, Relationship } from "../types";

export const CODEX_IDENTITY: Identity = {
  id: crypto.randomUUID(),
  name: "Forge",
  description: "The home of Forge itself — the Living Codex lives here.",
  accentColor: "yellow",
  createdAt: new Date(),
};

function entry(
  title: string,
  insight: string,
  source: KnowledgeEntry["source"],
): KnowledgeEntry {
  return {
    id: crypto.randomUUID(),
    identityId: CODEX_IDENTITY.id,
    projectId: null, // Codex knowledge isn't part of a music project — it's
    // identity-level, exactly like any creator's own unclassified insight.
    title,
    insight,
    source,
    createdAt: new Date(), // placeholder — staggered below once the full
    // ordered list exists, so the Codex's own Creative History reads as a
    // real arc instead of everything appearing in the same instant.
  };
}

// ---- Philosophy ----
const philosophyLocalFirst = entry(
  "Forge is a local-first Creative Knowledge Engine",
  "Forge is not a project manager and not an AI application — it orchestrates creative workflows and preserves understanding, running entirely on the creator's own machine.",
  "Decision",
);
const philosophyCompounds = entry(
  "Knowledge compounds",
  "Relationships matter. Context reduces cognitive load. History creates understanding. Each of these is a direct consequence of treating knowledge as something that connects and accumulates, rather than something captured once and forgotten.",
  "Observation",
);
const philosophyCreatorDecides = entry(
  "Forge remembers, connects, and suggests — the creator decides",
  "Automation removes friction, but never removes the creator's authority. Every automated behavior in Forge — deterministic discovery, Quick Capture, and any future Companion reasoning — stops at a suggestion; nothing acts without confirmation.",
  "Decision",
);

// ---- Principles ----
const principleRelationshipsOverHierarchy = entry(
  "Prefer relationships over hierarchy",
  "A rigid parent-child tree fossilizes understanding at the moment it's built. Forge favors a flexible web of typed relationships that can grow and be reinterpreted as understanding evolves — hierarchy is used only where a true ownership relationship exists, like a Project's own Assets.",
  "Decision",
);
const principleReuseBeforeNew = entry(
  "Reuse existing architecture before introducing something new",
  "Before writing a new hook, component, or field, check whether an existing one can be extended or mirrored instead. Every sprint since Manual Connect has started by asking this question first.",
  "Review",
);
const principleAdditive = entry(
  "Remain additive — avoid breaking changes",
  "New capability should extend what already works rather than modifying it out from under existing callers. When a shared piece of UI needs to grow, it should still serve every caller it already had.",
  "Review",
);

// ---- Architecture ----
const architectureIdentityScoping = entry(
  "Every entity is scoped to exactly one Identity",
  "Project, KnowledgeEntry, Asset, Release, Capture, Relationship, and Activity all carry an identityId and live in one flat array per hook, filtered down to whichever identity is active. Switching identity just works, with no extra bookkeeping — including for the Codex itself, which is simply the Forge identity's own Knowledge.",
  "Observation",
);
const architectureRelationshipEngine = entry(
  "The Relationship Engine connects any first-class object to any other",
  "ObjectRef — a type + id pair — is reused across Activity and Relationship, so one model expresses every kind of connection between any pair of objects, with no dedicated join table per pair of types. Deterministic discovery finds relationships automatically; Manual Connect lets a creator form them directly; both write to the exact same array.",
  "Decision",
);
const architectureHistoryComputed = entry(
  "Creative History is computed, not persisted",
  "hooks/creativeHistory.ts derives a chronological timeline purely from existing Activity and confirmed Relationship records at read time. There is no separate history log, so History can never drift out of sync with what actually happened.",
  "Decision",
);

// ---- Engineering ----
const engineeringExtractOnRepeat = entry(
  "Extract a shared component the moment a pattern is about to repeat",
  "RelatedSection was pulled out of ProjectWorkspace specifically because Context Everywhere was about to need the same toolbar and list in four more places. Extracting at that moment keeps every detail view in sync through one file instead of several slowly drifting apart.",
  "Experiment",
);
const engineeringLogicVsPresentation = entry(
  "Business logic lives in hooks, presentation lives in components",
  "Every hook (useProjects, useKnowledge, useRelationships, ...) owns its own state and mutation logic; components only render props and call callbacks. This separation is what makes swapping in-memory state for a real database later a realistic, contained change.",
  "Observation",
);

// ---- Product ----
const productNotProjectManager = entry(
  "Forge is not a project manager",
  "Forge orchestrates creative workflows and preserves understanding. It deliberately has no task assignment, no deadlines, no team coordination — those are project-management concerns outside what Forge is trying to be.",
  "Decision",
);
const productAutomationBounded = entry(
  "Automation removes friction, never the creator's decision",
  "Quick Capture, deterministic discovery, and any future Companion reasoning all exist to shorten the distance between a thought and a captured, connected piece of knowledge — never to act on the creator's behalf without confirmation.",
  "Decision",
);

// ---- UX ----
const uxContextReducesLoad = entry(
  "Context reduces cognitive load",
  "Every first-class object exposes its own surrounding context — what it's related to, its own history, and (where relevant) which project it belongs to — directly on its own page, so understanding where something belongs never takes more than one navigation step.",
  "Observation",
);
const uxHistoryAsNarrative = entry(
  "History should read as narrative, not an audit log",
  "Creative History orders events oldest-first and distinguishes milestones from ordinary entries, because the goal is understanding how something evolved — not producing a timestamped list of database writes.",
  "Review",
);

// ---- Companion Design (forward-looking — Chief Companion doesn't exist yet) ----
const companionSuggestsDecides = entry(
  "Forge suggests. The creator decides.",
  "The one rule every future Companion feature must inherit without exception. Deterministic discovery already behaves this way — a suggested relationship changes nothing until confirmed — and any AI-assisted reasoning added later must sit behind that exact same confirm/dismiss boundary, never write directly.",
  "Decision",
);

// ---- Decision Records ----
const decisionManualReusesModel = entry(
  "Manual relationships reuse the exact same Relationship model as discovery",
  "origin: \"user\" and status: \"confirmed\" were added to the existing Relationship shape instead of building a second, parallel connection system, so Related, History, and discovery all keep working on every relationship regardless of how it was formed. Decided during the Manual Connect sprint.",
  "Decision",
);
const decisionConfirmedOnlyHistory = entry(
  "A still-suggested relationship does not belong in Creative History",
  "Creative History originally treated any non-dismissed relationship as a potential milestone. This was corrected during the Creative History sprint's own verification, once it became clear that a pending suggestion is a possibility Forge is offering, not something that has actually happened yet.",
  "Review",
);

// ---- Forge is built inside Forge ----
// Placed last deliberately — this sprint's own thesis, and so the newest
// entry once dates are staggered below.
const philosophyBuiltInside = entry(
  "Forge is built inside Forge",
  "The Living Codex is the proof: the same Creative Knowledge Engine that captures a musician's projects, knowledge, and relationships is capable of capturing Forge's own philosophy, architecture, and decisions — with no parallel system.",
  "Observation",
);

export const CODEX_KNOWLEDGE_ENTRIES: KnowledgeEntry[] = [
  philosophyLocalFirst,
  philosophyCompounds,
  philosophyCreatorDecides,
  principleRelationshipsOverHierarchy,
  principleReuseBeforeNew,
  principleAdditive,
  architectureIdentityScoping,
  architectureRelationshipEngine,
  architectureHistoryComputed,
  engineeringExtractOnRepeat,
  engineeringLogicVsPresentation,
  productNotProjectManager,
  productAutomationBounded,
  uxContextReducesLoad,
  uxHistoryAsNarrative,
  companionSuggestsDecides,
  decisionManualReusesModel,
  decisionConfirmedOnlyHistory,
  philosophyBuiltInside,
];

// Stagger createdAt across a realistic span (oldest first, matching the
// order above) so the Codex's own Creative History reads as a real arc
// rather than everything appearing in the same instant — which would also
// make deterministic discovery flag every single pair as a spurious
// "recent-activity" match the moment any entry's page is opened.
const ONE_DAY_MS = 24 * 60 * 60 * 1000;
CODEX_KNOWLEDGE_ENTRIES.forEach((codexEntry, index) => {
  const daysAgo = CODEX_KNOWLEDGE_ENTRIES.length - index;
  codexEntry.createdAt = new Date(Date.now() - daysAgo * ONE_DAY_MS);
});

// A hand-authored connection between two Codex entries — the Codex's own
// use of "+ Connect To…" (see ConnectToModal.tsx), just expressed as data
// instead of a click, exactly like createManualRelationship would produce:
// already confirmed, full confidence, origin "user". Called only after the
// forEach above has staggered real createdAt values, so the connection is
// timestamped just after the later of the two entries it joins — a
// relationship can't form before both things it connects exist.
function connection(a: KnowledgeEntry, b: KnowledgeEntry, reason: string): Relationship {
  const ONE_HOUR_MS = 60 * 60 * 1000;
  const formedAt = new Date(Math.max(a.createdAt.getTime(), b.createdAt.getTime()) + ONE_HOUR_MS);

  return {
    id: crypto.randomUUID(),
    identityId: CODEX_IDENTITY.id,
    source: { type: "knowledge", id: a.id },
    target: { type: "knowledge", id: b.id },
    relationshipType: "manual",
    confidence: 1,
    origin: "user",
    reason,
    status: "confirmed",
    createdAt: formedAt,
  };
}

export const CODEX_RELATIONSHIPS: Relationship[] = [
  connection(
    philosophyCompounds,
    architectureRelationshipEngine,
    '"Relationships matter" is directly implemented by the Relationship Engine.',
  ),
  connection(
    philosophyCompounds,
    uxContextReducesLoad,
    '"Context reduces cognitive load" motivated Context Everywhere\'s per-object Related/History sections.',
  ),
  connection(
    philosophyCompounds,
    architectureHistoryComputed,
    '"History creates understanding" is the philosophy this architecture decision implements.',
  ),
  connection(
    philosophyCreatorDecides,
    companionSuggestsDecides,
    "The same principle, extended to any future Companion reasoning.",
  ),
  connection(
    philosophyCreatorDecides,
    decisionConfirmedOnlyHistory,
    'This decision exists specifically to enforce "the creator decides" inside Creative History.',
  ),
  connection(
    principleRelationshipsOverHierarchy,
    architectureRelationshipEngine,
    "The Relationship Engine is this principle's concrete implementation.",
  ),
  connection(
    principleReuseBeforeNew,
    engineeringExtractOnRepeat,
    "Extracting RelatedSection is this principle applied in practice.",
  ),
  connection(
    principleReuseBeforeNew,
    decisionManualReusesModel,
    "This decision is a direct application of reusing before building new.",
  ),
  connection(
    productNotProjectManager,
    philosophyLocalFirst,
    "Clarifies what Forge deliberately does not do.",
  ),
  connection(
    productAutomationBounded,
    philosophyCreatorDecides,
    "Automation is bounded by the same creator-decides principle.",
  ),
  connection(
    architectureIdentityScoping,
    philosophyBuiltInside,
    "The Codex is simply another Identity's Knowledge, scoped and filtered exactly like every creator's own work.",
  ),
  connection(
    decisionConfirmedOnlyHistory,
    architectureHistoryComputed,
    "Refines exactly which data this computation is allowed to read.",
  ),
  connection(
    uxHistoryAsNarrative,
    architectureHistoryComputed,
    "The narrative framing is what this architecture makes possible.",
  ),
  connection(
    principleAdditive,
    engineeringLogicVsPresentation,
    "Keeping logic in hooks and presentation in components is what makes additive change safe.",
  ),
];
