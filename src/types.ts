// Shared TypeScript types used across the Forge app shell.

// The six preset accent colours a user can choose when creating an identity.
// Using a fixed union type (instead of a plain string) means TypeScript will
// catch a typo like "oragne" at compile time instead of at runtime.
export type AccentColorId =
  | "orange"
  | "blue"
  | "purple"
  | "green"
  | "red"
  | "yellow";

export interface AccentColorOption {
  id: AccentColorId;
  label: string;
  hex: string;
}

// The single source of truth for what each accent colour looks like.
// Both the colour picker in the "Create Identity" modal and the coloured
// dot on each identity card read from this same list.
export const ACCENT_COLORS: AccentColorOption[] = [
  { id: "orange", label: "Orange", hex: "#FF8A1A" },
  { id: "blue", label: "Blue", hex: "#3B82F6" },
  { id: "purple", label: "Purple", hex: "#A855F7" },
  { id: "green", label: "Green", hex: "#22C55E" },
  { id: "red", label: "Red", hex: "#EF4444" },
  { id: "yellow", label: "Yellow", hex: "#EAB308" },
];

// An Identity is one of the "profiles" a user can operate Forge as
// (e.g. a persona, a brand, a studio).
//
// This shape is intentionally simple and serializable (no functions, no
// React-specific values) so that later, swapping the in-memory React state
// for a SQLite-backed store just means saving/loading objects that already
// look exactly like this.
export interface Identity {
  id: string;
  name: string;
  description: string;
  accentColor: AccentColorId;
  createdAt: Date;
}

// Which "section" of the main workspace is currently visible. Kept as a
// small union (rather than a boolean) so more sections can be added later
// just by adding another string here.
export type WorkspaceSection =
  | "overview"
  | "projects"
  | "knowledge"
  | "assets"
  | "releases"
  | "inbox"
  | "companions"
  | "discoveries"
  | "chief"
  | "opportunities"
  | "music"
  | "prompt-studio"
  | "release-manifest"
  | "release-translation"
  | "album-production"
  | "track-workspace"
  | "studio-library"
  | "project-studio"
  | "settings";

// The kinds of project Forge currently understands. A union type (instead
// of a plain string) means TypeScript catches typos at compile time.
export type ProjectType = "Single" | "EP" | "Album";

export interface ProjectTypeOption {
  id: ProjectType;
  label: string;
}

// The single source of truth for available project types. The "Create
// Project" dropdown is built by looping over this list, so adding a new
// type later (e.g. "Mixtape") only means adding one entry here and to the
// ProjectType union above — no other code needs to change.
export const PROJECT_TYPES: ProjectTypeOption[] = [
  { id: "Single", label: "Single" },
  { id: "EP", label: "EP" },
  { id: "Album", label: "Album" },
];

// The stages a project can move through. Every new project starts at
// DEFAULT_PROJECT_STATUS ("Idea") and would move through this list as work
// progresses (status changes aren't wired up to any UI yet).
export type ProjectStatus =
  | "Idea"
  | "Planning"
  | "Creating"
  | "Review"
  | "Released"
  | "Archived";

export const PROJECT_STATUSES: ProjectStatus[] = [
  "Idea",
  "Planning",
  "Creating",
  "Review",
  "Released",
  "Archived",
];

export const DEFAULT_PROJECT_STATUS: ProjectStatus = "Idea";

// A Project always belongs to exactly one Identity (see identityId). Like
// Identity, this shape is plain data — no functions, nothing React-specific
// — so it can later be persisted to SQLite with no changes to its fields.
export interface Project {
  id: string;
  identityId: string;
  name: string;
  type: ProjectType;
  status: ProjectStatus;
  description: string;
  createdAt: Date;
}

// How a piece of knowledge was learned. A plain string union (like
// ProjectStatus) since there's no extra data — just a label — per source.
export type KnowledgeSource =
  | "Experiment"
  | "Research"
  | "Conversation"
  | "Decision"
  | "Observation"
  | "Review";

// The single source of truth for available sources. The "Capture Knowledge"
// dropdown loops over this list, so adding a new source later is a one-line
// change here (plus the union above) — no other code needs to change.
export const KNOWLEDGE_SOURCES: KnowledgeSource[] = [
  "Experiment",
  "Research",
  "Conversation",
  "Decision",
  "Observation",
  "Review",
];

