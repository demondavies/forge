import { useEffect, useState } from "react";
import "./App.css";
import Sidebar from "./components/Sidebar/Sidebar";
import Workspace from "./components/Workspace/Workspace";
import CreateIdentityModal from "./components/Modal/CreateIdentityModal";
import CreateProjectModal from "./components/Modal/CreateProjectModal";
import CaptureKnowledgeModal from "./components/Knowledge/CaptureKnowledgeModal";
import CreateAssetModal from "./components/Asset/CreateAssetModal";
import CreateReleaseModal from "./components/Release/CreateReleaseModal";
import CommandPalette from "./components/CommandPalette/CommandPalette";
import QuickCaptureModal from "./components/CommandPalette/QuickCaptureModal";
import ConnectToModal from "./components/Relationships/ConnectToModal";
import ImportModal from "./components/Import/ImportModal";
import FolderImportModal from "./components/Import/FolderImportModal";
import { pickFolderAsImportSources, pickVaultAsImportSources, pickAudioFiles, revealInExplorer } from "./native/nativeFolderSource";
import { useStudioResources } from "./hooks/useStudioResources";
// Side-effect only: registers every real Execution Provider this build
// includes (today, just the Suno Service Adapter) into the Execution
// Provider Framework's own registry. Nothing here is used directly by
// App.tsx — importing it is the entire integration cost.
import "./providers/registerProviders";
// Side-effect only: registers every real Browser Automation Target this
// build includes (today, just the Chrome Automation Target) into the
// Browser Automation Framework's own registry. Nothing here is used
// directly by App.tsx — importing it is the entire integration cost.
import "./providers/registerBrowserAutomationTargets";
import { BLUEPRINT_DEFINITIONS } from "./hooks/blueprints";
import type { BlueprintId } from "./hooks/blueprints";
import { useIdentities } from "./hooks/useIdentities";
import type { CreateIdentityInput } from "./hooks/useIdentities";
import { useProjects } from "./hooks/useProjects";
import type { CreateProjectInput } from "./hooks/useProjects";
import { useKnowledge } from "./hooks/useKnowledge";
import type { CaptureKnowledgeInput } from "./hooks/useKnowledge";
import { useAssets } from "./hooks/useAssets";
import type { CreateAssetInput } from "./hooks/useAssets";
import { useReleases } from "./hooks/useReleases";
import type { CreateReleaseInput } from "./hooks/useReleases";
import { useCaptures } from "./hooks/useCaptures";
import type { CreateCaptureInput } from "./hooks/useCaptures";
import { useActivity } from "./hooks/useActivity";
import { useRelationships } from "./hooks/useRelationships";
import { useStudioQueue } from "./hooks/useStudioQueue";
import { usePlannedTracks } from "./hooks/usePlannedTracks";
import { usePromptAttributions } from "./hooks/usePromptAttributions";
import { useCandidates } from "./hooks/useCandidates";
import { requestExecutionReport } from "./hooks/executionProviders";
import { outputsToCandidateInputs } from "./hooks/candidateImport";
import { resolveGenerationProvider, resolveTrackPromptVersion } from "./hooks/generationRequest";
import { deliverPromptForTrack } from "./hooks/promptDeliveryEngine";
import type { ProjectDownloadContext } from "./hooks/promptDeliveryEngine";
import type { SaveAndGenerateResult } from "./components/ProjectStudio/ProjectStudioView";
import type { SunoPrompt } from "./types";
import { serializeSunoPrompt } from "./types";
import { useProductionConsole } from "./hooks/useProductionConsole";
import { useWorkspaceSurface } from "./hooks/useWorkspaceSurface";
import { useCommandPalette } from "./hooks/useCommandPalette";
import type { CommandResultData, QuickCaptureType } from "./hooks/useCommandPalette";
import { truncateText } from "./utils/truncateText";
import type { Candidate, CreativeExecution, ObjectRef, PlannedTrack, WorkspaceSection } from "./types";

