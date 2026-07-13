import { useEffect } from "react";
import type { ReactNode } from "react";
import "./Modal.css";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  // Optional extra class appended to the panel — e.g. the Command Palette
  // uses this to widen itself, without forking the overlay/ESC/outside-
  // click logic below just to get a different size.
  panelClassName?: string;
}

// A generic modal shell: dark overlay + centered panel. It only knows how a
// modal opens and closes (ESC key, clicking outside) — what's *inside* it is
// passed in as `children`, so this same component can be reused for any
// future dialog, not just identity creation.
function Modal({ isOpen, onClose, children, panelClassName }: ModalProps) {
  // useEffect lets us run code in response to something changing — here,
  // subscribing to keyboard events — which isn't something you do directly
  // during render. It only re-subscribes when `isOpen` or `onClose` change.
  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    window.addEventListener("keydown", handleKeyDown);

    // The returned function is a "cleanup" — React calls it before the
    // effect runs again (or when the component unmounts) so we don't leave
    // stale event listeners behind every time the modal opens and closes.
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Conditional rendering: while the modal is closed, this component
  // renders nothing at all.
  if (!isOpen) return null;

  return (
    // The overlay is a fixed, full-screen layer sitting above everything
    // else. Because it physically covers the page, the background simply
    // can't be clicked while it's visible — no extra logic needed for that.
    // Clicking the overlay itself (outside the panel) closes the modal.
    <div className="modal-overlay" onClick={onClose}>
      {/* Clicks inside the panel would otherwise "bubble up" to the overlay
          and close the modal. stopPropagation() stops that bubbling so
          interacting with the form doesn't accidentally dismiss it. */}
      <div
        className={`modal-panel${panelClassName ? ` ${panelClassName}` : ""}`}
        role="dialog"
        aria-modal="true"
        onClick={(event) => event.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}

export default Modal;