// A Knowledge entry always belongs to exactly one Identity, and may
// optionally reference one of that identity's Projects (projectId is null
// when it doesn't). Knowledge captures a lesson learned — it is not a
// general-purpose note. Like Identity and Project, this shape is plain data
// so it can later be persisted to SQLite with no changes to its fields.
export interface KnowledgeEntry {
  id: string;
  identityId: string;
  projectId: string | null;
  title: string;
  insight: string;
  source: KnowledgeSource;
  createdAt: Date;
}

// The kinds of file Forge currently understands as an asset. A plain string
// union (like ProjectStatus/KnowledgeSource) since there's no extra data —
// just a label — per type.
export type AssetType =
  | "Audio"
  | "Image"
  | "Video"
  | "Lyrics"
  | "Document"
  | "Artwork"
  | "Source"
  | "Other";

// The single source of truth for available asset types. The "Create Asset"
// dropdown loops over this list, so adding a new type later is a one-line
// change here (plus the union above) — no other code needs to change.
export const ASSET_TYPES: AssetType[] = [
  "Audio",
  "Image",
  "Video",
  "Lyrics",
  "Document",
  "Artwork",
  "Source",
  "Other",
];

// An Asset always belongs to exactly one Project (projectId is required,
// unlike a Knowledge entry's optional one), and — like Project — also
// carries identityId directly rather than requiring a join through its
// project every time it needs to be filtered by identity. Plain data, like
// every other entity here, so it can later be persisted to SQLite with no
// changes to its fields.
export interface Asset {
  id: string;
  identityId: string;
  projectId: string;
  name: string;
  type: AssetType;
  description: string;
  createdAt: Date;
  filePath: string | null;
}

// Where a release can be published. A plain string union (like
// AssetType/KnowledgeSource) since there's no extra data — just a label —
// per platform.
export type ReleasePlatform =
  | "Spotify"
  | "YouTube"
  | "Bandcamp"
  | "SoundCloud"
  | "Apple Music"
  | "Other";

// The single source of truth for available platforms. The "Create Release"
// dropdown loops over this list, so adding a new platform later is a
// one-line change here (plus the union above) — no other code needs to change.
export const RELEASE_PLATFORMS: ReleasePlatform[] = [
  "Spotify",
  "YouTube",
  "Bandcamp",
  "SoundCloud",
  "Apple Music",
  "Other",
];

// The stages a release can move through. Every new release starts at
// DEFAULT_RELEASE_STATUS ("Planned"), but — unlike a Project's status —
// this one is chosen directly in the Create Release modal, since a release
// might already be Scheduled or Released by the time it's entered into Forge.
export type ReleaseStatus = "Planned" | "Scheduled" | "Released" | "Archived";

export const RELEASE_STATUSES: ReleaseStatus[] = [
  "Planned",
  "Scheduled",
  "Released",
  "Archived",
];

export const DEFAULT_RELEASE_STATUS: ReleaseStatus = "Planned";

// A Release always belongs to exactly one Project (like Asset, projectId is
// required), and carries identityId directly for the same reason Project
// and Asset do. releaseDate is separate from createdAt: releaseDate is the
// (possibly future, possibly past) date the work is or was published,
// while createdAt is simply when this record was added to Forge. Plain
// data, like every other entity here, so it can later be persisted to
// SQLite with no changes to its fields.
export interface Release {
  id: string;
  identityId: string;
  projectId: string;
  title: string;
  platform: ReleasePlatform;
  status: ReleaseStatus;
  releaseDate: Date;
  description: string;
  createdAt: Date;
}

// The kinds of event Forge automatically records. Unlike every other type
// union above, nothing ever lets a user pick one of these directly — they're
// only ever set by the app itself when a creation succeeds (see useActivity.ts).
export type ActivityType =
  | "Identity Created"
  | "Project Created"
  | "Knowledge Captured"
  | "Asset Added"
  | "Release Planned"
  | "Item Captured";

// Which kind of entity an Activity is about. Lets a future "jump to this
// item" feature resolve relatedObjectId without guessing its type.
export type RelatedObjectType =
  | "identity"
  | "project"
  | "knowledge"
  | "asset"
  | "release"
  | "capture";

