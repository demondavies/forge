import { useState } from "react";
import { resolveSunoGenerateSession } from "../../hooks/browserSessionResolver";
import type { AutomationProgress } from "../../hooks/browserAutomation";
import "./BrowserSessionResolver.css";

// The Browser Session Resolver's own proof surface — rendered as a
// sibling below BrowserAutomationStatusView, rather than inside it: the
// Browser Automation Framework (including its own Settings view) is
// off-limits to modify this sprint. This button triggers the exact same
// resolveSunoGenerateSession() call Generate Track/Generate Album now
// fire automatically (see App.tsx) — the real proof is what happens in
// a creator's own browser, not the message shown here.
function BrowserSessionResolverView() {
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<AutomationProgress | null>(null);

  async function handleResolve() {
    setIsRunning(true);
    const outcome = await resolveSunoGenerateSession();
    setResult(outcome);
    setIsRunning(false);
  }

  return (
    <div className="browser-session-resolver">
      <h2 className="browser-session-resolver-title">🎯 Browser Session Resolver</h2>
      <p className="browser-session-resolver-subtitle">
        When a creator chooses Generate Track or Generate Album, Forge already knows which browser tab it will use
        for Suno Generate — without ever asking which browser, window, or tab. This button triggers that exact same
        resolution on demand.
      </p>
      <button className="secondary browser-session-resolver-btn" disabled={isRunning} onClick={handleResolve}>
        {isRunning ? "Resolving…" : "🎯 Resolve Suno Generate Session"}
      </button>
      {result && (
        <p
          className={`field-label browser-session-resolver-result browser-session-resolver-result-${result.status.toLowerCase()}`}
        >
          {result.status}: {result.detail}
        </p>
      )}
    </div>
  );
}

export default BrowserSessionResolverView;
