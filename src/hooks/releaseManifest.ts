// The Release Manifest Engine — Forge's own canonical representation of a
// release. Core Principle of this sprint: Forge maintains exactly one
// canonical representation; everything outside it (a LANDR upload, a
// DistroKid form, a JSON file, a CSV row) is a translation of this shape,
// never a second source of truth. Nothing in this file knows any of those
// names, or any provider's terminology at all — see this sprint's own
// report for why that's a hard requirement, not a style preference.
//
// Composition, not a new store: every field below is read, unmodified,
// from systems that already exist. Track List and Artwork are literally
// buildMusicWorkspace's own `audio`/`artwork` groups (Music Workspace is
// off-limits to modify this sprint, so its already-exported composition is
// reused exactly as Prompt Studio's own Reference-track chips already did).
// Sound & Style is the project's latest saved Prompt Studio version,
// recognised the same way Prompt Studio recognises its own version history
// — via `isPromptVersion`, imported unmodified from promptComposition.ts.
// Release Notes is the remainder of the project's Knowledge once prompt
// versions are set aside, so nothing is ever listed twice. Artist and
// Copyright are computed directly from the active Identity and the
// Release's own fields — no new persisted data anywhere.
import type { Activity, Asset, Identity, KnowledgeEntry, Project, Release } from "../types";
import type { DiscoveryContext } from "./relationshipDiscovery";
import { buildMusicWorkspace } from "./musicWorkspace";
import { isPromptVersion } from "./promptComposition";

// "Complete"/"missing" is the entire vocabulary this sprint needs — the
// mission explicitly asks for a way to tell complete, incomplete, and
// missing information apart "without inventing validation systems". A
// field either has real content Forge already knows, or it doesn't; there
// is no severity, no required/optional tiering, and nothing resembling a
// rules engine layered on top.
export type ManifestFieldStatus = "complete" | "missing";

// One universal shape for every field on the manifest, whatever kind of
// value it holds (a string, a list of Assets, a list of KnowledgeEntry).
// This is what lets ReleaseManifestView render every field — Artist next
// to Track List next to Release Notes — through one small, honestly
// generic component, rather than a bespoke look per field. Composition
// Over Configuration: nothing about a field's *meaning* lives here, only
// its label, its already-derived value, and whether that value is present.
export interface ManifestField<T> {
  label: string;
  value: T;
  status: ManifestFieldStatus;
}

// The manifest itself. Deliberately flat and provider-independent: every
// field name here is a term a musician already uses to describe their own
// work (Artist, Track List, Copyright), never a term any distributor's API
// or upload form uses. This is the exact boundary the mission calls the
// Translation Boundary — a future Provider Translation layer would read
// *this* shape and produce a LANDR/DistroKid/CSV/JSON representation from
// it; nothing on this side of the boundary should ever need to change to
// support a new provider arriving on the other side of it.
export interface ReleaseManifest {
  release: Release;
  project: Project;
  artist: ManifestField<string>;
  releaseTitle: ManifestField<string>;
  description: ManifestField<string>;
  trackList: ManifestField<Asset[]>;
  artwork: ManifestField<Asset[]>;
  soundAndStyle: ManifestField<string>;
  releaseNotes: ManifestField<KnowledgeEntry[]>;
  copyright: ManifestField<string>;
  completeFieldCount: number;
  totalFieldCount: number;
  completeness: "complete" | "incomplete";
}

function textField(label: string, value: string): ManifestField<string> {
  const trimmed = value.trim();
  return { label, value: trimmed, status: trimmed ? "complete" : "missing" };
}

function listField<T>(label: string, value: T[]): ManifestField<T[]> {
  return { label, value, status: value.length > 0 ? "complete" : "missing" };
}

// The one composition this sprint adds. `project` and `context` together
// already carry everything needed — no new data is read from anywhere
// this file introduces itself.
export function buildReleaseManifest(
  release: Release,
  project: Project,
  identity: Identity,
  context: DiscoveryContext,
  activities: Activity[],
): ReleaseManifest {
  // Reused completely unmodified — the same audio/artwork/notes grouping
  // Music Workspace itself already shows for this project, not a second,
  // slightly-different filter written here.
  const workspace = buildMusicWorkspace(project, context, activities);

  const promptVersions = workspace.notes
    .filter(isPromptVersion)
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  const latestPromptVersion = promptVersions[0] ?? null;

  // Release Notes is deliberately "everything else" — whatever the
  // project's Knowledge already holds once its Prompt Studio history is
  // set aside — so nothing a creator captured is ever silently dropped,
  // and nothing appears in two sections of the same manifest at once.
  const releaseNoteEntries = workspace.notes.filter((entry) => !isPromptVersion(entry));

  const artist = textField("Artist", identity.name);
  const releaseTitle = textField("Release Title", release.title);
  // Release.description is the release's own words about *this* release;
  // Project.description is the fallback for a release that hasn't written
  // its own yet — never a second, competing description field.
  const description = textField("Description", release.description || project.description);
  const trackList = listField("Track List", workspace.audio);
  const artwork = listField("Artwork", workspace.artwork);
  // Deliberately the whole saved prompt, not individual Genre/Mood/
  // Instrumentation lines picked back out of it — composePromptText's own
  // documentation calls its output "a plain, labelled block of text",
  // meant to be read as one portable whole, not re-parsed field-by-field
  // by something downstream. Treating it as one opaque block respects
  // that boundary instead of reaching through it.
  const soundAndStyle = textField("Sound & Style", latestPromptVersion?.insight ?? "");
  const releaseNotes = listField("Release Notes", releaseNoteEntries);
  // A plain computed convention, not a new stored fact — the same two
  // already-known facts (who, and when) every printed copyright line has
  // always been made of.
  const copyright = textField(
    "Copyright",
    identity.name.trim() ? `© ${release.releaseDate.getFullYear()} ${identity.name.trim()}` : "",
  );

  const fields: { status: ManifestFieldStatus }[] = [
    artist,
    releaseTitle,
    description,
    trackList,
    artwork,
    soundAndStyle,
    releaseNotes,
    copyright,
  ];
  const completeFieldCount = fields.filter((field) => field.status === "complete").length;

  return {
    release,
    project,
    artist,
    releaseTitle,
    description,
    trackList,
    artwork,
    soundAndStyle,
    releaseNotes,
    copyright,
    completeFieldCount,
    totalFieldCount: fields.length,
    completeness: completeFieldCount === fields.length ? "complete" : "incomplete",
  };
}
