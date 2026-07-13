import { useState } from "react";
import {
  discoverBrowsers,
  locateTabs,
  activateTab,
  navigateTab,
  BROWSER_AVAILABILITY_LABELS,
} from "../../hooks/browserAutomation";
import type { AutomationProgress, BrowserTab } from "../../hooks/browserAutomation";
import { discoverChromeInstances } from "../../providers/chromeAutomationTarget";
import "./BrowserAutomation.css";

const CHROME_BROWSER_ID = "chrome";

// The Browser Automation Framework's one visible surface — proof that
// the frozen contract (src/hooks/browserAutomation.ts, unmodified by
// this sprint) now runs against a real, already-running browser session
// through the Chrome Automation Target. Every button here calls the same
// framework functions Settings already exposed before a real target
// existed; discoverChromeInstances is the one exception, reached
// directly from the concrete adapter, since "discover" isn't modeled as
// a per-target async method on the frozen interface — the same relationship
// ProviderSettingsView's Suno form has to configureSunoService.
function BrowserAutomationStatusView() {
  const [refreshCount, setRefreshCount] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [discoverResult, setDiscoverResult] = useState<AutomationProgress | null>(null);
  const [tabsResult, setTabsResult] = useState<AutomationProgress | null>(null);
  const [tabActionResults, setTabActionResults] = useState<Record<string, AutomationProgress>>({});
  const [navigateDrafts, setNavigateDrafts] = useState<Record<string, string>>({});

  // Re-reads checkAvailability() fresh after every real operation — the
  // value itself is never read, only the state change matters (mirrors
  // ProviderSettingsView's own refreshCount fix).
  void refreshCount;
  const browsers = discoverBrowsers();

  async function handleDiscover() {
    setIsRunning(true);
    const result = await discoverChromeInstances();
    setDiscoverResult(result);
    setRefreshCount((count) => count + 1);
    setIsRunning(false);
  }

  async function handleLocateTabs() {
    setIsRunning(true);
    const result = await locateTabs(CHROME_BROWSER_ID);
    setTabsResult(result);
    setTabActionResults({});
    setRefreshCount((count) => count + 1);
    setIsRunning(false);
  }

  async function handleActivate(tab: BrowserTab) {
    const result = await activateTab(CHROME_BROWSER_ID, tab.id);
    setTabActionResults((current) => ({ ...current, [tab.id]: result }));
    setRefreshCount((count) => count + 1);
  }

  async function handleNavigate(tab: BrowserTab) {
    const url = (navigateDrafts[tab.id] ?? "").trim();
    if (!url) return;
    const result = await navigateTab(CHROME_BROWSER_ID, tab.id, url);
    setTabActionResults((current) => ({ ...current, [tab.id]: result }));
    setRefreshCount((count) => count + 1);
  }

  return (
    <div className="browser-automation">
      <h2 className="browser-automation-title">🌐 Browser Automation</h2>
      <p className="browser-automation-subtitle">
        Forge can connect to an already-running browser session — discovering it, locating its tabs, activating
        one, and navigating it to a URL. Forge never launches a browser, and never reads or changes a page's own
        content. Launch Chrome or Edge with --remote-debugging-port=9222 (or 9223) for Forge to find it.
      </p>

      {browsers.length === 0 ? (
        <p className="field-label">No browser automation targets are registered in this build yet.</p>
      ) : (
        browsers.map((browser) => (
          <div key={browser.browserId} className="browser-automation-row">
            <span className="browser-automation-name">{browser.displayName}</span>
            <span className={`badge browser-automation-badge browser-automation-${browser.availability}`}>
              {BROWSER_AVAILABILITY_LABELS[browser.availability]}
            </span>
          </div>
        ))
      )}

      <div className="browser-automation-test">
        <button className="secondary browser-automation-test-btn" disabled={isRunning} onClick={handleDiscover}>
          {isRunning ? "Asking…" : "🔍 Discover"}
        </button>
        {discoverResult && (
          <p
            className={`field-label browser-automation-result browser-automation-result-${discoverResult.status.toLowerCase()}`}
          >
            {discoverResult.status}: {discoverResult.detail}
          </p>
        )}

        <button className="secondary browser-automation-test-btn" disabled={isRunning} onClick={handleLocateTabs}>
          {isRunning ? "Asking…" : "📑 Locate Tabs"}
        </button>
        {tabsResult && (
          <p
            className={`field-label browser-automation-result browser-automation-result-${tabsResult.status.toLowerCase()}`}
          >
            {tabsResult.status}: {tabsResult.detail}
          </p>
        )}

        {tabsResult?.tabs && tabsResult.tabs.length > 0 && (
          <div className="browser-automation-tabs">
            {tabsResult.tabs.map((tab) => (
              <div key={tab.id} className="browser-automation-tab-row">
                <div className="browser-automation-tab-info">
                  <span className="browser-automation-tab-title">{tab.title || "(untitled tab)"}</span>
                  <p className="field-label">{tab.url}</p>
                </div>
                <div className="browser-automation-tab-actions">
                  <button className="secondary" onClick={() => handleActivate(tab)}>
                    ▶ Activate
                  </button>
                  <input
                    type="text"
                    placeholder="https://…"
                    value={navigateDrafts[tab.id] ?? ""}
                    onChange={(event) =>
                      setNavigateDrafts((current) => ({ ...current, [tab.id]: event.target.value }))
                    }
                  />
                  <button className="secondary" onClick={() => handleNavigate(tab)}>
                    🧭 Navigate
                  </button>
                </div>
                {tabActionResults[tab.id] && (
                  <p
                    className={`field-label browser-automation-result browser-automation-result-${tabActionResults[
                      tab.id
                    ].status.toLowerCase()}`}
                  >
                    {tabActionResults[tab.id].status}: {tabActionResults[tab.id].detail}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default BrowserAutomationStatusView;
