interface CreateIdentityButtonProps {
  onClick: () => void;
}

// Opens the "Create Identity" modal. The modal itself lives in App.tsx,
// this button just reports that it was clicked.
function CreateIdentityButton({ onClick }: CreateIdentityButtonProps) {
  return (
    <button className="create-identity-btn" onClick={onClick}>
      + Create Identity
    </button>
  );
}

export default CreateIdentityButton;
