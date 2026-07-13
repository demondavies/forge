import type { RelatedObjectType } from "../types";

// One icon per kind of first-class object Forge tracks. Shared by anything
// that needs to show "what kind of thing is this" at a glance — the
// Command Palette's search results and the Relationship Engine's "Related"
// list both reuse this single map instead of keeping their own copies.
export const OBJECT_TYPE_ICONS: Record<RelatedObjectType, string> = {
  identity: "👤",
  project: "📁",
  knowledge: "🧠",
  asset: "🎨",
  release: "🎵",
  capture: "📥",
};
