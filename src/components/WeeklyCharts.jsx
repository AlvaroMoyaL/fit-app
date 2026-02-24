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

function weekLabel(date) {
  return date.toLocaleDateString("es-ES", { day: "2-digit", month: "short" });
}

function shortDayLabel(date) {
  return date.toLocaleDateString("es-ES", { weekday: "short", day: "2-digit" });
}

function computeWeek(history, start, end) {
  const days = [];
  let xp = 0;
  let seconds = 0;
  let sessions = 0;
  const exerciseMap = new Map();

  for (let d = 0; d < 7; d += 1) {
    const date = addDays(start, d);
    const key = toKey(date);
    const items = history[key]?.items || [];
    const dayXp = items.reduce((sum, it) => sum + (it.xp || 0), 0);
    const daySeconds = items.reduce((sum, it) => {
      if (it.type === "time") return sum + (it.workSec || 0);
      const reps = (it.repsBySet || []).reduce((a, b) => a + b, 0);
      return sum + reps * 3;
    }, 0);
    const dayMinutes = Math.round(daySeconds / 60);
    const daySessions = items.length ? 1 : 0;
    if (daySessions) sessions += 1;
    xp += dayXp;
    seconds += daySeconds;
    days.push({
      key,
      dayIndex: d,
      label: shortDayLabel(date),
      xp: dayXp,
      minutes: dayMinutes,
      exercises: items.length,
    });
    items.forEach((it) => {
      const name = it.name_es || it.name || it.name_en || "Ejercicio";
      const prev = exerciseMap.get(name) || { name, xp: 0, count: 0 };
      prev.xp += it.xp || 0;
      prev.count += 1;
      exerciseMap.set(name, prev);
    });
  }

  const topExercises = [...exerciseMap.values()]
    .sort((a, b) => (a.xp < b.xp ? 1 : -1))
    .slice(0, 5);

  return {
    label: `${weekLabel(start)} - ${weekLabel(end)}`,
    shortLabel: `${start.toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit" })}`,
    startKey: toKey(start),
    endKey: toKey(end),
    xp,
    minutes: Math.round(seconds / 60),
    sessions,
    avgXpPerSession: sessions ? Math.round(xp / sessions) : 0,
    days,
    topExercises,
  };
}

function deltaText(current, prev) {
  const delta = (current || 0) - (prev || 0);
  if (!delta) return "0";
  return delta > 0 ? `+${delta}` : `${delta}`;
}

function weekStatus(week, goalXp = 0) {
  if (!week) return "bad";
  const goalHit = goalXp > 0 ? week.xp >= goalXp * 0.9 : true;
  if (week.sessions >= 5 && goalHit) return "ok";
  if (week.sessions >= 3) return "warn";
  return "bad";
}

function coachRecommendation(status, week, goalXp = 0, weakestDay = null) {
  if (!week) return { summary: "", actions: [] };
  const gapXp = Math.max(0, goalXp - week.xp);
  const weakestLabel = weakestDay?.label || "día con menor rendimiento";

  if (status === "ok") {
    return {
      summary: "Semana sólida. Objetivo: consolidar y progresar sin perder recuperación.",
      actions: [
        "Mantén el mismo número de sesiones y sube solo 5-10% el volumen total.",
        `Refuerza ${weakestLabel} con una sesión técnica breve (20-30 min) enfocada en ejecución.`,
        "Incluye 1 bloque aeróbico suave adicional para mejorar tolerancia de carga.",
      ],
    };
  }

  if (status === "warn") {
    const neededSessions = gapXp > 0 ? Math.max(1, Math.ceil(gapXp / Math.max(1, week.avgXpPerSession))) : 1;
    return {
      summary:
        goalXp > 0 && gapXp > 0
          ? `Semana intermedia: faltaron ${gapXp} XP para la meta.`
          : "Semana intermedia: hay base, pero falta consistencia para estabilizar progreso.",
      actions: [
        `Suma ${neededSessions} sesión(es) corta(s) extra esta semana para cerrar brecha.`,
        "Prioriza completar sesiones planificadas antes de añadir intensidad.",
        `Trabaja primero ${weakestLabel} para equilibrar la semana y evitar puntos débiles.`,
      ],
    };
  }

  return {
    summary: "Semana baja en cumplimiento. Enfócate en recuperar hábito, no en máxima intensidad.",
    actions: [
      "Plan mínimo: 3 sesiones de 20-30 min (cumplir > perfeccionar).",
      "Usa ejercicios simples y margen de esfuerzo moderado para volver a ritmo.",
      `Agenda desde ya ${weakestLabel} como primera sesión clave de la próxima semana.`,
    ],
  };
}

