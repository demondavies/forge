import { useState, useEffect } from "react";
import type { CreativeExecution } from "../types";
import { UNASSIGNED_PROVIDER } from "../types";

const EXECUTIONS_KEY = "forge.executions";

function loadExecutions(): CreativeExecution[] {
  try {
    const raw = localStorage.getItem(EXECUTIONS_KEY);
    if (!raw) return [];
    return (JSON.parse(raw) as Array<Record<string, unknown>>).map(
      (e) => ({ ...e, createdAt: new Date(e.createdAt as string) }) as CreativeExecution,
    );
  } catch {
    return [];
  }
}

// The raw input needed to queue one execution. "id", "identityId",
// "provider", "status", and "createdAt" aren't included here because the
// engine itself fills those in (see queueExecution below) — a creator only
// ever chooses which project and which prompt version.
export interface QueueExecutionInput {
  projectId: string;
  promptVersionId: string;
}

// queueExecution() can fail validation, so instead of throwing it returns
// this small result object — mirrors CreateReleaseResult/
// CaptureKnowledgeResult exactly.
export interface QueueExecutionResult {
  error: string | null;
  execution: CreativeExecution | null;
}

// Mirrors useReleases()/useAssets(): one hook owns all queued-execution
// state plus the logic that changes it, so components never call useState
// directly. This is the first genuinely creator-owned, creator-mutable
// state this sprint's reasoning stack introduces — unlike Music Workspace,
// Creative Pipeline, Release Manifest, or Translation (all pure read-time
// projections over data that already exists), a queued execution is a real
// request a creator initiates and can take back, so it needs the same
// full create/remove hook shape Release/Asset/Knowledge already have.
//
// Every execution for every identity lives in one flat array, filtered
// down to whichever identity is currently active — the same shape every
// other creator-owned entity in Forge already uses.
export function useStudioQueue(activeIdentityId: string | null) {
  const [executions, setExecutions] = useState<CreativeExecution[]>(loadExecutions);

  useEffect(() => {
    try { localStorage.setItem(EXECUTIONS_KEY, JSON.stringify(executions)); } catch {}
  }, [executions]);

  const executionsForActiveIdentity = executions
    .filter((execution) => execution.identityId === activeIdentityId)
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  function queueExecution(input: QueueExecutionInput): QueueExecutionResult {
    if (!activeIdentityId) {
      return { error: "Select an identity first.", execution: null };
    }

    if (!input.projectId) {
      return { error: "Choose which project this execution belongs to.", execution: null };
    }

    if (!input.promptVersionId) {
      return { error: "Choose a prompt version to queue.", execution: null };
    }

    // No AI provider is chosen here — see UNASSIGNED_PROVIDER's own
    // comment in types.ts. Every execution starts, and this sprint always
    // stays, at "Queued": nothing here simulates progress, a background
    // worker, or a network call.
    const newExecution: CreativeExecution = {
      id: crypto.randomUUID(),
      identityId: activeIdentityId,
      projectId: input.projectId,
      promptVersionId: input.promptVersionId,
      provider: UNASSIGNED_PROVIDER,
      status: "Queued",
      createdAt: new Date(),
    };

    // Functional update — guards against reading a stale `executions` value
    // if multiple updates ever happen in quick succession.
    setExecutions((current) => [...current, newExecution]);

    return { error: null, execution: newExecution };
  }

  // Removing before execution is a real, permanent deletion — not a soft
  // dismiss like a suggested Relationship's. There is nothing here that
  // needs to remember "this was once queued and then taken back out"; once
  // removed, the queue simply no longer contains it.
  function removeExecution(id: string) {
    setExecutions((current) => current.filter((execution) => execution.id !== id));
  }

  return {
    executions: executionsForActiveIdentity,
    // The full, unfiltered list across every identity — kept for parity
    // with every other useX hook's own allX export, even though nothing
    // yet searches queued executions identity-wide the way the Command
    // Palette does for Projects/Knowledge/Assets/Releases/Captures.
    allExecutions: executions,
    queueExecution,
    removeExecution,
  };
}
