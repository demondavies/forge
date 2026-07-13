// The Execution Provider Framework — the stable boundary between Forge's
// own canonical Creative Execution model (CreativeExecution, from the
// Studio Queue sprint) and whatever, if anything, eventually performs that
// execution. This sprint defines the contract only: no provider is
// implemented, nothing here makes a network call, opens a socket, reads a
// cookie, or authenticates against anything. Every function in this file
// is a pure, synchronous lookup over an in-memory registry that starts —
// and, this sprint, stays — empty.
//
// Core Principle: Forge owns creative execution; providers perform it.
// Nothing in Studio Queue, Creative Pipeline, Release Manifest, or any
// other engine ever needs to know whether a provider runs locally, inside
// Docker, behind a REST endpoint, on a remote server, or inside a future
// plugin — this file is the only place that distinction could ever
// matter, and today it doesn't even know that either: an
// ExecutionProvider is just an object matching the interface below,
// wherever it came from.
import type { CreativeExecution, ExecutionStatus } from "../types";

// A provider's own identifier — a plain string, deliberately not a closed
// union of real service names (mirrors CreativeExecution.provider's own
// reasoning in types.ts). Forge doesn't get to enumerate providers in
// advance; a provider brings its own id when it registers.
export type ExecutionProviderId = string;

// What Forge can honestly know about whether a provider can currently
// execute work. "not-configured" is the only value any real code path
// produces this sprint — every provider must truthfully report it, per
// this sprint's own Non-Negotiables. "available"/"unavailable" exist so a
// future, real provider implementation has somewhere honest to report
// either, without this type needing to change when one arrives.
export type ProviderAvailability = "not-configured" | "available" | "unavailable";

export const PROVIDER_AVAILABILITY_LABELS: Record<ProviderAvailability, string> = {
  "not-configured": "Not Configured",
  available: "Available",
  unavailable: "Unavailable",
};

// One generated output a provider hands back once it considers an
// execution complete — the smallest honest fact Forge can record about a
// single variant before a creator ever reviews it. `externalId` is the
// provider's own identifier for this specific output (opaque to Forge,
// never parsed or trusted for meaning) so a future import step could tell
// two outputs apart without guessing from a title alone; `title` is the
// one human-readable label Candidate Import hands straight to Candidate
// Review unchanged. Deliberately nothing richer: no audio URL, no
// duration, no waveform — Candidate Review's own preview is a static
// placeholder, so inventing a real media shape here would be exactly the
// kind of audio analysis this sprint's Non-Negotiables forbid.
export interface ProviderOutput {
  externalId: string;
  title: string;
}

// The result of asking a provider about one specific execution — distinct
// from the provider's own general availability (a provider could be
// available in general but still failing on one particular execution).
// `status` reuses ExecutionStatus (Studio Queue's own vocabulary)
// completely unmodified: a provider reports progress in Forge's own
// terms, never invents a second status vocabulary translated back later.
// `outputs` is optional and deliberately only ever meaningful alongside a
// "Completed" status — every other status honestly has nothing generated
// yet to report. Provider Results Are Temporary: nothing in this
// interface is ever written back onto CreativeExecution itself; a fresh
// report is requested every time a creator wants to know.
export interface ProviderStatusReport {
  status: ExecutionStatus;
  detail: string;
  outputs?: ProviderOutput[];
}

// The one interface every future real provider implements — the smallest
// honest surface Forge needs: who it is, what to call it, whether it can
// work right now, and the two things "performing creative execution"
// actually means (starting a CreativeExecution, and later checking on
// it). execute/reportStatus are async because any real implementation — a
// local process, a Docker container, a REST call, a remote service, a
// plugin — is inherently asynchronous; declaring that here costs nothing
// today (nothing calls either method this sprint) and means a real
// implementation's own shape never has to fight this interface later.
export interface ExecutionProvider {
  id: ExecutionProviderId;
  displayName: string;
  checkAvailability(): ProviderAvailability;
  execute(execution: CreativeExecution): Promise<ProviderStatusReport>;
  reportStatus(execution: CreativeExecution): Promise<ProviderStatusReport>;
}

// The only place a provider is ever registered — deliberately a plain
// array behind three small functions, not a class, a plugin loader, or a
// dependency-injection container. A future "Local Suno Service" registers
// itself by constructing one object matching ExecutionProvider and
// calling registerExecutionProvider once; nothing about how it does that
// (a static import at startup, a dynamically loaded plugin, anything
// else) is this framework's concern — the Service Boundary Principle,
// applied literally.
const registeredProviders: ExecutionProvider[] = [];

export function registerExecutionProvider(provider: ExecutionProvider): void {
  registeredProviders.push(provider);
}

export function listExecutionProviders(): ExecutionProvider[] {
  return [...registeredProviders];
}

function findExecutionProvider(id: ExecutionProviderId): ExecutionProvider | null {
  return registeredProviders.find((provider) => provider.id === id) ?? null;
}

// What Studio Queue's own display (see this sprint's own report for why
// that file isn't touched directly) needs for one queued execution: the
// provider it named, what Forge currently knows about that provider's
// state, and whether execution is possible right now. Every field here is
// either echoed straight from the request or answered by asking the
// provider itself — never guessed, never simulated.
export interface ProviderResolution {
  providerId: ExecutionProviderId;
  displayName: string;
  availability: ProviderAvailability;
  canExecute: boolean;
}

// The one function this sprint's UI actually calls. If no provider is
// registered for the requested id — true for every execution today, since
// registeredProviders starts empty and nothing this sprint ever registers
// one — the honest answer is "not-configured", not an error and not a
// guess. Once a real provider registers itself under a matching id, this
// exact function starts answering from that provider's own
// checkAvailability() instead, with no change to itself or to any caller.
export function resolveProviderForExecution(providerId: ExecutionProviderId): ProviderResolution {
  const provider = findExecutionProvider(providerId);

  if (!provider) {
    return {
      providerId,
      displayName: providerId,
      availability: "not-configured",
      canExecute: false,
    };
  }

  const availability = provider.checkAvailability();
  return {
    providerId: provider.id,
    displayName: provider.displayName,
    availability,
    canExecute: availability === "available",
  };
}

// The one function the Candidate Import Engine calls — the framework's
// own answer to "what, if anything, has this provider produced for this
// execution right now." Deliberately asks fresh every time (Provider
// Results Are Temporary): nothing here is cached, and nothing is ever
// written back onto the CreativeExecution itself, the same reason
// RegisteredProvidersView's own execute() results live only in that
// component's transient state. If no provider is registered for this
// execution's requested id — true for every execution today, the same
// reason resolveProviderForExecution above must handle it — the honest
// answer is that nothing has been asked yet, not a guess at what a real
// provider might eventually say.
export async function requestExecutionReport(execution: CreativeExecution): Promise<ProviderStatusReport> {
  const provider = findExecutionProvider(execution.provider);

  if (!provider) {
    return {
      status: "Queued",
      detail: "No execution provider is registered for this request yet — nothing to import.",
    };
  }

  return provider.reportStatus(execution);
}