export default function WeeklyCharts({ history, lang, goals, onGoToPlanDay }) {
  const [selectedWeek, setSelectedWeek] = useState(null);
  const weeks = useMemo(() => {
    const now = new Date();
    const data = Array.from({ length: 6 }).map((_, i) => {
      const start = startOfWeek(addDays(now, -7 * i));
      const end = addDays(start, 6);
      return computeWeek(history, start, end);
    }).reverse();
    return data.map((w, idx) => {
      const prev = data[idx - 1];
      return {
        ...w,
        xpDelta: prev ? w.xp - prev.xp : 0,
        sessionsDelta: prev ? w.sessions - prev.sessions : 0,
      };
    });
  }, [history]);

  const maxXp = Math.max(1, ...weeks.map((w) => w.xp), goals?.weeklyXpGoal || 0);
  const maxSessions = Math.max(1, ...weeks.map((w) => w.sessions), 7);
  const goalXp = goals?.weeklyXpGoal || 0;

  const latest = weeks[weeks.length - 1] || null;
  const previous = weeks.length > 1 ? weeks[weeks.length - 2] : null;
  const selectedStatus = weekStatus(selectedWeek, goalXp);
  const weakestDay = selectedWeek?.days?.length
    ? [...selectedWeek.days].sort((a, b) => {
        if (a.xp === b.xp) return a.exercises - b.exercises;
        return a.xp - b.xp;
      })[0]
    : null;
  const coachPlan = coachRecommendation(selectedStatus, selectedWeek, goalXp, weakestDay);

  const renderBars = (items, valueKey, max, mode = "xp") => (
    <div className="chart-bars">
      {items.map((w) => {
        const value = w[valueKey] || 0;
        const pct = Math.round((value / max) * 100);
        const delta = mode === "xp" ? w.xpDelta : w.sessionsDelta;
        return (
          <button
            type="button"
            className="chart-bar chart-bar-btn"
            key={`${mode}-${w.startKey}`}
            onClick={() => setSelectedWeek(w)}
            title={`${w.label} · ${value}`}
          >
            <div className="bar-track">
              {mode === "xp" && goalXp > 0 && (
                <div
                  className="bar-goal-line"
                  style={{ bottom: `${Math.min(100, Math.round((goalXp / max) * 100))}%` }}
                />
              )}
              <div className="bar-fill" style={{ height: `${pct}%` }} />
            </div>
            <strong className="bar-value">{value}</strong>
            <span className="bar-delta">{deltaText(value, value - delta)}</span>
            <span className="bar-label" title={w.label}>
              {w.shortLabel}
            </span>
          </button>
        );
      })}
    </div>
  );

  return (
    <>
      <div className="charts">
        <div className="chart chart-highlight">
          <h3>{lang === "en" ? "Weekly focus" : "Resumen semanal"}</h3>
          {!latest ? (
            <p className="note">Sin datos de semanas recientes.</p>
          ) : (
            <div className="chart-kpis">
              <div>
                <span>XP semana</span>
                <strong>{latest.xp}</strong>
                <small>{previous ? `${deltaText(latest.xp, previous.xp)} vs semana previa` : "Primera semana"}</small>
              </div>
              <div>
                <span>Sesiones</span>
                <strong>{latest.sessions}/7</strong>
                <small>{previous ? `${deltaText(latest.sessions, previous.sessions)} vs semana previa` : "Sin referencia"}</small>
              </div>
              <div>
                <span>XP por sesión</span>
                <strong>{latest.avgXpPerSession}</strong>
                <small>{latest.minutes} min total</small>
              </div>
              <div>
                <span>Meta XP</span>
                <strong>{goalXp > 0 ? `${Math.round((latest.xp / goalXp) * 100)}%` : "—"}</strong>
                <small>{goalXp > 0 ? `${latest.xp}/${goalXp} XP` : "Sin meta definida"}</small>
              </div>
            </div>
          )}
        </div>

        <div className="chart">
          <h3>{lang === "en" ? "XP per week" : "XP por semana"}</h3>
          {renderBars(weeks, "xp", maxXp, "xp")}
          <p className="note">Click en una barra para ver desglose semanal.</p>
        </div>

        <div className="chart">
          <h3>{lang === "en" ? "Sessions per week" : "Sesiones por semana"}</h3>
          {renderBars(weeks, "sessions", maxSessions, "sessions")}
        </div>
      </div>

      <div
        className={`drawer-backdrop ${selectedWeek ? "is-open" : ""}`}
        onClick={() => setSelectedWeek(null)}
      />
      <aside className={`drawer weekly-drawer ${selectedWeek ? "is-open" : ""}`}>
        <div className="drawer-head">
          <div>
            <h3>{selectedWeek?.label || "Semana"}</h3>
            <p className="note">
              XP, sesiones, minutos y ejercicios con mayor aporte de la semana.
            </p>
          </div>
          <div className="drawer-actions">
            <button className="tiny" type="button" onClick={() => setSelectedWeek(null)}>
              Cerrar
            </button>
          </div>
        </div>

        {selectedWeek && (
          <>
            <div className={`weekly-status ${selectedStatus}`}>
              <span className={`weekly-status-pill ${selectedStatus}`}>
                {selectedStatus === "ok"
                  ? "Semáforo: verde"
                  : selectedStatus === "warn"
                    ? "Semáforo: amarillo"
                    : "Semáforo: rojo"}
              </span>
              <p>{coachPlan.summary}</p>
              {coachPlan.actions.length > 0 && (
                <ul className="weekly-status-actions">
                  {coachPlan.actions.map((action) => (
                    <li key={action}>{action}</li>
                  ))}
                </ul>
              )}
            </div>

            <div className="weekly-kpi-grid">
              <div>
                <span>XP</span>
                <strong>{selectedWeek.xp}</strong>
              </div>
              <div>
                <span>Sesiones</span>
                <strong>{selectedWeek.sessions}/7</strong>
              </div>
              <div>
                <span>Minutos</span>
                <strong>{selectedWeek.minutes}</strong>
              </div>
              <div>
                <span>XP por sesión</span>
                <strong>{selectedWeek.avgXpPerSession}</strong>
              </div>
            </div>

            <div className="weekly-actions">
              <button
                type="button"
                className="tiny primary-btn"
                disabled={!weakestDay || typeof onGoToPlanDay !== "function"}
                onClick={() => {
                  if (!weakestDay || typeof onGoToPlanDay !== "function") return;
                  onGoToPlanDay(weakestDay.dayIndex);
                  setSelectedWeek(null);
                }}
              >
                Ir al día más débil ({weakestDay?.label || "—"})
              </button>
            </div>

            <div className="weekly-breakdown">
              <h4>Desglose por día</h4>
              {selectedWeek.days.map((d) => (
                <div className="weekly-day-row" key={d.key}>
                  <strong>{d.label}</strong>
                  <span>{d.exercises} ej</span>
                  <span>XP {d.xp}</span>
                  <span>{d.minutes} min</span>
                </div>
              ))}
            </div>

            <div className="weekly-breakdown">
              <h4>Top ejercicios (por XP)</h4>
              {selectedWeek.topExercises.length === 0 ? (
                <p className="note">Sin ejercicios registrados esta semana.</p>
              ) : (
                selectedWeek.topExercises.map((ex) => (
                  <div className="weekly-day-row" key={ex.name}>
                    <strong>{ex.name}</strong>
                    <span>{ex.count} regs</span>
                    <span>XP {ex.xp}</span>
                    <span />
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </aside>
    </>
  );
}
