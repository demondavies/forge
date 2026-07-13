// Chief — Forge's first Companion, and the first user-facing expression of
// everything the Creative Knowledge Engine already understands. Chief
// consumes Discoveries and (as of Chief Coaching) Opportunities; it
// generates neither. Chief never bypasses the chains beneath it:
// Chief → Perspective (perspectiveLayer.ts) → Discovery (discoveryEngine.ts)
// for one axis, and Chief → Opportunity (opportunityEngine.ts) for the
// other — both of which still trace all the way back to the Creative
// Knowledge Engine itself.
//
// Chief's First Law: never say anything Forge cannot explain. Everything
// in this file selects and labels — it composes nothing that
// buildPerspective/findDiscoveries/findOpportunities didn't already
// produce, and invents no score, ranking, or fact of its own.
import { COMPANION_ROLES } from "../types";
import type { Companion } from "../types";
import type { Discovery } from "./discoveryEngine";
import type { Opportunity } from "./opportunityEngine";
import { buildPerspective } from "./perspectiveLayer";
import type { Perspective } from "./perspectiveLayer";

// "A small number of meaningful observations" — kept deliberately low,
// split across both sources so neither crowds out the other, and so Chief
// stays calm and focused rather than becoming another feed to scan.
const MAX_DISCOVERY_OBSERVATIONS = 3;
const MAX_OPPORTUNITY_OBSERVATIONS = 2;

// Chief is simply one more entry in COMPANION_ROLES — nothing here treats
// it as a special kind of Companion, only as a specific one, the same way
// any other Companion could be given its own dedicated view later.
const CHIEF = COMPANION_ROLES.find((companion) => companion.id === "chief");

// One Discovery, communicated — reuses Perspective exactly as it already
// existed before this sprint. `perspective.text` is buildPerspective's own,
// completely unmodified composition ("focus → reason").
export interface ChiefDiscoveryObservation {
  kind: "discovery";
  discovery: Discovery;
  perspective: Perspective;
}

// One Opportunity, communicated. There is no Opportunity-shaped
// equivalent of Perspective to reuse: Perspective's own `discoveryId`
// field is honestly named for a Discovery specifically, and the Perspective
// Layer is off-limits to modify this sprint (Non-Negotiable) — inventing a
// `discoveryId` that actually holds an Opportunity's id would violate the
// Honest Vocabulary Principle outright. So Chief composes this one small
// piece of text itself (see composeOpportunityText below), in the same
// "focus → ..." voice buildPerspective already established, so Chief reads
// consistently regardless of which source an observation came from.
export interface ChiefOpportunityObservation {
  kind: "opportunity";
  opportunity: Opportunity;
  text: string;
}

// A discriminated union, not a merged shape — Non-Negotiable: "Chief must
// never merge Discovery and Opportunity into a single concept." Each
// variant keeps its real Discovery/Opportunity object fully intact, with
// every field (confidence vs significance, reason vs observation/rationale,
// its own type) exactly as that engine produced it. `kind` is the one new,
// honestly-named field that lets one list hold both without hiding which
// is which — an existing type (Discovery or Opportunity alone) could not
// truthfully express "this is either one or the other, and you can always
// tell which."
export type ChiefObservation = ChiefDiscoveryObservation | ChiefOpportunityObservation;

// The one composition Chief owns directly, because nowhere else in the
// architecture is allowed to own it: not the Opportunity Engine (a rule
// engine has no business phrasing anything for a specific Companion), and
// not the Perspective Layer (off-limits to modify this sprint, and its own
// Perspective shape is Discovery-specific). Mirrors buildPerspective's
// exact "focus → ..." framing so Chief's voice is consistent either way —
// nothing here is invented; `companion.focus` and
// `opportunity.observation`/`rationale` all already existed before this
// function ever ran.
function composeOpportunityText(companion: Companion, opportunity: Opportunity): string {
  return `${companion.focus} → ${opportunity.observation} ${opportunity.rationale}`;
}

// findDiscoveries()/findOpportunities() already sort by confidence/
// significance, highest first (see each engine's own doc comment) — Chief
// trusts both orderings completely rather than re-ranking with a second,
// competing notion of "importance." Discoveries ("what Forge understands")
// are presented before Opportunities ("what Forge suggests is possible"),
// matching the reasoning stack's own order and the natural shape of a
// coaching conversation — here's what I've noticed, and here's what might
// be worth doing about it. Taking each source's own top slice is the only
// selection happening here; nothing is merge-sorted across the two,
// because confidence and significance are answers to different questions
// and were never meant to be compared on one shared scale.
export function buildChiefObservations(
  discoveries: Discovery[],
  opportunities: Opportunity[],
): ChiefObservation[] {
  if (!CHIEF) return [];

  const discoveryObservations: ChiefObservation[] = discoveries
    .slice(0, MAX_DISCOVERY_OBSERVATIONS)
    .map((discovery) => ({
      kind: "discovery",
      discovery,
      perspective: buildPerspective(CHIEF, discovery),
    }));

  const opportunityObservations: ChiefObservation[] = opportunities
    .slice(0, MAX_OPPORTUNITY_OBSERVATIONS)
    .map((opportunity) => ({
      kind: "opportunity",
      opportunity,
      text: composeOpportunityText(CHIEF, opportunity),
    }));

  return [...discoveryObservations, ...opportunityObservations];
}