// Activity is deliberately not a first-class, user-created object — it's a
// derived history of actions that already happened elsewhere. Every entry
// always belongs to exactly one Identity, and always points back at the
// entity that caused it (relatedObjectType/relatedObjectId). Plain data,
// like every other entity here, so it can later be persisted to SQLite
// with no changes to its fields.
export interface Activity {
  id: string;
  identityId: string;
  type: ActivityType;
  title: string;
  timestamp: Date;
  relatedObjectType: RelatedObjectType;
  relatedObjectId: string;
}

// The kinds of thing Quick Capture can save with nothing more than a single
// block of text. "Knowledge" is deliberately NOT one of these — it already
// has a proper home (KnowledgeEntry, with projectId left null for
// unclassified capture), so Quick Capture reuses that system directly
// instead of duplicating it here.
export type CaptureType = "Idea" | "Prompt" | "Task" | "Link" | "Release Note";

export const CAPTURE_TYPES: CaptureType[] = ["Idea", "Prompt", "Task", "Link", "Release Note"];

// A Capture is intentionally the smallest possible record: whatever the
// creator typed, stamped with when and by which identity. It has no
// projectId — Quick Capture's whole purpose is to let a thought exist
// before it's organized, so nothing here forces that decision. A future
// "assign to a project" action would add that field's *consumer*, not
// require a schema change here. Plain data, like every other entity in this
// file, so it can later be persisted to SQLite with no changes to its fields.
export interface Capture {
  id: string;
  identityId: string;
  type: CaptureType;
  content: string;
  createdAt: Date;
}

// A pointer to any first-class object Forge tracks — the one thing every
// entity above has in common (an id) plus which kind it is. This is what
// lets a Relationship connect literally anything without needing a
// separate "ProjectRelationship"/"AssetRelationship"/etc. per pair of
// types. Reuses RelatedObjectType (already defined for Activity above)
// rather than a parallel enum.
export interface ObjectRef {
  type: RelatedObjectType;
  id: string;
}

// Why a relationship exists. Each value doubles as both "what kind of
// connection is this" and "which rule found it" — for the deterministic
// discovery rules, those are the same thing. "manual" is what a creator's
// own "Connect To…" action always produces by default (see
// ConnectToModal.tsx) — the same union, no parallel taxonomy for
// creator-made connections.
export type RelationshipType =
  | "manual"
  | "shared-project"
  | "shared-identity"
  | "similar-title"
  | "shared-filename"
  | "recent-activity"
  | "reference";

// The single source of truth for how each relationship type reads in the
// UI. Adding a new discovery rule later is a one-line change here (plus
// the union above) — no other code needs to change. The "Connect To…"
// picker loops over RELATIONSHIP_TYPES below rather than hard-coding
// options, for the same reason.
export const RELATIONSHIP_TYPE_LABELS: Record<RelationshipType, string> = {
  manual: "Linked manually",
  "shared-project": "Shared project",
  "shared-identity": "Shared identity",
  "similar-title": "Similar title",
  "shared-filename": "Shared filename",
  "recent-activity": "Created around the same time",
  reference: "Direct reference",
};

export const RELATIONSHIP_TYPES: RelationshipType[] = [
  "manual",
  "shared-project",
  "shared-identity",
  "similar-title",
  "shared-filename",
  "recent-activity",
  "reference",
];

// Where a relationship came from — mirrors the same three-way split most
// systems eventually need: something the creator did directly, something
// Forge noticed on its own, or something brought in from outside.
export type RelationshipOrigin = "user" | "discovery" | "import";

// "suggested" relationships are only ever created by discovery — a
// creator's own confirmation or dismissal is what moves them out of that
// state. Dismissed ones are never deleted (so discovery never re-suggests
// the same pair), just hidden from view.
export type RelationshipStatus = "suggested" | "confirmed" | "dismissed";

// The reusable model connecting any two first-class objects. Every
// relationship — however it was found — must be able to answer "why does
// this exist" (the `reason` field) and "how sure is Forge" (`confidence`,
// a fixed constant per rule, never a learned/probabilistic score). Plain
// data, like every other entity here, so it can later be persisted to
// SQLite with no changes to its fields.
export interface Relationship {
  id: string;
  identityId: string;
  source: ObjectRef;
  target: ObjectRef;
  relationshipType: RelationshipType;
  confidence: number;
  origin: RelationshipOrigin;
  reason: string;
  status: RelationshipStatus;
  createdAt: Date;
}

