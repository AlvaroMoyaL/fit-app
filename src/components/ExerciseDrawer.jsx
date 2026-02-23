import IntervalTimer from "./IntervalTimer";
import { useEffect, useState } from "react";

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
  const sourcePool = Array.isArray(replacementPool) ? replacementPool : [];

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
            {onPrev && (
              <button className="tiny" type="button" onClick={onPrev}>
                Atrás
              </button>
            )}
            {onNext && (
              <button className="tiny" type="button" onClick={onNext}>
                Siguiente
              </button>
            )}
            <button className="tiny" type="button" onClick={onClose}>
              Cerrar
            </button>
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
              <div className="drawer-save-actions">
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
                {onCompleteAndNext && (
                  <button
                    type="button"
                    className="tiny"
                    onClick={() => {
                      const ok = window.confirm(
                        "¿Guardar y pasar al siguiente ejercicio?"
                      );
                      if (ok) onCompleteAndNext(dayTitle, exercise);
                    }}
                  >
                    Guardar y siguiente
                  </button>
                )}
              </div>
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
            <label>
              Tipo de cambio
              <select
                value={replaceMode}
                onChange={(e) => {
                  const nextMode = e.target.value;
                  setReplaceMode(nextMode);
                }}
              >
                <option value="random">Aleatorio</option>
                <option value="manual">Elegir manualmente</option>
              </select>
            </label>
            {replaceMode === "manual" && (
              <>
                <label>
                  Grupo muscular
                  <select
                    value={selectedBodyPart}
                    onChange={(e) => {
                      setSelectedBodyPart(e.target.value);
                      setSelectedExerciseId("");
                    }}
                  >
                    <option value="">Seleccionar</option>
                    {bodyPartOptions.map((bp) => (
                      <option key={bp} value={bp}>
                        {groupLabel(bp)}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Ejercicio
                  <select
                    value={selectedExerciseId}
                    onChange={(e) => setSelectedExerciseId(e.target.value)}
                    disabled={!selectedBodyPart}
                  >
                    <option value="">Seleccionar</option>
                    {exerciseOptions.map((item) => (
                      <option key={`${item.id}-${item.name || item.name_es || item.name_en}`} value={item.id}>
                        {`${getPoolName(item)} · ${item.target || "target"} · ${item.equipment || "equipo"}`}
                      </option>
                    ))}
                  </select>
                </label>
                {selectedPoolExercise && (
                  <p className="note">
                    Seleccionado: <strong>{getPoolName(selectedPoolExercise)}</strong>{" "}
                    ({selectedPoolExercise.target || "target"} ·{" "}
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
                  alert("Selecciona un ejercicio para reemplazar.");
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
              {replaceMode === "manual" ? "Cambiar por selección" : "Cambiar aleatorio"}
            </button>
          </div>
        )}

        {exercise?.prescription?.type === "time" && (
          <IntervalTimer
            key={`${exercise.instanceId || exercise.id || exercise.name}-${exercise.prescription.workSec}-${exercise.prescription.restSec}`}
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
