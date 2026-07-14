import { useState } from "react";
import type { Asset, AssetType } from "../types";

// The raw form values needed to create a new asset. "id", "identityId", and
// "createdAt" aren't included here because the engine itself fills those in
// (see createAsset below).
export interface CreateAssetInput {
  name: string;
  type: AssetType;
  projectId: string;
  description: string;
  filePath?: string | null;
}

// createAsset() can fail validation, so instead of throwing it returns this
// small result object — the caller just checks "error" and decides what to
// do, no try/catch needed. "asset" carries the newly created asset on
// success (null otherwise) so callers — namely App.tsx's activity logging —
// can read its id/name without a second lookup.
export interface CreateAssetResult {
  error: string | null;
  asset: Asset | null;
}

// Mirrors useProjects() and useKnowledge(): one hook owns all asset state
// plus the logic that changes it, so components never call useState
// directly.
//
// Every asset for every identity lives in a single flat array — the way a
// real database table would hold every row regardless of which identity or
// project it belongs to. This hook filters that array down to whichever
// identity is currently active.
export function useAssets(activeIdentityId: string | null) {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);

  // Only the assets that belong to the currently selected identity.
  const assetsForActiveIdentity = assets.filter(
    (asset) => asset.identityId === activeIdentityId,
  );

  const selectedAsset =
    assetsForActiveIdentity.find((asset) => asset.id === selectedAssetId) ?? null;

  // Accepts null so AssetDetail's "Back to Assets" button can clear the
  // selection and return to the list — mirrors useProjects' selectProject.
  function selectAsset(id: string | null) {
    setSelectedAssetId(id);
  }

  function createAsset(input: CreateAssetInput): CreateAssetResult {
    if (!activeIdentityId) {
      return { error: "Select an identity first.", asset: null };
    }

    const trimmedName = input.name.trim();
    if (!trimmedName) {
      return { error: "Give this asset a name.", asset: null };
    }

    if (!input.projectId) {
      return { error: "Choose which project this asset belongs to.", asset: null };
    }

    const newAsset: Asset = {
      id: crypto.randomUUID(),
      identityId: activeIdentityId,
      projectId: input.projectId,
      name: trimmedName,
      type: input.type,
      description: input.description.trim(),
      createdAt: new Date(),
      filePath: input.filePath ?? null,
    };

    // Functional update — guards against reading a stale `assets` value if
    // multiple updates ever happen in quick succession.
    setAssets((current) => [...current, newAsset]);

    return { error: null, asset: newAsset };
  }

  function removeAsset(id: string) {
    setAssets((current) => current.filter((a) => a.id !== id));
    if (selectedAssetId === id) setSelectedAssetId(null);
  }

  return {
    assets: assetsForActiveIdentity,
    // The full, unfiltered list across every identity — needed by anything
    // that searches globally (the Command Palette) rather than within just
    // the active identity.
    allAssets: assets,
    selectedAsset,
    selectAsset,
    createAsset,
    removeAsset,
  };
}
