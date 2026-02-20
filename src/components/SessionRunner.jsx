import IntervalTimer from "./IntervalTimer";

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
}) {
  if (!open || !day) return null;
  const ex = day.exercises[exerciseIndex];
  if (!ex) return null;

  const key = getExerciseKey(day.title, ex);
  const isDone = Boolean(completedMap[key]);
  const detail = completedDetails[key] || {};

  const name =
    lang === "en"
      ? ex.name_en || ex.name || ex.name_es
      : ex.name_es || ex.name || ex.name_en;

  return (
    <div className="session-overlay">
      <div className="session">
        <div className="session-head">
          <div>
            <strong>{day.title}</strong>
            <h3>{name}</h3>
          </div>
          <button className="tiny" type="button" onClick={onClose}>
            Cerrar
          </button>
        </div>

        <div className="session-body">
          {ex.gifUrl && <img src={ex.gifUrl} alt={name} />}

          {ex.prescription?.type === "reps" && (
            <div className="ex-done">
              <span className="ex-done-title">Reps por serie</span>
              <div className="series-grid">
                {Array.from({ length: ex.prescription.sets }).map((_, idx) => {
                  const repsBySet = detail.repsBySet || [];
                  const value = repsBySet[idx] ?? ex.prescription.reps;
                  return (
                    <label key={idx}>
                      Serie {idx + 1}
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
                Tiempo real (s)
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
              <IntervalTimer
                key={`${key}-${ex.prescription.workSec}-${ex.prescription.restSec}`}
                workSec={ex.prescription.workSec}
                restSec={ex.prescription.restSec}
              />
            </div>
          )}
        </div>

        <div className="session-actions">
          <button className="tiny" type="button" onClick={onPrev}>
            Anterior
          </button>
          <button
            className="tiny primary-btn"
            type="button"
            onClick={() => onSave(day.title, ex, !isDone)}
          >
            {isDone ? "Desmarcar" : "Guardar"}
          </button>
          <button className="tiny" type="button" onClick={onNext}>
            Siguiente
          </button>
        </div>
      </div>
    </div>
  );
}
