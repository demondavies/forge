// Pure function — no React, no state, no side effects. Given what Forge
// already knows about a track (title, description), its project (name,
// type, sibling tracks), and the user's captured knowledge, returns 1-3
// candidate lyric-prompt strings the Companion can surface in the editor.
//
// "Prompt" mode in Suno means the user writes a *description* of what
// they want the lyrics to be about, and Suno's own AI writes the actual
// lyrics. These suggestions are starting points for that description —
// assembled deterministically from Forge's own data, never invented.
import type { KnowledgeEntry, PlannedTrack, Project } from "../types";

export interface LyricPromptSuggestion {
  source: "track" | "project" | "knowledge";
  label: string;
  text: string;
}

export function buildLyricPromptSuggestions(
  track: PlannedTrack,
  project: Project,
  projectTracks: PlannedTrack[],
  knowledgeEntries: KnowledgeEntry[],
  styles: string,
): LyricPromptSuggestion[] {
  const suggestions: LyricPromptSuggestion[] = [];
  const styleHint = styles.trim() ? `, with a ${styles.trim()} feel` : "";

  // 1. Track-focused — always available. Uses description if set.
  const descHint = track.description ? ` — ${track.description}` : "";
  suggestions.push({
    source: "track",
    label: "From this track",
    text: `A song called "${track.title}"${descHint}${styleHint}. Describe the mood, narrative perspective, and emotional arc. What story does this song tell?`,
  });

  // 2. Album/EP context — when sibling tracks exist, hint at cohesion.
  const siblings = projectTracks.filter((t) => t.id !== track.id);
  if (siblings.length > 0) {
    const trackNumber = projectTracks.findIndex((t) => t.id === track.id) + 1;
    const siblingList = siblings
      .slice(0, 3)
      .map((t) => `"${t.title}"`)
      .join(", ");
    suggestions.push({
      source: "project",
      label: `From ${project.name}`,
      text: `Track ${trackNumber} of ${projectTracks.length} in "${project.name}" (${project.type}), alongside ${siblingList}. Write lyrics for "${track.title}" that feel cohesive with this collection${styleHint}.`,
    });
  }

  // 3. Knowledge-seeded — pull the most relevant captured insight.
  // Prefer entries that mention the track title; fall back to the most
  // recently created project entry with meaningful content.
  const projectEntries = knowledgeEntries
    .filter((e) => e.projectId === project.id && e.insight.trim().length > 30)
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  const titleLower = track.title.toLowerCase();
  const relevant =
    projectEntries.find(
      (e) =>
        e.insight.toLowerCase().includes(titleLower) ||
        e.title.toLowerCase().includes(titleLower),
    ) ?? projectEntries[0];

  if (relevant) {
    const snippet =
      relevant.insight.length > 120
        ? relevant.insight.slice(0, 120).trimEnd() + "…"
        : relevant.insight;
    suggestions.push({
      source: "knowledge",
      label: `From "${relevant.title}"`,
      text: `${snippet} Write lyrics for "${track.title}" that capture this idea${styleHint}.`,
    });
  }

  return suggestions;
}
