import { EQUIPMENT_MODES } from "../utils/plan";

export default function DayCard({
  day,
  index,
  onChangeMode,
  onToggleQuiet,
  onChangeEquipment,
  onSelectExercise,
  completedMap,
  completedDetails,
  onUpdateDetail,
  getExerciseKey,
  getExerciseXp,
  lang,
  onStartSession,
  activeExerciseKey,
  equipmentGroups,
}) {
  const dayPossible = day.exercises.reduce((sum, ex) => sum + getExerciseXp(ex), 0);
  const dayEarned = day.exercises.reduce((sum, ex) => {
    const key = getExerciseKey(day.title, ex);
    return sum + (completedMap[key] ? getExerciseXp(ex) : 0);
  }, 0);
  const dayCompleted = day.exercises.every((ex) => completedMap[getExerciseKey(day.title, ex)]);

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

  const selectedEquipment = Array.isArray(day.equipmentList) ? day.equipmentList : [];
  const formatEquipment = (value) => {
    if (!value) return value;
    return value
      .replace(/_/g, " ")
      .replace(/\b\w/g, (m) => m.toUpperCase());
  };
  const bodyweightOption =
    selectedEquipment.find((e) => /body weight|bodyweight/i.test(e)) ||
    (equipmentGroups || [])
      .flatMap((g) => g.items)
      .find((e) => /body weight|bodyweight/i.test(e));
  const toggleEquipment = (value) => {
    const next = selectedEquipment.includes(value)
      ? selectedEquipment.filter((e) => e !== value)
      : [...selectedEquipment, value];
    onChangeEquipment(index, next);
  };
  const clearEquipment = () => onChangeEquipment(index, []);
  const setBodyweightOnly = () =>
    onChangeEquipment(index, bodyweightOption ? [bodyweightOption] : []);
  const selectedLabel =
    selectedEquipment.length > 0
      ? selectedEquipment.map(formatEquipment)
      : [];

  return (
    <div className="day-card">
      <div className="day-head">
        <strong>{day.title}</strong>
        <span className="day-xp">
          {dayEarned} / {dayPossible} XP
        </span>
      </div>
      {dayCompleted && (
        <div className="day-complete">
          ✅ {lang === "en" ? "Day completed" : "Día completado"}
        </div>
      )}

      <div className="day-controls">
        <label className="field">
          {lang === "en" ? "Day equipment" : "Equipo del día"}
          <select value={day.mode} onChange={(e) => onChangeMode(index, e.target.value)}>
            <option value="week">{EQUIPMENT_MODES.week.label}</option>
            <option value="weekend">{EQUIPMENT_MODES.weekend.label}</option>
            <option value="gym">{EQUIPMENT_MODES.gym.label}</option>
          </select>
        </label>
        <label className="toggle">
          <input
            type="checkbox"
            checked={Boolean(day.quiet)}
            onChange={(e) => onToggleQuiet(index, e.target.checked)}
          />
          {lang === "en" ? "Quiet mode" : "Modo silencioso"}
        </label>
      </div>
      {equipmentGroups && equipmentGroups.length > 0 && (
        <details className="equipment-details">
          <summary>
            {lang === "en"
              ? "Specific equipment (optional)"
              : "Equipo específico (opcional)"}
          </summary>
          {selectedLabel.length > 0 && (
            <div className="equipment-selected">
              {selectedLabel.map((item) => (
                <span key={item} className="pill">
                  {item}
                </span>
              ))}
            </div>
          )}
          <div className="equipment-actions">
            <button type="button" className="tiny" onClick={clearEquipment}>
              {lang === "en" ? "Clear" : "Limpiar"}
            </button>
            <button
              type="button"
              className="tiny"
              onClick={setBodyweightOnly}
              disabled={!bodyweightOption}
            >
              {lang === "en" ? "Bodyweight only" : "Solo sin equipo"}
            </button>
            {selectedEquipment.length > 0 && (
              <span className="note">
                {lang === "en"
                  ? `${selectedEquipment.length} selected`
                  : `${selectedEquipment.length} seleccionados`}
              </span>
            )}
          </div>
          <div className="equipment-groups">
            {equipmentGroups.map((group) => (
              <div key={group.label} className="equipment-group">
                <strong>{group.label}</strong>
                <div className="equipment-grid">
                  {group.items.map((item) => (
                    <label key={item} className="check">
                      <input
                        type="checkbox"
                        checked={selectedEquipment.includes(item)}
                        onChange={() => toggleEquipment(item)}
                      />
                      {formatEquipment(item)}
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </details>
      )}

      <ul className="ex-list">
        {day.exercises.map((ex, i) => (
          <li
            key={ex.name + i}
            className={`ex-item ${
              activeExerciseKey === getExerciseKey(day.title, ex) ? "active" : ""
            }`}
          >
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
