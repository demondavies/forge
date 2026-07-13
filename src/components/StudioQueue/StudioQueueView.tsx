import type { CreativeExecution, KnowledgeEntry, Project } from "../../types";
import { isPromptVersion } from "../../hooks/promptComposition";
import type { QueueExecutionInput, QueueExecutionResult } from "../../hooks/useStudioQueue";
import { formatDate } from "../../utils/formatDate";
import "./StudioQueue.css";

interface StudioQueueViewProps {
  project: Project;
  knowledgeEntries: KnowledgeEntry[];
  executions: CreativeExecution[];
  onQueueExecution: (input: QueueExecutionInput) => QueueExecutionResult;
  onRemoveExecution: (id: string) => void;
  onOpenKnowledgeEntry: (id: string) => void;
  onOpenPromptStudio: (projectId: string) => void;
}

// Forge's first execution engine — but this file itself performs no
// execution at all. It only ever does two things: list the project's own
// saved Prompt Versions (recognised the same way Prompt Studio and Release
// Manifest already recognise them, via the completely unmodified
// isPromptVersion) so one can be queued, and list whatever's already been
// queued for this project. Queueing calls the real onQueueExecution
// straight through to useStudioQueue.ts; nothing here decides what
// "Queued" means, generates anything, or advances a status — that is
// deliberately absent this sprint.
function StudioQueueView({
  project,
  knowledgeEntries,
  executions,
  onQueueExecution,
  onRemoveExecution,
  onOpenKnowledgeEntry,
  onOpenPromptStudio,
}: StudioQueueViewProps) {
  const promptVersions = knowledgeEntries.filter(
    (entry) => entry.projectId === project.id && isPromptVersion(entry),
  );
  const projectExecutions = executions.filter((execution) => execution.projectId === project.id);

  function findPromptVersion(id: string): KnowledgeEntry | null {
    return knowledgeEntries.find((entry) => entry.id === id) ?? null;
  }

  return (
    <div className="studio-queue">
      <div className="studio-queue-header">
        <h3 className="studio-queue-title">⚙️ Studio Queue</h3>
        <p className="studio-queue-subtitle">
          Queue a saved prompt version for future generation. Forge doesn't generate anything yet —
          this only tracks what's been requested.
        </p>
      </div>

      {promptVersions.length === 0 ? (
        <p className="field-label">
          No prompt versions saved yet.{" "}
          <button className="studio-queue-link-btn" onClick={() => onOpenPromptStudio(project.id)}>
            Open Prompt Studio
          </button>{" "}
          to create one.
        </p>
      ) : (
        <div className="studio-queue-prompt-list">
          {promptVersions.map((entry) => (
            <div key={entry.id} className="studio-queue-prompt-row">
              <button className="studio-queue-prompt-title" onClick={() => onOpenKnowledgeEntry(entry.id)}>
                {entry.title}
              </button>
              <button
                className="secondary studio-queue-add-btn"
                onClick={() => onQueueExecution({ projectId: project.id, promptVersionId: entry.id })}
              >
                + Queue for Generation
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="studio-queue-list">
        <h4 className="studio-queue-list-title">Queued Executions</h4>
        {projectExecutions.length === 0 ? (
          <p className="field-label">Nothing queued for this project yet.</p>
        ) : (
          projectExecutions.map((execution) => {
            const promptVersion = findPromptVersion(execution.promptVersionId);
            return (
              <div key={execution.id} className="studio-queue-execution-card">
                <div className="studio-queue-execution-header">
                  <button
                    className="studio-queue-prompt-title"
                    onClick={() => onOpenKnowledgeEntry(execution.promptVersionId)}
                  >
                    {promptVersion?.title ?? "Prompt version no longer available"}
                  </button>
                  <span
                    className={`badge studio-queue-status-badge studio-queue-status-${execution.status.toLowerCase()}`}
                  >
                    {execution.status}
                  </span>
                </div>
                <p className="studio-queue-execution-meta">
                  Provider: {execution.provider} · Queued {formatDate(execution.createdAt)}
                </p>
                {/* Removal only ever makes sense before execution — this
                    sprint, every item is always "Queued", but the guard
                    stays honest for whenever a future engine actually
                    advances a status. */}
                {execution.status === "Queued" && (
                  <button
                    className="secondary studio-queue-remove-btn"
                    onClick={() => onRemoveExecution(execution.id)}
                  >
                    ✕ Remove
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export default StudioQueueView;
