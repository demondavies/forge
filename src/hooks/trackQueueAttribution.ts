// Track Queue Attribution — the smallest possible composition connecting
// two facts that already exist: which Prompt Version a Creative Execution
// was submitted for (CreativeExecution.promptVersionId, from Studio
// Queue), and which Planned Track that Prompt Version was explicitly
// written for (Prompt Attribution's own getAttributedTrackId, from last
// sprint). No new persisted concept is introduced here — an execution's
// track is never stored anywhere; it's read fresh, every time, straight
// from data two earlier sprints already produced. Studio Queue never
// learns a track exists; Prompt Attribution never learns an execution
// exists. This file is the only place that reads both, and it only ever
// reads — nothing here writes to any hook's state.
//
// Core Principle, applied literally: an execution doesn't carry its own
// track choice (there is nothing here to choose — Canonical Truth forbids
// picking this manually) — it simply inherits whatever its own prompt
// version was already, honestly, declared to belong to. An execution
// queued from an album-wide prompt is, and stays, album-wide; nothing
// here ever infers otherwise from a title, a filename, or anything else.
import type { CreativeExecution, PlannedTrack } from "../types";

// Which Planned Track (if any) requested this execution — resolved purely
// by composition, never guessed. Returns null for an execution whose own
// prompt version was never attributed (or whose attributed track no
// longer exists), which is the same honest "Album-wide" state Prompt
// Attribution itself already uses.
export function resolveExecutionTrack(
  execution: CreativeExecution,
  getAttributedTrackId: (promptVersionId: string) => string | null,
  tracks: PlannedTrack[],
): PlannedTrack | null {
  const trackId = getAttributedTrackId(execution.promptVersionId);
  if (!trackId) return null;
  return tracks.find((track) => track.id === trackId) ?? null;
}

// One group of executions sharing the same resolved track — `track: null`
// is the honest "Album-wide" bucket, exactly mirroring how Track Workspace
// already labels an unattributed prompt.
export interface ExecutionTrackGroup {
  track: PlannedTrack | null;
  executions: CreativeExecution[];
}

// Groups a project's own queued executions by the track that requested
// them. Attributed groups are listed in the same order their tracks were
// planned in; the Album-wide bucket (if anything belongs there) always
// comes last, since it's the fallback, not the primary lens.
export function groupExecutionsByTrack(
  executions: CreativeExecution[],
  getAttributedTrackId: (promptVersionId: string) => string | null,
  tracks: PlannedTrack[],
): ExecutionTrackGroup[] {
  const albumWide: CreativeExecution[] = [];
  const byTrackId = new Map<string, CreativeExecution[]>();

  for (const execution of executions) {
    const track = resolveExecutionTrack(execution, getAttributedTrackId, tracks);
    if (!track) {
      albumWide.push(execution);
      continue;
    }
    const existing = byTrackId.get(track.id) ?? [];
    existing.push(execution);
    byTrackId.set(track.id, existing);
  }

  const trackGroups: ExecutionTrackGroup[] = tracks
    .filter((track) => byTrackId.has(track.id))
    .map((track) => ({ track, executions: byTrackId.get(track.id) as CreativeExecution[] }));

  return albumWide.length > 0 ? [...trackGroups, { track: null, executions: albumWide }] : trackGroups;
}
