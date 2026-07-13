import { useEffect, useState } from "react";
import type { Asset, Capture, CaptureType, Identity, KnowledgeEntry, Project, Release } from "../types";
import { COMPANION_ROLES } from "../types";
import { OBJECT_TYPE_ICONS } from "../utils/objectTypeIcons";
import { truncateText } from "../utils/truncateText";

export type CommandResultType =
  | "identity"
  | "project"
  | "knowledge"
  | "asset"
  | "release"
  | "capture"
  | "action"
  | "companion";

// The type Quick Capture is opened with — every real Capture type, plus
// "Knowledge" (which reuses the existing Knowledge system entirely; see
// QuickCaptureModal.tsx).
export type QuickCaptureType = CaptureType | "Knowledge";

// One row in the palette's results list. This is a derived, ephemeral
// search-result shape — not a domain entity — so it lives here rather than
// in types.ts. "action" (Quick Capture) and "companion" results don't point
// at any identity-scoped entity, so identityId/projectId are unused
// placeholders for them — App.tsx's activation handler checks `type` first
// and never reads those fields for either.
export interface CommandResultData {
  id: string;
  type: CommandResultType;
  icon: string;
  name: string;
  // "Identity" for an Identity result, "Identity name" or
  // "Identity name / Project name" for everything else, "Quick Capture"
  // for an action.
  context: string;
  identityId: string;
  projectId: string | null;
  // Only present on "action" results — which Quick Capture flow to open.
  commandAction?: QuickCaptureType;
}

// The data the palette searches over. Exported because "Connect To…"'s
// search step (ConnectToModal.tsx) reuses buildResults directly rather than
// duplicating this matching logic — the only difference is *which* data it's
// called with: the Command Palette passes each hook's cross-identity "all"
// arrays, while Connect To… passes just the active identity's own,
// already-filtered ones (since a Relationship can't span identities).
export interface CommandPaletteData {
  identities: Identity[];
  projects: Project[];
  knowledgeEntries: KnowledgeEntry[];
  assets: Asset[];
  releases: Release[];
  captures: Capture[];
}

// Reuses the shared icon-per-object-type map (also used by the
// Relationship Engine's "Related" list) — "action" results get their icon
// from CAPTURE_COMMANDS below instead, so this only ever needs to be
// indexed by the six real object types.
const RESULT_ICONS = OBJECT_TYPE_ICONS;

interface CaptureCommand {
  captureType: QuickCaptureType;
  label: string;
  icon: string;
  // Everything this command should match against — includes both "capture"
  // and "new" phrasing (per the Quick Capture spec) plus the bare type name,
  // so typing any of "capture", "new", or e.g. "idea" surfaces it.
  keywords: string[];
}

// The single source of truth for Quick Capture's actions. The palette
// builds its "Quick Capture" result group by looping over this list, so
// adding a future capture type later is a one-line change here — no other
// search code needs to change.
const CAPTURE_COMMANDS: CaptureCommand[] = [
  { captureType: "Idea", label: "Capture Idea", icon: "💡", keywords: ["capture idea", "new idea", "idea"] },
  {
    captureType: "Knowledge",
    label: "Capture Knowledge",
    icon: "🧠",
    keywords: ["capture knowledge", "new knowledge", "knowledge"],
  },
  {
    captureType: "Prompt",
    label: "Capture Prompt",
    icon: "✨",
    keywords: ["capture prompt", "new prompt", "prompt"],
  },
  { captureType: "Task", label: "Capture Task", icon: "✅", keywords: ["capture task", "new task", "task"] },
  { captureType: "Link", label: "Capture Link", icon: "🔗", keywords: ["capture link", "new link", "link"] },
  {
    captureType: "Release Note",
    label: "Capture Release Note",
    icon: "🎵",
    keywords: ["capture release note", "new release note", "release note"],
  },
];

