export default function MuscleSummary({ history, lang }) {
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
    <div className="summary">
      <h2>{lang === "en" ? "Summary" : "Resumen"}</h2>
      <div className="summary-grid">
        <div className="summary-card">
          <h3>{lang === "en" ? "Top Muscles" : "Top músculos"}</h3>
          {topMuscles.length === 0 ? (
            <p className="note">Sin datos</p>
          ) : (
            <ul>
              {topMuscles.map(([name, count]) => (
                <li key={name}>
                  <span>{name}</span>
                  <strong>{count}</strong>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="summary-card">
          <h3>{lang === "en" ? "Top Exercises" : "Top ejercicios"}</h3>
          {topExercises.length === 0 ? (
            <p className="note">Sin datos</p>
          ) : (
            <ul>
              {topExercises.map(([name, count]) => (
                <li key={name}>
                  <span>{name}</span>
                  <strong>{count}</strong>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
