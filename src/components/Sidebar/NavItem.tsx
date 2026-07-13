interface NavItemProps {
  label: string;
  // Both optional: most nav entries still don't do anything yet (no routing
  // exists for Knowledge, Assets, etc.). Only "Projects" currently passes
  // these in — see Sidebar.tsx.
  isActive?: boolean;
  onClick?: () => void;
}

// A single navigation entry. Rendered as a real <button> so it's
// keyboard-accessible for free, whether or not it has a click handler yet.
function NavItem({ label, isActive = false, onClick }: NavItemProps) {
  return (
    <button className={`nav-item${isActive ? " active" : ""}`} onClick={onClick}>
      {label}
    </button>
  );
}

export default NavItem;
