import { useMemo, useState } from "react";

function startOfWeek(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = (day === 0 ? -6 : 1) - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

function toKey(date) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function formatDayLabel(date) {
  return date.toLocaleDateString("es-ES", {
    weekday: "short",
    day: "2-digit",
    month: "short",
  });
}

function exerciseFormKey(ex, idx) {
  return `${ex.instanceId || ex.id || ex.name || "ex"}::${idx}`;
}

function makeDefaultEntry(ex) {
  if (ex?.prescription?.type === "time") {
    return { type: "time", workSec: ex.prescription?.workSec || 30 };
  }
  return {
    type: "reps",
    repsBySet: Array.from({ length: ex?.prescription?.sets || 3 }).map(
      () => ex?.prescription?.reps || 10
    ),
  };
}

function buildEntries(day) {
  const out = {};
  const list = Array.isArray(day?.exercises) ? day.exercises : [];
  list.forEach((ex, idx) => {
    out[exerciseFormKey(ex, idx)] = makeDefaultEntry(ex);
  });
  return out;
}

function buildSelected(day) {
  const out = {};
  const list = Array.isArray(day?.exercises) ? day.exercises : [];
  list.forEach((ex, idx) => {
    out[exerciseFormKey(ex, idx)] = true;
  });
  return out;
}

export default function HistoryWeek({
  history,
  lang,
  plan,
  onRegisterPastExercise,
  onPreviewExercise,
}) {
  const [offset, setOffset] = useState(0);
  const [showRegister, setShowRegister] = useState(false);
  const [registerDate, setRegisterDate] = useState(() => {
    const now = new Date();
    now.setDate(now.getDate() - 1);
    return toKey(now);
  });
  const [registerDayTitle, setRegisterDayTitle] = useState("");
  const [registerEntries, setRegisterEntries] = useState({});
  const [registerSelected, setRegisterSelected] = useState({});
  const [registerSaved, setRegisterSaved] = useState({});
  const [registerMsg, setRegisterMsg] = useState("");

  const baseDate = new Date();
  baseDate.setDate(baseDate.getDate() + offset * 7);
  const weekStart = startOfWeek(baseDate);

  const days = Array.from({ length: 7 }).map((_, i) => {
    const d = addDays(weekStart, i);
    const key = toKey(d);
    const items = history[key]?.items || [];
    const xp = items.reduce((sum, it) => sum + (it.xp || 0), 0);
    const seconds = items.reduce((sum, it) => {
      if (it.type === "time") return sum + (it.workSec || 0);
      const reps = (it.repsBySet || []).reduce((a, b) => a + b, 0);
      return sum + reps * 3;
    }, 0);
    const minutes = Math.round(seconds / 60);
    return { date: d, key, items, xp, minutes };
  });

  const weekXp = days.reduce((sum, d) => sum + (d.xp || 0), 0);
  const weekMinutes = days.reduce((sum, d) => sum + (d.minutes || 0), 0);

  const toWeekInput = (date) => {
    const year = date.getFullYear();
    const jan4 = new Date(year, 0, 4);
    const firstWeekStart = startOfWeek(jan4);
    const thisWeekStart = startOfWeek(date);
    const diffWeeks = Math.round(
      (thisWeekStart - firstWeekStart) / (7 * 24 * 60 * 60 * 1000)
    );
    const weekNumber = diffWeeks + 1;
    const padded = String(weekNumber).padStart(2, "0");
    return `${year}-W${padded}`;
  };

  const weekInput = toWeekInput(baseDate);
  const registerDays = Array.isArray(plan?.days) ? plan.days : [];
  const selectedDay = useMemo(() => {
    if (!registerDays.length) return null;
    const first = registerDays[0] || null;
    if (!registerDayTitle) return first;
    return registerDays.find((d) => d.title === registerDayTitle) || first;
  }, [registerDays, registerDayTitle]);

  const openRegister = () => {
    if (typeof onRegisterPastExercise !== "function") return;
    const firstDay = registerDays[0] || null;
    setRegisterDayTitle(firstDay?.title || "");
    setRegisterEntries(buildEntries(firstDay));
    setRegisterSelected(buildSelected(firstDay));
    setRegisterSaved({});
    setRegisterMsg("");
    setShowRegister(true);
  };

  const onChangeDay = (title) => {
    setRegisterDayTitle(title);
    const day = registerDays.find((d) => d.title === title) || null;
    setRegisterEntries(buildEntries(day));
    setRegisterSelected(buildSelected(day));
    setRegisterSaved({});
    setRegisterMsg("");
  };

  const updateEntry = (key, patch) => {
    setRegisterEntries((prev) => ({
      ...prev,
      [key]: { ...(prev[key] || {}), ...patch },
    }));
    setRegisterSaved((prev) => ({ ...prev, [key]: false }));
  };

  const toggleSelected = (key, checked) => {
    setRegisterSelected((prev) => ({ ...prev, [key]: checked }));
  };

  const onSaveExercise = (ex, idx) => {
    if (!selectedDay || typeof onRegisterPastExercise !== "function") return;
    const key = exerciseFormKey(ex, idx);
    const entry = registerEntries[key] || makeDefaultEntry(ex);
    const payload = {
      date: registerDate,
      dayTitle: selectedDay.title,
      exercise: ex,
      detail:
        entry.type === "time"
          ? { type: "time", workSec: Number(entry.workSec || ex.prescription?.workSec || 30) }
          : {
              type: "reps",
              repsBySet:
                Array.isArray(entry.repsBySet) && entry.repsBySet.length
                  ? entry.repsBySet.map((n) => Number(n || 0))
                  : Array.from({ length: ex.prescription?.sets || 3 }).map(
                      () => ex.prescription?.reps || 10
                    ),
            },
    };
    const ok = onRegisterPastExercise(payload);
    if (ok) {
      setRegisterSaved((prev) => ({ ...prev, [key]: true }));
      const exName =
        lang === "en"
          ? ex.name_en || ex.name || ex.name_es
          : ex.name_es || ex.name || ex.name_en;
      setRegisterMsg(`Guardado: ${exName}`);
    }
  };

  const onSaveAll = () => {
    const list = Array.isArray(selectedDay?.exercises) ? selectedDay.exercises : [];
    if (!list.length) return;
    let okCount = 0;
    list.forEach((ex, idx) => {
      const key = exerciseFormKey(ex, idx);
      if (!registerSelected[key]) return;
      const entry = registerEntries[key] || makeDefaultEntry(ex);
      const payload = {
        date: registerDate,
        dayTitle: selectedDay.title,
        exercise: ex,
        detail:
          entry.type === "time"
            ? {
                type: "time",
                workSec: Number(entry.workSec || ex.prescription?.workSec || 30),
              }
            : {
                type: "reps",
                repsBySet:
                  Array.isArray(entry.repsBySet) && entry.repsBySet.length
                    ? entry.repsBySet.map((n) => Number(n || 0))
                    : Array.from({ length: ex.prescription?.sets || 3 }).map(
                        () => ex.prescription?.reps || 10
                      ),
              },
      };
      if (onRegisterPastExercise(payload)) {
        okCount += 1;
        setRegisterSaved((prev) => ({ ...prev, [key]: true }));
      }
    });
    setRegisterMsg(`Guardados: ${okCount}`);
  };

  return (
    <div className="history">
      <div className="history-header">
        <h2>Historial semanal</h2>
        {onRegisterPastExercise && (
          <button type="button" className="tiny" onClick={openRegister}>
            Registrar ejercicio anterior
          </button>
        )}
        <div className="history-nav">
          <button
            type="button"
            className="tiny"
            onClick={() => setOffset((o) => o - 1)}
          >
            Semana anterior
          </button>
          <button
            type="button"
            className="tiny"
            onClick={() => setOffset(0)}
          >
            Esta semana
          </button>
          <button
            type="button"
            className="tiny"
            onClick={() => setOffset((o) => o + 1)}
          >
            Semana siguiente
          </button>
          <div className="week-picker">
            <label>
              Ir a semana
              <input
                type="week"
                value={weekInput}
                onChange={(e) => {
                  const value = e.target.value;
                  if (!value) return;
                  const [yearStr, weekStr] = value.split("-W");
                  const year = Number(yearStr);
                  const week = Number(weekStr);
                  if (!year || !week) return;
                  const jan4 = new Date(year, 0, 4);
                  const firstWeekStart = startOfWeek(jan4);
                  const target = addDays(firstWeekStart, (week - 1) * 7);
                  const nowWeekStart = startOfWeek(new Date());
                  const diffWeeks = Math.round(
                    (target - nowWeekStart) / (7 * 24 * 60 * 60 * 1000)
                  );
                  setOffset(diffWeeks);
                }}
              />
            </label>
          </div>
        </div>
      </div>

      {showRegister && (
        <div className="history-register">
          <div className="history-register-head">
            <strong>Registrar ejercicio anterior</strong>
            <div className="history-register-head-actions">
              <button type="button" className="tiny" onClick={onSaveAll}>
                Guardar todo
              </button>
              <button type="button" className="tiny" onClick={() => setShowRegister(false)}>
                Cerrar
              </button>
            </div>
          </div>
          <div className="history-register-grid">
            <label>
              Fecha
              <input
                type="date"
                value={registerDate}
                onChange={(e) => setRegisterDate(e.target.value)}
              />
            </label>
            <label>
              Día del plan
              <select
                value={selectedDay?.title || ""}
                onChange={(e) => onChangeDay(e.target.value)}
              >
                {registerDays.map((day) => (
                  <option key={day.title} value={day.title}>
                    {day.title}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="history-register-list">
            {(selectedDay?.exercises || []).map((ex, idx) => {
              const key = exerciseFormKey(ex, idx);
              const entry = registerEntries[key] || makeDefaultEntry(ex);
              const name =
                lang === "en"
                  ? ex.name_en || ex.name || ex.name_es
                  : ex.name_es || ex.name || ex.name_en;

              return (
                <div className="history-register-item" key={key}>
                  <div className="history-register-item-head">
                    <label className="history-register-check">
                      <input
                        type="checkbox"
                        checked={Boolean(registerSelected[key])}
                        onChange={(e) => toggleSelected(key, e.target.checked)}
                      />
                      <strong>{name}</strong>
                    </label>
                    <div className="history-register-item-actions">
                      <span className="note">{ex.target} • {ex.equipment}</span>
                      <button
                        type="button"
                        className="tiny"
                        onClick={() =>
                          onPreviewExercise &&
                          onPreviewExercise({ ex, dayTitle: selectedDay?.title })
                        }
                      >
                        Ayuda
                      </button>
                    </div>
                  </div>

                  {entry.type === "reps" && (
                    <div className="history-register-series">
                      <span>Reps por serie</span>
                      <div className="series-grid">
                        {Array.from({ length: ex.prescription?.sets || 3 }).map((_, setIdx) => {
                          const value =
                            entry.repsBySet?.[setIdx] ?? ex.prescription?.reps ?? 10;
                          return (
                            <label key={`${key}-set-${setIdx}`}>
                              Serie {setIdx + 1}
                              <input
                                type="number"
                                min="1"
                                value={value}
                                onChange={(e) => {
                                  const next = [...(entry.repsBySet || [])];
                                  next[setIdx] = Number(e.target.value || 0);
                                  updateEntry(key, { type: "reps", repsBySet: next });
                                }}
                              />
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {entry.type === "time" && (
                    <div className="history-register-series">
                      <label>
                        Tiempo real (s)
                        <input
                          type="number"
                          min="5"
                          value={entry.workSec ?? ex.prescription?.workSec ?? 30}
                          onChange={(e) =>
                            updateEntry(key, {
                              type: "time",
                              workSec: Number(e.target.value || 0),
                            })
                          }
                        />
                      </label>
                    </div>
                  )}

                  <div className="history-register-actions">
                    <button
                      type="button"
                      className="tiny primary-btn"
                      disabled={!registerSelected[key] || Boolean(registerSaved[key])}
                      onClick={() => onSaveExercise(ex, idx)}
                    >
                      {registerSaved[key] ? "Guardado" : "Guardar"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {registerMsg && <span className="note">{registerMsg}</span>}
        </div>
      )}

      <div className="history-summary">
        <div>
          <span>XP semanal</span>
          <strong>{weekXp}</strong>
        </div>
        <div>
          <span>Tiempo total</span>
          <strong>{weekMinutes} min</strong>
        </div>
      </div>
      <div className="history-grid">
        {days.map((d) => (
          <div className="history-day" key={d.key}>
            <div className="history-head">
              <strong>{formatDayLabel(d.date)}</strong>
              <span>{d.items.length} ejercicios</span>
            </div>
            <div className="history-day-meta">
              <span>XP: {d.xp || 0}</span>
              <span>{d.minutes || 0} min</span>
            </div>
            {d.items.length === 0 ? (
              <p className="note">Sin registro</p>
            ) : (
              <ul className="history-list">
                {d.items.map((item) => (
                  <li key={item.key}>
                    <strong>
                      {lang === "en"
                        ? item.name_en || item.name || item.name_es
                        : item.name_es || item.name || item.name_en}
                    </strong>
                    {item.type === "replace" && <span>Motivo: {item.reason}</span>}
                    {item.type === "reps" && <span>{item.repsBySet?.join(" / ")} reps</span>}
                    {item.type === "time" && <span>{item.workSec}s</span>}
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
