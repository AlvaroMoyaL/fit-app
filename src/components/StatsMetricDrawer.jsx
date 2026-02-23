import { useMemo } from "react";

const METRIC_META = {
  weight: { label: "Peso", unit: "kg", related: ["waist", "bodyFat", "sleepHours", "steps"] },
  waist: { label: "Cintura", unit: "cm", related: ["weight", "bodyFat", "whtr"] },
  hip: { label: "Cadera", unit: "cm", related: ["waist", "whr", "bodyFat"] },
  bodyFat: { label: "% Grasa", unit: "%", related: ["weight", "waist", "leanMass"] },
  bmi: { label: "IMC", unit: "", related: ["weight", "waist", "whtr"] },
  whtr: { label: "WHtR", unit: "", related: ["waist", "weight"] },
  whr: { label: "WHR", unit: "", related: ["waist", "hip"] },
  leanMass: { label: "Masa magra", unit: "kg", related: ["weight", "bodyFat", "ffmi"] },
  ffmi: { label: "FFMI", unit: "", related: ["leanMass", "weight"] },
  restHr: { label: "FC reposo", unit: "bpm", related: ["sleepHours", "stress", "hrv"] },
  sleepHours: { label: "Sueño", unit: "h", related: ["restHr", "stress", "steps"] },
  steps: { label: "Pasos", unit: "", related: ["sleepHours", "weight", "loadRatio"] },
  sleepScore: { label: "Sleep score", unit: "", related: ["sleepHours", "readiness", "bodyBattery"] },
  hrv: { label: "HRV", unit: "ms", related: ["restHr", "sleepHours", "readiness"] },
  bodyBattery: { label: "Body Battery", unit: "", related: ["sleepHours", "stress", "readiness"] },
  stress: { label: "Estrés", unit: "", related: ["sleepHours", "restHr", "bodyBattery"] },
  loadRatio: { label: "Carga 7d/28d", unit: "", related: ["steps", "vo2max", "readiness"] },
  vo2max: { label: "VO2 max", unit: "", related: ["restHr", "loadRatio", "steps"] },
  readiness: { label: "Readiness", unit: "", related: ["sleepHours", "hrv", "bodyBattery"] },
};

