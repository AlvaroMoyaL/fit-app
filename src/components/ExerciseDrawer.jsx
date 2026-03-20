import { useEffect, useState } from "react";
import IntervalTimer from "./IntervalTimer";

function getTypeLabel(exercise, lang) {
  const category = (exercise?.category || "").toLowerCase();
  const bodyPart = (exercise?.bodyPart || "").toLowerCase();
  const isCardio = category.includes("cardio") || bodyPart.includes("cardio");
  const isMobility = category.includes("stretching") || category.includes("mobility");
  const isCore = bodyPart.includes("waist") || bodyPart.includes("abs");

  if (lang === "en") {
    if (isCardio) return "Cardio";
    if (isMobility) return "Mobility";
    if (isCore) return "Core";
    return "Strength";
  }

  if (isCardio) return "Cardio";
  if (isMobility) return "Movilidad";
  if (isCore) return "Core";
  return "Fuerza";
}

function getTypeTone(label) {
  if (label === "Cardio") return "cardio";
  if (label === "Core") return "core";
  if (label === "Mobility" || label === "Movilidad") return "movilidad";
  return "fuerza";
}

function getExerciseName(exercise, lang) {
  if (!exercise) return lang === "en" ? "Exercise" : "Ejercicio";
  if (lang === "en") return exercise.name_en || exercise.name || exercise.name_es;
  return exercise.name_es || exercise.name || exercise.name_en;
}

function getDescription(exercise, lang) {
  if (!exercise) return "";
  if (lang === "en") {
    return exercise.description_en || exercise.description || exercise.description_es || "";
  }
  return exercise.description_es || exercise.description || exercise.description_en || "";
}

function getInstructions(exercise, lang) {
  if (!exercise) return [];
  if (lang === "en") return exercise.instructions_en || exercise.instructions || [];
  return exercise.instructions_es || exercise.instructions || [];
}

function getPrescriptionSummary(exercise, lang) {
  if (exercise?.prescription?.type === "reps") {
    return lang === "en"
      ? `${exercise.prescription.sets} sets · ${exercise.prescription.reps} reps · ${exercise.prescription.restSec}s rest`
      : `${exercise.prescription.sets} series · ${exercise.prescription.reps} reps · ${exercise.prescription.restSec}s descanso`;
  }

  if (exercise?.prescription?.type === "time") {
    return lang === "en"
      ? `${exercise.prescription.workSec}s work · ${exercise.prescription.restSec}s rest`
      : `${exercise.prescription.workSec}s trabajo · ${exercise.prescription.restSec}s descanso`;
  }

  return lang === "en" ? "Custom prescription" : "Prescripción personalizada";
}

