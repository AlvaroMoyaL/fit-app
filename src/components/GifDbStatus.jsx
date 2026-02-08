export default function GifDbStatus({ status }) {
  if (!status) return null;
  const { state, downloaded, total, error, localCount, nextRetryAt } = status;

  if (state === "ready") {
    return (
      <div className="localdb">
        <strong>Gifs locales listos</strong>
        <span>{localCount ?? total} gifs en local</span>
      </div>
    );
  }

  if (state === "error") {
    return (
      <div className="localdb error">
        <strong>No se pudo descargar gifs</strong>
        <span>{error}</span>
      </div>
    );
  }

  if (state === "downloading") {
    const pct = total ? Math.min(100, Math.round((downloaded / total) * 100)) : 0;
    return (
      <div className="localdb">
        <strong>Descargando gifs…</strong>
        <span>
          {downloaded} / {total || "?"} gifs
        </span>
        <span>En local: {localCount ?? downloaded}</span>
        <div className="xp-bar">
          <div className="xp-bar-fill" style={{ width: `${pct}%` }} />
        </div>
      </div>
    );
  }

  if (state === "paused") {
    return (
      <div className="localdb">
        <strong>Descarga de gifs en pausa</strong>
        <span>En local: {localCount ?? downloaded}</span>
        {nextRetryAt && (
          <span>Reintento: {new Date(nextRetryAt).toLocaleTimeString()}</span>
        )}
      </div>
    );
  }

  return null;
}
