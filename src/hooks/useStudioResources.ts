import { useState, useEffect } from "react";
import type { StudioResource, StudioResourceAttachment } from "../types";

const STORAGE_KEY = "forge_studio_resources";
const ATTACHMENTS_KEY = "forge_studio_resource_attachments";

type PersistedResource = Omit<StudioResource, "createdAt"> & { createdAt: string };
type PersistedAttachment = Omit<StudioResourceAttachment, "createdAt"> & { createdAt: string };

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

  const [attachments, setAttachments] = useState<StudioResourceAttachment[]>(() => {
    try {
      const raw = localStorage.getItem(ATTACHMENTS_KEY);
      if (!raw) return [];
      return (JSON.parse(raw) as PersistedAttachment[]).map((a) => ({
        ...a,
        createdAt: new Date(a.createdAt),
      }));
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(resources));
  }, [resources]);

  useEffect(() => {
    localStorage.setItem(ATTACHMENTS_KEY, JSON.stringify(attachments));
  }, [attachments]);

  const studioResources = resources.filter((r) => r.identityId === activeIdentityId);

  // Only attachments whose resource belongs to the current identity
  const resourceIds = new Set(studioResources.map((r) => r.id));
  const studioAttachments = attachments.filter((a) => resourceIds.has(a.resourceId));

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
    setAttachments((current) => current.filter((a) => a.resourceId !== id));
  }

  function renameResource(id: string, name: string) {
    setResources((current) => current.map((r) => (r.id === id ? { ...r, name } : r)));
  }

  function attachResource(resourceId: string, trackId: string) {
    if (attachments.some((a) => a.resourceId === resourceId && a.trackId === trackId)) return;
    setAttachments((current) => [
      ...current,
      { id: crypto.randomUUID(), resourceId, trackId, createdAt: new Date() },
    ]);
  }

  function detachResource(resourceId: string, trackId: string) {
    setAttachments((current) =>
      current.filter((a) => !(a.resourceId === resourceId && a.trackId === trackId)),
    );
  }

  return {
    studioResources,
    attachments: studioAttachments,
    importResources,
    deleteResource,
    renameResource,
    attachResource,
    detachResource,
  };
}
