import { useState } from "react";
import type { CreativeExecution, KnowledgeEntry, Project } from "../../types";
import { listExecutionProviders, PROVIDER_AVAILABILITY_LABELS } from "../../hooks/executionProviders";
import type { ProviderStatusReport } from "../../hooks/executionProviders";
import "./RegisteredProviders.css";

interface RegisteredProvidersViewProps {
  project: Project;
  executions: CreativeExecution[];
  knowledgeEntries: KnowledgeEntry[];
}

// Proof that the Execution Provider Framework can reach a real, registered
// provider — rendered as a sibling below Execution Provider Status rather
// than inside it, since the framework's own view is off-limits to modify
// this sprint (the same reason every prior "host is off-limits" sprint
// added its surface in Workspace.tsx instead). This component itself knows
// nothing about Suno specifically: it lists whatever
// listExecutionProviders() returns, generically, so a second registered
// provider would appear here identically with zero changes to this file.
function RegisteredProvidersView({ project, executions, knowledgeEntries }: RegisteredProvidersViewProps) {
  const providers = listExecutionProviders();
  const projectExecutions = executions.filter((execution) => execution.projectId === project.id);

  // Provider Results Are Temporary: an execute() result lives only here,
  // in this component's own transient state, purely for display — it is
  // never written back into CreativeExecution or any other canonical
  // record, and vanishes the moment this view unmounts.
  const [results, setResults] = useState<Record<string, ProviderStatusReport>>({});
  const [runningKey, setRunningKey] = useState<string | null>(null);

  if (providers.length === 0) return null;

  async function handleExecute(providerId: string, execution: CreativeExecution) {
    const provider = providers.find((candidate) => candidate.id === providerId);
    if (!provider) return;

    const key = `${providerId}:${execution.id}`;
    setRunningKey(key);
    // The one real call this sprint proves: a genuine CreativeExecution,
    // already sitting in Studio Queue's own state, handed to a real
    // provider through the framework's own contract — never simulated,
    // never pre-filled with a fake success.
    const report = await provider.execute(execution);
    setResults((current) => ({ ...current, [key]: report }));
    setRunningKey(null);
  }

  return (
    <div className="registered-providers">
      <h4 className="registered-providers-title">🔌 Registered Execution Providers</h4>
      <p className="registered-providers-subtitle">
        Providers Forge currently knows how to talk to, through the Execution Provider Framework.
      </p>
      {providers.map((provider) => {
        const availability = provider.checkAvailability();
        return (
          <div key={provider.id} className="registered-provider-card">
            <div className="registered-provider-header">
              <span className="registered-provider-name">{provider.displayName}</span>
              <span className={`badge registered-provider-badge registered-provider-${availability}`}>
                {PROVIDER_AVAILABILITY_LABELS[availability]}
              </span>
            </div>
            {projectExecutions.length === 0 ? (
              <p className="registered-provider-empty">No queued executions in this project to test with yet.</p>
            ) : (
              projectExecutions.map((execution) => {
                const promptVersion = knowledgeEntries.find((entry) => entry.id === execution.promptVersionId);
                const key = `${provider.id}:${execution.id}`;
                const result = results[key];
                return (
                  <div key={execution.id} className="registered-provider-execution-row">
                    <span className="registered-provider-execution-label">
                      {promptVersion?.title ?? "Queued execution"}
                    </span>
                    <button
                      className="secondary registered-provider-execute-btn"
                      disabled={runningKey === key}
                      onClick={() => handleExecute(provider.id, execution)}
                    >
                      {runningKey === key ? "Executing…" : `▶ Execute via ${provider.displayName}`}
                    </button>
                    {result && (
                      <span
                        className={`registered-provider-result registered-provider-result-${result.status.toLowerCase()}`}
                      >
                        {result.status}: {result.detail}
                      </span>
                    )}
                  </div>
                );
              })
            )}
          </div>
        );
      })}
    </div>
  );
}

export default RegisteredProvidersView;
