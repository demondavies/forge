// Download Watcher — TypeScript side of the provider-agnostic filesystem
// observer. Only ever calls invoke(); all filesystem access, path
// resolution, and polling logic lives in Rust (src-tauri/src/download_watcher.rs).
// This file does not import @tauri-apps/plugin-fs or @tauri-apps/api/path —
// the Rust side resolves the system downloads folder itself via AppHandle.
import { invoke } from "@tauri-apps/api/core";

export interface DownloadWatchResult {
  status: "Completed" | "Timeout" | "Error";
  detail: string;
  filename: string | null;
  path: string | null;
}

// Returns the filenames of every audio file currently in the system
// downloads folder. Call this before generation fires so watchForDownload
// knows which files already existed and should be ignored.
export async function snapshotDownloadsFolder(): Promise<string[]> {
  return invoke<string[]>("snapshot_downloads_folder");
}

// Polls the system downloads folder until a new completed audio file
// appears or timeoutSeconds elapses. knownFilenames is the baseline from
// snapshotDownloadsFolder — any file in that list is treated as
// pre-existing and skipped. Default timeout is 5 minutes, matching
// Suno's typical generation time.
export async function watchForDownload(
  knownFilenames: string[],
  timeoutSeconds = 300,
): Promise<DownloadWatchResult> {
  return invoke<DownloadWatchResult>("watch_for_download", {
    knownFilenames,
    timeoutSeconds,
  });
}