export default function ExerciseDrawer({
  exercise,
  dayTitle,
  completedMap,
  completedDetails,
  onUpdateDetail,
  onToggleComplete,
  onCompleteAndNext,
  getExerciseKey,
  onReplaceExercise,
  replacementPool,
  onRequestGif,
  onClose,
  onNext,
  onPrev,
  isPersistent,
  lang,
}) {
  const open = Boolean(exercise);
  const [reason, setReason] = useState("discomfort");
  const [replaceMode, setReplaceMode] = useState("random");
  const [selectedBodyPart, setSelectedBodyPart] = useState("");
  const [selectedExerciseId, setSelectedExerciseId] = useState("");

  useEffect(() => {
    setReplaceMode("random");
    setSelectedBodyPart("");
    setSelectedExerciseId("");
  }, [exercise?.instanceId, exercise?.id, dayTitle]);

  useEffect(() => {
    if (!open || !exercise || exercise.gifUrl || !onRequestGif) return;
    onRequestGif(exercise);
  }, [open, exercise?.instanceId, exercise?.id, exercise?.gifUrl, onRequestGif]);

  const groupLabel = (bodyPart) => {
    const bp = String(bodyPart || "").toLowerCase();
    const labelsEs = {
      chest: "Pecho",
      back: "Espalda",
      shoulders: "Hombros",
      "upper arms": "Brazos",
      "lower arms": "Brazos",
      "upper legs": "Pierna",
      "lower legs": "Pierna",
      waist: "Core",
      cardio: "Cardio",
      neck: "Cuello",
    };
    const labelsEn = {
      chest: "Chest",
      back: "Back",
      shoulders: "Shoulders",
      "upper arms": "Arms",
      "lower arms": "Arms",
      "upper legs": "Legs",
      "lower legs": "Legs",
      waist: "Core",
      cardio: "Cardio",
      neck: "Neck",
    };
    return (lang === "en" ? labelsEn : labelsEs)[bp] || bodyPart || "Otros";
  };

  const getPoolName = (item) => {
    if (!item) return "";
    if (lang === "en") return item.name_en || item.name || item.name_es || "";
    return item.name_es || item.name || item.name_en || "";
  };

  const key = exercise && dayTitle ? getExerciseKey(dayTitle, exercise) : "";
  const isDone = key ? Boolean(completedMap[key]) : false;
  const detail = key ? completedDetails[key] || {} : {};
  const sourcePool = Array.isArray(replacementPool) ? replacementPool : [];
  const typeLabel = getTypeLabel(exercise, lang);
  const typeTone = getTypeTone(typeLabel);
  const name = getExerciseName(exercise, lang);
  const description = getDescription(exercise, lang);
  const instructions = getInstructions(exercise, lang);
  const prescriptionSummary = getPrescriptionSummary(exercise, lang);
  const targetLabel = exercise?.target || (lang === "en" ? "General" : "General");
  const equipmentLabel =
    exercise?.equipment || (lang === "en" ? "Bodyweight" : "Sin equipo");
  const secondaryLabel =
    Array.isArray(exercise?.secondaryMuscles) && exercise.secondaryMuscles.length > 0
      ? exercise.secondaryMuscles.join(", ")
      : lang === "en"
        ? "No secondary focus"
        : "Sin foco secundario";
  const saveLabel = isDone
    ? lang === "en"
      ? "Saved"
      : "Guardado"
    : lang === "en"
      ? "Pending"
      : "Pendiente";

  const availableByBodyPart = sourcePool
    .filter((item) => String(item?.id || "") !== String(exercise?.id || ""))
    .reduce((acc, item) => {
      const keyBp = String(item?.bodyPart || "other").toLowerCase();
      if (!acc[keyBp]) acc[keyBp] = [];
      if (!acc[keyBp].some((it) => String(it.id) === String(item.id))) {
        acc[keyBp].push(item);
      }
      return acc;
    }, {});

  const bodyPartOptions = Object.keys(availableByBodyPart).sort((a, b) =>
    groupLabel(a).localeCompare(groupLabel(b))
  );
  const exerciseOptions = selectedBodyPart ? availableByBodyPart[selectedBodyPart] || [] : [];
  const selectedPoolExercise = exerciseOptions.find(
    (item) => String(item.id) === String(selectedExerciseId)
  );

  const reasonOptions =
    lang === "en"
      ? [
          { value: "discomfort", label: "Discomfort" },
          { value: "no-equipment", label: "No equipment" },
          { value: "space", label: "Needs too much space" },
        ]
      : [
          { value: "discomfort", label: "Me incomoda" },
          { value: "no-equipment", label: "No tengo equipo" },
          { value: "space", label: "Necesita mucho espacio" },
        ];

  return (
    <>
      {!isPersistent && (
        <div className={`drawer-backdrop ${open ? "is-open" : ""}`} onClick={onClose} />
      )}
      <aside
        className={`drawer exercise-drawer ${open ? "is-open" : ""} ${
          isPersistent ? "is-persistent" : ""
        }`}
      >
        <div className="drawer-head exercise-drawer-head">
          <div className="exercise-drawer-head-copy">
            <p className="workspace-section-kicker">
              {lang === "en" ? "Exercise detail" : "Detalle del ejercicio"}
            </p>
            <h3>{name}</h3>
            <p className="exercise-drawer-lead">
              {dayTitle
                ? `${dayTitle} · `
                : ""}
              {lang === "en"
                ? "Review execution, save the current block or swap the exercise without leaving the flow."
                : "Revisa la ejecución, guarda el bloque actual o cambia el ejercicio sin salir del flujo."}
            </p>
          </div>

          <div className="exercise-drawer-head-side">
            <span className={`exercise-drawer-status ${isDone ? "is-done" : "is-pending"}`}>
              {saveLabel}
            </span>
            <div className="drawer-actions exercise-drawer-actions">
              {onPrev && (
                <button className="tiny" type="button" onClick={onPrev}>
                  {lang === "en" ? "Previous" : "Atrás"}
                </button>
              )}
              {onNext && (
                <button className="tiny" type="button" onClick={onNext}>
                  {lang === "en" ? "Next" : "Siguiente"}
                </button>
              )}
              <button className="tiny" type="button" onClick={onClose}>
                {lang === "en" ? "Close" : "Cerrar"}
              </button>
            </div>
          </div>
        </div>

        <div className="exercise-drawer-summary">
          <div className="exercise-drawer-card">
            <span>{lang === "en" ? "Prescription" : "Prescripción"}</span>
            <strong>{typeLabel}</strong>
            <small>{prescriptionSummary}</small>
          </div>
          <div className="exercise-drawer-card">
            <span>{lang === "en" ? "Primary target" : "Músculo principal"}</span>
            <strong>{targetLabel}</strong>
            <small>{secondaryLabel}</small>
          </div>
          <div className="exercise-drawer-card">
            <span>{lang === "en" ? "Equipment" : "Equipo"}</span>
            <strong>{equipmentLabel}</strong>
            <small>{dayTitle || (lang === "en" ? "Free context" : "Contexto libre")}</small>
          </div>
        </div>

        {exercise && (
          <div className="exercise-drawer-media-frame">
            {exercise.gifUrl ? (
              <img src={exercise.gifUrl} alt={name} decoding="async" />
            ) : (
              <div className="gif-placeholder exercise-drawer-gif-placeholder">
                {lang === "en" ? "No gif available" : "Sin gif disponible"}
              </div>
            )}
            {!exercise.gifUrl && onRequestGif && (
              <button
                type="button"
                className="tiny"
                onClick={() => onRequestGif(exercise)}
              >
                {lang === "en" ? "Load gif" : "Cargar gif"}
              </button>
            )}
          </div>
        )}

        <div className="exercise-drawer-pill-row">
          <span className={`type-pill ${typeTone}`}>{typeLabel}</span>
          <span className="pill">{targetLabel}</span>
          <span className="pill">{equipmentLabel}</span>
        </div>

        {(description || instructions.length > 0) && (
          <section className="exercise-drawer-panel">
            <div className="exercise-drawer-panel-head">
              <div>
                <p className="workspace-section-kicker">
                  {lang === "en" ? "Guide" : "Guía"}
                </p>
                <h4>{lang === "en" ? "Execution notes" : "Notas de ejecución"}</h4>
              </div>
            </div>
            {description && <p className="exercise-drawer-description">{description}</p>}
            {instructions.length > 0 && (
              <ol className="drawer-steps exercise-drawer-steps">
                {instructions.map((step, idx) => (
                  <li key={`${key || name}-step-${idx}`}>{step}</li>
                ))}
              </ol>
            )}
          </section>
        )}

        <section className="exercise-drawer-panel">
          <div className="exercise-drawer-panel-head">
            <div>
              <p className="workspace-section-kicker">
                {lang === "en" ? "Current block" : "Bloque actual"}
              </p>
              <h4>{lang === "en" ? "Session log" : "Registro del ejercicio"}</h4>
            </div>
          </div>

          {exercise?.prescription?.type === "reps" && (
            <div className="ex-done">
              <span className="ex-done-title">
                {lang === "en" ? "Reps by set" : "Reps por serie"}
              </span>
              <div className="series-grid">
                {Array.from({ length: exercise.prescription.sets }).map((_, idx) => {
                  const repsBySet = detail.repsBySet || [];
                  const value = repsBySet[idx] ?? exercise.prescription.reps;
                  return (
                    <label key={idx}>
                      {lang === "en" ? `Set ${idx + 1}` : `Serie ${idx + 1}`}
                      <input
                        type="number"
                        min="1"
                        disabled={isDone}
                        value={value}
                        onChange={(e) => {
                          const next = [...repsBySet];
                          next[idx] = Number(e.target.value || 0);
                          onUpdateDetail(dayTitle, exercise, {
                            type: "reps",
                            repsBySet: next,
                          });
                        }}
                      />
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          {exercise?.prescription?.type === "time" && (
            <div className="exercise-drawer-log-grid">
              <div className="ex-done">
                <label>
                  {lang === "en" ? "Actual time (s)" : "Tiempo real (s)"}
                  <input
                    type="number"
                    min="5"
                    disabled={isDone}
                    value={detail.workSec ?? exercise.prescription.workSec}
                    onChange={(e) =>
                      onUpdateDetail(dayTitle, exercise, {
                        type: "time",
                        workSec: Number(e.target.value || 0),
                      })
                    }
                  />
                </label>
              </div>

              <IntervalTimer
                key={`${exercise.instanceId || exercise.id || exercise.name}-${exercise.prescription.workSec}-${exercise.prescription.restSec}`}
                workSec={exercise.prescription.workSec}
                restSec={exercise.prescription.restSec}
              />
            </div>
          )}
        </section>

        {exercise && dayTitle && (
          <section className="exercise-drawer-panel">
            <div className="exercise-drawer-panel-head">
              <div>
                <p className="workspace-section-kicker">
                  {lang === "en" ? "Completion" : "Guardado"}
                </p>
                <h4>{lang === "en" ? "Save progress" : "Guardar progreso"}</h4>
              </div>
            </div>

            <p className="exercise-drawer-note">
              {isDone
                ? lang === "en"
                  ? "This exercise is already marked as completed."
                  : "Este ejercicio ya está marcado como completado."
                : lang === "en"
                  ? "Save this block or move directly to the next exercise."
                  : "Guarda este bloque o avanza directamente al siguiente ejercicio."}
            </p>

            <div className="drawer-save">
              {isDone ? (
                <button
                  type="button"
                  className="tiny saved"
                  onClick={() => {
                    const ok = window.confirm(
                      lang === "en"
                        ? "Do you want to unmark this exercise?"
                        : "¿Quieres desmarcar este ejercicio?"
                    );
                    if (ok) onToggleComplete(dayTitle, exercise, false);
                  }}
                >
                  {lang === "en" ? "Unmark" : "Desmarcar"}
                </button>
              ) : (
                <div className="drawer-save-actions">
                  <button
                    type="button"
                    className="tiny primary-btn"
                    onClick={() => {
                      const ok = window.confirm(
                        lang === "en"
                          ? "Save this exercise as completed?"
                          : "¿Guardar este ejercicio como completado?"
                      );
                      if (ok) onToggleComplete(dayTitle, exercise, true);
                    }}
                  >
                    {lang === "en" ? "Save" : "Guardar"}
                  </button>
                  {onCompleteAndNext && (
                    <button
                      type="button"
                      className="tiny"
                      onClick={() => {
                        const ok = window.confirm(
                          lang === "en"
                            ? "Save and move to the next exercise?"
                            : "¿Guardar y pasar al siguiente ejercicio?"
                        );
                        if (ok) onCompleteAndNext(dayTitle, exercise);
                      }}
                    >
                      {lang === "en" ? "Save and next" : "Guardar y siguiente"}
                    </button>
                  )}
                </div>
              )}
            </div>
          </section>
        )}

        {exercise && dayTitle && onReplaceExercise && (
          <section className="exercise-drawer-panel">
            <div className="exercise-drawer-panel-head">
              <div>
                <p className="workspace-section-kicker">
                  {lang === "en" ? "Alternative" : "Sustitución"}
                </p>
                <h4>{lang === "en" ? "Replace exercise" : "Cambiar ejercicio"}</h4>
              </div>
            </div>

            <div className="drawer-replace">
              <label>
                {lang === "en" ? "Why do you want to replace it?" : "¿Por qué quieres cambiarlo?"}
                <select value={reason} onChange={(e) => setReason(e.target.value)}>
                  {reasonOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                {lang === "en" ? "Replacement type" : "Tipo de cambio"}
                <select
                  value={replaceMode}
                  onChange={(e) => {
                    setReplaceMode(e.target.value);
                  }}
                >
                  <option value="random">
                    {lang === "en" ? "Random" : "Aleatorio"}
                  </option>
                  <option value="manual">
                    {lang === "en" ? "Manual choice" : "Elegir manualmente"}
                  </option>
                </select>
              </label>

              {replaceMode === "manual" && (
                <>
                  <label>
                    {lang === "en" ? "Muscle group" : "Grupo muscular"}
                    <select
                      value={selectedBodyPart}
                      onChange={(e) => {
                        setSelectedBodyPart(e.target.value);
                        setSelectedExerciseId("");
                      }}
                    >
                      <option value="">{lang === "en" ? "Select" : "Seleccionar"}</option>
                      {bodyPartOptions.map((bp) => (
                        <option key={bp} value={bp}>
                          {groupLabel(bp)}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label>
                    {lang === "en" ? "Exercise" : "Ejercicio"}
                    <select
                      value={selectedExerciseId}
                      onChange={(e) => setSelectedExerciseId(e.target.value)}
                      disabled={!selectedBodyPart}
                    >
                      <option value="">{lang === "en" ? "Select" : "Seleccionar"}</option>
                      {exerciseOptions.map((item) => (
                        <option
                          key={`${item.id}-${item.name || item.name_es || item.name_en}`}
                          value={item.id}
                        >
                          {`${getPoolName(item)} · ${item.target || "target"} · ${
                            item.equipment || "equipo"
                          }`}
                        </option>
                      ))}
                    </select>
                  </label>

                  {selectedPoolExercise && (
                    <p className="note exercise-drawer-note">
                      {lang === "en" ? "Selected" : "Seleccionado"}:{" "}
                      <strong>{getPoolName(selectedPoolExercise)}</strong> (
                      {selectedPoolExercise.target || "target"} ·{" "}
                      {selectedPoolExercise.equipment || "equipo"})
                    </p>
                  )}
                </>
              )}

              <button
                type="button"
                className="tiny"
                onClick={() => {
                  if (replaceMode === "manual" && !selectedExerciseId) {
                    alert(
                      lang === "en"
                        ? "Select an exercise to replace this one."
                        : "Selecciona un ejercicio para reemplazar."
                    );
                    return;
                  }

                  onReplaceExercise(dayTitle, exercise, {
                    mode: replaceMode,
                    reason,
                    bodyPart: selectedBodyPart,
                    exerciseId: selectedExerciseId,
                  });
                }}
              >
                {replaceMode === "manual"
                  ? lang === "en"
                    ? "Replace with selection"
                    : "Cambiar por selección"
                  : lang === "en"
                    ? "Random replacement"
                    : "Cambiar aleatorio"}
              </button>
            </div>
          </section>
        )}
      </aside>
    </>
  );
}
