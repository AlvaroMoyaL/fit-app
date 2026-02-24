import { useMemo, useState } from "react";

function toNum(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function toDateKey(date) {
  const d = new Date(`${date}T00:00:00`);
  if (Number.isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function buildSeries(entries, key) {
  return entries
    .map((e) => ({ date: e.date, value: toNum(e[key]) }))
    .filter((e) => e.value > 0)
    .sort((a, b) => (a.date < b.date ? -1 : 1))
    .slice(-14);
}

function startOfWeek(dateStr) {
  const d = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(d.getTime())) return "";
  const day = d.getDay();
  const diff = (day === 0 ? -6 : 1) - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return toDateKey(d.toISOString().slice(0, 10));
}

function weeklyAverages(entries, key) {
  const map = new Map();
  entries.forEach((e) => {
    const val = toNum(e[key]);
    if (!val) return;
    const k = startOfWeek(e.date);
    if (!k) return;
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

function formatValue(value, unit = "") {
  if (!Number.isFinite(value)) return "—";
  const rounded = value >= 100 ? Math.round(value) : Math.round(value * 10) / 10;
  return unit ? `${rounded} ${unit}` : String(rounded);
}

function computeStats(series) {
  if (!series.length) return null;
  const values = series.map((s) => s.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const avg = values.reduce((sum, v) => sum + v, 0) / values.length;
  return {
    last: values[values.length - 1],
    min,
    max,
    avg,
  };
}

function getScaleBounds(series) {
  if (!series.length) return { min: 0, range: 1 };
  const values = series.map((s) => s.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  return { min, range: Math.max(1, max - min) };
}

function buildSparkPoints(series, width = 320, height = 140, pad = 14) {
  const bounds = getScaleBounds(series);
  const stepX = series.length > 1 ? (width - pad * 2) / (series.length - 1) : 0;
  return series.map((s, idx) => {
    const x = pad + idx * stepX;
    const y = height - pad - ((s.value - bounds.min) / bounds.range) * (height - pad * 2);
    return { x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10, ...s };
  });
}

function MetricSparkCard({ title, unit = "", data }) {
  const [tooltip, setTooltip] = useState(null);
  const points = useMemo(() => buildSparkPoints(data), [data]);
  const polyline = points.map((p) => `${p.x},${p.y}`).join(" ");
  const stats = useMemo(() => computeStats(data), [data]);

  if (!data.length || !stats) return null;

  return (
    <div className="metric-card spark">
      <strong>{title}</strong>
      <div className="metric-spark-wrap">
        <svg viewBox="0 0 320 140" role="img" aria-label={`Tendencia ${title}`}>
          {[0, 1, 2, 3].map((idx) => (
            <line key={`g-${idx}`} x1="14" y1={14 + idx * 37} x2="306" y2={14 + idx * 37} className="metric-spark-grid" />
          ))}
          <polyline points={polyline} className="metric-spark-line" />
          {points.map((p) => (
            <circle
              key={`${title}-${p.date}`}
              cx={p.x}
              cy={p.y}
              r="3"
              className="metric-spark-dot"
              onMouseEnter={() =>
                setTooltip({
                  date: p.date,
                  value: p.value,
                  x: p.x,
                  y: p.y,
                })
              }
              onMouseLeave={() => setTooltip(null)}
            >
              <title>
                {p.date}: {formatValue(p.value, unit)}
              </title>
            </circle>
          ))}
        </svg>
        {tooltip && (
          <div
            className="metric-spark-tooltip"
            style={{
              left: `${Math.min(78, Math.max(8, (tooltip.x / 320) * 100))}%`,
              top: `${Math.min(62, Math.max(6, (tooltip.y / 140) * 100))}%`,
            }}
          >
            <span>{tooltip.date}</span>
            <strong>{formatValue(tooltip.value, unit)}</strong>
          </div>
        )}
      </div>
      <div className="metric-spark-stats">
        <span>Último: {formatValue(stats.last, unit)}</span>
        <span>Prom: {formatValue(stats.avg, unit)}</span>
        <span>
          Rango: {formatValue(stats.min, unit)} - {formatValue(stats.max, unit)}
        </span>
      </div>
    </div>
  );
}

export default function MetricsCharts({ metricsLog, lang }) {
  if (!metricsLog || metricsLog.length === 0) return null;

  const entries = [...metricsLog]
    .filter((row) => row?.date)
    .sort((a, b) => (a.date < b.date ? -1 : 1));

  const series = [
    { key: "weight", label: lang === "en" ? "Weight" : "Peso", unit: "kg" },
    { key: "waist", label: lang === "en" ? "Waist" : "Cintura", unit: "cm" },
    { key: "bodyFat", label: lang === "en" ? "Body fat" : "% Grasa", unit: "%" },
    { key: "restHr", label: lang === "en" ? "Resting HR" : "FC reposo", unit: "bpm" },
    { key: "sleepHours", label: lang === "en" ? "Sleep" : "Sueño", unit: "h" },
    { key: "steps", label: lang === "en" ? "Steps" : "Pasos", unit: "" },
  ];

  const weeklySleep = weeklyAverages(entries, "sleepHours");
  const weeklySteps = weeklyAverages(entries, "steps");

  return (
    <div className="metrics-charts">
      <h3>{lang === "en" ? "Trends" : "Tendencias"}</h3>
      <p className="note">Vista de últimos 14 registros por métrica con detalle al pasar el mouse.</p>
      <div className="metric-chart-grid">
        {series.map((s) => (
          <MetricSparkCard key={s.key} title={s.label} unit={s.unit} data={buildSeries(entries, s.key)} />
        ))}
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
