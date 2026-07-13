// The Translation Engine — the boundary between Forge's own canonical
// truth and everything outside it. Core Principle of this sprint: Forge
// owns creative truth; a translation exists only to communicate that truth
// to an external system, and is disposable — deleting every translation
// (this whole file, and anything that renders one) leaves the Release
// Manifest, and everything Forge itself understands, completely unchanged.
//
// The one boundary this file enforces strictly: every function here takes
// a ReleaseManifest and nothing else. Nothing in this file imports Project,
// Release, Asset, or KnowledgeEntry's own hooks, queries any of Forge's
// state arrays, or reaches past the Manifest to "double-check" something
// against the Creative Knowledge Engine directly. The Release Manifest is
// already the canonical composition — a translation's only job is to
// re-shape *that*, faithfully, into a format something outside Forge can
// read. Translation Without Mutation, applied literally: nothing here ever
// writes back to a ReleaseManifest, and nothing it produces is ever fed
// back into Forge as new data.
import type { Asset, KnowledgeEntry } from "../types";
import type { ManifestField, ManifestFieldStatus, ReleaseManifest } from "./releaseManifest";

// The only format this sprint implements. A plain string union (like every
// other format/type/source enum in this app) rather than a class hierarchy
// or plugin object — there is exactly one true fact to represent (a
// format's name) and a lookup table below is all "many formats" ever
// needs.
export type TranslationFormat = "json";

// Display label per format — the single source both a future format picker
// and this file's own dispatch table read from, mirroring
// IMPORT_SOURCE_FORMAT_LABELS (folderImport.ts)/RELATIONSHIP_TYPE_LABELS
// (types.ts) exactly. Adding "csv"/"yaml"/"xml" later is a one-line
// addition here, plus one more line in TRANSLATE_BY_FORMAT below — nothing
// about ReleaseManifest, or any function already defined, needs to change.
export const TRANSLATION_FORMAT_LABELS: Record<TranslationFormat, string> = {
  json: "release.json",
};

// A field's value, translated honestly: present content passes through
// unchanged, but a *missing* field becomes `null` rather than an empty
// string. An empty string could be mistaken for "Forge knows this field is
// blank" — `null` says the only true thing Forge actually knows: it
// doesn't have this yet. Fact Before Decision, applied to the translation
// itself: the output never guesses or pads in a placeholder value on a
// distributor's behalf.
function fieldValue<T>(field: ManifestField<T>): T | null {
  return field.status === "complete" ? field.value : null;
}

// An Asset, reduced to what an external representation actually needs to
// know about a track or piece of artwork — not Forge's own internal
// identityId/projectId bookkeeping, which means nothing outside Forge.
// Still entirely Forge's own vocabulary (type, name, description), never a
// distributor's.
function trackToJson(asset: Asset) {
  return {
    title: asset.name,
    type: asset.type,
    description: asset.description || null,
  };
}

// A Knowledge entry, reduced the same way — this project's own captured
// notes (including, honestly, whatever Prompt Studio history didn't
// already become Sound & Style), described in Forge's own terms.
function noteToJson(entry: KnowledgeEntry) {
  return {
    title: entry.title,
    insight: entry.insight,
    source: entry.source,
    capturedAt: entry.createdAt.toISOString(),
  };
}

// Every field the manifest tracks completeness for, in one list — the
// exact same fields buildReleaseManifest itself totals, reused here rather
// than re-enumerated a third time, so missingFields below can never drift
// out of sync with the manifest's own completeFieldCount/totalFieldCount.
function allManifestFields(manifest: ReleaseManifest): { label: string; status: ManifestFieldStatus }[] {
  return [
    manifest.artist,
    manifest.releaseTitle,
    manifest.description,
    manifest.trackList,
    manifest.artwork,
    manifest.soundAndStyle,
    manifest.releaseNotes,
    manifest.copyright,
  ];
}

// The one translation this sprint implements. A faithful, pretty-printed
// re-shaping of the Release Manifest — every field the manifest already
// tracks, nothing added, nothing distributor-specific. Its purpose is to
// prove a translation can be produced from the manifest alone; it is not
// meant to satisfy any particular external system's schema.
export function translateToJson(manifest: ReleaseManifest): string {
  const document = {
    artist: fieldValue(manifest.artist),
    releaseTitle: fieldValue(manifest.releaseTitle),
    description: fieldValue(manifest.description),
    trackList: manifest.trackList.value.map(trackToJson),
    artwork: manifest.artwork.value.map(trackToJson),
    soundAndStyle: fieldValue(manifest.soundAndStyle),
    releaseNotes: manifest.releaseNotes.value.map(noteToJson),
    copyright: fieldValue(manifest.copyright),
    completeness: {
      status: manifest.completeness,
      fieldsComplete: manifest.completeFieldCount,
      fieldsTotal: manifest.totalFieldCount,
      missingFields: allManifestFields(manifest)
        .filter((field) => field.status === "missing")
        .map((field) => field.label),
    },
  };

  return JSON.stringify(document, null, 2);
}

// Which function produces which format — the only place a format name is
// ever mapped to the code that actually generates it. This is the exact
// shape PARSE_BY_FORMAT (folderImport.ts) already proved for Import: a
// future translator (csv, yaml, xml, a distributor JSON shape, a folder or
// ZIP package, an API payload) is one new function beside translateToJson
// plus one new entry in this table and TRANSLATION_FORMAT_LABELS above —
// translateReleaseManifest, every view that calls it, and the Release
// Manifest Engine itself, would all stay exactly as they are today.
const TRANSLATE_BY_FORMAT: Record<TranslationFormat, (manifest: ReleaseManifest) => string> = {
  json: translateToJson,
};

// The one function anything outside this file ever calls. Deliberately
// stateless and side-effect-free: called twice with the same manifest, it
// returns the same string twice — there is nothing to cache, nothing to
// regenerate-because-it-went-stale, because nothing here is ever stored in
// the first place.
export function translateReleaseManifest(manifest: ReleaseManifest, format: TranslationFormat): string {
  return TRANSLATE_BY_FORMAT[format](manifest);
}
