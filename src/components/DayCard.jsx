import { buildDayFocusLabel } from "../utils/dayFocus";

export default function DayCard({
  day,
  index,
  onChangeMode,
  onToggleQuiet,
  onChangeEquipment,
  onSelectExercise,
  completedMap,
  getExerciseKey,
  getExerciseXp,
  lang,
  onStartSession,
  activeExerciseKey,
  equipmentGroups,
  exerciseCatalog,
  onAddCoreAlternative,
}) {
  const dayPossible = day.exercises.reduce((sum, ex) => sum + getExerciseXp(ex), 0);
  const dayEarned = day.exercises.reduce((sum, ex) => {
    const key = getExerciseKey(day.title, ex);
    return sum + (completedMap[key] ? getExerciseXp(ex) : 0);
  }, 0);
  const dayCompleted = day.exercises.every((ex) => completedMap[getExerciseKey(day.title, ex)]);
  const resolvedFocus = buildDayFocusLabel(day, lang, day.focus);

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

  const isCoreExercise = (ex) => {
    const body = (ex.bodyPart || "").toLowerCase();
    const target = (ex.target || "").toLowerCase();
    const category = (ex.category || "").toLowerCase();
    return (
      body === "waist" ||
      target === "core" ||
      target === "abs" ||
      target === "obliques" ||
      category === "core"
    );
  };

  const isStrengthExercise = (ex) => {
    const category = (ex.category || "").toLowerCase();
    if (isCoreExercise(ex)) return false;
    return !["cardio", "mobility", "stretching", "balance"].includes(category);
  };

  const strengthExercises = day.exercises.filter(isStrengthExercise);
  const coreExercises = day.exercises.filter(isCoreExercise);

  const renderExercise = (ex, i, sectionKey) => (
    <li
      key={`${sectionKey}-${ex.instanceId || ex.id || ex.name}-${i}`}
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
        <span className="ex-meta">
          ID ex: {ex.id || "—"} • ID gif: {ex.gifResolvedId || "—"} • fuente:{" "}
          {ex.gifSource || "—"}
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
  );

  const selectedEquipment = Array.isArray(day.equipmentList) ? day.equipmentList : [];
  const hasEquipment =
    selectedEquipment.length > 0 || (day.mode && day.mode !== "week");
  const normalizeEquipment = (equipment) => {
    const e = String(equipment || "").toLowerCase();
    if (!e) return "";
    if (e.includes("barbell")) return "barbell";
    if (e.includes("dumbbell")) return "dumbbell";
    if (e.includes("bench")) return "bench";
    if (e.includes("body weight")) return "bodyweight";
    if (e.includes("cable")) return "cable";
    if (e.includes("machine")) return "machine";
    if (e.includes("leverage")) return "leverage";
    if (e.includes("assisted")) return "assisted";
    if (e.includes("band")) return "band";
    if (e.includes("kettlebell")) return "kettlebell";
    if (e.includes("smith")) return "smith";
    if (e.includes("ez")) return "ez barbell";
    if (e.includes("rope")) return "rope";
    if (e.includes("plate") || e.includes("disc")) return "plate";
    if (e.includes("medicine")) return "medicine ball";
    return e;
  };
  const formatEquipment = (value) => {
    if (!value) return value;
    return value
      .replace(/_/g, " ")
      .replace(/\b\w/g, (m) => m.toUpperCase());
  };
  const translateEquipment = (value) => {
    const raw = normalizeEquipment(value);
    const labelsEs = [
      { re: /dumbbell/, label: "Mancuerna" },
      { re: /barbell|ez barbell|smith/, label: "Barra" },
      { re: /bench/, label: "Banca" },
      { re: /plate|disc/, label: "Discos / Pesos" },
      { re: /body weight|bodyweight/, label: "Sin equipo" },
      { re: /medicine ball/, label: "Bola medicinal" },
      { re: /kettlebell/, label: "Kettlebell" },
      { re: /machine|leverage|assisted/, label: "Máquina" },
      { re: /cable/, label: "Cable" },
      { re: /band/, label: "Banda" },
      { re: /rope/, label: "Cuerda" },
    ];
    const labelsEn = [
      { re: /dumbbell/, label: "Dumbbell" },
      { re: /barbell|ez barbell|smith/, label: "Barbell" },
      { re: /bench/, label: "Bench" },
      { re: /plate|disc/, label: "Plates / Weights" },
      { re: /body weight|bodyweight/, label: "Bodyweight" },
      { re: /medicine ball/, label: "Medicine Ball" },
      { re: /kettlebell/, label: "Kettlebell" },
      { re: /machine|leverage|assisted/, label: "Machine" },
      { re: /cable/, label: "Cable" },
      { re: /band/, label: "Band" },
      { re: /rope/, label: "Rope" },
    ];
    const found = (lang === "en" ? labelsEn : labelsEs).find((it) =>
      it.re.test(raw)
    );
    return found ? found.label : formatEquipment(value);
  };
  const equipmentOptions = Array.from(
    new Set(
      (equipmentGroups || [])
        .flatMap((g) => g.items)
        .map((item) => normalizeEquipment(item))
        .filter(Boolean)
    )
  ).sort((a, b) => translateEquipment(a).localeCompare(translateEquipment(b)));
  const fallbackEquipmentOptions = [
    "bodyweight",
    "dumbbell",
    "barbell",
    "bench",
    "plate",
    "medicine ball",
    "kettlebell",
    "cable",
    "band",
    "machine",
    "leverage",
    "assisted",
    "rope",
    "smith",
    "ez barbell",
  ];
  const checklistOptions = Array.from(
    new Set([...fallbackEquipmentOptions, ...equipmentOptions])
  ).sort((a, b) => translateEquipment(a).localeCompare(translateEquipment(b)));
  const inferModeFromEquipment = (list) => {
    if (!Array.isArray(list) || list.length === 0) return "week";
    const gymHints = /(machine|leverage|assisted|cable|smith|ez barbell|rope)/i;
    return list.some((item) => gymHints.test(String(item || ""))) ? "gym" : "weekend";
  };
  const applyEquipmentSelection = (nextList) => {
    const list = Array.isArray(nextList)
      ? Array.from(
          new Set(nextList.map((item) => normalizeEquipment(item)).filter(Boolean))
        )
      : [];
    onChangeEquipment(index, list);
    const nextMode = inferModeFromEquipment(list);
    if (day.mode !== nextMode) onChangeMode(index, nextMode);
  };
  const hasSelectedEquipmentValue = (value) => {
    const needle = normalizeEquipment(value);
    return selectedEquipment.some((item) => normalizeEquipment(item) === needle);
  };
  const addEquipment = (value) => {
    const normalized = normalizeEquipment(value);
    if (!normalized) return;
    if (hasSelectedEquipmentValue(normalized)) return;
    applyEquipmentSelection([...selectedEquipment, normalized]);
  };
  const removeEquipment = (value) => {
    const normalized = normalizeEquipment(value);
    applyEquipmentSelection(
      selectedEquipment.filter((item) => normalizeEquipment(item) !== normalized)
    );
  };
  const toggleEquipment = (value) => {
    if (!value) return;
    if (selectedEquipment.includes(value)) {
      removeEquipment(value);
      return;
    }
    addEquipment(value);
  };
  const selectedEquipmentSet = new Set(
    selectedEquipment.map((item) => normalizeEquipment(item)).filter(Boolean)
  );
  const currentCoreIds = new Set(
    coreExercises.map((item) => String(item?.id || item?.instanceId || ""))
  );
  const coreEquipmentAlternatives = (Array.isArray(exerciseCatalog) ? exerciseCatalog : [])
    .filter((ex) => isCoreExercise(ex))
    .filter((ex) => selectedEquipmentSet.has(normalizeEquipment(ex.equipment)))
    .filter((ex) => !currentCoreIds.has(String(ex?.id || ex?.instanceId || "")))
    .slice(0, 6);

  return (
    <div className="day-card">
      <div className="day-head">
        <div className="day-title">
          <strong>{day.title}</strong>
          {resolvedFocus && <span className="day-focus">{resolvedFocus}</span>}
        </div>
        <div className="day-head-side">
          <span className="day-xp">
            {dayEarned} / {dayPossible} XP
          </span>
          <label className="toggle quiet-inline">
            <input
              type="checkbox"
              checked={Boolean(day.quiet)}
              onChange={(e) => onToggleQuiet(index, e.target.checked)}
            />
            {lang === "en" ? "Quiet mode" : "Modo silencioso"}
          </label>
        </div>
      </div>
      {dayCompleted && (
        <div className="day-complete">
          ✅ {lang === "en" ? "Day completed" : "Día completado"}
        </div>
      )}

      <div className="equipment-inline">
        <label className="field">
          {lang === "en" ? "Do you have equipment?" : "¿Tienes equipo?"}
          <select
            value={hasEquipment ? "yes" : "no"}
            onChange={(e) => {
              const enabled = e.target.value === "yes";
              if (!enabled) {
                applyEquipmentSelection([]);
                return;
              }
              if (day.mode === "week") onChangeMode(index, "weekend");
            }}
          >
            <option value="no">{lang === "en" ? "No" : "No"}</option>
            <option value="yes">{lang === "en" ? "Yes" : "Sí"}</option>
          </select>
        </label>
        {hasEquipment && (
          <div className="field equipment-checklist">
            <span>{lang === "en" ? "What equipment do you have?" : "¿Qué equipo tienes?"}</span>
            <div className="equipment-grid">
              {checklistOptions.map((item) => (
                <label key={item} className="check">
                  <input
                    type="checkbox"
                    checked={hasSelectedEquipmentValue(item)}
                    onChange={() => toggleEquipment(item)}
                  />
                  {translateEquipment(item)}
                </label>
              ))}
            </div>
          </div>
        )}
      </div>

      {hasEquipment && selectedEquipment.length > 0 && (
        <div className="equipment-selected">
          {Array.from(
            new Set(selectedEquipment.map((item) => normalizeEquipment(item)).filter(Boolean))
          ).map((item) => (
            <button
              key={item}
              type="button"
              className="pill"
              onClick={() => removeEquipment(item)}
              title={lang === "en" ? "Remove" : "Quitar"}
            >
              {translateEquipment(item)} ×
            </button>
          ))}
        </div>
      )}
      {day.equipmentShortage && (
        <div className="equipment-warning">
          {lang === "en"
            ? "Not enough exercises for selected equipment. Add more equipment or change selection."
            : "No hay suficientes ejercicios para el equipo seleccionado. Agrega más equipo o cambia la selección."}
        </div>
      )}

      <div className="ex-section">
        <div className="ex-section-head">
          <strong>{lang === "en" ? "Strength" : "Fuerza"}</strong>
          <span>{strengthExercises.length}/3</span>
        </div>
        <ul className="ex-list">
          {strengthExercises.map((ex, i) => renderExercise(ex, i, "strength"))}
        </ul>
      </div>

      <div className="ex-section">
        <div className="ex-section-head">
          <strong>Core</strong>
          <span>{coreExercises.length}/3</span>
        </div>
        {selectedEquipment.length > 0 && coreEquipmentAlternatives.length > 0 && (
          <div className="core-alt-box">
            <span className="core-alt-title">
              {lang === "en"
                ? "Core alternatives with equipment (optional)"
                : "Alternativas de core con equipo (opcional)"}
            </span>
            <div className="core-alt-list">
              {coreEquipmentAlternatives.map((ex) => (
                <div
                  key={`${ex.id || ex.instanceId || ex.name}-${ex.equipment || ""}`}
                  className="pill core-alt-item"
                >
                  <span>{getName(ex)} · {translateEquipment(ex.equipment)}</span>
                  <div className="core-alt-actions">
                    <button
                      type="button"
                      className="tiny"
                      onClick={() => onSelectExercise?.({ ex, dayTitle: day.title })}
                    >
                      {lang === "en" ? "View" : "Ver"}
                    </button>
                    <button
                      type="button"
                      className="tiny primary-btn"
                      onClick={() => onAddCoreAlternative?.(index, ex.id)}
                    >
                      {lang === "en" ? "Add" : "Agregar"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        <ul className="ex-list">
          {coreExercises.map((ex, i) => renderExercise(ex, i, "core"))}
        </ul>
      </div>
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
