// The Suno Service Adapter — Forge's first real Execution Provider, and
// the only file in this app permitted to know that "Suno" exists. Every
// provider-specific concept lives here and nowhere else: no cookie,
// session token, REST endpoint, HTTP payload shape, or authentication
// detail is ever visible to CreativeExecution, Prompt Studio, Studio
// Queue, or Creative Pipeline. Those systems only ever see the same
// ExecutionProvider contract the Execution Provider Framework already
// defined last sprint — this file simply implements it honestly.
//
// Service Boundary Principle, applied literally: this adapter assumes a
// separate Suno service exists somewhere (locally, in Docker, behind a
// REST endpoint, remote — it doesn't matter which, and nothing here
// hardcodes an assumption about that). Forge communicates only with that
// service, and only through this file.
import type { CreativeExecution } from "../types";
import type {
  ExecutionProvider,
  ProviderAvailability,
  ProviderOutput,
  ProviderStatusReport,
} from "../hooks/executionProviders";

const SUNO_PROVIDER_ID = "suno";

// The connection details a real deployment would need to actually reach a
// separately-running Suno service — deliberately never hardcoded to a
// real address, and never read from a committed file. Nothing in this
// sprint ever calls configureSunoService, which is exactly why
// checkAvailability() below always, honestly, reports "not-configured":
// there is truly nothing configured yet, not a fake or hidden default.
interface SunoServiceConnection {
  serviceUrl: string;
  apiKey: string;
}

let connection: SunoServiceConnection | null = null;

// The one function a future settings surface (not built yet) would call
// once a creator actually points Forge at a running Suno service. Trimmed
// and validated so "configured with blank strings" can never masquerade
// as real configuration.
export function configureSunoService(config: SunoServiceConnection): void {
  const serviceUrl = config.serviceUrl.trim();
  const apiKey = config.apiKey.trim();
  connection = serviceUrl && apiKey ? { serviceUrl, apiKey } : null;
}

// Synchronous, per the ExecutionProvider contract this file must not
// change — so this can only ever honestly answer "do we have connection
// details," never "is the remote service actually reachable right now"
// (that would require a real network round trip, which a synchronous
// function can't make). Whether a *configured* service is actually
// reachable is exactly what execute()/reportStatus() below discover for
// real, per attempt, never assumed here.
function checkAvailability(): ProviderAvailability {
  return connection ? "available" : "not-configured";
}

// The only place any assumed shape of a Suno response is ever named. If
// Suno's real response schema turns out to look different once this
// adapter is actually pointed at a live service, this is the only
// function that would need to change — every canonical system above the
// Execution Provider Framework boundary stays exactly as it is. Provider
// Results Are Temporary: this returns the smallest canonical fact Studio
// Queue could ever need (a status Forge already understands, plus one
// human-readable note) — never the raw payload itself.
// Translates Suno's own assumed "outputs" shape into the framework's
// ProviderOutput — the only place that assumed shape is ever named, same
// as translateSunoResponse itself below. Falls back to an honest,
// positional title/id when Suno's own fields are missing or the wrong
// type, rather than dropping the output or throwing.
function translateSunoOutputs(record: Record<string, unknown>): ProviderOutput[] {
  if (!Array.isArray(record.outputs)) return [];

  const suffix = ["A", "B", "C", "D", "E", "F", "G", "H"];
  return record.outputs.map((rawOutput, index) => {
    const output = typeof rawOutput === "object" && rawOutput !== null ? (rawOutput as Record<string, unknown>) : {};
    const baseTitle = typeof output.title === "string" ? output.title : `Suno Output`;
    const label = suffix[index] ?? String(index + 1);
    return {
      externalId: typeof output.id === "string" ? output.id : `suno-output-${index}`,
      title: `${baseTitle} — ${label}`,
    };
  });
}

function translateSunoResponse(payload: unknown): ProviderStatusReport {
  if (typeof payload !== "object" || payload === null) {
    return { status: "Failed", detail: "Suno service returned an unrecognised response." };
  }

  const record = payload as Record<string, unknown>;
  const rawStatus = typeof record.status === "string" ? record.status.toLowerCase() : "";

  if (rawStatus === "completed" || rawStatus === "succeeded") {
    return {
      status: "Completed",
      detail: "Suno reported this execution as complete.",
      outputs: translateSunoOutputs(record),
    };
  }
  if (rawStatus === "failed" || rawStatus === "error") {
    return { status: "Failed", detail: "Suno reported this execution as failed." };
  }
  if (rawStatus === "running" || rawStatus === "processing") {
    return { status: "Running", detail: "Suno is still processing this execution." };
  }

  return { status: "Queued", detail: "Suno accepted the request; no progress reported yet." };
}

// Submits one CreativeExecution for generation. Translates only the one
// canonical fact Suno's own submission could honestly need
// (promptVersionId) — never the whole CreativeExecution record, never any
// of Forge's other internal ids. Fails closed, honestly, rather than
// simulating a network attempt that was never actually possible: with no
// connection configured, there is truly nothing to submit to, so this
// returns a real "Failed" report rather than a fake "Queued"/"Running"
// one.
async function execute(execution: CreativeExecution): Promise<ProviderStatusReport> {
  if (!connection) {
    return {
      status: "Failed",
      detail: "Suno Service Adapter has no configured service connection. Nothing was submitted.",
    };
  }

  try {
    const response = await fetch(`${connection.serviceUrl}/executions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${connection.apiKey}`,
      },
      body: JSON.stringify({ promptVersionId: execution.promptVersionId }),
    });

    if (!response.ok) {
      return { status: "Failed", detail: `Suno service responded with ${response.status}.` };
    }

    return translateSunoResponse(await response.json());
  } catch (error) {
    return {
      status: "Failed",
      detail: error instanceof Error ? `Could not reach Suno service: ${error.message}` : "Could not reach Suno service.",
    };
  }
}

// Queries the current state of one already-submitted execution. Same
// fail-closed honesty as execute(): no connection means no real question
// was ever asked, so this reports that truthfully instead of guessing.
async function reportStatus(execution: CreativeExecution): Promise<ProviderStatusReport> {
  if (!connection) {
    return {
      status: "Failed",
      detail: "Suno Service Adapter has no configured service connection.",
    };
  }

  try {
    const response = await fetch(`${connection.serviceUrl}/executions/${execution.id}/status`, {
      headers: { Authorization: `Bearer ${connection.apiKey}` },
    });

    if (!response.ok) {
      return { status: "Failed", detail: `Suno service responded with ${response.status}.` };
    }

    return translateSunoResponse(await response.json());
  } catch (error) {
    return {
      status: "Failed",
      detail: error instanceof Error ? `Could not reach Suno service: ${error.message}` : "Could not reach Suno service.",
    };
  }
}

// The one object this file exposes — a plain implementation of
// ExecutionProvider, nothing more. Registered via registerProviders.ts
// (see that file's own comment), using the Execution Provider Framework's
// existing, completely unmodified registerExecutionProvider function.
export const sunoServiceAdapter: ExecutionProvider = {
  id: SUNO_PROVIDER_ID,
  displayName: "Suno",
  checkAvailability,
  execute,
  reportStatus,
};
