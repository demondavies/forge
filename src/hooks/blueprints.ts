// Project Blueprints — the topmost layer of the reasoning stack, and the
// first thing a creator ever touches. A Blueprint owns nothing: it is a
// plain description of how the *existing* project-creation flow should be
// pre-filled, and where a creator naturally lands afterward. It never
// writes anything a plain "Blank Project" wouldn't also write — the
// Project a Blueprint produces is, underneath, indistinguishable from one
// created without ever seeing this file.
//
// Blueprint -> Workspace Composition -> Creative Actions -> Creative
// Session -> Creative Knowledge Engine: this file is only the first arrow.
// It doesn't compose a workspace, bind a Creative Action, or build a
// Creative Session itself — it only names *which* preferred workspace a
// Blueprint suggests (Workspace.tsx already knows how to land there and
// which Creative Actions to bind, unchanged since last sprint) and *which*
// ProjectType value (already real, already meaningful) that workspace
// implies.
import type { ProjectType, WorkspaceSection } from "../types";
import type { CreativeAction, CreativeActionId } from "./creativeActions";

// The categories this first implementation defines. Only the music
// blueprints (Single/EP/Album) and one deliberately unspecialised
// "blank-project" are implemented — see BLUEPRINT_DEFINITIONS' own comment
// for exactly why the mission's non-music examples (Leather Wallet,
// Business, YouTube Video, Podcast Episode) aren't among these yet. Adding
// a future Blueprint that fits ProjectType's existing values is a one-line
// addition here; nothing about CreateProjectModal's own step logic needs
// to change for it.
export type BlueprintId = "music-single" | "music-ep" | "music-album" | "blank-project";

// Purely descriptive, like RELATIONSHIP_TYPE_LABELS/DISCOVERY_TYPE_META/
// OPPORTUNITY_TYPE_META/CREATIVE_ACTION_DEFINITIONS before it. No existing
// type could honestly represent this: Project describes the *created
// thing*, not the *upfront choice* that preceded it, and nothing else in
// Forge represents "a starting intent that pre-fills an ordinary form and
// suggests a first destination." That's the smallest new shape a
// Blueprint could be — a description, never a container.
export interface BlueprintDefinition {
  label: string;
  icon: string;
  description: string;
  // Pre-fills CreateProjectModal's own, already-existing Project Type
  // field — never a new field on Project, and never locked: a creator can
  // still change it in the same form a Blueprint would have left alone.
  // Null for "blank-project", which suggests nothing and leaves the
  // form's own existing default exactly as it was before this sprint.
  suggestedProjectType: ProjectType | null;
  // Which WorkspaceSection a creator lands in immediately after creating a
  // project from this Blueprint — reuses the exact same section value
  // Workspace.tsx's "music" branch (and its Creative Actions binding,
  // unchanged since last sprint) already responds to. Null means "the
  // ordinary ProjectWorkspace," i.e. exactly what creating a project
  // already does today.
  preferredWorkspace: WorkspaceSection | null;
  // Which of Creative Actions' own, already-existing ids this Blueprint
  // considers most relevant first — a plain re-ordering preference, never
  // a new action, never a new field on CreativeAction itself. Reuses
  // CreativeActionId exactly as creativeActions.ts already defines it, so
  // this file has no vocabulary of its own for "what an action is," only
  // an opinion about which existing ones matter most right away.
  emphasizedActionIds: CreativeActionId[];
  // A Companion's own `id` (see COMPANION_ROLES, types.ts) this Blueprint
  // considers the natural first perspective for this kind of work — never
  // a new Companion, never new coaching logic. Typed as plain `string`
  // because Companion.id itself already is (no CompanionId union exists to
  // reuse); null for Blueprints with no workspace preference, since
  // there's nowhere for an emphasis to appear yet.
  emphasizedCompanionId: string | null;
}

// Why only these four: ProjectType's three real values (Single/EP/Album)
// are already, honestly, music-specific — Forge's own Project model has
// been music-shaped from the start. A "Leather Wallet" or "Business"
// Blueprint would need a ProjectType value that doesn't exist and
// shouldn't be invented here (adding one would mean modifying the
// Creative Knowledge Engine's own ProjectType union, explicitly
// off-limits this sprint), and forcing a leathercraft project to display
// "Single" would violate Honest Abstraction outright. Rather than fake a
// fit, those examples are left unimplemented — "blank-project" is this
// sprint's honest stand-in for "any kind of project Forge doesn't yet
// have a specialised experience for," proving the exact same
// architectural point (identical Project model, different experience)
// without misrepresenting what ProjectType means today.
// Each music Blueprint emphasises a *different* pair of actions and a
// *different* Companion — not just "music vs. not," but genuinely distinct
// experiences from each other, matching how a single, an EP, and an album
// actually unfold: a single lives or dies on its words and its cover, an
// EP lives or dies on its songs cohering, an album lives or dies on
// knowing what's ready to ship and when.
export const BLUEPRINT_DEFINITIONS: Record<BlueprintId, BlueprintDefinition> = {
  "music-single": {
    label: "Music Single",
    icon: "🎵",
    description: "One song, start to finish — lyrics, production, and release.",
    suggestedProjectType: "Single",
    preferredWorkspace: "music",
    emphasizedActionIds: ["capture-lyric", "add-artwork"],
    emphasizedCompanionId: "producer",
  },
  "music-ep": {
    label: "Music EP",
    icon: "💿",
    description: "A short collection of songs sharing one creative arc.",
    suggestedProjectType: "EP",
    preferredWorkspace: "music",
    emphasizedActionIds: ["capture-production-note", "import-notes"],
    emphasizedCompanionId: "curator",
  },
  "music-album": {
    label: "Music Album",
    icon: "📀",
    description: "A full body of work, developed over time.",
    suggestedProjectType: "Album",
    preferredWorkspace: "music",
    emphasizedActionIds: ["create-release", "begin-creative-session"],
    emphasizedCompanionId: "release-manager",
  },
  "blank-project": {
    label: "Blank Project",
    icon: "📁",
    description: "No suggestions — set everything up yourself.",
    suggestedProjectType: null,
    preferredWorkspace: null,
    emphasizedActionIds: [],
    emphasizedCompanionId: null,
  },
};

// The order Blueprint cards are offered in — kept as its own list (rather
// than Object.keys(BLUEPRINT_DEFINITIONS)) so that order is an explicit
// choice, not an accident of object-key iteration.
export const BLUEPRINT_IDS: BlueprintId[] = ["music-single", "music-ep", "music-album", "blank-project"];

// Blueprint Definition -> Workspace Preference -> Creative Action
// Preference -> ... -> Existing Forge Systems: this is the one function
// that carries out the "Creative Action Preference" arrow, and the only
// place a Blueprint's emphasis ever touches a real CreativeAction[]. It
// does not call creativeActions.ts, does not construct a CreativeAction,
// and does not know how any action actually runs — it only reorders a
// list Workspace.tsx already built by binding real callbacks, exactly the
// same list that would be shown with no Blueprint involved at all, just
// resequenced. Execution (what happens when a button is clicked) remains
// entirely inside Creative Actions, untouched.
export function applyActionEmphasis(actions: CreativeAction[], emphasizedIds: CreativeActionId[]): CreativeAction[] {
  if (emphasizedIds.length === 0) return actions;

  const emphasized = emphasizedIds
    .map((id) => actions.find((action) => action.id === id))
    .filter((action): action is CreativeAction => action !== undefined);
  const rest = actions.filter((action) => !emphasizedIds.includes(action.id));

  return [...emphasized, ...rest];
}