function toNum(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function getSeries(metricsLog, key) {
  if (!Array.isArray(metricsLog) || !key) return [];
  return [...metricsLog]
    .sort((a, b) => (a.date < b.date ? -1 : 1))
    .map((entry) => ({ date: entry.date, value: toNum(entry[key]) }))
    .filter((item) => item.value > 0);
}

function buildPairedSeries(aSeries, bSeries) {
  const map = new Map();
  aSeries.forEach((p) => map.set(p.date, { a: p.value, b: 0 }));
  bSeries.forEach((p) => {
    const row = map.get(p.date) || { a: 0, b: 0 };
    row.b = p.value;
    map.set(p.date, row);
  });
  return Array.from(map.values()).filter((r) => r.a > 0 && r.b > 0);
}

function absCorrelation(pairs) {
  if (!pairs || pairs.length < 2) return 0;
  const xs = pairs.map((p) => p.a);
  const ys = pairs.map((p) => p.b);
  const mx = xs.reduce((s, v) => s + v, 0) / xs.length;
  const my = ys.reduce((s, v) => s + v, 0) / ys.length;
  let num = 0;
  let dx = 0;
  let dy = 0;
  for (let i = 0; i < xs.length; i += 1) {
    const a = xs[i] - mx;
    const b = ys[i] - my;
    num += a * b;
    dx += a * a;
    dy += b * b;
  }
  const den = Math.sqrt(dx * dy);
  if (!den) return 0;
  return Math.abs(num / den);
}

function buildLinePoints(series, width = 380, height = 180, pad = 14) {
  if (!series.length) return "";
  const values = series.map((s) => s.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = Math.max(1, max - min);
  const stepX = series.length > 1 ? (width - pad * 2) / (series.length - 1) : 0;
  return series
    .map((s, idx) => {
      const x = pad + idx * stepX;
      const y = height - pad - ((s.value - min) / range) * (height - pad * 2);
      return `${x},${Math.round(y * 10) / 10}`;
    })
    .join(" ");
}

function formatValue(value, unit = "") {
  if (!Number.isFinite(value) || value <= 0) return "—";
  const raw = value >= 100 ? Math.round(value) : Math.round(value * 10) / 10;
  return unit ? `${raw} ${unit}` : String(raw);
}

export default function StatsMetricDrawer({
  open,
  onClose,
  metricKey,
  compareKey,
  onChangeCompareKey,
  metricsLog,
}) {
  const meta = METRIC_META[metricKey] || { label: metricKey || "Métrica", unit: "", related: [] };
  const primary = useMemo(() => getSeries(metricsLog, metricKey), [metricsLog, metricKey]);

  const compareOptions = useMemo(() => {
    const base = meta.related || [];
    return base.filter((k) => k !== metricKey);
  }, [meta.related, metricKey]);

  const recommendedCompareKey = useMemo(() => {
    if (!primary.length || !compareOptions.length) return "";
    let best = "";
    let bestScore = -1;
    compareOptions.forEach((key) => {
      const candidate = getSeries(metricsLog, key);
      const pairs = buildPairedSeries(primary, candidate);
      if (pairs.length < 2) return;
      const corr = absCorrelation(pairs);
      const score = pairs.length * 10 + corr;
      if (score > bestScore) {
        best = key;
        bestScore = score;
      }
    });
    return best;
  }, [primary, compareOptions, metricsLog]);

  const effectiveCompareKey = compareKey || recommendedCompareKey || "";
  const compare = useMemo(
    () => getSeries(metricsLog, effectiveCompareKey),
    [metricsLog, effectiveCompareKey]
  );
  const compareMeta = METRIC_META[effectiveCompareKey] || null;

  const primaryCurrent = primary.length ? primary[primary.length - 1].value : 0;
  const primaryPrev = primary.length > 1 ? primary[primary.length - 2].value : 0;
  const primaryDelta = primaryCurrent && primaryPrev ? primaryCurrent - primaryPrev : 0;

  const compareCurrent = compare.length ? compare[compare.length - 1].value : 0;
  const comparePrev = compare.length > 1 ? compare[compare.length - 2].value : 0;
  const compareDelta = compareCurrent && comparePrev ? compareCurrent - comparePrev : 0;

  const latestDates = useMemo(() => {
    const map = new Map();
    primary.forEach((i) => {
      map.set(i.date, { ...(map.get(i.date) || {}), a: i.value });
    });
    compare.forEach((i) => {
      map.set(i.date, { ...(map.get(i.date) || {}), b: i.value });
    });
    return Array.from(map.entries())
      .map(([date, v]) => ({ date, a: v.a || 0, b: v.b || 0 }))
      .sort((a, b) => (a.date < b.date ? 1 : -1))
      .slice(0, 8);
  }, [primary, compare]);

  return (
    <>
      <div className={`drawer-backdrop ${open ? "is-open" : ""}`} onClick={onClose} />
      <aside className={`drawer stats-drawer ${open ? "is-open" : ""}`}>
        <div className="drawer-head">
          <div>
            <h3>{meta.label}</h3>
            <p className="note">Serie temporal y cruce con otra métrica relacionada.</p>
          </div>
          <div className="drawer-actions">
            <button className="tiny" type="button" onClick={onClose}>
              Cerrar
            </button>
          </div>
        </div>

        <div className="stats-drawer-controls">
          <label>
            Cruzar con
            <select
              value={compareKey || ""}
              onChange={(e) => onChangeCompareKey(e.target.value)}
            >
              <option value="">
                {recommendedCompareKey
                  ? `Auto (recomendado: ${METRIC_META[recommendedCompareKey]?.label || recommendedCompareKey})`
                  : "Auto"}
              </option>
              {compareOptions.map((key) => (
                <option key={key} value={key}>
                  {METRIC_META[key]?.label || key}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="stats-drawer-summary">
          <div>
            <span>{meta.label}</span>
            <strong>{formatValue(primaryCurrent, meta.unit)}</strong>
            <small>{primaryDelta ? `${primaryDelta > 0 ? "+" : ""}${Math.round(primaryDelta * 10) / 10}` : "sin cambio"}</small>
          </div>
          {effectiveCompareKey && (
            <div>
              <span>{compareMeta?.label || effectiveCompareKey}</span>
              <strong>{formatValue(compareCurrent, compareMeta?.unit || "")}</strong>
              <small>{compareDelta ? `${compareDelta > 0 ? "+" : ""}${Math.round(compareDelta * 10) / 10}` : "sin cambio"}</small>
            </div>
          )}
        </div>

        <div className="stats-drawer-chart">
          {primary.length < 2 ? (
            <p className="note">No hay suficientes datos para graficar esta métrica.</p>
          ) : (
            <svg viewBox="0 0 380 180" role="img" aria-label={`Tendencia ${meta.label}`}>
              <polyline points={buildLinePoints(primary)} className="stats-line-primary" />
              {compare.length >= 2 && (
                <polyline points={buildLinePoints(compare)} className="stats-line-compare" />
              )}
            </svg>
          )}
          <div className="stats-drawer-legend">
            <span className="primary-dot">{meta.label}</span>
            {compare.length >= 2 && (
              <span className="compare-dot">{compareMeta?.label || effectiveCompareKey}</span>
            )}
          </div>
          <p className="note">El gráfico compara tendencia normalizada por métrica.</p>
        </div>

        {latestDates.length > 0 && (
          <div className="stats-drawer-table">
            <div className="stats-drawer-table-head">
              <strong>Fecha</strong>
              <strong>{meta.label}</strong>
              <strong>{compareMeta?.label || "Cruce"}</strong>
            </div>
            {latestDates.map((row) => (
              <div className="stats-drawer-table-row" key={row.date}>
                <span>{row.date}</span>
                <span>{formatValue(row.a, meta.unit)}</span>
                <span>{effectiveCompareKey ? formatValue(row.b, compareMeta?.unit || "") : "—"}</span>
              </div>
            ))}
          </div>
        )}
      </aside>
    </>
  );
}
