// The Perspective Layer — a deterministic interpretation of a Discovery
// through a Companion's own stated focus. Discovery and perspective are
// separate concerns, kept in separate files on purpose: discoveryEngine.ts
// only knows how to notice patterns; this file only knows how to phrase
// one, per Companion, and never calls findDiscoveries or produces a new
// Discovery itself. Companions do not create facts — every Perspective
// traces back to a real Discovery (discoveryId) and a real Companion
// (companionId), and its text is composed entirely from fields that
// already exist on both, not synthesized from anything new.
//
// Honest Abstraction Principle: this composition is not meant to read like
// fluent, AI-authored advice — it's meant to visibly be what it is, a
// Companion's own focus set directly against a Discovery's own reason.
// Removing every future AI model should leave this exact, unchanged,
// still-explainable text behind.
import { COMPANION_ROLES } from "../types";
import type { Companion } from "../types";
import type { Discovery } from "./discoveryEngine";

export interface Perspective {
  id: string;
  companionId: string;
  discoveryId: string;
  text: string;
}

// The one place this composition happens — reused by buildPerspectivesFor
// below, and available on its own for anywhere that only needs one
// Companion's take on one Discovery (e.g. DiscoveryCard's per-companion
// toggle, which composes on demand rather than eagerly building all of
// them for a discovery no one has asked about yet).
export function buildPerspective(companion: Companion, discovery: Discovery): Perspective {
  return {
    id: `${companion.id}:${discovery.id}`,
    companionId: companion.id,
    discoveryId: discovery.id,
    text: `${companion.focus} → ${discovery.reason}`,
  };
}

// Every Companion's perspective on one Discovery — the full "how do
// different Companions interpret the same discovery" comparison, generated
// straight from COMPANION_ROLES (reusing the exact same fixed roster the
// Companion Framework already defined) rather than requiring a caller to
// pass every Companion in one at a time. Not called by anything yet — kept
// ready for a future bulk view (e.g. Morning Briefings) without that
// feature needing any change here.
export function buildPerspectivesFor(discovery: Discovery): Perspective[] {
  return COMPANION_ROLES.map((companion) => buildPerspective(companion, discovery));
}