// Which stage a queued creative execution is currently in — a closed
// vocabulary, like ProjectStatus/ReleaseStatus. "Queued" is the only value
// any code this sprint ever sets; "Running"/"Completed"/"Failed" exist so a
// *future* execution engine has somewhere honest to report progress,
// without this type needing to change when one arrives. No background
// worker, timer, or fake progress ever moves an item off "Queued" this
// sprint — see useStudioQueue.ts.
export type ExecutionStatus = "Queued" | "Running" | "Completed" | "Failed";

export const EXECUTION_STATUSES: ExecutionStatus[] = ["Queued", "Running", "Completed", "Failed"];

// The one, honest placeholder value every CreativeExecution's `provider`
// field holds this sprint — see CreativeExecution's own comment below for
// why a real provider name (Suno, MusicGPT, ACE, ...) can never appear
// here yet. A plain string, not a closed union of real AI services: the
// Queue needs somewhere to note which execution provider was requested
// without ever being taught what any real provider is.
export const UNASSIGNED_PROVIDER = "Unassigned";

// A request to execute one Prompt Version — Forge's first model of
// *creative execution itself*, not of any AI provider. A CreativeExecution
// always points at exactly one Prompt Version (via promptVersionId, a
// KnowledgeEntry's own id — Prompt Studio's saved versions already ARE
// ordinary KnowledgeEntry records, so no new "prompt" concept is
// introduced here either) and belongs to exactly one Project, the same way
// an Asset or Release does.
//
// No existing type could honestly represent this: Project is the whole
// creative work, not a single request to run one version of it; a
// KnowledgeEntry's own fields already mean something specific to every
// other entry in Forge (title/insight/source), and giving it a mutable
// execution status would mean every other kind of Knowledge — a research
// note, a decision record — gained a meaningless "Queued/Running/..."
// field too. Release represents something ready to ship, not a request
// still in progress. Activity is a derived, append-only history that a
// creator never mutates or deletes — it has no `status` that changes over
// time, and nothing in it is ever removed, while a CreativeExecution must
// be both. Discovery and Opportunity are never persisted at all —
// recomputed fresh from context every time — but a queued execution is a
// real, creator-initiated request that must persist exactly as the
// creator left it until it's removed or a future engine changes its
// status; nothing about it can be re-derived from other data the way a
// Discovery or Opportunity can.
//
// `provider` is deliberately a plain string, not a closed union of real AI
// services (see UNASSIGNED_PROVIDER above) — this field exists so the
// Queue has somewhere honest to note which execution provider was
// requested, without the Queue itself ever needing to know any real
// provider's name. A future sprint that actually integrates a provider
// could let this hold a real chosen value, or introduce its own small
// Provider concept elsewhere — this field's shape doesn't need to change
// either way.
export interface CreativeExecution {
  id: string;
  identityId: string;
  projectId: string;
  promptVersionId: string;
  provider: string;
  status: ExecutionStatus;
  createdAt: Date;
}

// A track a creator intends to make within an album, before any actual
// creative work exists for it yet — Album Production's one new persisted
// concept, and deliberately the smallest possible shape: an id, which
// project/identity it belongs to, a title, and when it was planned.
// Nothing about status, progress, or order is stored here — all of that
// is derived fresh, every time, from Asset/KnowledgeEntry/CreativeExecution/
// Release via existing engines and honest name-matching (see
// hooks/albumProduction.ts), never duplicated onto this record.
//
// No existing type could honestly represent this: Project is the whole
// album, not one of the songs inside it; Asset requires something that
// already exists — a file, an artwork, a reference — and a planned track
// has none of that yet, by definition; KnowledgeEntry represents a
// captured insight or lesson, not a placeholder for creative work that
// hasn't started; Release represents the whole album's shipping target,
// not one internal song; Activity is a derived, append-only history of
// things that already happened, never something a creator plans ahead of
// time; Discovery and Opportunity are never persisted at all — recomputed
// fresh from context every time — but a planned track is a real,
// creator-authored intention that must persist exactly as entered until
// it's removed, the same reason CreativeExecution needed its own shape
// rather than reusing any of these.
export interface PlannedTrack {
  id: string;
  identityId: string;
  projectId: string;
  title: string;
  description?: string;
  createdAt: Date;
  completedAt?: Date;
}

