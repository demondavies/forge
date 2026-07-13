import { open } from "@tauri-apps/plugin-dialog";
import { revealItemInDir } from "@tauri-apps/plugin-opener";
import { readDir, readTextFile } from "@tauri-apps/plugin-fs";
import { join } from "@tauri-apps/api/path";
import type { ImportSource, ImportSourceFormat } from "../hooks/folderImport";

// The one and only file in the whole app allowed to import @tauri-apps/
// plugin-dialog, plugin-fs, or api/path. Everything it produces is a plain
// ImportSource — the exact same type buildImportBatch already consumes.
// Nothing downstream of that type (buildImportBatch, ImportItemPreview, the
// Creative Knowledge Engine) can tell, or needs to tell, that these sources
// came from the real filesystem instead of a textarea, or that one provider
// walks a whole vault while another reads a single folder. A future
// drag-and-drop handler, watched folder, git repo, or cloud provider is just
// another function with this same shape: gather some source of files, end
// with Promise<ImportSource[]>. None of them require touching this file's
// exported signatures, let alone anything below them.

export interface NativeFolderPickOutcome {
  folderPath: string;
  sources: ImportSource[];
  // Not an error — just what wasn't turned into an ImportSource, so the
  // creator can be told the truth about what was (and wasn't) recognised,
  // per the Import Framework's own transparency requirement.
  skippedFiles: number;
  skippedFolders: number;
}

// The one recursive-walk primitive both providers below share — reading a
// directory, deciding per-entry whether to recurse or recognise a file, is
// identical work regardless of which extensions or directories a provider
// cares about. Parameterising it by two small predicates is what let the
// vault provider arrive without duplicating the folder provider's own
// traversal loop.
async function walkDirectory(
  currentPath: string,
  currentLabel: string,
  recursive: boolean,
  recognize: (fileName: string) => ImportSourceFormat | null,
  shouldSkipDirectory: (dirName: string) => boolean,
): Promise<{ sources: ImportSource[]; skippedFiles: number; skippedFolders: number }> {
  const entries = await readDir(currentPath);
  const sources: ImportSource[] = [];
  let skippedFiles = 0;
  let skippedFolders = 0;

  for (const entry of entries) {
    if (entry.isDirectory) {
      if (!recursive || shouldSkipDirectory(entry.name)) {
        skippedFolders += 1;
        continue;
      }

      const childPath = await join(currentPath, entry.name);
      const childLabel = currentLabel ? `${currentLabel}/${entry.name}` : entry.name;
      const nested = await walkDirectory(childPath, childLabel, recursive, recognize, shouldSkipDirectory);
      sources.push(...nested.sources);
      skippedFiles += nested.skippedFiles;
      skippedFolders += nested.skippedFolders;
      continue;
    }

    const format = recognize(entry.name);
    if (!format) {
      skippedFiles += 1;
      continue;
    }

    const fullPath = await join(currentPath, entry.name);
    const rawText = await readTextFile(fullPath);
    const label = currentLabel ? `${currentLabel}/${entry.name}` : entry.name;
    sources.push({ id: crypto.randomUUID(), label, format, rawText });
  }

  return { sources, skippedFiles, skippedFolders };
}

// ---- Native Folder Access ----
// Only the two formats the Import Framework's Parse stage understood before
// Obsidian Vault Import — recognising a file is deciding which of these it
// maps to, nothing more.
function formatForFileName(name: string): ImportSourceFormat | null {
  const lower = name.toLowerCase();
  if (lower.endsWith(".md") || lower.endsWith(".markdown")) return "markdown";
  if (lower.endsWith(".txt")) return "text";
  return null;
}

// Reads one level of a creator-chosen folder — not recursively. A folder
// full of nested subfolders is a legitimate shape (see skippedFolders), but
// walking a whole tree is exactly what pickVaultAsImportSources below does
// instead; this provider's own behaviour is unchanged from Native Folder
// Access.
export async function pickFolderAsImportSources(): Promise<NativeFolderPickOutcome | null> {
  const folderPath = await open({ directory: true, multiple: false });
  if (!folderPath || Array.isArray(folderPath)) {
    return null; // Creator cancelled the native dialog.
  }

  const result = await walkDirectory(folderPath, "", false, formatForFileName, () => false);
  return { folderPath, ...result };
}

// ---- Audio File Picker ----
// Opens a multi-select file dialog filtered to common audio formats. Returns
// every selected path; returns an empty array if the creator cancels.
export async function pickAudioFiles(): Promise<string[]> {
  const result = await open({
    directory: false,
    multiple: true,
    filters: [{ name: "Audio", extensions: ["mp3", "wav", "flac", "m4a", "ogg"] }],
  });
  if (!result) return [];
  if (Array.isArray(result)) return result;
  return [result];
}

// ---- Reveal in Explorer ----
// Opens the system file manager and selects the given file — Windows
// Explorer on Windows, Finder on macOS. Does not open the file itself.
export async function revealInExplorer(filePath: string): Promise<void> {
  await revealItemInDir(filePath);
}

// ---- Obsidian Vault Import ----
// A vault is only ever Markdown notes — Obsidian-specific formats like
// .canvas simply aren't recognised, exactly like any other unsupported file
// (see Non-Negotiables: "do not implement canvas files"; there's no special
// case for it here because there doesn't need to be one).
function formatForVaultFileName(name: string): ImportSourceFormat | null {
  const lower = name.toLowerCase();
  if (lower.endsWith(".md") || lower.endsWith(".markdown")) return "obsidian-markdown";
  return null;
}

// Obsidian's own config, plugin data, and local trash all live in
// dot-prefixed folders (".obsidian", ".trash", ...) — skipping every hidden
// directory is a generic rule, not a hardcoded list of Obsidian internals,
// and it's what keeps plugins/metadata databases out of the vault reader
// without Forge ever needing to know their names (see Non-Negotiables: "do
// not implement plugins... metadata databases").
function shouldSkipHiddenDirectory(dirName: string): boolean {
  return dirName.startsWith(".");
}

// Reads a whole vault recursively — the one genuinely new capability this
// sprint adds to the Native Provider layer, shared via walkDirectory above
// rather than duplicated. `recursive: true` on the dialog options is load
// bearing: it's what tells Tauri to extend the fs scope to the folder's
// entire subtree, not just its immediate contents (see OpenDialogOptions'
// own docs) — without it, reads below the top level would be rejected.
export async function pickVaultAsImportSources(): Promise<NativeFolderPickOutcome | null> {
  const folderPath = await open({ directory: true, multiple: false, recursive: true });
  if (!folderPath || Array.isArray(folderPath)) {
    return null; // Creator cancelled the native dialog.
  }

  const result = await walkDirectory(folderPath, "", true, formatForVaultFileName, shouldSkipHiddenDirectory);
  return { folderPath, ...result };
}
