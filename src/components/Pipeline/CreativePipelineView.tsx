import type {
  Activity,
  Asset,
  Capture,
  Identity,
  KnowledgeEntry,
  Project,
  Relationship,
  Release,
} from "../../types";
import type { DiscoveryContext } from "../../hooks/relationshipDiscovery";
import { buildCreativePipeline } from "../../hooks/creativePipeline";
import type { CreativePipelineCallbacks, PipelineStage } from "../../hooks/creativePipeline";
import "./CreativePipeline.css";

interface CreativePipelineViewProps extends CreativePipelineCallbacks {
  project: Project;
  identity: Identity;
  knowledgeEntries: KnowledgeEntry[];
  assets: Asset[];
  releases: Release[];
  captures: Capture[];
  relationships: Relationship[];
  activities: Activity[];
}

// One stage, rendered the same way regardless of which system it's
// summarising — a title, a status pill, a short fact, and at most one
// button. No stage is allowed a second button, a checklist, or a percentage:
// this is the entire vocabulary a Pipeline stage is permitted to speak in.
function PipelineStageCard({ stage }: { stage: PipelineStage }) {
  return (
    <div className="pipeline-stage-card">
      <div className="pipeline-stage-header">
        <h3 className="pipeline-stage-title">{stage.title}</h3>
        <span className={`badge pipeline-status-badge pipeline-status-${stage.status}`}>
          {stage.status === "complete" ? "Complete" : stage.status === "in-progress" ? "In Progress" : "Not Started"}
        </span>
      </div>
      <p className="pipeline-stage-summary">{stage.summary}</p>
      {stage.action && (
        <button className="secondary pipeline-stage-action-btn" onClick={stage.action.onClick}>
          {stage.action.icon} {stage.action.label}
        </button>
      )}
    </div>
  );
}

// The calm answer to one question — "where is this project right now?" —
// composed entirely from engines that already exist. This view owns no
// business logic of its own beyond calling buildCreativePipeline and
// rendering its output; deleting this whole folder leaves Prompt Studio,
// Music Workspace, Release Manifest, and Translation completely
// unaffected, because none of them know this file exists.
function CreativePipelineView({
  project,
  identity,
  knowledgeEntries,
  assets,
  releases,
  captures,
  relationships,
  activities,
  onCaptureKnowledge,
  onAddAsset,
  onCreateRelease,
  onOpenPromptStudio,
  onOpenReleaseManifest,
  onOpenReleaseTranslation,
}: CreativePipelineViewProps) {
  const discoveryContext: DiscoveryContext = {
    identities: [identity],
    projects: [project],
    knowledgeEntries,
    assets,
    releases,
    captures,
    relationships,
  };

  const pipeline = buildCreativePipeline(project, identity, discoveryContext, activities, {
    onCaptureKnowledge,
    onAddAsset,
    onCreateRelease,
    onOpenPromptStudio,
    onOpenReleaseManifest,
    onOpenReleaseTranslation,
  });

  return (
    <div className="creative-pipeline">
      <div className="pipeline-header">
        <h3 className="pipeline-title">🧭 Creative Pipeline</h3>
        <p className="pipeline-current-stage">
          {pipeline.currentStage
            ? `Right now, this project is at: ${pipeline.currentStage.title}.`
            : "Every stage Forge can currently observe is complete."}
        </p>
      </div>
      <div className="pipeline-stage-list">
        {pipeline.stages.map((stage) => (
          <PipelineStageCard key={stage.id} stage={stage} />
        ))}
      </div>
    </div>
  );
}

export default CreativePipelineView;
