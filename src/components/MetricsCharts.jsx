function toNum(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function buildSeries(entries, key) {
  return entries
    .map((e) => ({ date: e.date, value: toNum(e[key]) }))
    .filter((e) => e.value > 0);
}

function startOfWeek(dateStr) {
  const d = new Date(dateStr);
  const day = d.getDay();
  const diff = (day === 0 ? -6 : 1) - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function weekKey(dateStr) {
  const d = startOfWeek(dateStr);
  return d.toISOString().slice(0, 10);
}

function weeklyAverages(entries, key) {
  const map = new Map();
  entries.forEach((e) => {
    const val = toNum(e[key]);
    if (!val) return;
    const k = weekKey(e.date);
    const item = map.get(k) || { sum: 0, count: 0 };
    item.sum += val;
    item.count += 1;
    map.set(k, item);
  });
  return Array.from(map.entries())
    .map(([k, v]) => ({
      week: k,
      avg: v.count ? Math.round((v.sum / v.count) * 10) / 10 : 0,
    }))
    .sort((a, b) => (a.week < b.week ? -1 : 1))
    .slice(-4);
}

function renderBars(series) {
  const max = Math.max(1, ...series.map((s) => s.value));
  return (
    <div className="metric-bars">
      {series.map((s) => (
        <div className="metric-bar" key={`${s.date}-${s.value}`}>
          <div className="metric-bar-track">
            <div
              className="metric-bar-fill"
              style={{ width: `${Math.round((s.value / max) * 100)}%` }}
            />
          </div>
          <div className="metric-bar-meta">
            <span>{s.date}</span>
            <strong>{s.value}</strong>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function MetricsCharts({ metricsLog, lang }) {
  if (!metricsLog || metricsLog.length === 0) return null;

  const entries = [...metricsLog].sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 8);

  const series = [
    {
      key: "weight",
      label: lang === "en" ? "Weight (kg)" : "Peso (kg)",
    },
    {
      key: "waist",
      label: lang === "en" ? "Waist (cm)" : "Cintura (cm)",
    },
    {
      key: "bodyFat",
      label: lang === "en" ? "Body fat (%)" : "% Grasa",
    },
    {
      key: "restHr",
      label: lang === "en" ? "Resting HR" : "FC reposo",
    },
    {
      key: "sleepHours",
      label: lang === "en" ? "Sleep (hours)" : "Sueño (horas)",
    },
    {
      key: "steps",
      label: lang === "en" ? "Steps" : "Pasos",
    },
  ];

  const weeklySleep = weeklyAverages(metricsLog, "sleepHours");
  const weeklySteps = weeklyAverages(metricsLog, "steps");

  return (
    <div className="metrics-charts">
      <h3>{lang === "en" ? "Trends" : "Tendencias"}</h3>
      <div className="metric-chart-grid">
        {series.map((s) => {
          const data = buildSeries(entries, s.key);
          if (data.length < 2) return null;
          return (
            <div className="metric-card" key={s.key}>
              <strong>{s.label}</strong>
              {renderBars(data)}
            </div>
          );
        })}
      </div>

      {(weeklySleep.length || weeklySteps.length) && (
        <div className="metric-weekly">
          <h4>{lang === "en" ? "Weekly averages" : "Promedios semanales"}</h4>
          <div className="metric-week-grid">
            {weeklySleep.map((w) => (
              <div className="metric-week-card" key={`sleep-${w.week}`}>
                <strong>{w.week}</strong>
                <span>{lang === "en" ? "Sleep" : "Sueño"}</span>
                <div>{w.avg} h</div>
              </div>
            ))}
            {weeklySteps.map((w) => (
              <div className="metric-week-card" key={`steps-${w.week}`}>
                <strong>{w.week}</strong>
                <span>{lang === "en" ? "Steps" : "Pasos"}</span>
                <div>{w.avg}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