// An explicit, creator-declared fact: this saved Prompt Version was
// written specifically for this Planned Track, not merely for the album
// it belongs to. Deliberately the smallest possible shape — nothing here
// describes a prompt's lifecycle, ownership rules, or state; it records
// exactly one thing, established exactly one way: a creator's own choice
// at the moment they saved a version in Prompt Studio.
//
// No existing type could honestly represent this, and composing it from
// existing fields would require *inferring* the relationship (from a
// prompt's title, its text, an execution, or generated audio) — precisely
// what Canonical Truth forbids here: "Only an explicit creator decision
// establishes this relationship." KnowledgeEntry's own fields (title,
// insight, source) already mean something specific to every prompt
// version and every other kind of Knowledge; overloading any of them to
// also encode a track id would either pollute that meaning for every
// other entry, or invite exactly the "recognise by title" trick this
// sprint explicitly rules out as too weak a foundation for a declared,
// not inferred, fact. Relationship (the existing engine) can't honestly
// hold this either: a Relationship connects two ObjectRefs, and
// PlannedTrack has no ObjectRef of its own — giving it one would mean
// teaching the Relationship Engine, Activity, Discovery, and Opportunity
// what a Planned Track is, exactly what "no existing engine should gain
// Prompt Attribution logic" forbids. PromptAttribution is a deliberately
// narrow, standalone record precisely so it stays invisible to all of them.
export interface PromptAttribution {
  id: string;
  identityId: string;
  promptVersionId: string;
  trackId: string;
  createdAt: Date;
}

// A single listening note a creator captures against a Candidate during
// review. Plain text only — no markdown, no tags, no sentiment. The
// timestamp records when the thought was written, not when in the audio
// it refers to (that's a future scrubber concern, not this sprint's).
export interface CandidateNote {
  id: string;
  text: string;
  createdAt: Date;
}

// Which stage a Candidate is currently in — a closed vocabulary, like
// ExecutionStatus. "Pending Review" is where every Candidate starts and
// stays until a creator makes an explicit decision; nothing here ever
// moves a Candidate to "Approved" or "Rejected" automatically — there is
// no scoring, no analysis, no inference. Once decided, a Candidate stays
// decided: this sprint doesn't support reopening a review.
export type CandidateStatus = "Pending Review" | "Approved" | "Rejected";

export const CANDIDATE_STATUSES: CandidateStatus[] = ["Pending Review", "Approved", "Rejected"];

// A generated creative output awaiting a creator's judgment — Candidate
// Review's one new concept, and deliberately its own identity rather than
// an overload of anything that already exists.
//
// Asset can't honestly hold this: an Asset is canonical the moment it
// exists in Forge (Music Workspace, Release Manifest, and every other
// engine already treat "it's an Asset" as settled creative truth) — a
// Candidate is the opposite, a temporary possibility that might be
// rejected and never become real. Persisting it as an Asset from the
// start would mean rejected work sits in Forge's permanent Asset list
// exactly like approved work, which is precisely the confusion Canonical
// Truth exists to prevent. CreativeExecution can't hold this either: one
// execution can honestly produce several candidates ("Candidate A, B,
// C..."), a one-to-many relationship CreativeExecution's own single
// `status` field (Queued/Running/Completed/Failed — a completely
// different axis, the execution's own lifecycle, not any one output's
// review state) has no room for. KnowledgeEntry (a Prompt Version)
// represents creative intent, several steps upstream of a generated
// output — it was never meant to represent the result of executing it.
//
// `approvedAssetId` is the one field set only at the moment of approval —
// without it, "click through to the Approved Audio" (this sprint's own
// Navigation requirement) would have nothing to point at, and Forge would
// have to guess which Asset a Candidate became, exactly the kind of
// inference this sprint forbids. It stays `null` for every Candidate that
// is Pending Review or Rejected, since neither ever produces an Asset.
export interface Candidate {
  id: string;
  identityId: string;
  executionId: string;
  title: string;
  status: CandidateStatus;
  createdAt: Date;
  approvedAssetId: string | null;
  // Full filesystem path to the audio file — null for candidates created
  // before the Download Watcher or imported via Candidate Import (which
  // reports outputs by title, not file path). Set only by the Download
  // Watcher path; the Candidate Import workflow is not modified.
  filePath: string | null;
  notes: CandidateNote[];
  // Promotion markers — set explicitly by the creator after approval,
  // never automatically. Only one Candidate per Track may hold each.
  // Both default to false; both may be true on the same candidate.
  isCurrentBest: boolean;
  isAlbumVersion: boolean;
}

