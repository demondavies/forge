// Music Workspace — the first specialisation over the reasoning stack, not
// a new layer of it. Everything here composes data that already exists in
// exactly the shapes it already has: Asset already carries a `type` field
// whose values ("Lyrics", "Audio", "Artwork", ...) already mean exactly
// what a song needs them to mean, Knowledge already represents creative/
// production notes, Release already represents where the song ships. The
// Universal Engines Principle, applied directly: nothing about
// findOpportunities, buildCreativeSession, or AssetType had to become
// music-aware for this file to exist — the *same* generic engines and the
// *same* generic AssetType values a writing session or a leathercraft
// session would use are all this reuses. If those specialisations arrive
// later, this file is the proof they'd each need their own thin
// composition like this one, not a change to anything below it.
import type { Activity, Asset, KnowledgeEntry, Project, Release } from "../types";
import type { DiscoveryContext } from "./relationshipDiscovery";
import { buildCreativeSession } from "./creativeSession";
import type { Opportunity } from "./opportunityEngine";

// A read-time reorganisation of one Project's existing Assets/Knowledge/
// Releases around songwriting and production — never a second place any
// of them live. No existing type could honestly hold "this project's
// creative material, grouped the way a musician actually thinks about it"
// (Project itself is the entity, not a grouped view over its own
// children; Asset/KnowledgeEntry/Release are each just one item). This is
// the smallest new shape that could truthfully express that grouping, and
// every field in it is either a plain filter of already-existing arrays or
// (missingArtworkOpportunity) a single already-computed Opportunity picked
// out by its own existing, unmodified type.
export interface MusicWorkspaceComposition {
  project: Project;
  notes: KnowledgeEntry[];
  lyrics: Asset[];
  audio: Asset[];
  artwork: Asset[];
  releases: Release[];
  // Null when there's nothing to say — either artwork already exists, or
  // there's no release yet for the Opportunity Engine to notice is missing
  // one. Reused, not recomputed: the exact same Opportunity
  // findOpportunities already produced for Creative Sessions, not a
  // second "does this project need artwork" check written here.
  missingArtworkOpportunity: Opportunity | null;
}

// "Reference tracks" and "versions/mixes" are two of the mission's example
// categories, but Forge's Asset model has no field distinguishing an
// inspiration track from the song's own evolving mix — both are simply
// Audio assets. Rather than invent a distinction the data can't truthfully
// support, both live in one honestly-named `audio` group, ordered by
// creation time — which already tells the "how did this song's sound
// evolve" story Versions was asking for, the same way Creative History
// already narrates order-of-events elsewhere, with no new concept needed.
function byCreatedAt(a: Asset, b: Asset): number {
  return a.createdAt.getTime() - b.createdAt.getTime();
}

// The one composition this sprint adds. buildCreativeSession is called
// completely unmodified — its own filtering (this project's Knowledge,
// this project's slice of identity-wide Opportunities) is reused rather
// than re-derived, so Notes and the artwork nudge stay consistent with
// whatever a creator would already see in that project's own Creative
// Session. The only genuinely new work is grouping this project's own
// Assets by their existing `type`, and pulling in Releases, which Creative
// Session doesn't surface at all.
export function buildMusicWorkspace(
  project: Project,
  context: DiscoveryContext,
  activities: Activity[],
): MusicWorkspaceComposition {
  const session = buildCreativeSession(project, context, activities);

  const projectAssets = context.assets.filter((asset) => asset.projectId === project.id);
  const lyrics = projectAssets.filter((asset) => asset.type === "Lyrics");
  const audio = projectAssets.filter((asset) => asset.type === "Audio").sort(byCreatedAt);
  const artwork = projectAssets.filter((asset) => asset.type === "Artwork");
  const releases = context.releases.filter((release) => release.projectId === project.id);

  const missingArtworkOpportunity =
    session.opportunities.find((opportunity) => opportunity.type === "release-missing-artwork") ?? null;

  return {
    project,
    notes: session.relatedKnowledge,
    lyrics,
    audio,
    artwork,
    releases,
    missingArtworkOpportunity,
  };
}
