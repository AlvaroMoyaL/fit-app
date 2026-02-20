import { useState } from "react";

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
  return date.toISOString().slice(0, 10);
}

function formatDayLabel(date) {
  return date.toLocaleDateString("es-ES", {
    weekday: "short",
    day: "2-digit",
    month: "short",
  });
}

export default function HistoryWeek({ history, lang }) {
  const [offset, setOffset] = useState(0);
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

  return (
    <div className="history">
      <div className="history-header">
        <h2>Historial semanal</h2>
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
                    {item.type === "replace" && (
                      <span>Motivo: {item.reason}</span>
                    )}
                    {item.type === "reps" && (
                      <span>
                        {item.repsBySet?.join(" / ")} reps
                      </span>
                    )}
                    {item.type === "time" && (
                      <span>{item.workSec}s</span>
                    )}
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
