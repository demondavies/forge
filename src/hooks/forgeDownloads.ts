// Forge Download Engine — TypeScript wrapper for the Rust CDN download command.
//
// Service Boundary: this file is the only place in the TypeScript app allowed
// to know that forge_downloads.rs exists. Everything above it (promptDelivery
// Engine, App.tsx) works with the result shape, never with Tauri invoke()
// directly. Same pattern as chromeAutomationTarget.ts for CDP commands.
import { invoke } from "@tauri-apps/api/core";

export interface ForgeDownloadResult {
  status: "Completed" | "Error";
  detail: string;
  path: string | null;
  filename: string | null;
}

// "Download one Suno-generated audio file from its CDN URL to the correct
// Forge folder" — delegates entirely to Rust. The folder is determined by
// project_type ("Album" → Albums/, "EP" → EPs/, anything else → Singles/).
// Returns the absolute path of the saved file on success.
export async function downloadForgeTrack(
  uuid: string,
  projectType: string,
  projectName: string,
  trackTitle: string,
): Promise<ForgeDownloadResult> {
  return invoke<ForgeDownloadResult>("download_forge_track", {
    uuid,
    projectType,
    projectName,
    trackTitle,
  });
}