function App() {
  // useIdentities encapsulates all identity state and logic (the list,
  // which one is selected, creating new ones with validation). App.tsx just
  // wires that up to the UI — it doesn't manage any of it directly.
  const { identities, selectedIdentity, selectIdentity, createIdentity } = useIdentities();

  // Projects, knowledge, assets, releases, and captures all belong to
  // whichever identity is currently selected. Passing that id into each
  // hook means none of them ever has to reason about any other identity's
  // data, and all of them automatically show something different whenever
  // selectedIdentity changes. Each hook also exposes an unfiltered "all"
  // list (allProjects, allEntries, ...) for the Command Palette, which
  // searches across every identity at once; ConnectToModal's search reuses
  // the exact same matching function, but with the identity-scoped lists
  // instead (a Relationship can't span identities) — see below.
  const { projects, archivedProjects, allProjects, selectedProject, selectProject, createProject, archiveProject, unarchiveProject, removeProject } = useProjects(
    selectedIdentity?.id ?? null,
  );
  const {
    entries: knowledgeEntries,
    allEntries: allKnowledgeEntries,
    selectedEntry: selectedKnowledgeEntry,
    selectEntry,
    captureKnowledge,
    removeEntry: removeKnowledgeEntry,
  } = useKnowledge(selectedIdentity?.id ?? null);
  const { assets, allAssets, selectedAsset, selectAsset, createAsset, removeAsset } = useAssets(
    selectedIdentity?.id ?? null,
  );
  const { releases, allReleases, selectedRelease, selectRelease, createRelease } = useReleases(
    selectedIdentity?.id ?? null,
  );
  const { captures, allCaptures, selectedCapture, selectCapture, createCapture } = useCaptures(
    selectedIdentity?.id ?? null,
  );

  // Studio Queue's own state — the first genuinely creator-owned,
  // creator-mutable data this reasoning stack introduces since Release/
  // Asset/Knowledge/Capture themselves. No activity logging wrapper here
  // (unlike handleCreateIdentity/handleCreateProject/... below): Activity
  // is part of the Creative Knowledge Engine, off-limits to extend this
  // sprint, and queueing/removing an execution isn't one of its existing
  // ActivityTypes.
  const { executions, queueExecution, removeExecution } = useStudioQueue(selectedIdentity?.id ?? null);

  // Album Production's own state — mirrors Studio Queue's own reasoning
  // exactly: a planned track is genuinely creator-owned, creator-mutable
  // data, not a derived projection, so it needs its own hook. No activity
  // logging wrapper here either, for the same reason: Activity is part of
  // the Creative Knowledge Engine, off-limits to extend this sprint, and
  // planning/removing a track isn't one of its existing ActivityTypes.
  const { tracks: plannedTracks, planTrack, removeTrack, finishTrack, reopenTrack, updateTrack } = usePlannedTracks(selectedIdentity?.id ?? null);

  // Prompt Attribution's own state — the same reasoning as Studio Queue
  // and Album Production: a creator's own declared choice is real,
  // creator-authored data, not something any existing engine derives. No
  // activity logging wrapper here either, for the same reason those two
  // skip it: Activity is part of the Creative Knowledge Engine, off-limits
  // to extend this sprint, and declaring an attribution isn't one of its
  // existing ActivityTypes.
  const { attributions, attributePrompt, getAttributedTrackId } = usePromptAttributions(selectedIdentity?.id ?? null);

  // Candidate Review's own state — the same reasoning as every other
  // creator-owned entity above: a candidate's existence, and a creator's
  // approval or rejection of it, are real declared facts. No activity
  // logging wrapper for adding/rejecting a candidate, for the same reason
  // Studio Queue/Album Production/Prompt Attribution all skip it (Activity
  // is part of the off-limits Creative Knowledge Engine, and neither
  // action is one of its existing ActivityTypes) — but approving one
  // *does* eventually log an Activity, automatically, because it results
  // in a real Asset via handleCreateAsset below, which already logs
  // "Asset Added" for every other caller too.
  const { candidates, addCandidate, addCandidateFromFile, addNote, approveCandidate, rejectCandidate, setCandidatePromotion } = useCandidates(selectedIdentity?.id ?? null);

  const {
    studioResources,
    attachments,
    importResources,
    deleteResource: deleteStudioResource,
    renameResource: renameStudioResource,
    attachResource,
    detachResource,
  } = useStudioResources(selectedIdentity?.id ?? null);

  // Workspace Surface's own session state — not identity-scoped (see
  // useWorkspaceSurface.ts's own comment), the same reason
  // activeBlueprint/firstBlueprintVisit below aren't either.
  const { messages: consoleMessages, addMessage: addConsoleMessage, clearMessages: clearConsole } = useProductionConsole();

  const {
    openSurfaceId: workspaceSurfaceOpenId,
    lastOpenedSurfaceId: workspaceSurfaceLastOpenedId,
    openSurface: openWorkspaceSurface,
    closeSurface: closeWorkspaceSurface,
  } = useWorkspaceSurface();

  // Activity is a derived history, not something a user creates directly —
  // recordActivity is only ever called from the wrapper functions below,
  // right after the matching createX() call actually succeeds.
  const { activities, recordActivity } = useActivity(selectedIdentity?.id ?? null);

  // The Relationship Engine. Suggestions are written by
  // discoverRelationshipsFor (called from ProjectWorkspace); a creator
  // confirms or dismisses one, or — new this sprint — creates one directly
  // via createManualRelationship, reached through the "+ Connect To…"
  // button (see ConnectToModal below). All three write to the exact same
  // relationships array; there is no separate manual-connection system.
  const {
    relationships,
    getRelationshipsFor,
    confirmRelationship,
    dismissRelationship,
    discoverRelationshipsFor,
    createManualRelationship,
  } = useRelationships(selectedIdentity?.id ?? null);

  // Thin wrappers: call the real hook, and if it succeeded, log one
  // activity from the entity it just created. Keeping this here (rather
  // than inside each hook) means useIdentities/useProjects/useKnowledge/
  // useAssets/useReleases/useCaptures stay entirely unaware that activity
  // logging exists — no duplicated logic, no coupling between feature hooks.
  function handleCreateIdentity(input: CreateIdentityInput) {
    const result = createIdentity(input);
    if (result.identity) {
      recordActivity({
        identityId: result.identity.id,
        type: "Identity Created",
        title: `Created identity "${result.identity.name}"`,
        relatedObjectType: "identity",
        relatedObjectId: result.identity.id,
      });
    }
    return result;
  }

  function handleCreateProject(input: CreateProjectInput) {
    const result = createProject(input);
    if (result.project) {
      recordActivity({
        identityId: result.project.identityId,
        type: "Project Created",
        title: `Created project "${result.project.name}"`,
        relatedObjectType: "project",
        relatedObjectId: result.project.id,
      });
    }
    return result;
  }

  function handleCaptureKnowledge(input: CaptureKnowledgeInput) {
    const result = captureKnowledge(input);
    if (result.entry) {
      recordActivity({
        identityId: result.entry.identityId,
        type: "Knowledge Captured",
        title: `Captured knowledge "${result.entry.title}"`,
        relatedObjectType: "knowledge",
        relatedObjectId: result.entry.id,
      });
    }
    return result;
  }

  function handleCreateAsset(input: CreateAssetInput) {
    const result = createAsset(input);
    if (result.asset) {
      recordActivity({
        identityId: result.asset.identityId,
        type: "Asset Added",
        title: `Added asset "${result.asset.name}"`,
        relatedObjectType: "asset",
        relatedObjectId: result.asset.id,
      });
    }
    return result;
  }

  // Studio Resource Import: opens a multi-select file picker, then registers
  // every selected file as a StudioResource for the active identity. No
  // project, no track, no album — audio enters the studio first.
  async function handleImportAudio() {
    const filePaths = await pickAudioFiles();
    if (filePaths.length === 0) return;
    importResources(filePaths);
  }

  // File-import candidate: opens a multi-select audio file picker and adds
  // one Candidate per chosen file directly to the given track, bypassing
  // the generation chain entirely. The synthetic executionId ensures no
  // existing Set.has() checks accidentally match a real execution.
  async function handleAddCandidateFromFile(track: PlannedTrack) {
    const filePaths = await pickAudioFiles();
    for (const filePath of filePaths) {
      const fileName = filePath.split(/[\\/]/).pop() ?? filePath;
      addCandidateFromFile({ trackId: track.id, title: fileName, filePath });
    }
  }

  // Reveal in Explorer: opens the system file manager at the given path.
  // Fire-and-forget — errors (e.g. file moved) surface as OS-level notices.
  function handleRevealInExplorer(filePath: string) {
    revealInExplorer(filePath);
  }

  function handleRenameStudioResource(id: string, name: string) {
    renameStudioResource(id, name);
  }

  function handleAttachResource(resourceId: string, trackId: string) {
    attachResource(resourceId, trackId);
  }

  function handleDetachResource(resourceId: string, trackId: string) {
    detachResource(resourceId, trackId);
  }

  // Candidate Review's one cross-system moment: approving a candidate
  // means promoting it into a real Audio Asset, "using the existing asset
  // workflow" exactly as this sprint's mission requires. Reuses
  // handleCreateAsset completely unmodified — including its own Activity
  // logging, so Creative History narrates the promotion automatically,
  // with nothing added here to make that happen. The candidate itself is
  // never deleted; approveCandidate only ever marks it Approved and
  // records which Asset it became.
  function handleApproveCandidate(candidate: Candidate) {
    const execution = executions.find((e) => e.id === candidate.executionId);
    let projectId = execution?.projectId;
    if (!projectId && candidate.trackId) {
      projectId = plannedTracks.find((t) => t.id === candidate.trackId)?.projectId;
    }
    if (!projectId) return;

    const result = handleCreateAsset({
      name: candidate.title,
      type: "Audio",
      projectId,
      description: "Promoted from Candidate Review.",
    });

    if (result.asset) {
      approveCandidate(candidate.id, result.asset.id);
    }
  }

  // Resolve all other candidates attributed to the same track(s) as
  // `candidateId` — needed by the two promotion handlers below to enforce
  // the "only one per track" constraint without teaching useCandidates.ts
  // anything about the attribution chain.
  function getSiblingCandidateIds(candidateId: string): string[] {
    const candidate = candidates.find((c) => c.id === candidateId);
    if (!candidate) return [];
    const execution = executions.find((e) => e.id === candidate.executionId);
    if (!execution) {
      // Manual candidate: siblings are others filed directly to the same track.
      if (!candidate.trackId) return [];
      return candidates
        .filter((c) => c.id !== candidateId && c.trackId === candidate.trackId)
        .map((c) => c.id);
    }
    const trackIds = new Set(
      attributions
        .filter((a) => a.promptVersionId === execution.promptVersionId)
        .map((a) => a.trackId),
    );
    const siblingVersionIds = new Set(
      attributions.filter((a) => trackIds.has(a.trackId)).map((a) => a.promptVersionId),
    );
    const siblingExecIds = new Set(
      executions.filter((e) => siblingVersionIds.has(e.promptVersionId)).map((e) => e.id),
    );
    return candidates
      .filter((c) => c.id !== candidateId && siblingExecIds.has(c.executionId))
      .map((c) => c.id);
  }

  function handleSetCurrentBest(candidateId: string) {
    setCandidatePromotion(candidateId, "isCurrentBest", getSiblingCandidateIds(candidateId));
  }

  function handleSetAlbumVersion(candidateId: string) {
    setCandidatePromotion(candidateId, "isAlbumVersion", getSiblingCandidateIds(candidateId));
  }

  // Candidate Import's one cross-system moment: asking the Execution
  // Provider Framework what a given execution's provider has produced
  // (requestExecutionReport — a fresh, honest question, never a cached or
  // guessed answer), turning any reported outputs into plain
  // AddCandidateInput values (outputsToCandidateInputs — a pure function,
  // candidateImport.ts itself never touches useCandidates.ts), and only
  // then calling addCandidate for each one. Mirrors handleApproveCandidate
  // immediately above: the cross-system composition lives here, in
  // App.tsx, never inside either narrow hook. No Asset is ever created by
  // this path — approval remains the only way a Candidate becomes canonical.
  async function handleImportCandidates(execution: CreativeExecution) {
    const report = await requestExecutionReport(execution);
    const inputs = outputsToCandidateInputs(execution, report);

    inputs.forEach((input) => addCandidate(input));

    if (inputs.length === 0) {
      return { imported: 0, message: report.detail };
    }
    return { imported: inputs.length, message: `Imported ${inputs.length} candidate(s) from ${execution.provider}.` };
  }

  // Generation Request Engine's one cross-system moment: resolving which
  // of a track's own attributed prompt versions to queue
  // (resolveTrackPromptVersion — a pure function; generationRequest.ts
  // itself never touches useStudioQueue.ts) and then calling the
  // existing, completely unmodified queueExecution for it. Mirrors
  // handleApproveCandidate/handleImportCandidates above: this is where
  // Generation Request Engine composes with Studio Queue and the
  // Execution Provider Framework, never inside either of those systems'
  // own narrow hooks. queueExecution still always sets provider to
  // UNASSIGNED_PROVIDER — nothing here changes that, or persists
  // resolveGenerationProvider's own answer anywhere; see
  // generationRequest.ts's own comment for why (Provider Results Are
  // Temporary — the resolution is re-asked fresh, purely for display,
  // every time a creator generates something).
  function handleGenerateTrack(track: PlannedTrack) {
    const promptVersion = resolveTrackPromptVersion(track.id, attributions, knowledgeEntries);
    if (!promptVersion) {
      return { queued: false, message: `Write a prompt for "${track.title}" in Prompt Studio first.` };
    }

    const execResult = queueExecution({ projectId: track.projectId, promptVersionId: promptVersion.id });
    if (!execResult.execution) {
      return { queued: false, message: execResult.error ?? "Could not queue generation." };
    }

    const resolution = resolveGenerationProvider();
    const providerNote =
      resolution.source === "none" ? "no execution provider is available yet" : `Forge will use ${resolution.displayName}`;

    // Prompt Delivery Engine: fire-and-forget, best-effort. Generate
    // Track's own synchronous result (GenerateTrackPanel calls
    // onGenerateTrack and reads .message immediately — Generation
    // Request Engine's own frozen contract) never waits on delivery.
    // Progress is reported through the Production Console.
    //
    // Download Watcher: onDownload is the bridge between the watcher and
    // Candidate Review. deliverPromptForTrack calls it with the detected
    // filename; the actual candidate creation (which execution to associate,
    // how to title it) is this function's decision, not the engine's.
    clearConsole();
    const executionId = execResult.execution.id;
    const trackProject = projects.find((p) => p.id === track.projectId);
    const projectContext: ProjectDownloadContext | undefined = trackProject
      ? { projectType: trackProject.type, projectName: trackProject.name }
      : undefined;
    void deliverPromptForTrack(
      track,
      attributions,
      knowledgeEntries,
      addConsoleMessage,
      (filename, filePath) => {
        void filename;
        const importResult = addCandidate({ executionId, title: track.title, filePath });
        if (importResult.candidate) {
          addConsoleMessage("Candidate imported.");
          addConsoleMessage("Ready for review.");
        } else {
          addConsoleMessage(`Downloaded file could not be associated with an active generation.`);
          addConsoleMessage("Manual import may be required.");
        }
      },
      projectContext,
    );

    return { queued: true, message: `Queued "${promptVersion.title}" for generation — ${providerNote}.` };
  }

  // Project Studio's generate flow: saves the prompt as a new version,
  // attributes it to the track, queues execution, and starts CDP delivery
  // — all in one action, using synchronously-returned values to build
  // fresh arrays for deliverPromptForTrack so it always sees the new entry.
  function handleSaveAndGenerateTrack(track: PlannedTrack, prompt: SunoPrompt): SaveAndGenerateResult {
    const trackAttrList = attributions.filter((a) => a.trackId === track.id);
    const attrVersionIds = new Set(trackAttrList.map((a) => a.promptVersionId));
    const trackVersionCount = knowledgeEntries.filter(
      (e) => e.projectId === track.projectId && attrVersionIds.has(e.id),
    ).length;

    const saveResult = handleCaptureKnowledge({
      title: `${track.title} - Prompt v${trackVersionCount + 1}`,
      insight: serializeSunoPrompt(prompt),
      source: "Experiment",
      projectId: track.projectId,
    });
    if (!saveResult.entry) {
      return { queued: false, message: saveResult.error ?? "Could not save prompt." };
    }

    const attrResult = attributePrompt({ promptVersionId: saveResult.entry.id, trackId: track.id });
    if (!attrResult.attribution) {
      return { queued: false, message: attrResult.error ?? "Could not attribute prompt." };
    }

    const execResult = queueExecution({ projectId: track.projectId, promptVersionId: saveResult.entry.id });
    if (!execResult.execution) {
      return { queued: false, message: execResult.error ?? "Could not queue generation." };
    }

    const resolution = resolveGenerationProvider();
    const providerNote =
      resolution.source === "none" ? "no execution provider is available yet" : `Forge will use ${resolution.displayName}`;

    const freshKnowledge = [...knowledgeEntries, saveResult.entry];
    const freshAttributions = [...attributions, attrResult.attribution];

    clearConsole();
    const executionId = execResult.execution.id;
    const studioProject = projects.find((p) => p.id === track.projectId);
    const studioProjectContext: ProjectDownloadContext | undefined = studioProject
      ? { projectType: studioProject.type, projectName: studioProject.name }
      : undefined;
    void deliverPromptForTrack(
      track,
      freshAttributions,
      freshKnowledge,
      addConsoleMessage,
      (filename, filePath) => {
        void filename;
        const importResult = addCandidate({ executionId, title: track.title, filePath });
        if (importResult.candidate) {
          addConsoleMessage("Candidate imported.");
          addConsoleMessage("Ready for review.");
        } else {
          addConsoleMessage("Downloaded file could not be associated with an active generation.");
          addConsoleMessage("Manual import may be required.");
        }
      },
      studioProjectContext,
    );

    return { queued: true, message: `Generating "${track.title}" — ${providerNote}.` };
  }

  function handleCreateRelease(input: CreateReleaseInput) {
    const result = createRelease(input);
    if (result.release) {
      recordActivity({
        identityId: result.release.identityId,
        type: "Release Planned",
        title: `Planned release "${result.release.title}"`,
        relatedObjectType: "release",
        relatedObjectId: result.release.id,
      });
    }
    return result;
  }

  function handleCreateCapture(input: CreateCaptureInput) {
    const result = createCapture(input);
    if (result.capture) {
      recordActivity({
        identityId: result.capture.identityId,
        type: "Item Captured",
        title: `Captured ${result.capture.type.toLowerCase()}: "${truncateText(result.capture.content, 40)}"`,
        relatedObjectType: "capture",
        relatedObjectId: result.capture.id,
      });
    }
    return result;
  }

  // Whether each "Create X" modal is open is pure UI state, unrelated to the
  // identities/projects/knowledge/assets/releases/captures themselves, so
  // it stays here instead of in a hook.
  const [isCreateIdentityOpen, setIsCreateIdentityOpen] = useState(false);
  const [isCreateProjectOpen, setIsCreateProjectOpen] = useState(false);
  const [isCaptureKnowledgeOpen, setIsCaptureKnowledgeOpen] = useState(false);
  const [isCreateAssetOpen, setIsCreateAssetOpen] = useState(false);
  const [isCreateReleaseOpen, setIsCreateReleaseOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isFolderImportOpen, setIsFolderImportOpen] = useState(false);
  const [isVaultImportOpen, setIsVaultImportOpen] = useState(false);

  // Which Quick Capture flow is open, if any — null means closed. Unlike
  // the booleans above, this also carries *which* type to start on, since
  // that's chosen from the Command Palette (or defaulted by the Inbox's
  // own button) rather than being fixed per-modal.
  const [quickCaptureType, setQuickCaptureType] = useState<QuickCaptureType | null>(null);

  // Which object "+ Connect To…" was opened from, if any — null means
  // closed. Carries the source's own display label alongside its ref so
  // ConnectToModal doesn't need to re-resolve something the caller (e.g.
  // ProjectWorkspace) already knows directly.
  const [connectFrom, setConnectFrom] = useState<{ ref: ObjectRef; label: string } | null>(null);

  // Which section of the main workspace is visible (the general overview,
  // or the Inbox/Projects/Knowledge/Assets/Releases list). Also
  // UI/navigation state.
  const [activeSection, setActiveSection] = useState<WorkspaceSection>("overview");

  // "Context Everywhere": one function per object type that switches to its
  // section AND selects it, so jumping straight to a specific object's own
  // detail view is always a single call — reused by the Command Palette
  // below, by every detail view's "Part of <Project>" link, and by
  // ProjectWorkspace's own tabs when a creator drills into one of its own
  // assets/knowledge/releases (see Workspace.tsx/ProjectsView.tsx).
  function openProject(id: string) {
    setActiveSection("projects");
    selectProject(id);
  }
  function openKnowledgeEntry(id: string) {
    setActiveSection("knowledge");
    selectEntry(id);
  }
  function openAsset(id: string) {
    setActiveSection("assets");
    selectAsset(id);
  }
  function openRelease(id: string) {
    setActiveSection("releases");
    selectRelease(id);
  }
  function openCapture(id: string) {
    setActiveSection("inbox");
    selectCapture(id);
  }

  // Begins a Creative Session for one project — the same "select + switch
  // section" shape as every openX helper above, just landing on "session"
  // Opens Music Workspace for one project — reuses selectProject
  // for the same reason: "music" + selectedProjectId together are all
  // MusicWorkspaceView needs (see Workspace.tsx). Never touches
  // firstBlueprintVisit itself — this is the *ordinary* way in, used by
  // ProjectWorkspace's own button and by handleProjectCreated below;
  // whether that landing gets a Blueprint's first-visit composition is
  // decided entirely by whether firstBlueprintVisit already names this
  // same project (see the effect below, and Workspace.tsx).
  function openMusicWorkspace(id: string) {
    setActiveSection("music");
    selectProject(id);
  }

  function openProjectStudio(id: string) {
    setActiveSection("projects");
    selectProject(id);
  }

  // Opens Prompt Studio for one project — identical shape to
  // openMusicWorkspace, just landing on "prompt-studio" instead.
  function openPromptStudio(id: string) {
    setActiveSection("prompt-studio");
    selectProject(id);
  }

  // Which planned track Track Workspace is currently open for — plain,
  // local navigation state, the same reason firstBlueprintVisit lives
  // directly in App.tsx rather than inside any hook: usePlannedTracks
  // (Album Production Engine) is off-limits to modify this sprint, and
  // this is nothing more than "which track was last clicked," not a fact
  // any creative engine owns.
  const [selectedTrackId, setSelectedTrackId] = useState<string | null>(null);

  // Opens Track Workspace for one planned track — identical shape to
  // every other openX helper, but selects both the track's own project
  // (so every existing project-scoped prop already works unmodified) and
  // the track itself.
  function openTrackWorkspace(track: PlannedTrack) {
    setActiveSection("track-workspace");
    selectProject(track.projectId);
    setSelectedTrackId(track.id);
  }

  // Opens the Release Manifest for one release — identical shape to
  // openRelease, just landing on "release-manifest" instead. Reuses
  // selectRelease for the same reason every other openX helper reuses its
  // own type's existing select function: "release-manifest" +
  // selectedRelease together are all ReleaseManifestView needs (see
  // Workspace.tsx).
  function openReleaseManifest(id: string) {
    setActiveSection("release-manifest");
    selectRelease(id);
  }

  // Opens the Translation Engine's own view for one release — identical
  // shape to openReleaseManifest, just landing on "release-translation"
  // instead. One further step down the reasoning stack, same navigation
  // pattern every step of it already uses.
  function openReleaseTranslation(id: string) {
    setActiveSection("release-translation");
    selectRelease(id);
  }

  // Blueprint Composition's one piece of transient, in-memory state — not
  // creative data, not persisted, not a new field on Project. It exists
  // only to let a Blueprint's preferences (which Creative Actions to
  // emphasise, which Companion to introduce) reach the *first* landing in
  // Music Workspace after creation, the same way preferredWorkspace
  // already reached that landing's *destination* last sprint. The effect
  // below is what makes this genuinely transient: the moment a creator
  // navigates anywhere else, it clears itself, and Forge falls back to
  // exactly its ordinary behaviour — no Blueprint, no memory of one.
  const [firstBlueprintVisit, setFirstBlueprintVisit] = useState<{
    projectId: string;
    blueprintId: BlueprintId;
  } | null>(null);

  useEffect(() => {
    if (!firstBlueprintVisit) return;
    const stillOnThatLanding =
      activeSection === "music" && selectedProject?.id === firstBlueprintVisit.projectId;
    if (!stillOnThatLanding) setFirstBlueprintVisit(null);
  }, [activeSection, selectedProject, firstBlueprintVisit]);

  // CreateProjectModal only ever reports what happened; deciding what a
  // Blueprint's preferences should do about it lives entirely here, beside
  // every other navigation decision App.tsx already owns.
  function handleProjectCreated(projectId: string, blueprintId: BlueprintId | null) {
    if (!blueprintId) return; // No Blueprint (or "Blank Project") — ordinary behaviour, nothing more to do.

    const blueprint = BLUEPRINT_DEFINITIONS[blueprintId];
    if (blueprint.preferredWorkspace === "music") {
      setFirstBlueprintVisit({ projectId, blueprintId });
      openProjectStudio(projectId);
    }
  }

  // The Discovery Engine's findings can point at any object type, so its
  // one "open this" callback needs to dispatch to whichever openX helper
  // matches — everything it needs already exists above; this is just the
  // switch a caller with a bare ObjectRef (rather than a known type) needs.
  function openObject(ref: ObjectRef) {
    if (ref.type === "project") openProject(ref.id);
    else if (ref.type === "knowledge") openKnowledgeEntry(ref.id);
    else if (ref.type === "asset") openAsset(ref.id);
    else if (ref.type === "release") openRelease(ref.id);
    else if (ref.type === "capture") openCapture(ref.id);
  }

  // The Command Palette searches across every identity's data at once
  // (allProjects/allKnowledgeEntries/allAssets/allReleases), not just the
  // active identity's filtered view — that's what lets it jump you
  // somewhere else entirely.
  const commandPalette = useCommandPalette({
    identities,
    projects: allProjects,
    knowledgeEntries: allKnowledgeEntries,
    assets: allAssets,
    releases: allReleases,
    captures: allCaptures,
  });

  // What happens when a palette result is chosen. A Quick Capture action
  // just opens that capture flow — no identity/project navigation involved,
  // since capturing doesn't require deciding where something belongs. A
  // Companion result is similar: Companions aren't identity-scoped, so
  // activating one just opens the Companions section rather than trying to
  // select an identity. Every other result type first switches to the
  // identity it belongs to (a no-op if already active), then jumps straight
  // into that object's own detail view via the openX helpers above — the
  // same "Context Everywhere" surfaces reached by clicking its card. This
  // closes the gap the previous sprint left open: Knowledge/Asset/Release
  // results used to only open the section's list; now every result type
  // lands exactly where it points.
  function handleActivateCommandResult(result: CommandResultData) {
    if (result.type === "action") {
      commandPalette.close();
      if (result.commandAction) setQuickCaptureType(result.commandAction);
      return;
    }

    if (result.type === "companion") {
      setActiveSection("companions");
      commandPalette.close();
      return;
    }

    selectIdentity(result.identityId);

    if (result.type === "capture") {
      openCapture(result.id);
    } else if (result.type === "knowledge") {
      openKnowledgeEntry(result.id);
    } else if (result.type === "asset") {
      openAsset(result.id);
    } else if (result.type === "release") {
      openRelease(result.id);
    } else if (result.type === "project") {
      openProject(result.id);
    }

    commandPalette.close();
  }

  return (
    <div className="app-shell">
      <Sidebar
        identities={identities}
        selectedId={selectedIdentity?.id ?? ""}
        onSelect={selectIdentity}
        onCreateIdentity={() => setIsCreateIdentityOpen(true)}
        activeSection={activeSection}
        onSelectSection={setActiveSection}
      />

      <Workspace
        identity={selectedIdentity}
        identities={identities}
        section={activeSection}
        projects={projects}
        archivedProjects={archivedProjects}
        selectedProjectId={selectedProject?.id ?? null}
        onSelectProject={selectProject}
        onCreateProject={() => setIsCreateProjectOpen(true)}
        onArchiveProject={archiveProject}
        onUnarchiveProject={unarchiveProject}
        onDeleteProject={removeProject}
        knowledgeEntries={knowledgeEntries}
        onCaptureKnowledge={() => setIsCaptureKnowledgeOpen(true)}
        selectedKnowledgeEntry={selectedKnowledgeEntry}
        onSelectKnowledgeEntry={selectEntry}
        onRemoveKnowledgeEntry={removeKnowledgeEntry}
        assets={assets}
        onAddAsset={() => setIsCreateAssetOpen(true)}
        onImportAudio={handleImportAudio}
        studioResources={studioResources}
        attachments={attachments}
        onDeleteStudioResource={deleteStudioResource}
        onRevealInExplorer={handleRevealInExplorer}
        onRenameStudioResource={handleRenameStudioResource}
        onAttachResource={handleAttachResource}
        onDetachResource={handleDetachResource}
        selectedAsset={selectedAsset}
        onSelectAsset={selectAsset}
        onRemoveAsset={removeAsset}
        releases={releases}
        onCreateRelease={() => setIsCreateReleaseOpen(true)}
        selectedRelease={selectedRelease}
        onSelectRelease={selectRelease}
        activities={activities}
        captures={captures}
        onQuickCapture={() => setQuickCaptureType("Idea")}
        selectedCapture={selectedCapture}
        onSelectCapture={selectCapture}
        getRelationshipsFor={getRelationshipsFor}
        onDiscoverRelationships={discoverRelationshipsFor}
        onConfirmRelationship={confirmRelationship}
        onDismissRelationship={dismissRelationship}
        onConnectTo={(ref, label) => setConnectFrom({ ref, label })}
        onOpenProject={openProject}
        onOpenAsset={openAsset}
        onOpenKnowledgeEntry={openKnowledgeEntry}
        onOpenRelease={openRelease}
        relationships={relationships}
        onOpenObject={openObject}
        onOpenChief={() => setActiveSection("chief")}
        onImport={() => setIsImportOpen(true)}
        onImportFolder={() => setIsFolderImportOpen(true)}
        onImportVault={() => setIsVaultImportOpen(true)}
        onOpenMusicWorkspace={openMusicWorkspace}
        activeBlueprint={
          firstBlueprintVisit && selectedProject?.id === firstBlueprintVisit.projectId
            ? BLUEPRINT_DEFINITIONS[firstBlueprintVisit.blueprintId]
            : null
        }
        onOpenPromptStudio={openPromptStudio}
        onSaveKnowledge={handleCaptureKnowledge}
        onOpenReleaseManifest={openReleaseManifest}
        onOpenReleaseTranslation={openReleaseTranslation}
        executions={executions}
        onQueueExecution={queueExecution}
        onRemoveExecution={removeExecution}
        plannedTracks={plannedTracks}
        onPlanTrack={planTrack}
        onUpdateTrack={updateTrack}
        onRemoveTrack={removeTrack}
        onFinishTrack={finishTrack}
        onReopenTrack={reopenTrack}
        onOpenProjectStudio={openProjectStudio}
        onSaveAndGenerateTrack={handleSaveAndGenerateTrack}
        selectedTrackId={selectedTrackId}
        onOpenTrackWorkspace={openTrackWorkspace}
        attributions={attributions}
        onAttributePrompt={attributePrompt}
        getAttributedTrackId={getAttributedTrackId}
        candidates={candidates}
        onAddCandidate={addCandidate}
        onAddNote={addNote}
        onApproveCandidate={handleApproveCandidate}
        onRejectCandidate={rejectCandidate}
        onSetCurrentBest={handleSetCurrentBest}
        onSetAlbumVersion={handleSetAlbumVersion}
        onImportCandidates={handleImportCandidates}
        onAddCandidateFromFile={handleAddCandidateFromFile}
        onGenerateTrack={handleGenerateTrack}
        workspaceSurfaceOpenId={workspaceSurfaceOpenId}
        workspaceSurfaceLastOpenedId={workspaceSurfaceLastOpenedId}
        onOpenWorkspaceSurface={openWorkspaceSurface}
        onCloseWorkspaceSurface={closeWorkspaceSurface}
        consoleMessages={consoleMessages}
        onClearConsole={clearConsole}
        onLog={addConsoleMessage}
      />

      <CreateIdentityModal
        isOpen={isCreateIdentityOpen}
        onClose={() => setIsCreateIdentityOpen(false)}
        onCreate={handleCreateIdentity}
      />

      <CreateProjectModal
        isOpen={isCreateProjectOpen}
        onClose={() => setIsCreateProjectOpen(false)}
        onCreate={handleCreateProject}
        onProjectCreated={handleProjectCreated}
      />

      <CaptureKnowledgeModal
        isOpen={isCaptureKnowledgeOpen}
        onClose={() => setIsCaptureKnowledgeOpen(false)}
        onCapture={handleCaptureKnowledge}
        projects={projects}
      />

      {/* Reuses handleCaptureKnowledge (same creation + Activity logging as
          every other Knowledge entry) and createManualRelationship (same
          creation as "+ Connect To…") — Import has no creation path of its
          own. Identity-scoped data only, matching ConnectToModal above: a
          Relationship can't span identities, so neither can an import's
          suggestions. */}
      <ImportModal
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        onCaptureKnowledge={handleCaptureKnowledge}
        onCreateManualRelationship={createManualRelationship}
        activeIdentityId={selectedIdentity?.id ?? ""}
        identities={selectedIdentity ? [selectedIdentity] : []}
        projects={projects}
        knowledgeEntries={knowledgeEntries}
        assets={assets}
        releases={releases}
        captures={captures}
      />

      {/* Same reuse as ImportModal above — buildImportBatch just runs
          Parse -> Interpret once per queued file; every actual creation
          still goes through handleCaptureKnowledge/createManualRelationship.
          pickSources is the only thing that differs from the vault instance
          below — FolderImportModal itself has no idea which one it is. */}
      <FolderImportModal
        isOpen={isFolderImportOpen}
        onClose={() => setIsFolderImportOpen(false)}
        title="Import a Folder"
        description="Choose a folder on your computer — Forge will read every file it recognises inside it (currently Plain Text and Markdown) and preview each one exactly like a single import."
        pickSources={pickFolderAsImportSources}
        onCaptureKnowledge={handleCaptureKnowledge}
        onCreateManualRelationship={createManualRelationship}
        activeIdentityId={selectedIdentity?.id ?? ""}
        identities={selectedIdentity ? [selectedIdentity] : []}
        projects={projects}
        knowledgeEntries={knowledgeEntries}
        assets={assets}
        releases={releases}
        captures={captures}
      />

      {/* Obsidian Vault Import: the exact same FolderImportModal, pointed at
          pickVaultAsImportSources instead (native/nativeFolderSource.ts) —
          a recursive, Markdown-only reader that also recognises [[wiki
          links]] via obsidian Import's own Parse stage (see
          hooks/obsidianImport.ts). Nothing from here down — capture,
          relationships, the Creative Knowledge Engine — knows this exists;
          an imported note becomes exactly the same kind of Knowledge entry
          as any other import. */}
      <FolderImportModal
        isOpen={isVaultImportOpen}
        onClose={() => setIsVaultImportOpen(false)}
        title="Import an Obsidian Vault"
        description="Choose an Obsidian vault folder — Forge will recursively read every Markdown note inside it, understand [[wiki links]] as references to other notes, and preview each one exactly like a single import."
        pickSources={pickVaultAsImportSources}
        onCaptureKnowledge={handleCaptureKnowledge}
        onCreateManualRelationship={createManualRelationship}
        activeIdentityId={selectedIdentity?.id ?? ""}
        identities={selectedIdentity ? [selectedIdentity] : []}
        projects={projects}
        knowledgeEntries={knowledgeEntries}
        assets={assets}
        releases={releases}
        captures={captures}
      />

      <CreateAssetModal
        isOpen={isCreateAssetOpen}
        onClose={() => setIsCreateAssetOpen(false)}
        onCreate={handleCreateAsset}
        projects={projects}
      />

      <CreateReleaseModal
        isOpen={isCreateReleaseOpen}
        onClose={() => setIsCreateReleaseOpen(false)}
        onCreate={handleCreateRelease}
        projects={projects}
      />

      {/* key={quickCaptureType} forces a fresh instance (fresh internal
          form state) each time a different capture type is chosen — the
          same fix used for ProjectWorkspace when jumping between projects. */}
      <QuickCaptureModal
        key={quickCaptureType ?? "closed"}
        isOpen={quickCaptureType !== null}
        initialType={quickCaptureType ?? "Idea"}
        onClose={() => setQuickCaptureType(null)}
        onCaptureGeneric={handleCreateCapture}
        onCaptureKnowledge={handleCaptureKnowledge}
      />

      <CommandPalette
        isOpen={commandPalette.isOpen}
        query={commandPalette.query}
        onQueryChange={commandPalette.updateQuery}
        results={commandPalette.results}
        selectedIndex={commandPalette.selectedIndex}
        onMoveSelection={commandPalette.moveSelection}
        onClose={commandPalette.close}
        onActivate={handleActivateCommandResult}
      />

      {/* Reuses buildResults exactly like the Command Palette above, but
          called with the active identity's own already-filtered lists
          instead of the cross-identity "all" ones — a Relationship can't
          span identities, so there's nothing to search outside this one. */}
      <ConnectToModal
        isOpen={connectFrom !== null}
        sourceRef={connectFrom?.ref ?? null}
        sourceLabel={connectFrom?.label ?? ""}
        searchData={{
          identities: selectedIdentity ? [selectedIdentity] : [],
          projects,
          knowledgeEntries,
          assets,
          releases,
          captures,
        }}
        onClose={() => setConnectFrom(null)}
        onConnect={(target, relationshipType) => {
          if (!connectFrom) return { error: null };
          return createManualRelationship(connectFrom.ref, target, relationshipType);
        }}
      />
    </div>
  );
}

export default App;
