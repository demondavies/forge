import type { CreativeExecution } from "../types";
import type { ProviderStatusReport } from "./executionProviders";
import type { AddCandidateInput } from "./useCandidates";

// The Candidate Import Engine — deliberately not a persisted concept at
// all. "Provider outputs become Candidates, not Assets" describes a pure
// transformation from one already-defined shape (ProviderStatusReport,
// the Execution Provider Framework's own transient report) into another
// already-defined one (AddCandidateInput, Candidate Review's own
// unmodified input shape) — nothing about that transformation needs to be
// remembered between calls, so there is nothing here to store, and
// nothing new to justify introducing as its own persisted type. External
// outputs are temporary: a provider's report is asked for fresh every
// time (see requestExecutionReport in executionProviders.ts) and is never
// itself written down anywhere.
//
// This file is intentionally narrow: it knows about CreativeExecution and
// ProviderStatusReport (Execution Provider Framework) and AddCandidateInput
// (Candidate Review), and composes the two — but it never calls
// useCandidates.ts's addCandidate itself, and it never imports useAssets.ts
// at all. Actually creating Candidates (and, later, promoting one into an
// Asset) stays a creator-facing composition one layer up, in App.tsx —
// the same place handleApproveCandidate already lives — so this file
// can be reused, tested, and reasoned about with zero React and zero
// hook state.
//
// A report only ever yields importable outputs when the provider itself
// says "Completed" — Queued/Running/Failed all honestly have nothing
// generated yet, and `outputs` being absent (every status this sprint can
// actually produce, since no provider is configured) yields nothing
// either, rather than guessing.
export function outputsToCandidateInputs(
  execution: CreativeExecution,
  report: ProviderStatusReport,
): AddCandidateInput[] {
  if (report.status !== "Completed" || !report.outputs || report.outputs.length === 0) {
    return [];
  }

  return report.outputs.map((output) => ({
    executionId: execution.id,
    title: output.title,
  }));
}
