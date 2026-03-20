import { useEffect } from "react";
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

export default function SessionRunner({
  open,
  day,
  exerciseIndex,
  lang,
  onClose,
  onSave,
  onPrev,
  onNext,
  getExerciseKey,
  completedMap,
  completedDetails,
  onUpdateDetail,
  onRequestGif,
}) {
  const ex = open && day ? day.exercises[exerciseIndex] : null;

  useEffect(() => {
    if (!open || !ex || ex.gifUrl || !onRequestGif) return;
    onRequestGif(ex);
  }, [open, ex?.instanceId, ex?.id, ex?.gifUrl, onRequestGif]);

  if (!open || !day) return null;
  if (!ex) return null;

  const key = getExerciseKey(day.title, ex);
  const isDone = Boolean(completedMap[key]);
  const detail = completedDetails[key] || {};
  const currentStep = exerciseIndex + 1;
  const completedCount = day.exercises.reduce((sum, item) => {
    const itemKey = getExerciseKey(day.title, item);
    return sum + (completedMap[itemKey] ? 1 : 0);
  }, 0);
  const completedPct = Math.round((completedCount / Math.max(1, day.exercises.length)) * 100);

  const name =
    lang === "en"
      ? ex.name_en || ex.name || ex.name_es
      : ex.name_es || ex.name || ex.name_en;
  const typeLabel = getTypeLabel(ex, lang);
  const typeTone =
    typeLabel === "Cardio"
      ? "cardio"
      : typeLabel === "Core"
        ? "core"
        : typeLabel === "Movilidad" || typeLabel === "Mobility"
          ? "movilidad"
          : "fuerza";
  const description = getDescription(ex, lang);
  const instructions = getInstructions(ex, lang);
  const prescriptionSummary = getPrescriptionSummary(ex, lang);
  const targetLabel = ex.target || (lang === "en" ? "General" : "General");
  const equipmentLabel = ex.equipment || (lang === "en" ? "Bodyweight" : "Sin equipo");

  return (
    <div className="session-overlay" onClick={onClose}>
      <div className="session" onClick={(e) => e.stopPropagation()}>
        <div className="session-head">
          <div className="session-head-copy">
            <p className="workspace-section-kicker">
              {lang === "en" ? "Active session" : "Sesión activa"} · {currentStep}/
              {day.exercises.length}
            </p>
            <strong className="session-day-title">{day.title}</strong>
            <h3>{name}</h3>
            <p className="session-lead">
              {lang === "en"
                ? "Log the current exercise and keep moving through the session without losing context."
                : "Registra el ejercicio actual y sigue avanzando por la sesión sin perder contexto."}
            </p>
          </div>
          <div className="session-head-side">
            <span className={`session-status ${isDone ? "is-done" : "is-pending"}`}>
              {isDone
                ? lang === "en"
                  ? "Saved"
                  : "Guardado"
                : lang === "en"
                  ? "Pending"
                  : "Pendiente"}
            </span>
            <button className="tiny" type="button" onClick={onClose}>
              {lang === "en" ? "Close" : "Cerrar"}
            </button>
          </div>
        </div>

        <div className="session-meta-grid">
          <div className="session-meta-card">
            <span>{lang === "en" ? "Day progress" : "Progreso del día"}</span>
            <strong>
              {completedCount}/{day.exercises.length}
            </strong>
            <small>{lang === "en" ? "completed exercises" : "ejercicios completados"}</small>
          </div>
          <div className="session-meta-card">
            <span>{lang === "en" ? "Prescription" : "Prescripción"}</span>
            <strong>{typeLabel}</strong>
            <small>{prescriptionSummary}</small>
          </div>
          <div className="session-meta-card">
            <span>{lang === "en" ? "Setup" : "Entorno"}</span>
            <strong>{targetLabel}</strong>
            <small>{equipmentLabel}</small>
          </div>
        </div>

        <div className="session-progress-strip">
          <div className="session-progress-copy">
            <span className="session-progress-kicker">
              {lang === "en" ? "Session pulse" : "Pulso de la sesión"}
            </span>
            <strong>{completedPct}%</strong>
            <small>
              {lang === "en"
                ? `${completedCount}/${day.exercises.length} completed · exercise ${currentStep} in focus`
                : `${completedCount}/${day.exercises.length} completados · ejercicio ${currentStep} en foco`}
            </small>
          </div>
          <div
            className="session-progress-track"
            role="progressbar"
            aria-valuemin="0"
            aria-valuemax="100"
            aria-valuenow={completedPct}
            aria-label={lang === "en" ? "Session completion" : "Progreso de la sesión"}
          >
            <div className="session-progress-fill" style={{ width: `${completedPct}%` }} />
          </div>
        </div>

        <div className="session-layout">
          <div className="session-media-column">
            <div className="session-media-frame">
              {ex.gifUrl ? (
                <img src={ex.gifUrl} alt={name} decoding="async" />
              ) : (
                <div className="gif-placeholder session-gif-placeholder">
                  {lang === "en" ? "No gif available" : "Sin gif disponible"}
                </div>
              )}
            </div>
            {!ex.gifUrl && onRequestGif && (
              <button type="button" className="tiny" onClick={() => onRequestGif(ex)}>
                {lang === "en" ? "Load gif" : "Cargar gif"}
              </button>
            )}
            <div className="session-pill-row">
              <span className={`type-pill ${typeTone}`}>{typeLabel}</span>
              <span className="pill">{targetLabel}</span>
              <span className="pill">{equipmentLabel}</span>
            </div>
          </div>

          <div className="session-content-column">
            {(description || instructions.length > 0) && (
              <div className="session-panel">
                <div className="session-panel-head">
                  <div>
                    <p className="workspace-section-kicker">
                      {lang === "en" ? "Guide" : "Guía"}
                    </p>
                    <h4>{lang === "en" ? "Execution notes" : "Notas de ejecución"}</h4>
                  </div>
                </div>
                {description && <p className="session-description">{description}</p>}
                {instructions.length > 0 && (
                  <ol className="session-steps">
                    {instructions.map((step, idx) => (
                      <li key={`${key}-step-${idx}`}>{step}</li>
                    ))}
                  </ol>
                )}
              </div>
            )}

            <div
              className={`session-log-grid ${
                ex.prescription?.type === "time" ? "has-timer" : ""
              }`}
            >
              <div className="session-panel">
                <div className="session-panel-head">
                  <div>
                    <p className="workspace-section-kicker">
                      {lang === "en" ? "Current block" : "Bloque actual"}
                    </p>
                    <h4>{lang === "en" ? "Session log" : "Registro de sesión"}</h4>
                  </div>
                </div>

                {ex.prescription?.type === "reps" && (
                  <div className="ex-done">
                    <span className="ex-done-title">
                      {lang === "en" ? "Reps by set" : "Reps por serie"}
                    </span>
                    <div className="series-grid">
                      {Array.from({ length: ex.prescription.sets }).map((_, idx) => {
                        const repsBySet = detail.repsBySet || [];
                        const value = repsBySet[idx] ?? ex.prescription.reps;
                        return (
                          <label key={idx}>
                            {lang === "en" ? `Set ${idx + 1}` : `Serie ${idx + 1}`}
                            <input
                              type="number"
                              min="1"
                              value={value}
                              onChange={(e) => {
                                const next = [...repsBySet];
                                next[idx] = Number(e.target.value || 0);
                                onUpdateDetail(day.title, ex, {
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

                {ex.prescription?.type === "time" && (
                  <div className="ex-done">
                    <label>
                      {lang === "en" ? "Actual time (s)" : "Tiempo real (s)"}
                      <input
                        type="number"
                        min="5"
                        value={detail.workSec ?? ex.prescription.workSec}
                        onChange={(e) =>
                          onUpdateDetail(day.title, ex, {
                            type: "time",
                            workSec: Number(e.target.value || 0),
                          })
                        }
                      />
                    </label>
                  </div>
                )}
              </div>

              {ex.prescription?.type === "time" && (
                <div className="session-panel">
                  <div className="session-panel-head">
                    <div>
                      <p className="workspace-section-kicker">
                        {lang === "en" ? "Pacing" : "Ritmo"}
                      </p>
                      <h4>{lang === "en" ? "Interval timer" : "Temporizador"}</h4>
                    </div>
                  </div>
                  <IntervalTimer
                    key={`${key}-${ex.prescription.workSec}-${ex.prescription.restSec}`}
                    workSec={ex.prescription.workSec}
                    restSec={ex.prescription.restSec}
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="session-actions">
          <div className="session-actions-group">
            <button className="tiny" type="button" onClick={onPrev}>
              {lang === "en" ? "Previous" : "Anterior"}
            </button>
            <button className="tiny" type="button" onClick={onNext}>
              {lang === "en" ? "Next" : "Siguiente"}
            </button>
          </div>
          <button
            className="tiny primary-btn session-save-btn"
            type="button"
            onClick={() => onSave(day.title, ex, !isDone)}
          >
            {isDone
              ? lang === "en"
                ? "Unmark"
                : "Desmarcar"
              : lang === "en"
                ? "Save"
                : "Guardar"}
          </button>
        </div>
      </div>
    </div>
  );
}
