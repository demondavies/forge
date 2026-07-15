import { useState } from "react";
import type {
  Activity,
  Asset,
  Capture,
  Identity,
  KnowledgeEntry,
  Project,
  Relationship,
  Release,
} from "../../types";
import type { DiscoveryContext } from "../../hooks/relationshipDiscovery";
import { buildReleaseManifest } from "../../hooks/releaseManifest";
import { translateReleaseManifest, TRANSLATION_FORMAT_LABELS } from "../../hooks/translationEngine";
import type { TranslationFormat } from "../../hooks/translationEngine";
import "./Translation.css";

interface ReleaseTranslationViewProps {
  release: Release;
  project: Project;
  identity: Identity;
  knowledgeEntries: KnowledgeEntry[];
  assets: Asset[];
  releases: Release[];
  captures: Capture[];
  relationships: Relationship[];
  activities: Activity[];
  onBack: () => void;
}

// The one screen where Forge shows something that isn't Forge's own truth
// — an external representation *of* it. Deliberately the plainest view in
// the app: no fields to fill in, nothing to click through, nothing that
// looks editable, because none of it is. The manifest (and the translation
// built from it) is rebuilt fresh on every render, straight from whatever
// Forge currently knows — there is no "regenerate" button because there is
// nothing here that could ever go stale: this file stores nothing, so
// leaving and returning always shows the current truth translated again.
function ReleaseTranslationView({
  release,
  project,
  identity,
  knowledgeEntries,
  assets,
  releases,
  captures,
  relationships,
  activities,
  onBack,
}: ReleaseTranslationViewProps) {
  const [copyMessage, setCopyMessage] = useState<string | null>(null);
  const [format, setFormat] = useState<TranslationFormat>("landr");

  const discoveryContext: DiscoveryContext = {
    identities: [identity],
    projects: [project],
    knowledgeEntries,
    assets,
    releases,
    captures,
    relationships,
  };

  // The one boundary this view itself respects: everything below this line
  // only ever touches `manifest`, never the arrays above it directly —
  // exactly the discipline translationEngine.ts's own functions hold to.
  const manifest = buildReleaseManifest(release, project, identity, discoveryContext, activities);
  const translated = translateReleaseManifest(manifest, format);

  async function handleCopy() {
    await navigator.clipboard.writeText(translated);
    setCopyMessage("Copied to clipboard.");
    setTimeout(() => setCopyMessage(null), 2000);
  }

  return (
    <section className="section-view release-translation">
      <button className="back-btn" onClick={onBack}>
        ← Back to Release Manifest
      </button>

      <div>
        <h2 className="section-title">🔁 Translation</h2>
        <p className="section-subtitle">
          {release.title} — an external representation of Forge's own canonical Release Manifest.
        </p>
        <p className="translation-boundary-note">
          This is a translation, not a second copy of the truth. It is never edited here — only ever
          regenerated fresh from the Release Manifest, every time this screen is opened.
        </p>
      </div>

      <div className="translation-format-picker">
        {(Object.keys(TRANSLATION_FORMAT_LABELS) as TranslationFormat[]).map((f) => (
          <button
            key={f}
            className={`translation-format-tab${f === format ? " active" : ""}`}
            onClick={() => setFormat(f)}
          >
            {TRANSLATION_FORMAT_LABELS[f]}
          </button>
        ))}
      </div>

      <textarea
        className="translation-output"
        value={translated}
        readOnly
        rows={24}
        spellCheck={false}
      />

      <div className="translation-actions">
        <button className="secondary" onClick={handleCopy}>
          📋 Copy {TRANSLATION_FORMAT_LABELS[format]}
        </button>
      </div>
      {copyMessage && <p className="field-label">{copyMessage}</p>}
    </section>
  );
}

export default ReleaseTranslationView;
