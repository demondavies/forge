interface PlaceholderCardProps {
  title: string;
  description: string;
  icon: string;
  // Optional — most placeholder cards (the Overview teasers, most of the
  // Companions roster) are purely a "coming soon" display with nothing to
  // click. Passing onClick turns this same card into a real destination
  // (e.g. Chief's card in CompanionsView) without a second component.
  onClick?: () => void;
}

// A generic "coming soon" card used across the workspace. It doesn't hold
// any state — it just displays whatever props it's given.
function PlaceholderCard({ title, description, icon, onClick }: PlaceholderCardProps) {
  const content = (
    <>
      <div className="card-icon">{icon}</div>
      <h3 className="card-title">{title}</h3>
      <p className="card-description">{description}</p>
    </>
  );

  if (onClick) {
    return (
      <button className="placeholder-card" onClick={onClick}>
        {content}
      </button>
    );
  }

  return <div className="placeholder-card">{content}</div>;
}

export default PlaceholderCard;
