import type { KnowledgeEntry, PlannedTrack, PromptAttribution } from "../types";
import { resolveTrackPromptVersion } from "./generationRequest";
import { resolveSunoGenerateSession } from "./browserSessionResolver";
import { automateSunoPage } from "../providers/chromeAutomationTarget";
import { snapshotDownloadsFolder, watchForDownload } from "./downloadWatcher";

// onDownload is the bridge to Candidate Review — the delivery engine calls
// it with the detected filename and then stops. What to do with the file
// (which execution to associate it with, how to title the candidate) is the
// caller's decision, made through composition in App.tsx.
export async function deliverPromptForTrack(
  track: PlannedTrack,
  attributions: PromptAttribution[],
  knowledgeEntries: KnowledgeEntry[],
  onProgress: (message: string) => void,
  onDownload?: (filename: string, filePath: string) => void,
): Promise<void> {
  onProgress(`Preparing "${track.title}"…`);

  const promptVersion = resolveTrackPromptVersion(track.id, attributions, knowledgeEntries);
  if (!promptVersion) {
    onProgress(`No attributed prompt for "${track.title}" — write one in Prompt Studio first.`);
    return;
  }

  onProgress(`Resolved: "${promptVersion.title}".`);

  try {
    await navigator.clipboard.writeText(promptVersion.insight);
    onProgress("Prompt copied to clipboard.");
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

  // Snapshot before the 3-second wait so the baseline is as early as
  // possible — Suno cannot have produced a file yet at this point.
  const baseline = onDownload ? await snapshotDownloadsFolder().catch(() => []) : [];

  await new Promise<void>((resolve) => setTimeout(resolve, 3000));

  try {
    const automation = await automateSunoPage(session.tabs[0].id, promptVersion.insight);
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

  onProgress("Waiting for download…");

  try {
    const watch = await watchForDownload(baseline);
    if (watch.status === "Completed" && watch.filename && watch.path) {
      onProgress("Download detected.");
      onProgress("Importing candidate…");
      onDownload(watch.filename, watch.path);
    } else {
      onProgress(watch.detail);
      onProgress("Manual import may be required.");
    }
  } catch {
    onProgress("Could not monitor downloads folder. Manual import may be required.");
  }
}
