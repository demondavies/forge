import type { KnowledgeEntry, PlannedTrack, PromptAttribution } from "../types";
import { parseSunoPrompt } from "../types";
import { resolveTrackPromptVersion } from "./generationRequest";
import { resolveSunoGenerateSession } from "./browserSessionResolver";
import { automateSunoPage, snapshotSunoSongIds, pollSunoNewSongs } from "../providers/chromeAutomationTarget";
import { downloadForgeTrack } from "./forgeDownloads";
import { snapshotDownloadsFolder, watchForDownload } from "./downloadWatcher";

// onDownload is the bridge to Candidate Review — the delivery engine calls
// it with the detected filename and path, then stops. What to do with the
// file (which execution to associate, how to title the candidate) is the
// caller's decision, made through composition in App.tsx.
//
// projectContext enables the CDN download path: when provided, Forge polls
// the Suno page for new song UUIDs and downloads directly from cdn1.suno.ai
// into Documents/Forge/{type}s/{project}/{track}/. When absent the legacy
// Downloads-folder watcher is used as a fallback.
export interface ProjectDownloadContext {
  projectType: string;
  projectName: string;
}

export async function deliverPromptForTrack(
  track: PlannedTrack,
  attributions: PromptAttribution[],
  knowledgeEntries: KnowledgeEntry[],
  onProgress: (message: string) => void,
  onDownload?: (filename: string, filePath: string) => void,
  projectContext?: ProjectDownloadContext,
): Promise<void> {
  onProgress(`Preparing "${track.title}"…`);

  const promptVersion = resolveTrackPromptVersion(track.id, attributions, knowledgeEntries);
  if (!promptVersion) {
    onProgress(`No attributed prompt for "${track.title}" — write one in Prompt Studio first.`);
    return;
  }

  onProgress(`Resolved: "${promptVersion.title}".`);

  const sunoPrompt = parseSunoPrompt(promptVersion.insight);

  try {
    await navigator.clipboard.writeText(sunoPrompt.styles || promptVersion.insight);
    onProgress("Styles copied to clipboard.");
  } catch {
    onProgress("Clipboard unavailable — prompt will be delivered directly by automation.");
  }

  onProgress("Locating browser session…");

  const session = await resolveSunoGenerateSession();
  if (session.status !== "Completed" || !session.tabs?.length) {
    onProgress(`Browser: ${session.detail}`);
    return;
  }

  onProgress("Browser located.");

  const tabId = session.tabs[0].id;

  // ── CDN download path ────────────────────────────────────────────────────
  // When a project context is available, snapshot existing song IDs before
  // triggering generation so the poller knows which songs to ignore.
  const useCdnPath = !!onDownload && !!projectContext;
  let knownIds: string[] = [];

  if (useCdnPath) {
    onProgress("Snapshotting current Suno songs…");
    try {
      const snapshot = await snapshotSunoSongIds(tabId);
      knownIds = snapshot.uuids;
      onProgress(`Baseline: ${knownIds.length} existing song(s).`);
    } catch {
      onProgress("Could not snapshot Suno page — will use Downloads folder as fallback.");
    }
  }

  // ── Legacy fallback: snapshot the Downloads folder ───────────────────────
  const baseline = !useCdnPath && onDownload
    ? await snapshotDownloadsFolder().catch(() => [])
    : [];

  await new Promise<void>((resolve) => setTimeout(resolve, 3000));

  try {
    const automation = await automateSunoPage(tabId, sunoPrompt, track.title);
    if (automation.status !== "Completed") {
      onProgress(automation.detail);
      onProgress("Automation paused. Take over manually.");
      return;
    }
  } catch {
    onProgress("Unable to reach browser automation. Take over manually.");
    return;
  }

  onProgress("Prompt delivered.");
  onProgress("Generate clicked.");

  if (!onDownload) {
    onProgress("Waiting for Suno…");
    return;
  }

  // ── CDN download path ────────────────────────────────────────────────────
  if (useCdnPath && projectContext) {
    onProgress("Waiting for Suno to generate songs… (polls CDN, typically 30-90 s)");

    let pollResult;
    try {
      pollResult = await pollSunoNewSongs(tabId, knownIds, 300);
    } catch {
      onProgress("Could not poll Suno page. Manual import may be required.");
      return;
    }

    if (pollResult.status !== "Completed" || pollResult.uuids.length === 0) {
      onProgress(pollResult.detail);
      onProgress("Manual import may be required.");
      return;
    }

    onProgress(`${pollResult.uuids.length} song(s) ready. Downloading…`);

    for (const uuid of pollResult.uuids) {
      onProgress(`Downloading ${uuid.slice(0, 8)}…`);
      try {
        const result = await downloadForgeTrack(
          uuid,
          projectContext.projectType,
          projectContext.projectName,
          track.title,
        );
        if (result.status === "Completed" && result.filename && result.path) {
          onProgress(`Saved: ${result.filename}`);
          onDownload(result.filename, result.path);
          // App.tsx's onDownload callback logs "Candidate imported." / "Ready for review."
        } else {
          onProgress(`Download failed: ${result.detail}`);
        }
      } catch {
        onProgress(`Could not download ${uuid.slice(0, 8)}.`);
      }
    }
    return;
  }

  // ── Legacy fallback: Downloads folder watcher ────────────────────────────
  onProgress("Waiting for downloads… (Suno generates 2)");

  try {
    const watch1 = await watchForDownload(baseline);
    if (watch1.status === "Completed" && watch1.filename && watch1.path) {
      onProgress("Download 1 detected.");
      onProgress("Importing candidate 1…");
      onDownload(watch1.filename, watch1.path);

      const baseline2 = [...baseline, watch1.filename];
      onProgress("Waiting for download 2…");
      try {
        const watch2 = await watchForDownload(baseline2, 60);
        if (watch2.status === "Completed" && watch2.filename && watch2.path) {
          onProgress("Download 2 detected.");
          onProgress("Importing candidate 2…");
          onDownload(watch2.filename, watch2.path);
        } else {
          onProgress("Second download not detected — manual import may be required.");
        }
      } catch {
        onProgress("Could not monitor for second download.");
      }
    } else {
      onProgress(watch1.detail);
      onProgress("Manual import may be required.");
    }
  } catch {
    onProgress("Could not monitor downloads folder. Manual import may be required.");
  }
}
