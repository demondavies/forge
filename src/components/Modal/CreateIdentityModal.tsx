import { useState } from "react";
import Modal from "./Modal";
import { ACCENT_COLORS } from "../../types";
import type { AccentColorId } from "../../types";
import type { CreateIdentityInput, CreateIdentityResult } from "../../hooks/useIdentities";
import "./CreateIdentityModal.css";

interface CreateIdentityModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (input: CreateIdentityInput) => CreateIdentityResult;
}

const DEFAULT_COLOR: AccentColorId = "orange";

function CreateIdentityModal({ isOpen, onClose, onCreate }: CreateIdentityModalProps) {
  // Form fields live here, as "local" state, because nothing outside this
  // modal needs to know what the user is typing until they press Create.
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [accentColor, setAccentColor] = useState<AccentColorId>(DEFAULT_COLOR);
  const [error, setError] = useState<string | null>(null);

  function resetForm() {
    setName("");
    setDescription("");
    setAccentColor(DEFAULT_COLOR);
    setError(null);
  }

  // Cancel, ESC, and clicking outside all end up here (see Modal's onClose).
  // None of them should leave behind any typed text for next time.
  function handleClose() {
    resetForm();
    onClose();
  }

  function handleCreate() {
    const result = onCreate({ name, description, accentColor });

    if (result.error) {
      setError(result.error);
      return; // Keep the modal open so the user can fix the problem.
    }

    resetForm();
    onClose();
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose}>
      <h3 className="modal-title">Create Identity</h3>

      <div className="field">
        <label className="field-label" htmlFor="identity-name">
          Identity Name
        </label>
        <input
          id="identity-name"
          type="text"
          placeholder="e.g. Night Owl"
          value={name}
          onChange={(event) => {
            setName(event.target.value);
            if (error) setError(null); // Clear the message once they start fixing it.
          }}
          autoFocus
        />
      </div>

      <div className="field">
        <label className="field-label" htmlFor="identity-description">
          Description <span className="field-optional">(optional)</span>
        </label>
        <textarea
          id="identity-description"
          placeholder="What is this identity for?"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          rows={3}
        />
      </div>

      <div className="field">
        <span className="field-label">Accent Colour</span>
        <div className="color-picker">
          {/* .map() turns the shared ACCENT_COLORS list into one swatch
              button per colour. Each needs a stable "key" so React can
              track it across re-renders. */}
          {ACCENT_COLORS.map((color) => (
            <button
              key={color.id}
              className={`color-swatch${accentColor === color.id ? " selected" : ""}`}
              style={{ backgroundColor: color.hex }}
              aria-label={color.label}
              // aria-pressed marks this as a toggle-style button so screen
              // readers announce which colour is currently chosen.
              aria-pressed={accentColor === color.id}
              onClick={() => setAccentColor(color.id)}
            />
          ))}
        </div>
      </div>

      {error && <p className="field-error">{error}</p>}

      <div className="modal-actions">
        <button className="secondary" onClick={handleClose}>
          Cancel
        </button>
        <button onClick={handleCreate}>Create</button>
      </div>
    </Modal>
  );
}

export default CreateIdentityModal;
