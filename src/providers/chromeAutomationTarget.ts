// Chrome Automation Target — the first real implementation of the
// Browser Automation Framework's frozen BrowserAutomationTarget contract
// (src/hooks/browserAutomation.ts, unchanged by this sprint). This file
// is the only place in the whole TypeScript app allowed to know that
// Tauri's Rust backend, CDP, or a debugger port exists — mirroring how
// sunoServiceAdapter.ts is the only file allowed to know Suno exists.
// Every real network call (HTTP to a browser's remote-debugging port,
// WebSocket for Page.navigate) happens in Rust
// (src-tauri/src/chrome_automation.rs); this file only ever forwards a
// request across Tauri's own invoke() boundary and hands back whatever
// AutomationProgress comes back, unchanged.
import { invoke } from "@tauri-apps/api/core";
import type { AutomationProgress, BrowserAutomationTarget, BrowserAvailability } from "../hooks/browserAutomation";

const CHROME_TARGET_ID = "chrome";

// checkAvailability() must stay synchronous — the frozen
// BrowserAutomationTarget contract requires it, the same reason
// sunoServiceAdapter.ts's own checkAvailability() never makes a live
// network call either. It can only ever report what the last real,
// async operation below actually found — Provider Results Are Temporary,
// applied to browsers instead of generation providers. Starts
// "not-connected": nothing has asked a real question yet.
let lastKnownAvailability: BrowserAvailability = "not-connected";

function rememberAvailabilityFrom(progress: AutomationProgress): AutomationProgress {
  lastKnownAvailability = progress.status === "Completed" ? "connected" : "unreachable";
  return progress;
}

function checkAvailability(): BrowserAvailability {
  return lastKnownAvailability;
}

// "Discover Chrome/Edge instances running with remote debugging
// enabled" — not part of the frozen BrowserAutomationTarget interface
// (discovery isn't modeled as one of its per-target async methods), so
// this is exposed as a plain extra export a concrete UI may call
// directly — the same relationship configureSunoService has to
// ProviderSettingsView's own Suno-specific form.
export async function discoverChromeInstances(): Promise<AutomationProgress> {
  const progress = await invoke<AutomationProgress>("discover_chrome_targets");
  return rememberAvailabilityFrom(progress);
}

async function listTabs(): Promise<AutomationProgress> {
  const progress = await invoke<AutomationProgress>("list_chrome_tabs");
  return rememberAvailabilityFrom(progress);
}

async function activateTab(tabId: string): Promise<AutomationProgress> {
  const progress = await invoke<AutomationProgress>("activate_chrome_tab", { tabId });
  return rememberAvailabilityFrom(progress);
}

async function navigateTab(tabId: string, url: string): Promise<AutomationProgress> {
  const progress = await invoke<AutomationProgress>("navigate_chrome_tab", { tabId, url });
  return rememberAvailabilityFrom(progress);
}

// "Deliver prompt and trigger generation on a Suno Generate tab" — the
// first Forge command that touches a page's own content. Restricted to
// Suno Generate. Outside the frozen BrowserAutomationTarget interface
// (page interaction is not modeled there), same extra-export relationship
// that discoverChromeInstances has to discovery.
export async function automateSunoPage(tabId: string, promptText: string): Promise<AutomationProgress> {
  const progress = await invoke<AutomationProgress>("automate_suno_generate", { tabId, promptText });
  return rememberAvailabilityFrom(progress);
}

// The one object this file exposes to the framework — a plain
// implementation of BrowserAutomationTarget, nothing more. Registered via
// registerBrowserAutomationTargets.ts (see that file's own comment),
// using the Browser Automation Framework's existing, completely
// unmodified registerBrowserAutomationTarget function.
export const chromeAutomationTarget: BrowserAutomationTarget = {
  id: CHROME_TARGET_ID,
  displayName: "Chrome / Edge (DevTools Protocol)",
  checkAvailability,
  listTabs,
  activateTab,
  navigateTab,
};
