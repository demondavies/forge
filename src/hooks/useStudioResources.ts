import { useState, useEffect } from "react";
import type { StudioResource } from "../types";

const STORAGE_KEY = "forge_studio_resources";

type PersistedResource = Omit<StudioResource, "createdAt"> & { createdAt: string };

export function useStudioResources(activeIdentityId: string | null) {
  const [resources, setResources] = useState<StudioResource[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      return (JSON.parse(raw) as PersistedResource[]).map((r) => ({
        ...r,
        createdAt: new Date(r.createdAt),
      }));
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(resources));
  }, [resources]);

  const studioResources = resources.filter((r) => r.identityId === activeIdentityId);

  function importResources(filePaths: string[]) {
    if (!activeIdentityId) return;
    const incoming: StudioResource[] = filePaths.map((filePath) => ({
      id: crypto.randomUUID(),
      identityId: activeIdentityId,
      name: filePath.split(/[/\\]/).pop() ?? filePath,
      filePath,
      createdAt: new Date(),
    }));
    setResources((current) => [...current, ...incoming]);
  }

  function deleteResource(id: string) {
    setResources((current) => current.filter((r) => r.id !== id));
  }

  return { studioResources, importResources, deleteResource };
}
