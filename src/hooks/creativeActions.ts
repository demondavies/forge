// Creative Actions — the entry-point layer, not a reasoning layer. This
// file defines what a Creative Action *is* (a label, an icon, a short
// description) and how one becomes runnable (bindCreativeAction), and
// nothing else. It never calls a modal, never touches React state, and
// never decides on its own which callback an action should run — that
// decision belongs entirely to whichever workspace binds an action to one
// of its own already-existing callbacks (see Workspace.tsx's "music"
// section for the first example). If every future AI integration were
// removed, every action bound through this file would still open the
// exact same real modal or make the exact same real navigation it does
// today — nothing here is an AI feature, or a stand-in for one.
//
// Action Definition -> Action Execution -> Existing Forge Systems:
//   Action Definition   = CreativeActionDefinition (below) — pure data,
//                          no function, nothing runnable.
//   Action Execution    = bindCreativeAction — the one place a definition
//                          and a real callback ever meet.
//   Existing Forge Systems = whatever the caller passes as `run`
//                          (onCaptureKnowledge, onAddAsset, onImport,
//                          onCreateRelease, onBeginSession, ...) — this
//                          file never defines, wraps, or duplicates any of
//                          them.

// The categories this first implementation defines. Like RelationshipType/
// DiscoveryType/OpportunityType before it, adding a new one later is a
// one-line addition here plus one more entry in
// CREATIVE_ACTION_DEFINITIONS — never a change to CreativeAction's shape
// or to bindCreativeAction. "Generate Production Prompt" (the mission's
// own example) and "Import Audio" are deliberately not among these — see
// this sprint's own report for why neither has an honest, deterministic
// implementation to orchestrate yet.
export type CreativeActionId =
  | "capture-lyric"
  | "capture-production-note"
  | "import-notes"
  | "add-artwork"
  | "create-release"
  | "begin-creative-session";

// Purely descriptive — a label, an icon, and a short explanation of what
// the action is for. No existing type could honestly represent this:
// Companion also has {label-ish name, icon} but represents a *perspective*
// a creator can view something through, not an *intent* a creator carries
// out; RelationshipType/DiscoveryType/OpportunityType each classify a fact
// Forge already noticed, not something a creator initiates. A Creative
// Action is the first thing in Forge that is a creator's own intent to
// act, which is why it needed this small, new, purely-descriptive shape.
export interface CreativeActionDefinition {
  label: string;
  icon: string;
  description: string;
}

// The single source of truth for what each Creative Action means —
// mirrors DISCOVERY_TYPE_META/OPPORTUNITY_TYPE_META/RELATIONSHIP_TYPE_LABELS'
// same role. Whoever renders an action reads its label/icon/description
// from here; nothing is ever hard-coded a second time at a call site.
export const CREATIVE_ACTION_DEFINITIONS: Record<CreativeActionId, CreativeActionDefinition> = {
  "capture-lyric": {
    label: "Capture Lyric",
    icon: "🎤",
    description: "Write down a lyric idea before it's lost.",
  },
  "capture-production-note": {
    label: "Capture Production Note",
    icon: "📝",
    description: "Record a production decision or idea as it happens.",
  },
  "import-notes": {
    label: "Import Notes",
    icon: "📥",
    description: "Bring in notes written somewhere else.",
  },
  "add-artwork": {
    label: "Add Artwork",
    icon: "🖼️",
    description: "Attach cover art or visual identity.",
  },
  "create-release": {
    label: "Create Release",
    icon: "🚀",
    description: "Plan where and when this ships.",
  },
  "begin-creative-session": {
    label: "Begin Creative Session",
    icon: "🎨",
    description: "Step into this project's current context.",
  },
};

// One Creative Action, ready to be shown and clicked. `run` is the only
// field bindCreativeAction ever adds on top of the action's own
// definition — a Creative Action is never constructed by hand from a
// literal object, so a definition and an executable callback can never
// silently drift apart.
export interface CreativeAction extends CreativeActionDefinition {
  id: CreativeActionId;
  run: () => void;
}

// Action Execution: the one place a pure Action Definition is connected to
// a real, already-existing Forge capability. `run` is always a callback
// that already exists elsewhere in the app (opening a modal App.tsx
// already owns, or a navigation helper App.tsx already exposes) — this
// function never creates new behaviour, it only labels behaviour that's
// already there. A future workspace contributes its own contextual actions
// simply by calling this with its own id + its own existing callback;
// nothing here needs to change for that to work.
export function bindCreativeAction(id: CreativeActionId, run: () => void): CreativeAction {
  return { id, run, ...CREATIVE_ACTION_DEFINITIONS[id] };
}
