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

function weekLabel(date) {
  return date.toLocaleDateString("es-ES", { day: "2-digit", month: "short" });
}

export default function WeeklyCharts({ history, lang, goals }) {
  const now = new Date();
  const weeks = Array.from({ length: 6 }).map((_, i) => {
    const start = startOfWeek(addDays(now, -7 * i));
    const end = addDays(start, 6);
    let xp = 0;
    let seconds = 0;
    let sessions = 0;

    for (let d = 0; d < 7; d += 1) {
      const date = addDays(start, d);
      const key = toKey(date);
      const items = history[key]?.items || [];
      if (items.length) sessions += 1;
      items.forEach((it) => {
        xp += it.xp || 0;
        if (it.type === "time") seconds += it.workSec || 0;
        if (it.type === "reps") {
          const reps = (it.repsBySet || []).reduce((a, b) => a + b, 0);
          seconds += reps * 3;
        }
      });
    }

    return {
      label: `${weekLabel(start)} - ${weekLabel(end)}`,
      xp,
      minutes: Math.round(seconds / 60),
      sessions,
    };
  }).reverse();

  const maxXp = Math.max(1, ...weeks.map((w) => w.xp));
  const maxMin = Math.max(1, ...weeks.map((w) => w.minutes));
  const maxSessions = Math.max(1, ...weeks.map((w) => w.sessions));

  const renderBars = (items, valueKey, max) => (
    <div className="chart-bars">
      {items.map((w) => (
        <div className="chart-bar" key={w.label}>
          <div className="bar-track">
            <div
              className="bar-fill"
              style={{ height: `${Math.round((w[valueKey] / max) * 100)}%` }}
            />
          </div>
          <span className="bar-label">{w.label}</span>
          <strong className="bar-value">{w[valueKey]}</strong>
        </div>
      ))}
    </div>
  );

  const goalXp = goals?.weeklyXpGoal || 0;
  const goalMin = goals?.weeklyMinutesGoal || 0;

  return (
    <div className="charts">
      <div className="chart">
        <h3>{lang === "en" ? "XP per week" : "XP por semana"}</h3>
        {renderBars(weeks, "xp", maxXp)}
        {goalXp > 0 && (
          <p className="note">
            {lang === "en" ? "Goal" : "Meta"}: {goalXp} XP
          </p>
        )}
      </div>
      <div className="chart">
        <h3>{lang === "en" ? "Minutes per week" : "Minutos por semana"}</h3>
        {renderBars(weeks, "minutes", maxMin)}
        {goalMin > 0 && (
          <p className="note">
            {lang === "en" ? "Goal" : "Meta"}: {goalMin} min
          </p>
        )}
      </div>
      <div className="chart">
        <h3>{lang === "en" ? "Sessions per week" : "Sesiones por semana"}</h3>
        {renderBars(weeks, "sessions", maxSessions)}
      </div>
    </div>
  );
}
