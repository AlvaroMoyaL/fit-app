export default function EmptyState({
  eyebrow = "",
  title,
  description,
  compact = false,
  className = "",
  children,
}) {
  const classes = [
    "empty-state",
    "app-empty-state",
    compact ? "is-compact" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={classes}>
      {eyebrow ? <span className="empty-state-eyebrow">{eyebrow}</span> : null}
      {title ? <strong className="empty-state-title">{title}</strong> : null}
      {description ? <p className="empty-state-copy">{description}</p> : null}
      {children ? <div className="empty-state-actions">{children}</div> : null}
    </div>
  );
}
