import { useState, useEffect } from "react";
import type { AccentColorId, Identity } from "../types";
import { CODEX_IDENTITY } from "../data/codexSeed";

const IDENTITIES_KEY = "forge.identities";
const IDENTITY_SELECTED_KEY = "forge.identities.selectedId";

function loadIdentities(): Identity[] {
  try {
    const raw = localStorage.getItem(IDENTITIES_KEY);
    if (!raw) return createInitialIdentities();
    return (JSON.parse(raw) as Array<Record<string, unknown>>).map(
      (i) => ({ ...i, createdAt: new Date(i.createdAt as string) }) as Identity,
    );
  } catch {
    return createInitialIdentities();
  }
}

function loadSelectedId(identities: Identity[]): string {
  try {
    const raw = localStorage.getItem(IDENTITY_SELECTED_KEY);
    if (raw && identities.some((i) => i.id === raw)) return raw;
  } catch {}
  return identities[0]?.id ?? "";
}

// The starting identities every session begins with. This runs once, inside
// a useState lazy initializer (see below), so it isn't recreated on every render.
//
// "Forge" is sourced from codexSeed.ts rather than built inline here — it's
// the exact same identity, just with its Knowledge (the Living Codex)
// seeded elsewhere in a way that needs to reference this identity's id
// reliably. See codexSeed.ts's own doc comment.
function createInitialIdentities(): Identity[] {
  return [
    {
      id: crypto.randomUUID(),
      name: "Memory Loops",
      description: "Personal reflections and recurring ideas.",
      accentColor: "orange",
      createdAt: new Date(),
    },
    {
      id: crypto.randomUUID(),
      name: "Cypris",
      description: "A quieter, more analytical voice.",
      accentColor: "purple",
      createdAt: new Date(),
    },
    CODEX_IDENTITY,
  ];
}

// The raw form values needed to create a new identity. "id" and "createdAt"
// aren't included here because the engine itself generates them.
export interface CreateIdentityInput {
  name: string;
  description: string;
  accentColor: AccentColorId;
}

// createIdentity() can fail validation, so instead of throwing it returns
// this small result object — the caller just checks "error" and decides
// what to do, no try/catch needed. "identity" carries the newly created
// identity on success (null otherwise) so callers — namely App.tsx's
// activity logging — can read its id/name without a second lookup.
export interface CreateIdentityResult {
  error: string | null;
  identity: Identity | null;
}

// A custom hook bundles related state together with the logic that changes
// it into one reusable function. Every component that needs identities calls
// useIdentities() and gets the same shape back — none of them touch
// useState directly. That indirection is what makes the "swap this for
// SQLite later" requirement realistic: only the inside of this file would
// need to change (e.g. createIdentity could become an async database
// insert), while Sidebar, Workspace, and the modal stay exactly the same.
export function useIdentities() {
  const [identities, setIdentities] = useState<Identity[]>(loadIdentities);

  // The lazy initializer below runs only on the very first render, at which
  // point the `identities` variable above already holds the resolved array —
  // either from localStorage or from createInitialIdentities() — so it's
  // safe to pass it to loadSelectedId here.
  const [selectedId, setSelectedId] = useState<string>(
    () => loadSelectedId(identities),
  );

  useEffect(() => {
    try { localStorage.setItem(IDENTITIES_KEY, JSON.stringify(identities)); } catch {}
  }, [identities]);

  useEffect(() => {
    try { localStorage.setItem(IDENTITY_SELECTED_KEY, selectedId); } catch {}
  }, [selectedId]);

  const selectedIdentity =
    identities.find((identity) => identity.id === selectedId) ?? null;

  function selectIdentity(id: string) {
    setSelectedId(id);
  }

  function createIdentity(input: CreateIdentityInput): CreateIdentityResult {
    const trimmedName = input.name.trim();
    const trimmedDescription = input.description.trim();

    if (!trimmedName) {
      return { error: "Give your identity a name.", identity: null };
    }

    const isDuplicate = identities.some(
      (identity) => identity.name.toLowerCase() === trimmedName.toLowerCase(),
    );
    if (isDuplicate) {
      return { error: "An identity with that name already exists.", identity: null };
    }

    const newIdentity: Identity = {
      id: crypto.randomUUID(),
      name: trimmedName,
      description: trimmedDescription,
      accentColor: input.accentColor,
      createdAt: new Date(),
    };

    // Functional updates — setIdentities(current => ...) instead of
    // setIdentities([...identities, newIdentity]) — guard against reading a
    // stale `identities` value if multiple updates ever happen in quick
    // succession.
    setIdentities((current) => [...current, newIdentity]);
    setSelectedId(newIdentity.id); // Automatically select the new identity.

    return { error: null, identity: newIdentity };
  }

  return { identities, selectedIdentity, selectIdentity, createIdentity };
}
