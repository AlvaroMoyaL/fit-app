import EmptyState from "./EmptyState";

export default function MuscleSummary({ history, lang, embedded = false }) {
  const muscleCounts = {};
  const exerciseCounts = {};

  Object.values(history || {}).forEach((day) => {
    (day.items || []).forEach((item) => {
      if (item.type === "replace") return;
      const name =
        lang === "en"
          ? item.name_en || item.name || item.name_es
          : item.name_es || item.name || item.name_en;
      if (name) {
        exerciseCounts[name] = (exerciseCounts[name] || 0) + 1;
      }
      const target = item.target || "";
      if (target) {
        muscleCounts[target] = (muscleCounts[target] || 0) + 1;
      }
      const secondary = item.secondaryMuscles || [];
      secondary.forEach((m) => {
        if (!m) return;
        muscleCounts[m] = (muscleCounts[m] || 0) + 0.5;
      });
    });
  });

  const topMuscles = Object.entries(muscleCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);

  const topExercises = Object.entries(exerciseCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);

  return (
    <div className={`muscle-summary ${embedded ? "is-embedded" : ""}`}>
      {!embedded && (
        <div className="workspace-section-head">
          <div>
            <p className="workspace-section-kicker">
              {lang === "en" ? "Coverage" : "Cobertura"}
            </p>
            <h3>{lang === "en" ? "Muscle summary" : "Resumen muscular"}</h3>
            <p className="workspace-section-copy">
              {lang === "en"
                ? "Top muscles and exercises registered in your history."
                : "Músculos y ejercicios con mayor presencia dentro de tu historial."}
            </p>
          </div>
        </div>
      )}
      <div className="muscle-summary-grid">
        <section className="muscle-summary-card">
          <div className="muscle-summary-card-head">
            <span>{lang === "en" ? "Coverage" : "Cobertura"}</span>
            <h4>{lang === "en" ? "Top muscles" : "Top músculos"}</h4>
          </div>
          {topMuscles.length === 0 ? (
            <EmptyState
              compact
              eyebrow={lang === "en" ? "No coverage yet" : "Sin cobertura"}
              title={lang === "en" ? "No muscles tracked yet" : "Aún no hay músculos registrados"}
              description={
                lang === "en"
                  ? "Tracked sessions will show which zones are repeating most."
                  : "Las sesiones registradas mostrarán qué zonas se repiten con más frecuencia."
              }
            />
          ) : (
            <ul className="muscle-summary-list">
              {topMuscles.map(([name, count]) => (
                <li key={name}>
                  <span>{name}</span>
                  <strong>{count}</strong>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section className="muscle-summary-card">
          <div className="muscle-summary-card-head">
            <span>{lang === "en" ? "Frequency" : "Frecuencia"}</span>
            <h4>{lang === "en" ? "Top exercises" : "Top ejercicios"}</h4>
          </div>
          {topExercises.length === 0 ? (
            <EmptyState
              compact
              eyebrow={lang === "en" ? "No frequency yet" : "Sin frecuencia"}
              title={lang === "en" ? "No exercises ranked yet" : "Todavía no hay ejercicios rankeados"}
              description={
                lang === "en"
                  ? "As you accumulate history, the most repeated exercises will appear here."
                  : "A medida que acumules historial, aquí aparecerán los ejercicios más repetidos."
              }
            />
          ) : (
            <ul className="muscle-summary-list">
              {topExercises.map(([name, count]) => (
                <li key={name}>
                  <span>{name}</span>
                  <strong>{count}</strong>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
