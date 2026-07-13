import { useState } from "react";
import { listExecutionProviders, PROVIDER_AVAILABILITY_LABELS } from "../../hooks/executionProviders";
import { configureSunoService } from "../../providers/sunoServiceAdapter";
import "./ProviderSettings.css";

// Provider Settings — the one place a creator can actually configure an
// Execution Provider from inside Forge. This view knows nothing about
// what "configured" means for any given provider: it lists whatever
// listExecutionProviders() returns (the same generic call
// RegisteredProvidersView already uses) and reads each one's own
// checkAvailability() fresh on every render — the exact same, completely
// unmodified source of truth Registered Providers and Execution Provider
// Status already read. No duplicated provider state: nothing here is
// cached beyond the lifetime of one render, and nothing is written back
// anywhere except through configureSunoService itself.
//
// Suno is the one provider this build can actually configure, so its form
// is named plainly rather than built as a generic "provider config
// schema" this sprint never asked for — a second real provider would need
// its own small form here, calling its own exported configure function,
// the same way this one does. The only thing imported from the adapter is
// the one function it already exported for exactly this purpose
// (configureSunoService's own comment: "The one function a future
// settings surface... would call") — trimming, validation, and the
// connection's own shape all stay inside the adapter, unchanged.
function SunoConfigForm({ onSaved }: { onSaved: () => void }) {
  const [serviceUrl, setServiceUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [savedCount, setSavedCount] = useState(0);

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    configureSunoService({ serviceUrl, apiKey });
    setSavedCount((count) => count + 1);
    // The availability badge above lives in the parent's own render, not
    // this form's — a state update in here alone would re-render only
    // this form, leaving the badge showing stale data. onSaved tells the
    // parent to re-render itself, which re-reads checkAvailability() fresh
    // the same way it always does; still no state duplicated, just a
    // prompt for the parent to look again.
    onSaved();
  }

  return (
    <form className="provider-settings-form" onSubmit={handleSubmit}>
      <div className="field">
        <label className="field-label" htmlFor="suno-service-url">
          Service URL
        </label>
        <input
          id="suno-service-url"
          type="text"
          placeholder="http://localhost:5959"
          value={serviceUrl}
          onChange={(event) => setServiceUrl(event.target.value)}
        />
      </div>
      <div className="field">
        <label className="field-label" htmlFor="suno-api-key">
          API Key
        </label>
        <input
          id="suno-api-key"
          type="password"
          placeholder="Suno service API key"
          value={apiKey}
          onChange={(event) => setApiKey(event.target.value)}
        />
      </div>
      <button type="submit" className="secondary provider-settings-save-btn">
        Save Configuration
      </button>
      {savedCount > 0 && <p className="field-label">Saved.</p>}
    </form>
  );
}

function ProviderSettingsView() {
  const providers = listExecutionProviders();
  // Bumped whenever a provider is saved, purely to force this component to
  // re-render and re-read checkAvailability() fresh (see SunoConfigForm's
  // onSaved) — the value itself is never read.
  const [, setRefreshCount] = useState(0);

  return (
    <div className="provider-settings">
      <h2 className="provider-settings-title">🔌 Provider Settings</h2>
      <p className="provider-settings-subtitle">
        Configure the execution providers Forge already knows how to talk to. Nothing here executes anything —
        Studio Queue and Candidate Import decide, on their own, when to actually ask a configured provider for
        something.
      </p>

      {providers.length === 0 ? (
        <p className="field-label">No execution providers are registered in this build yet.</p>
      ) : (
        providers.map((provider) => {
          const availability = provider.checkAvailability();
          return (
            <div key={provider.id} className="provider-settings-card">
              <div className="provider-settings-header">
                <span className="provider-settings-name">{provider.displayName}</span>
                <span className={`badge provider-settings-badge provider-settings-${availability}`}>
                  {PROVIDER_AVAILABILITY_LABELS[availability]}
                </span>
              </div>
              <p className="field-label">
                {availability === "not-configured"
                  ? "Not configured — Forge has no connection details for this provider yet."
                  : "Configured — Forge has connection details for this provider."}
              </p>
              {provider.id === "suno" && (
                <SunoConfigForm onSaved={() => setRefreshCount((count) => count + 1)} />
              )}
            </div>
          );
        })
      )}
    </div>
  );
}

export default ProviderSettingsView;
