import IntervalTimer from "./IntervalTimer";
import { useState } from "react";

export default function ExerciseDrawer({
  exercise,
  dayTitle,
  completedMap,
  completedDetails,
  onUpdateDetail,
  onToggleComplete,
  getExerciseKey,
  onReplaceExercise,
  onRequestGif,
  onClose,
  onNext,
  isPersistent,
  isDesktop,
  lang,
}) {
  const open = Boolean(exercise);
  const [reason, setReason] = useState("discomfort");
  const typeLabel = () => {
    const c = (exercise?.category || "").toLowerCase();
    const bp = (exercise?.bodyPart || "").toLowerCase();
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

  const getName = () => {
    if (!exercise) return "Ejercicio";
    if (lang === "en") return exercise.name_en || exercise.name || exercise.name_es;
    return exercise.name_es || exercise.name || exercise.name_en;
  };

  const getDescription = () => {
    if (!exercise) return "";
    if (lang === "en") {
      return (
        exercise.description_en ||
        exercise.description ||
        exercise.description_es ||
        ""
      );
    }
    return (
      exercise.description_es ||
      exercise.description ||
      exercise.description_en ||
      ""
    );
  };

  const getInstructions = () => {
    if (!exercise) return [];
    if (lang === "en") return exercise.instructions_en || exercise.instructions || [];
    return exercise.instructions_es || exercise.instructions || [];
  };

  const key = exercise && dayTitle ? getExerciseKey(dayTitle, exercise) : "";
  const isDone = key ? Boolean(completedMap[key]) : false;
  const detail = key ? completedDetails[key] || {} : {};

  return (
    <>
      {!isPersistent && (
        <div
          className={`drawer-backdrop ${open ? "is-open" : ""}`}
          onClick={onClose}
        />
      )}
      <aside
        className={`drawer ${open ? "is-open" : ""} ${
          isPersistent ? "is-persistent" : ""
        }`}
      >
        <div className="drawer-head">
          <div>
            <h3>{getName()}</h3>
            {exercise && (
              <span className={`type-pill ${typeLabel().toLowerCase()}`}>
                {typeLabel()}
              </span>
            )}
          </div>
          <div className="drawer-actions">
            {onNext && (
              <button className="tiny" type="button" onClick={onNext}>
                Siguiente
              </button>
            )}
            {!isPersistent && (
              <button className="tiny" type="button" onClick={onClose}>
                Cerrar
              </button>
            )}
          </div>
        </div>

        {exercise && (
          <div className="drawer-media">
            {exercise.gifUrl ? (
              <img src={exercise.gifUrl} alt={exercise.name} />
            ) : (
              <div className="gif-placeholder">Sin gif</div>
            )}
            {!exercise.gifUrl && onRequestGif && (
              <button
                type="button"
                className="tiny"
                onClick={() => onRequestGif(exercise)}
              >
                Cargar gif
              </button>
            )}
          </div>
        )}

        {getDescription() && <p>{getDescription()}</p>}

        {exercise && (
          <div className="drawer-meta">
            <p>
              <strong>Músculo principal:</strong> {exercise.target}
            </p>
            {exercise.secondaryMuscles?.length > 0 && (
              <p>
                <strong>Secundarios:</strong>{" "}
                {exercise.secondaryMuscles.join(", ")}
              </p>
            )}
            <p>
              <strong>Equipo:</strong> {exercise.equipment}
            </p>
            {exercise.prescription?.type === "reps" && (
              <p>
                <strong>Series:</strong> {exercise.prescription.sets} x{" "}
                {exercise.prescription.reps} —{" "}
                {exercise.prescription.restSec}s descanso
              </p>
            )}
            {exercise.prescription?.type === "time" && (
              <p>
                <strong>Tiempo:</strong> {exercise.prescription.workSec}s trabajo
                — {exercise.prescription.restSec}s descanso
              </p>
            )}
          </div>
        )}

        {exercise?.prescription?.type === "reps" && (
          <div className="ex-done">
            <span className="ex-done-title">Reps por serie</span>
            <div className="series-grid">
              {Array.from({ length: exercise.prescription.sets }).map(
                (_, idx) => {
                  const repsBySet = detail.repsBySet || [];
                  const value = repsBySet[idx] ?? exercise.prescription.reps;
                  return (
                    <label key={idx}>
                      Serie {idx + 1}
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
                }
              )}
            </div>
          </div>
        )}

        {exercise?.prescription?.type === "time" && (
          <div className="ex-done">
            <label>
              Tiempo real (s)
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
        )}

        {exercise && dayTitle && (
          <div className="drawer-save">
            {isDone ? (
              <button
                type="button"
                className="tiny saved"
                onClick={() => {
                  const ok = window.confirm(
                    "¿Quieres desmarcar este ejercicio?"
                  );
                  if (ok) onToggleComplete(dayTitle, exercise, false);
                }}
              >
                Guardado
              </button>
            ) : (
              <button
                type="button"
                className="tiny primary-btn"
                onClick={() => {
                  const ok = window.confirm(
                    "¿Guardar este ejercicio como completado?"
                  );
                  if (ok) onToggleComplete(dayTitle, exercise, true);
                }}
              >
                Guardar
              </button>
            )}
          </div>
        )}

        {exercise && dayTitle && onReplaceExercise && (
          <div className="drawer-replace">
            <label>
              ¿Por qué quieres cambiarlo?
              <select value={reason} onChange={(e) => setReason(e.target.value)}>
                <option value="discomfort">Me incomoda</option>
                <option value="no-equipment">No tengo equipo</option>
                <option value="space">Necesita mucho espacio</option>
              </select>
            </label>
            <button
              type="button"
              className="tiny"
              onClick={() => onReplaceExercise(dayTitle, exercise, reason)}
            >
              Cambiar ejercicio
            </button>
          </div>
        )}

        {exercise?.prescription?.type === "time" && (
          <IntervalTimer
            workSec={exercise.prescription.workSec}
            restSec={exercise.prescription.restSec}
          />
        )}

        {getInstructions().length > 0 && (
          <>
            <p>
              <strong>Instrucciones:</strong>
            </p>
            <ol className="drawer-steps">
              {getInstructions().map((step, i) => (
                <li key={i}>{step}</li>
              ))}
            </ol>
          </>
        )}
      </aside>
    </>
  );
}
