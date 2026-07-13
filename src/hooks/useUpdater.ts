import { check } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";
import { getVersion } from "@tauri-apps/api/app";
import { useState, useEffect } from "react";

export type UpdaterState =
  | { kind: "checking" }
  | { kind: "up-to-date" }
  | { kind: "available"; version: string; notes: string }
  | { kind: "downloading"; downloaded: number; total: number | null }
  | { kind: "installing" }
  | { kind: "error"; message: string };

export function useUpdater() {
  const [currentVersion, setCurrentVersion] = useState<string | null>(null);
  const [state, setState] = useState<UpdaterState>({ kind: "checking" });

  useEffect(() => {
    getVersion()
      .then((v) => setCurrentVersion(v))
      .catch(() => {});
    runCheck();
  }, []);

  async function runCheck() {
    setState({ kind: "checking" });
    try {
      const update = await check();
      if (update) {
        setState({ kind: "available", version: update.version, notes: update.body ?? "" });
      } else {
        setState({ kind: "up-to-date" });
      }
    } catch (err) {
      setState({ kind: "error", message: String(err) });
    }
  }

  async function installUpdate() {
    if (state.kind !== "available") return;
    const { version, notes } = state;
    try {
      const update = await check();
      if (!update) {
        setState({ kind: "up-to-date" });
        return;
      }
      let downloaded = 0;
      let total: number | null = null;
      setState({ kind: "downloading", downloaded: 0, total: null });
      await update.downloadAndInstall((event) => {
        if (event.event === "Started") {
          total = event.data.contentLength ?? null;
          setState({ kind: "downloading", downloaded: 0, total });
        } else if (event.event === "Progress") {
          downloaded += event.data.chunkLength;
          setState({ kind: "downloading", downloaded, total });
        } else if (event.event === "Finished") {
          setState({ kind: "installing" });
        }
      });
      await relaunch();
    } catch (err) {
      // Restore available state so the user can retry
      setState({ kind: "available", version, notes });
    }
  }

  return { currentVersion, state, checkForUpdate: runCheck, installUpdate };
}
