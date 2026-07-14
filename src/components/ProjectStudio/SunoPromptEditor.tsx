import type { SunoPrompt, SunoLyricsMode } from "../../types";
import type { LyricPromptSuggestion } from "../../hooks/lyricPromptSuggestions";
import "./SunoPromptEditor.css";

interface SunoPromptEditorProps {
  value: SunoPrompt;
  onChange: (prompt: SunoPrompt) => void;
  suggestions?: LyricPromptSuggestion[];
  onUseSuggestion?: (text: string) => void;
}

const LYRICS_MODES: SunoLyricsMode[] = ["Write", "Prompt", "Instrumental"];

function SunoPromptEditor({ value, onChange, suggestions, onUseSuggestion }: SunoPromptEditorProps) {
  function set<K extends keyof SunoPrompt>(key: K, val: SunoPrompt[K]) {
    onChange({ ...value, [key]: val });
  }

  return (
    <div className="spe-root">
      {/* Lyrics mode toggle */}
      <div className="spe-field">
        <label className="spe-label">Lyrics Mode</label>
        <div className="spe-mode-row">
          {LYRICS_MODES.map((mode) => (
            <button
              key={mode}
              className={`spe-mode-btn${value.lyricsMode === mode ? " spe-mode-btn--active" : ""}`}
              onClick={() => set("lyricsMode", mode)}
              type="button"
            >
              {mode}
            </button>
          ))}
        </div>
      </div>

      {/* Lyrics textarea — shown for Write and Prompt modes */}
      {value.lyricsMode !== "Instrumental" && (
        <div className="spe-field">
          <label className="spe-label">
            {value.lyricsMode === "Prompt" ? "Lyric Description" : "Lyrics"}
          </label>
          <textarea
            className="spe-textarea"
            placeholder={
              value.lyricsMode === "Prompt"
                ? "Describe what you want the lyrics to be about — Suno's AI will write them…"
                : "Write your lyrics here…"
            }
            value={value.lyrics}
            rows={4}
            onChange={(e) => set("lyrics", e.target.value)}
          />
          {value.lyricsMode === "Prompt" && suggestions && suggestions.length > 0 && (
            <div className="spe-suggestions">
              <span className="spe-suggestions-header">✨ Companion suggestions</span>
              {suggestions.map((s, i) => (
                <button
                  key={i}
                  className="spe-suggestion-card"
                  type="button"
                  onClick={() => onUseSuggestion?.(s.text)}
                >
                  <span className="spe-suggestion-label">{s.label}</span>
                  <span className="spe-suggestion-text">{s.text}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Styles */}
      <div className="spe-field">
        <label className="spe-label">Styles</label>
        <textarea
          className="spe-textarea"
          placeholder="épique, fast beats, guitar harmony, toy piano, dynamic arpeggios…"
          value={value.styles}
          rows={3}
          onChange={(e) => set("styles", e.target.value)}
        />
        <p className="spe-hint">Comma-separated style tags</p>
      </div>

      {/* Exclude styles */}
      <div className="spe-field">
        <label className="spe-label">Exclude Styles</label>
        <input
          className="spe-input"
          type="text"
          placeholder="e.g. drums, distortion…"
          value={value.excludeStyles}
          onChange={(e) => set("excludeStyles", e.target.value)}
        />
      </div>

      {/* Sliders */}
      <div className="spe-sliders">
        <div className="spe-slider-row">
          <label className="spe-slider-label">Weirdness</label>
          <input
            className="spe-slider"
            type="range"
            min={0}
            max={100}
            value={value.weirdness}
            onChange={(e) => set("weirdness", Number(e.target.value))}
          />
          <span className="spe-slider-value">{value.weirdness}%</span>
        </div>
        <div className="spe-slider-row">
          <label className="spe-slider-label">Style Influence</label>
          <input
            className="spe-slider"
            type="range"
            min={0}
            max={100}
            value={value.styleInfluence}
            onChange={(e) => set("styleInfluence", Number(e.target.value))}
          />
          <span className="spe-slider-value">{value.styleInfluence}%</span>
        </div>
      </div>
    </div>
  );
}

export default SunoPromptEditor;
