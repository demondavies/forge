// The Browser Automation Framework — the stable boundary between Forge's
// own intent ("work with an already-running browser session") and
// whatever, if anything, actually knows how to reach one. This sprint
// defines the contract only: no browser is implemented, nothing here
// opens a socket, makes an HTTP request, or reads a running process
// list. Every function in this file is a pure, synchronous or trivially
// async lookup over an in-memory registry that starts — and, this
// sprint, stays — empty. This isn't a placeholder standing in for a real
// implementation; it's the permanent shape a real one (a Chrome
// DevTools Protocol client, reached through Tauri's own Rust backend, in
// a dedicated follow-up sprint) will satisfy — the same role the
// Execution Provider Framework played before the Suno Service Adapter
// existed.
//
// Core Principle: Forge connects to a browser a creator already has
// open; it never launches one, and never controls a page's own content.
// "No page interaction yet" isn't a temporary simplification of this
// file — it's this file's entire boundary. Clicking, filling forms, and
// reading page content belong, if they ever exist, to a future, separate
// capability layered on top of this one. This framework only discovers,
// locates, activates, and navigates.
//
// This file knows nothing about Suno or any other creative tool.
// WorkspaceSurface (the iframe-hosting layer from a prior sprint) and
// this framework are deliberately unrelated: one embeds a tool inside
// Forge's own window; this one reaches out to a browser window Forge
// doesn't own. Whether the two are ever composed is a future sprint's
// decision, not this one's.

// A supported browser's own identifier — deliberately a plain string,
// not a closed union of real browser names, mirroring
// ExecutionProviderId/CreativeExecution.provider's own reasoning. Forge
// doesn't get to enumerate every real browser in advance; a real target
// brings its own id when it registers (a future "chrome", "edge",
// whatever else).
export type BrowserId = string;

// What Forge can honestly know about whether it currently has a live
// connection to a browser. "not-connected" is the only value any real
// code path produces this sprint — every target must truthfully report
// it. "connected"/"unreachable" exist so a future, real target has
// somewhere honest to report either, without this type needing to change
// when one arrives.
export type BrowserAvailability = "not-connected" | "connected" | "unreachable";

export const BROWSER_AVAILABILITY_LABELS: Record<BrowserAvailability, string> = {
  "not-connected": "Not Connected",
  connected: "Connected",
  unreachable: "Unreachable",
};

// The smallest honest fact Forge can know about one open tab in an
// already-running browser session — enough to identify it and show a
// creator which tab is which, and nothing else. No favicon, no page
// content, no history: this framework only ever locates tabs, it never
// reads what's inside them.
export interface BrowserTab {
  id: string;
  title: string;
  url: string;
}

// Which stage one automation operation is currently in — a closed
// vocabulary of its own, deliberately not a reuse of ExecutionStatus
// (Studio Queue's own vocabulary): a browser automation operation and a
// creative execution are different domains that happen to share a
// similar shape, and conflating them here would mean a future change to
// one silently changes the other's meaning too.
export type AutomationStatus = "Idle" | "InProgress" | "Completed" | "Failed";

// The result of asking the framework to do one thing — discover, locate,
// activate, or navigate. `status` and `detail` are the honest minimum
// every operation can report; `tabs` is optional and only ever populated
// by listTabs/locateTabs, the same reason ProviderStatusReport's own
// `outputs` field (Candidate Import Engine) is optional and
// Completed-only.
export interface AutomationProgress {
  status: AutomationStatus;
  detail: string;
  tabs?: BrowserTab[];
}

// The one interface a future real browser target implements — the
// smallest honest surface this framework needs: who it is, whether Forge
// is currently connected to it, and the three things "working with an
// already-running session" actually means (locating its tabs, activating
// one, and navigating one to a URL). Every method is async because any
// real implementation is inherently asynchronous; declaring that here
// costs nothing today (nothing calls any of these methods this sprint,
// since the registry starts and stays empty) and means a real
// implementation's own shape never has to fight this interface later.
export interface BrowserAutomationTarget {
  id: BrowserId;
  displayName: string;
  checkAvailability(): BrowserAvailability;
  listTabs(): Promise<AutomationProgress>;
  activateTab(tabId: string): Promise<AutomationProgress>;
  navigateTab(tabId: string, url: string): Promise<AutomationProgress>;
}

// The only place a browser automation target is ever registered —
// deliberately a plain array behind three small functions, mirroring the
// Execution Provider Framework's own registry exactly. A future real
// target (a Chrome DevTools Protocol client, reached through Tauri)
// registers itself by constructing one object matching
// BrowserAutomationTarget and calling registerBrowserAutomationTarget
// once; nothing about how it does that is this framework's concern.
const registeredTargets: BrowserAutomationTarget[] = [];

export function registerBrowserAutomationTarget(target: BrowserAutomationTarget): void {
  registeredTargets.push(target);
}

export function listBrowserAutomationTargets(): BrowserAutomationTarget[] {
  return [...registeredTargets];
}

function findBrowserAutomationTarget(id: BrowserId): BrowserAutomationTarget | null {
  return registeredTargets.find((target) => target.id === id) ?? null;
}

// What "discover supported browsers" honestly means today: whatever
// targets are registered, and what each one currently reports about
// itself. Since nothing registers a target this sprint, this always
// returns an empty list — not a guess at what a real browser session
// might look like.
export interface DiscoveredBrowser {
  browserId: BrowserId;
  displayName: string;
  availability: BrowserAvailability;
}

export function discoverBrowsers(): DiscoveredBrowser[] {
  return registeredTargets.map((target) => ({
    browserId: target.id,
    displayName: target.displayName,
    availability: target.checkAvailability(),
  }));
}

// If no target is registered for the requested id — true for every
// browser today, since registeredTargets starts empty and nothing this
// sprint ever registers one — the honest answer is that nothing was ever
// asked, not a guess at what a real browser might have said.
function notRegistered(browserId: BrowserId): AutomationProgress {
  return {
    status: "Failed",
    detail: `No browser automation target is registered for "${browserId}" yet.`,
  };
}

// "Locate tabs" — asks one already-registered target what tabs it
// currently has open.
export async function locateTabs(browserId: BrowserId): Promise<AutomationProgress> {
  const target = findBrowserAutomationTarget(browserId);
  if (!target) return notRegistered(browserId);
  return target.listTabs();
}

// "Activate tabs" — asks one already-registered target to bring one of
// its own tabs to the front. Never reads or changes anything about that
// tab's own content.
export async function activateTab(browserId: BrowserId, tabId: string): Promise<AutomationProgress> {
  const target = findBrowserAutomationTarget(browserId);
  if (!target) return notRegistered(browserId);
  return target.activateTab(tabId);
}

// "Navigate to URLs" — asks one already-registered target to point one
// of its own tabs at a URL. Still not page interaction: Forge names a
// destination, the browser's own navigation takes it there.
export async function navigateTab(browserId: BrowserId, tabId: string, url: string): Promise<AutomationProgress> {
  const target = findBrowserAutomationTarget(browserId);
  if (!target) return notRegistered(browserId);
  return target.navigateTab(tabId, url);
}
