export default function WorkspaceHeader({
  eyebrow,
  title,
  titleTag = "h1",
  description,
  tags = [],
  stats = [],
  aside = null,
  className = "",
  bodyClassName = "",
  children,
}) {
  const TitleTag = titleTag;
  const rootClassName = ["workspace-header", className].filter(Boolean).join(" ");
  const topClassName = ["workspace-header-top", aside ? "has-aside" : "no-aside"].join(" ");
  const bodyClasses = ["workspace-header-body", bodyClassName].filter(Boolean).join(" ");

  return (
    <section className={rootClassName}>
      <div className={topClassName}>
        <div className="workspace-header-main">
          {eyebrow ? <p className="workspace-eyebrow">{eyebrow}</p> : null}
          <TitleTag className="workspace-title">{title}</TitleTag>
          {description ? <p className="workspace-copy">{description}</p> : null}
        </div>
        {aside ? <div className="workspace-header-aside">{aside}</div> : null}
      </div>

      {tags.length > 0 ? (
        <div className="workspace-header-tags">
          {tags.map((tag, index) => (
            <span className="workspace-tag" key={`tag-${index}`}>
              {tag}
            </span>
          ))}
        </div>
      ) : null}

      {stats.length > 0 ? (
        <div className="workspace-header-stats">
          {stats.map((stat, index) => (
            <div className="workspace-stat" key={stat.key || `stat-${index}`}>
              <span>{stat.label}</span>
              <strong>{stat.value}</strong>
              {stat.helper ? <small>{stat.helper}</small> : null}
            </div>
          ))}
        </div>
      ) : null}

      {children ? <div className={bodyClasses}>{children}</div> : null}
    </section>
  );
}
