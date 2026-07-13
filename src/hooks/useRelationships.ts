import { useCallback, useState } from "react";
import type { ObjectRef, Relationship, RelationshipType } from "../types";
import { RELATIONSHIP_TYPE_LABELS } from "../types";
import type { DiscoveryContext } from "./relationshipDiscovery";
import { findCandidateRelationships, isSameRef, relationshipKey } from "./relationshipDiscovery";
import { CODEX_RELATIONSHIPS } from "../data/codexSeed";

// createManualRelationship() can fail validation, so instead of throwing it
// returns this small result object — mirrors every other createX() in the
// app (see CreateCaptureResult, etc).
export interface CreateManualRelationshipResult {
  error: string | null;
}

// Mirrors every other hook here: one hook owns all relationship state,
// filtered to whichever identity is currently active. A Relationship is
// either confirmed/dismissed from a discovered suggestion (see
// discoverRelationshipsFor), or created directly by a creator via
// createManualRelationship (origin: "user") — reached through "+ Connect
// To…" (see ConnectToModal.tsx). Both paths write into the exact same
// relationships array; there is no separate manual-connection system.
export function useRelationships(activeIdentityId: string | null) {
  // Seeded with the Living Codex's own hand-authored connections (scoped to
  // the "Forge" identity, see codexSeed.ts) — every other identity starts
  // with none, exactly as before; this is just non-empty initial data for
  // one of them, produced through this exact same createManualRelationship
  // shape rather than a second connection mechanism.
  const [relationships, setRelationships] = useState<Relationship[]>(CODEX_RELATIONSHIPS);

  const relationshipsForActiveIdentity = relationships.filter(
    (relationship) => relationship.identityId === activeIdentityId,
  );

  // All relationships (any status) touching a given object — the one query
  // every "Related" UI surface needs, in either direction.
  function getRelationshipsFor(ref: ObjectRef): Relationship[] {
    return relationshipsForActiveIdentity.filter(
      (relationship) => isSameRef(relationship.source, ref) || isSameRef(relationship.target, ref),
    );
  }

  function confirmRelationship(id: string) {
    setRelationships((current) =>
      current.map((relationship) =>
        relationship.id === id ? { ...relationship, status: "confirmed" as const } : relationship,
      ),
    );
  }

  function dismissRelationship(id: string) {
    setRelationships((current) =>
      current.map((relationship) =>
        relationship.id === id ? { ...relationship, status: "dismissed" as const } : relationship,
      ),
    );
  }

  // Runs the deterministic discovery rules for one object against the rest
  // of the identity's data, recording any new matches as "suggested"
  // relationships. Safe to call repeatedly (e.g. every time a Project
  // Workspace's data changes) — pairs that already have a relationship of
  // the same type are skipped, so this never creates duplicates no matter
  // how often it runs.
  //
  // Wrapped in useCallback (the one hook in this app that needs it) because
  // ProjectWorkspace calls this from inside a useEffect — without a stable
  // reference here, that effect would re-fire on every unrelated render.
  const discoverRelationshipsFor = useCallback(
    (ref: ObjectRef, context: DiscoveryContext) => {
      if (!activeIdentityId) return;

      const candidates = findCandidateRelationships(ref, context);
      if (candidates.length === 0) return;

      setRelationships((current) => {
        const existingKeys = new Set(
          current
            .filter((relationship) => relationship.identityId === activeIdentityId)
            .map((relationship) =>
              relationshipKey(relationship.source, relationship.target, relationship.relationshipType),
            ),
        );

        const newRelationships: Relationship[] = candidates
          .filter(
            (candidate) => !existingKeys.has(relationshipKey(ref, candidate.target, candidate.relationshipType)),
          )
          .map((candidate) => ({
            id: crypto.randomUUID(),
            identityId: activeIdentityId,
            source: ref,
            target: candidate.target,
            relationshipType: candidate.relationshipType,
            confidence: candidate.confidence,
            origin: "discovery",
            reason: candidate.reason,
            status: "suggested",
            createdAt: new Date(),
          }));

        return newRelationships.length > 0 ? [...current, ...newRelationships] : current;
      });
    },
    [activeIdentityId],
  );

  // The manual counterpart to discoverRelationshipsFor: a creator has
  // already decided these two objects are connected, so this writes
  // straight to "confirmed" (there's nothing to suggest — they said so
  // themselves) with full confidence and origin: "user". Reuses the same
  // relationshipKey dedup check as discovery so a manual connection can
  // never duplicate one that already exists, in either direction.
  function createManualRelationship(
    source: ObjectRef,
    target: ObjectRef,
    relationshipType: RelationshipType,
  ): CreateManualRelationshipResult {
    if (!activeIdentityId) {
      return { error: "Select an identity first." };
    }

    if (isSameRef(source, target)) {
      return { error: "Can't connect something to itself." };
    }

    const key = relationshipKey(source, target, relationshipType);
    const alreadyExists = relationships.some(
      (relationship) =>
        relationship.identityId === activeIdentityId &&
        relationshipKey(relationship.source, relationship.target, relationship.relationshipType) === key,
    );
    if (alreadyExists) {
      return { error: "Already connected that way." };
    }

    const reason =
      relationshipType === "manual"
        ? "Connected manually by you."
        : `Marked as "${RELATIONSHIP_TYPE_LABELS[relationshipType]}" by you.`;

    const newRelationship: Relationship = {
      id: crypto.randomUUID(),
      identityId: activeIdentityId,
      source,
      target,
      relationshipType,
      confidence: 1,
      origin: "user",
      reason,
      status: "confirmed",
      createdAt: new Date(),
    };

    setRelationships((current) => [...current, newRelationship]);

    return { error: null };
  }

  return {
    relationships: relationshipsForActiveIdentity,
    getRelationshipsFor,
    confirmRelationship,
    dismissRelationship,
    discoverRelationshipsFor,
    createManualRelationship,
  };
}