// A Companion represents a perspective over the Creative Knowledge Engine —
// a role, defined by what it pays attention to, not by whatever (if
// anything) might eventually power it. Chief is one of these roles, not a
// special case. Deliberately nothing here names a model, a provider, or a
// prompt: a Companion is its role, so swapping what powers one later — a
// local model, a cloud model, or nothing at all — needs no change to this
// shape or to anything that reads it.
export interface Companion {
  id: string;
  name: string;
  icon: string;
  focus: string;
}

// The single source of truth for which Companions Forge currently defines —
// mirrors RELATIONSHIP_TYPES/ASSET_TYPES: a plain list, not a hook, since
// nothing here is created, edited, or owned by a creator (yet — Companions
// aren't creator-authored the way a Project or Knowledge entry is). Adding
// a new Companion later is a one-line addition to this list; nothing else
// needs to change.
export const COMPANION_ROLES: Companion[] = [
  {
    id: "chief",
    name: "Chief",
    icon: "🧭",
    focus: "Coordinates across every Companion perspective and keeps the creator's own priorities in view.",
  },
  {
    id: "archivist",
    name: "Archivist",
    icon: "🗄️",
    focus: "Focuses on what's already been captured — organizing Knowledge and preserving Creative History.",
  },
  {
    id: "builder",
    name: "Builder",
    icon: "🔨",
    focus: "Focuses on what's being made right now — Projects and Assets in active progress.",
  },
  {
    id: "producer",
    name: "Producer",
    icon: "🎚️",
    focus: "Focuses on what's needed to finish and ship — Releases and the work still outstanding.",
  },
  {
    id: "curator",
    name: "Curator",
    icon: "🖼️",
    focus: "Focuses on how individual pieces of work relate to each other across the whole body of work.",
  },
  {
    id: "researcher",
    name: "Researcher",
    icon: "🔎",
    focus: "Focuses on surfacing patterns and precedents already captured in Knowledge.",
  },
  {
    id: "analyst",
    name: "Analyst",
    icon: "📊",
    focus: "Focuses on what Creative History reveals about how work has evolved over time.",
  },
  {
    id: "release-manager",
    name: "Release Manager",
    icon: "🚀",
    focus: "Focuses on what's ready, what's blocked, and what's next across every Release.",
  },
];

// The smallest honest description of one external, web-based creative
// tool a Workspace Surface can host — enough to render a generic iframe
// panel with a name, a short description, and somewhere to point it, and
// nothing else. Deliberately not a persisted, creator-owned entity the
// way a Project or Asset is: "Suno Generate exists as an option Forge
// knows how to host" isn't a fact a creator declares or that changes over
// time, it's a fixed catalog entry — the same shape COMPANION_ROLES
// already uses for exactly this kind of fixed reference data, not a
// useState-backed hook.
//
// This is the one concept the Workspace Surface architecture needed:
// the hosting component (components/WorkspaceSurface) only ever reads
// `url`, `displayName`, `description`, and `icon` from whichever
// definition it's given — it has no branch, no special case, and no
// import that could ever tell it "this one is Suno." Deleting the Suno
// Generate entry below leaves the hosting component fully intact; adding
// a second one (Suno Studio, Ableton, MusicalSEO, YouTube Studio) is one
// more object in this list, nothing more.
export interface WorkspaceSurfaceDefinition {
  id: string;
  displayName: string;
  description: string;
  url: string;
  icon: string;
}

// The one Workspace Surface this build ships. A future tool is added
// here, never by teaching the hosting component a new name.
export const WORKSPACE_SURFACE_DEFINITIONS: WorkspaceSurfaceDefinition[] = [
  {
    id: "suno-generate",
    displayName: "Suno Generate",
    description: "Generate new songs directly on Suno, without leaving Forge.",
    url: "https://suno.com/create",
    icon: "🎵",
  },
];

// A piece of audio that exists inside the creator's studio — imported from
// disk and available for use, but not yet attached to any track, album, or
// candidate. The studio floor, before anything earns a place on the record.
//
// Deliberately has no projectId, no trackId, no executionId: a Studio
// Resource is not a creative decision. It is simply: "this audio is in
// my studio." Everything that comes later (attaching to a track, promoting
// to a candidate) is a separate, explicit creator choice.
export interface StudioResource {
  id: string;
  identityId: string;
  name: string;
  filePath: string;
  createdAt: Date;
}

export interface StudioResourceAttachment {
  id: string;
  resourceId: string;
  trackId: string;
  createdAt: Date;
}
