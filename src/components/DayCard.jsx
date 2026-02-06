import { EQUIPMENT_MODES } from "../utils/plan";

export default function DayCard({
  day,
  index,
  onChangeMode,
  onToggleQuiet,
  onSelectExercise,
  completedMap,
  completedDetails,
  onUpdateDetail,
  getExerciseKey,
  getExerciseXp,
  lang,
  onStartSession,
}) {
  const dayPossible = day.exercises.reduce((sum, ex) => sum + getExerciseXp(ex), 0);
  const dayEarned = day.exercises.reduce((sum, ex) => {
    const key = getExerciseKey(day.title, ex);
    return sum + (completedMap[key] ? getExerciseXp(ex) : 0);
  }, 0);

  const getName = (ex) => {
    if (lang === "en") return ex.name_en || ex.name || ex.name_es;
    return ex.name_es || ex.name || ex.name_en;
  };

  const typeLabel = (ex) => {
    const c = (ex.category || "").toLowerCase();
    const bp = (ex.bodyPart || "").toLowerCase();
    const isCardio = c.includes("cardio") || bp.includes("cardio");
    const isMob = c.includes("stretching") || c.includes("mobility");
    const isCore = bp.includes("waist") || bp.includes("abs");
    if (lang === "en") {
      if (isCardio) return "Cardio";
      if (isMob) return "Mobility";
      if (isCore) return "Core";
      return "Strength";
    }
    if (isCardio) return "Cardio";
    if (isMob) return "Movilidad";
    if (isCore) return "Core";
    return "Fuerza";
  };

  return (
    <div className="day-card">
      <div className="day-head">
        <strong>{day.title}</strong>
        <span className="day-xp">
          {dayEarned} / {dayPossible} XP
        </span>
      </div>

      <div className="day-controls">
        <label className="field">
          Equipo del día
          <select value={day.mode} onChange={(e) => onChangeMode(index, e.target.value)}>
            <option value="week">{EQUIPMENT_MODES.week.label}</option>
            <option value="weekend">{EQUIPMENT_MODES.weekend.label}</option>
          </select>
        </label>
        <label className="toggle">
          <input
            type="checkbox"
            checked={Boolean(day.quiet)}
            onChange={(e) => onToggleQuiet(index, e.target.checked)}
          />
          Modo silencioso
        </label>
      </div>

      <ul className="ex-list">
        {day.exercises.map((ex, i) => (
          <li key={ex.name + i} className="ex-item">
            {ex.gifUrl ? (
              <img src={ex.gifUrl} alt={ex.name} />
            ) : (
              <div className="gif-placeholder">Sin gif</div>
            )}
            <div className="ex-info">
              <span className="ex-name">{getName(ex)}</span>
              <span className="ex-meta">
                {ex.target} • {ex.equipment}
              </span>
              <span className="ex-meta">
                {ex.prescription?.type === "reps" &&
                  `${ex.prescription.sets}x${ex.prescription.reps} • ${ex.prescription.restSec}s descanso`}
                {ex.prescription?.type === "time" &&
                  `${ex.prescription.workSec}s trabajo • ${ex.prescription.restSec}s descanso`}
              </span>
              <span className={`type-pill ${typeLabel(ex).toLowerCase()}`}>
                {typeLabel(ex)}
              </span>
            </div>
            <div className="ex-actions">
              <button
                className="tiny"
                type="button"
                onClick={() => onSelectExercise({ ex, dayTitle: day.title })}
              >
                {lang === "en" ? "View / log" : "Ver / registrar"}
              </button>
            </div>
          </li>
        ))}
      </ul>
      <div className="day-actions">
        <button
          className="tiny primary-btn"
          type="button"
          onClick={() => onStartSession(index)}
        >
          {lang === "en" ? "Start session" : "Iniciar sesión"}
        </button>
      </div>
      <div className="xp">+{day.xp} XP</div>
    </div>
  );
}
