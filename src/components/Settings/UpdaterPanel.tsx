import { useUpdater } from "../../hooks/useUpdater";
import "./ProviderSettings.css";

function UpdaterPanel() {
  const { currentVersion, state, checkForUpdate, installUpdate } = useUpdater();

  return (
    <div className="updater-panel">
      <h2 className="provider-settings-title">⬆️ Working Studio</h2>
      <p className="field-label">
        Current version: <strong>{currentVersion ?? "…"}</strong>
      </p>

      {state.kind === "checking" && (
        <p className="field-label">Checking for updates…</p>
      )}

      {state.kind === "up-to-date" && (
        <div className="updater-row">
          <p className="field-label">You're on the latest version.</p>
          <button className="secondary updater-check-btn" onClick={checkForUpdate}>
            Check Again
          </button>
        </div>
      )}

      {state.kind === "available" && (
        <div className="updater-card">
          <p className="updater-title">Working Studio Update Available</p>
          <p className="updater-version">{state.version}</p>
          {state.notes && (
            <ul className="updater-notes">
              {state.notes
                .split("\n")
                .map((line) => line.trim())
                .filter(Boolean)
                .map((line, i) => (
                  <li key={i}>{line.replace(/^[•\-*]\s*/, "")}</li>
                ))}
            </ul>
          )}
          <button className="updater-install-btn" onClick={installUpdate}>
            Install Update
          </button>
        </div>
      )}

      {state.kind === "downloading" && (
        <div className="updater-progress">
          <p className="field-label">
            Downloading…
            {state.total !== null && state.total > 0
              ? ` ${Math.round((state.downloaded / state.total) * 100)}%`
              : ""}
          </p>
          <div className="updater-progress-bar">
            <div
              className="updater-progress-fill"
              style={{
                width:
                  state.total !== null && state.total > 0
                    ? `${Math.round((state.downloaded / state.total) * 100)}%`
                    : "0%",
              }}
            />
          </div>
        </div>
      )}

      {state.kind === "installing" && (
        <p className="field-label">Installing… Forge will restart automatically.</p>
      )}

      {state.kind === "error" && (
        <div className="updater-row">
          <p className="field-label updater-error">Update check failed.</p>
          <button className="secondary updater-check-btn" onClick={checkForUpdate}>
            Retry
          </button>
        </div>
      )}
    </div>
  );
}

export default UpdaterPanel;
