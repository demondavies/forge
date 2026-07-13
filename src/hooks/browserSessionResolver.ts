// The Browser Session Resolver — the one place Forge decides "which
// browser tab will actually be used for Suno Generate," so that a
// creator choosing Generate Track/Generate Album (Generation Request
// Engine's own composition, in App.tsx) never has to pick a browser, a
// window, or a tab themselves (Intent Before Provider).
//
// Compose Existing Systems Only: this file imports nothing but the
// Browser Automation Framework's own frozen, unmodified exports
// (discoverBrowsers/locateTabs/activateTab/navigateTab) and the
// Workspace Surface catalog's own Suno Generate definition — its `url`
// field, nothing else. It never imports Chrome Automation Target
// directly, and never hardcodes which registered target id actually
// answers (today, "chrome" — a future second registered browser target
// would work here with zero changes to this file, since it iterates
// whatever discoverBrowsers() returns).
//
// Human-Visible Automation: every action this resolver takes — bringing
// a tab to the front, pointing it at a URL — is something a creator can
// see happen in their own browser in real time. No DOM interaction, no
// clicking inside a page, no form filling: activating and navigating a
// tab (the framework's own two real capabilities) is the whole of it.
import { WORKSPACE_SURFACE_DEFINITIONS } from "../types";
import { activateTab, discoverBrowsers, locateTabs, navigateTab } from "./browserAutomation";
import type { AutomationProgress, BrowserId, BrowserTab } from "./browserAutomation";

const SUNO_GENERATE_SURFACE_ID = "suno-generate";

// "Locate an existing Suno Generate tab. Activate it if found. Navigate
// to the Generate page if required. If no suitable tab exists, open a
// new one. Return a resolved browser session to the Browser Automation
// Framework." — this function is that sentence, expressed purely as
// composition of the frozen framework's own four operations plus one
// already-existing catalog fact (Suno Generate's own URL).
export async function resolveSunoGenerateSession(): Promise<AutomationProgress> {
  const sunoDefinition = WORKSPACE_SURFACE_DEFINITIONS.find(
    (definition) => definition.id === SUNO_GENERATE_SURFACE_ID,
  );
  if (!sunoDefinition) {
    return { status: "Failed", detail: "No Suno Generate workspace surface is defined." };
  }

  const registeredBrowsers = discoverBrowsers();
  if (registeredBrowsers.length === 0) {
    return { status: "Failed", detail: "No browser automation target is registered yet." };
  }

  for (const browser of registeredBrowsers) {
    // A registered target's own listTabs() is outside this resolver's
    // control — Compose Existing Systems Only means trusting whatever a
    // future second target does, without assuming it always resolves
    // cleanly. One target throwing (rather than honestly resolving to a
    // Failed AutomationProgress) shouldn't stop the resolver from still
    // trying any other registered browser.
    try {
      const listing = await locateTabs(browser.browserId);
      if (listing.status === "Completed" && listing.tabs) {
        return resolveWithinBrowser(browser.browserId, listing.tabs, sunoDefinition.url);
      }
    } catch {
      continue;
    }
  }

  return {
    status: "Failed",
    detail: "No reachable browser session was found for Suno Generate.",
  };
}

async function resolveWithinBrowser(
  browserId: BrowserId,
  tabs: BrowserTab[],
  generateUrl: string,
): Promise<AutomationProgress> {
  const existingSunoTab = tabs.find((tab) => tab.url.includes("suno.com"));
  if (existingSunoTab) {
    return useTab(browserId, existingSunoTab, generateUrl, "existing Suno tab");
  }

  // No suitable tab exists. The Browser Automation Framework has no
  // "open a brand new tab" operation — Chrome Automation Target (frozen
  // this sprint) only locates, activates, and navigates tabs that
  // already exist — so the closest honest way to "open a new one" is to
  // repurpose a tab that isn't showing anything else yet, preferring a
  // blank tab over disturbing one that already holds a creator's own
  // work. If literally no tab is open at all, this honestly fails rather
  // than pretending a tab was found.
  const blankTab = tabs.find((tab) => tab.url === "about:blank" || tab.url === "");
  const tabToRepurpose = blankTab ?? tabs[0];

  if (!tabToRepurpose) {
    return { status: "Failed", detail: "No open tab is available to use for Suno Generate." };
  }

  return useTab(browserId, tabToRepurpose, generateUrl, "repurposed tab");
}

async function useTab(
  browserId: BrowserId,
  tab: BrowserTab,
  generateUrl: string,
  origin: "existing Suno tab" | "repurposed tab",
): Promise<AutomationProgress> {
  const activated = await activateTab(browserId, tab.id);
  if (activated.status !== "Completed") return activated;

  if (tab.url.startsWith(generateUrl)) {
    return {
      status: "Completed",
      detail: `Using ${origin} "${tab.title || tab.url}" for Suno Generate.`,
      tabs: [tab],
    };
  }

  const navigated = await navigateTab(browserId, tab.id, generateUrl);
  if (navigated.status !== "Completed") return navigated;

  return {
    status: "Completed",
    detail: `Navigated ${origin} "${tab.title || tab.url}" to Suno Generate.`,
    tabs: [{ ...tab, url: generateUrl }],
  };
}
