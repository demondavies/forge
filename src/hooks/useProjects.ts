import { useState, useEffect } from "react";
import type { Project, ProjectType } from "../types";
import { DEFAULT_PROJECT_STATUS } from "../types";

const PROJECTS_KEY = "forge.projects";

function loadProjects(): Project[] {
  try {
    const raw = localStorage.getItem(PROJECTS_KEY);
    if (!raw) return [];
    return (JSON.parse(raw) as Array<Record<string, unknown>>).map(
      (p) => ({
        ...p,
        createdAt: new Date(p.createdAt as string),
        archivedAt: p.archivedAt ? new Date(p.archivedAt as string) : null,
      }) as Project,
    );
  } catch {
    return [];
  }
}

// The raw form values needed to create a new project. "id", "identityId",
// "status", and "createdAt" aren't included here because the engine itself
// fills those in (see createProject below).
export interface CreateProjectInput {
  name: string;
  type: ProjectType;
  description: string;
}

// createProject() can fail validation, so instead of throwing it returns
// this small result object — the caller just checks "error" and decides
// what to do, no try/catch needed. "project" carries the newly created
// project on success (null otherwise) so callers — namely App.tsx's
// activity logging — can read its id/name without a second lookup.
export interface CreateProjectResult {
  error: string | null;
  project: Project | null;
}

// Mirrors useIdentities(): one hook owns all project state plus the logic
// that changes it, so components never call useState directly.
//
// Every project for every identity lives in a single flat array — just like
// a real database table would hold every row regardless of which identity
// it belongs to. This hook's job is to filter that array down to whichever
// identity is currently active, so switching identities "just works" by
// re-filtering, with no extra bookkeeping.
export function useProjects(activeIdentityId: string | null) {
  const [projects, setProjects] = useState<Project[]>(loadProjects);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

  useEffect(() => {
    try { localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects)); } catch {}
  }, [projects]);

  const identityProjects = projects.filter(
    (project) => project.identityId === activeIdentityId,
  );

  // Only the projects that belong to the currently selected identity and are not archived.
  const projectsForActiveIdentity = identityProjects.filter((p) => !p.archivedAt);
  const archivedProjects = identityProjects.filter((p) => !!p.archivedAt);

  const selectedProject =
    identityProjects.find((project) => project.id === selectedProjectId) ?? null;

  // Accepts null so the Project Workspace's "Back to Projects" button can
  // clear the selection and return to the list, not just switch which
  // project is selected.
  function selectProject(id: string | null) {
    setSelectedProjectId(id);
  }

  function createProject(input: CreateProjectInput): CreateProjectResult {
    if (!activeIdentityId) {
      return { error: "Select an identity first.", project: null };
    }

    const trimmedName = input.name.trim();
    if (!trimmedName) {
      return { error: "Give your project a name.", project: null };
    }

    // Duplicate names are only checked within the active identity's own
    // projects — the same name is fine under a different identity.
    const isDuplicate = projectsForActiveIdentity.some(
      (project) => project.name.toLowerCase() === trimmedName.toLowerCase(),
    );
    if (isDuplicate) {
      return { error: "A project with that name already exists.", project: null };
    }

    const newProject: Project = {
      id: crypto.randomUUID(),
      identityId: activeIdentityId,
      name: trimmedName,
      type: input.type,
      status: DEFAULT_PROJECT_STATUS,
      description: input.description.trim(),
      createdAt: new Date(),
      archivedAt: null,
    };

    // Functional update — setProjects(current => ...) instead of
    // setProjects([...projects, newProject]) — guards against reading a
    // stale `projects` value if multiple updates ever happen in quick
    // succession.
    setProjects((current) => [...current, newProject]);
    setSelectedProjectId(newProject.id); // Automatically select the new project.

    return { error: null, project: newProject };
  }

  function archiveProject(id: string) {
    setProjects((current) =>
      current.map((p) => (p.id === id ? { ...p, archivedAt: new Date() } : p)),
    );
  }

  function unarchiveProject(id: string) {
    setProjects((current) =>
      current.map((p) => (p.id === id ? { ...p, archivedAt: null } : p)),
    );
  }

  function removeProject(id: string) {
    setProjects((current) => current.filter((p) => p.id !== id));
    if (selectedProjectId === id) setSelectedProjectId(null);
  }

  return {
    projects: projectsForActiveIdentity,
    archivedProjects,
    // The full, unfiltered list across every identity — needed by anything
    // that searches globally (the Command Palette) rather than within just
    // the active identity.
    allProjects: projects,
    selectedProject,
    selectProject,
    createProject,
    archiveProject,
    unarchiveProject,
    removeProject,
  };
}