// All search/matching logic lives in this one function — every caller
// (the Command Palette, and now ConnectToModal) never touches raw entity
// arrays itself, it only renders whatever this returns. Keeping it here
// (rather than spread across components) is what "do not duplicate
// filtering" means in practice, and it's the one place a future smarter
// (e.g. AI-assisted) search would need to change.
export function buildResults(query: string, data: CommandPaletteData): CommandResultData[] {
  const trimmed = query.trim().toLowerCase();
  if (!trimmed) return [];

  const identityName = (id: string) => data.identities.find((i) => i.id === id)?.name ?? "";
  const projectName = (id: string | null) =>
    id ? (data.projects.find((p) => p.id === id)?.name ?? "") : "";

  const results: CommandResultData[] = [];

  // Quick Capture actions are checked first — typing a verb like "capture"
  // or "new" is a clear statement of intent to create something, so those
  // results take priority over anything merely matching by name.
  for (const command of CAPTURE_COMMANDS) {
    if (command.keywords.some((keyword) => keyword.includes(trimmed))) {
      results.push({
        id: `capture-${command.captureType}`,
        type: "action",
        icon: command.icon,
        name: command.label,
        context: "Quick Capture",
        identityId: "",
        projectId: null,
        commandAction: command.captureType,
      });
    }
  }

  // Companions are a fixed, app-wide roster (COMPANION_ROLES, in types.ts)
  // — not identity-scoped data passed in via CommandPaletteData, the same
  // way CAPTURE_COMMANDS above is a static list matched directly rather
  // than threaded through as a prop.
  for (const companion of COMPANION_ROLES) {
    if (companion.name.toLowerCase().includes(trimmed)) {
      results.push({
        id: companion.id,
        type: "companion",
        icon: companion.icon,
        name: companion.name,
        context: "Companion",
        identityId: "",
        projectId: null,
      });
    }
  }

  for (const identity of data.identities) {
    if (identity.name.toLowerCase().includes(trimmed)) {
      results.push({
        id: identity.id,
        type: "identity",
        icon: RESULT_ICONS.identity,
        name: identity.name,
        context: "Identity",
        identityId: identity.id,
        projectId: null,
      });
    }
  }

  for (const project of data.projects) {
    if (project.name.toLowerCase().includes(trimmed)) {
      results.push({
        id: project.id,
        type: "project",
        icon: RESULT_ICONS.project,
        name: project.name,
        context: identityName(project.identityId),
        identityId: project.identityId,
        projectId: project.id,
      });
    }
  }

  for (const entry of data.knowledgeEntries) {
    if (entry.title.toLowerCase().includes(trimmed)) {
      const context = entry.projectId
        ? `${identityName(entry.identityId)} / ${projectName(entry.projectId)}`
        : identityName(entry.identityId);
      results.push({
        id: entry.id,
        type: "knowledge",
        icon: RESULT_ICONS.knowledge,
        name: entry.title,
        context,
        identityId: entry.identityId,
        projectId: entry.projectId,
      });
    }
  }

  for (const asset of data.assets) {
    if (asset.name.toLowerCase().includes(trimmed)) {
      results.push({
        id: asset.id,
        type: "asset",
        icon: RESULT_ICONS.asset,
        name: asset.name,
        context: `${identityName(asset.identityId)} / ${projectName(asset.projectId)}`,
        identityId: asset.identityId,
        projectId: asset.projectId,
      });
    }
  }

  for (const release of data.releases) {
    if (release.title.toLowerCase().includes(trimmed)) {
      results.push({
        id: release.id,
        type: "release",
        icon: RESULT_ICONS.release,
        name: release.title,
        context: `${identityName(release.identityId)} / ${projectName(release.projectId)}`,
        identityId: release.identityId,
        projectId: release.projectId,
      });
    }
  }

  for (const capture of data.captures) {
    if (capture.content.toLowerCase().includes(trimmed)) {
      results.push({
        id: capture.id,
        type: "capture",
        icon: RESULT_ICONS.capture,
        // Captures have no title of their own — the content itself is the
        // whole point, so a short excerpt of it stands in for a name here.
        name: truncateText(capture.content, 60),
        // Always identity-only — a Capture never has a project (see
        // types.ts), so there's no "/ Project name" half to add.
        context: identityName(capture.identityId),
        identityId: capture.identityId,
        projectId: null,
      });
    }
  }

  return results;
}

// Owns the palette's own UI state — open/closed, the search text, which
// result is highlighted — plus the global Ctrl/Cmd+K shortcut that opens
// it. Deliberately does NOT decide what happens when a result is chosen:
// that requires switching identities/projects/sections, which lives in
// App.tsx (the same place every other cross-system action already lives).
export function useCommandPalette(data: CommandPaletteData) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);

  // The shortcut listener is global and always active — it has to work no
  // matter what's currently on screen, so it can't live inside the palette's
  // own (conditionally rendered) markup.
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const isToggleShortcut =
        (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k";
      if (!isToggleShortcut) return;

      event.preventDefault();
      setIsOpen((wasOpen) => !wasOpen);
      // Always start from a clean slate, whether this opened or closed it.
      setQuery("");
      setSelectedIndex(0);
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const results = buildResults(query, data);

  function updateQuery(value: string) {
    setQuery(value);
    setSelectedIndex(0); // Typing narrows the list — keep the highlight valid.
  }

  function moveSelection(delta: number) {
    if (results.length === 0) return;
    setSelectedIndex((current) => (current + delta + results.length) % results.length);
  }

  function close() {
    setIsOpen(false);
    setQuery("");
    setSelectedIndex(0);
  }

  return { isOpen, query, updateQuery, results, selectedIndex, moveSelection, close };
}
