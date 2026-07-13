// Prompt Coach — deterministic creative intelligence grounded entirely in
// the creator's own work. No LLM, no embeddings, no network calls: every
// observation comes from counting what has already happened (approved and
// rejected Candidates) and what the creator has already written (listening
// Notes). This file is a pure function — no React, no state, no side
// effects — so it can be called anywhere and tested in isolation.
//
// The data chain that makes this possible: each Candidate records which
// CreativeExecution produced it (executionId), and each CreativeExecution
// records which saved Prompt Version was run (promptVersionId). A Prompt
// Version is an ordinary KnowledgeEntry whose insight field holds the full
// prompt text composed in Prompt Studio. Joining these three tables yields
// "for every approved or rejected Candidate, here is the exact prompt that
// produced it" — which is all this engine ever needs.
import type { Candidate, CreativeExecution, KnowledgeEntry } from "../types";

// Words too common to carry meaning in either approved or rejected prompts.
// Kept small on purpose: the prompt texts Forge produces are already
// structured ("Genre: lo-fi hip hop"), so field-label words ("genre",
// "mood", "energy", etc.) are the only real noise — those labels appear
// equally in every prompt, approved or not, so they cancel out on their
// own even without being in this list. The list exists only for free-form
// prose that might appear in direct-edit prompts.
const STOPWORDS = new Set([
  "a", "an", "the", "and", "or", "but", "in", "on", "at", "to", "for",
  "of", "with", "by", "from", "as", "is", "are", "was", "were", "be",
  "been", "being", "have", "has", "had", "do", "does", "did", "will",
  "would", "could", "should", "may", "might", "must", "can", "this",
  "that", "these", "those", "it", "its", "not", "no", "so", "just",
  "very", "also", "more", "some", "any", "all", "i", "you", "we",
]);

// Pulls the meaningful content out of one prompt text, respecting the
// "Label: value" structure Prompt Studio's own composePromptText produces.
// When a line has a colon, only the value side is extracted (field labels
// like "Genre" or "Instrumentation" would appear in every prompt and add
// nothing). Values are then split by comma — which is how Prompt Studio
// separates ideas within a single field — and each chunk becomes one
// candidate phrase. Free-form text (no colon) is split by comma too.
function extractPhrases(text: string): string[] {
  const phrases: string[] = [];
  for (const line of text.split("\n")) {
    const colonIdx = line.indexOf(":");
    const value = colonIdx >= 0 ? line.slice(colonIdx + 1) : line;
    for (const chunk of value.split(/[,;]+/)) {
      const phrase = chunk.trim().toLowerCase().replace(/[^a-z0-9 \-]/g, "").trim();
      if (phrase.length >= 2 && !STOPWORDS.has(phrase)) {
        phrases.push(phrase);
      }
    }
  }
  return phrases;
}

// Pulls individual words from a listening note — a creator's own short
// observation, so meaningful single words are more useful than phrases.
function extractWords(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 3 && !STOPWORDS.has(w));
}

function countFrequency(items: string[]): Map<string, number> {
  const freq = new Map<string, number>();
  for (const item of items) {
    freq.set(item, (freq.get(item) ?? 0) + 1);
  }
  return freq;
}

// Returns the top N items by frequency, skipping anything in `exclude`.
function topN(freq: Map<string, number>, n: number, exclude = new Set<string>()): string[] {
  return [...freq.entries()]
    .filter(([term]) => !exclude.has(term))
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([term]) => term);
}

export interface PromptCoachAnalysis {
  // Phrases that appear most often across the prompts of approved Candidates.
  approvedPhrases: string[];
  // Phrases from rejected Candidate prompts that are NOT in the approved set
  // — i.e. things the creator did differently when work was turned down.
  rejectedPhrases: string[];
  // Recurring words from listening Notes across all Candidates (any status)
  // — what the creator was noticing and saying while listening.
  noteThemes: string[];
  // A single, data-grounded sentence that names the most actionable pattern
  // visible in the data. Null when there isn't enough signal yet.
  suggestion: string | null;
  // True when at least one of the three signal sets has any content.
  hasEnoughData: boolean;
}

export function analyzeCreativeHistory(
  candidates: Candidate[],
  executions: CreativeExecution[],
  knowledgeEntries: KnowledgeEntry[],
): PromptCoachAnalysis {
  const executionById = new Map(executions.map((e) => [e.id, e]));
  const entryById = new Map(knowledgeEntries.map((k) => [k.id, k]));

  const approvedPhrasesList: string[] = [];
  const rejectedPhrasesList: string[] = [];
  const allNoteWords: string[] = [];

  for (const candidate of candidates) {
    const execution = executionById.get(candidate.executionId);
    const promptEntry = execution ? entryById.get(execution.promptVersionId) : undefined;
    const phrases = promptEntry ? extractPhrases(promptEntry.insight) : [];

    if (candidate.status === "Approved") {
      approvedPhrasesList.push(...phrases);
    } else if (candidate.status === "Rejected") {
      rejectedPhrasesList.push(...phrases);
    }

    for (const note of candidate.notes) {
      allNoteWords.push(...extractWords(note.text));
    }
  }

  const approvedFreq = countFrequency(approvedPhrasesList);
  const rejectedFreq = countFrequency(rejectedPhrasesList);
  const noteFreq = countFrequency(allNoteWords);

  const approvedPhrases = topN(approvedFreq, 5);
  const approvedSet = new Set(approvedPhrases);
  // Exclude terms that also appear in approved work — those aren't
  // distinctive to rejection; only things the creator avoided in approved
  // work but kept using in rejected work are meaningful negative signals.
  const rejectedPhrases = topN(rejectedFreq, 4, approvedSet);
  const noteThemes = topN(noteFreq, 4);

  const hasEnoughData =
    approvedPhrases.length > 0 || rejectedPhrases.length > 0 || noteThemes.length > 0;

  let suggestion: string | null = null;
  if (approvedPhrases.length > 0 && rejectedPhrases.length > 0) {
    suggestion = `Your approved work leans toward "${approvedPhrases[0]}". Rejected takes included "${rejectedPhrases[0]}". Try reinforcing what has already worked.`;
  } else if (approvedPhrases.length >= 2) {
    suggestion = `"${approvedPhrases[0]}" and "${approvedPhrases[1]}" appear consistently in your approved work. Consider anchoring future prompts around these.`;
  } else if (approvedPhrases.length === 1) {
    suggestion = `"${approvedPhrases[0]}" appears in every approved take so far. Consider making it a consistent anchor in future prompts.`;
  } else if (noteThemes.length > 0) {
    suggestion = `Your listening notes mention "${noteThemes[0]}" most often. This may be worth naming directly in future prompts.`;
  }

  return { approvedPhrases, rejectedPhrases, noteThemes, suggestion, hasEnoughData };
}
