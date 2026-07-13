import type { CreativeExecution, KnowledgeEntry, Project } from "../../types";
import { PROVIDER_AVAILABILITY_LABELS, resolveProviderForExecution } from "../../hooks/executionProviders";
import "./ExecutionProviderStatus.css";

interface ExecutionProviderStatusViewProps {
  project: Project;
  executions: CreativeExecution[];
  knowledgeEntries: KnowledgeEntry[];
}

// The Execution Provider Framework's one visible surface this sprint —
// rendered beside Studio Queue's own display rather than inside it, since
// Studio Queue is off-limits to modify this sprint (the same reason
// Prompt Studio's and Creative Pipeline's own entry points live in
// Workspace.tsx rather than inside the files they compose). Studio Queue
// already shows each queued item's requested provider and its stored
// status; this adds exactly the two new facts this sprint asks for — the
// provider's current, honestly-resolved state, and whether execution is
// possible right now — by asking the framework, never by guessing or
// simulating either.
function ExecutionProviderStatusView({ project, executions, knowledgeEntries }: ExecutionProviderStatusViewProps) {
  const projectExecutions = executions.filter((execution) => execution.projectId === project.id);

  // Graceful Disappearance: nothing queued, nothing to report — this
  // block simply isn't rendered rather than showing an empty shell.
  if (projectExecutions.length === 0) return null;

  return (
    <div className="execution-provider-status">
      <h4 className="execution-provider-status-title">🔌 Execution Providers</h4>
      <p className="execution-provider-status-subtitle">
        What Forge currently knows about each queued item's requested provider.
      </p>
      <div className="execution-provider-rows">
        {projectExecutions.map((execution) => {
          const resolution = resolveProviderForExecution(execution.provider);
          const promptVersion = knowledgeEntries.find((entry) => entry.id === execution.promptVersionId);
          return (
            <div key={execution.id} className="execution-provider-row">
              <span className="execution-provider-label">{promptVersion?.title ?? "Queued execution"}</span>
              <span className={`badge execution-provider-badge execution-provider-${resolution.availability}`}>
                {PROVIDER_AVAILABILITY_LABELS[resolution.availability]}
              </span>
              <span className="execution-provider-can-execute">
                {resolution.canExecute ? "Execution possible" : "Execution not yet possible"}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default ExecutionProviderStatusView;
