import { useState } from "react";
import { toLocalDateKey } from "../utils/dateKey";

const METRIC_FIELDS = [
  { name: "weight", min: 20, max: 300, step: "0.1", labelEs: "Peso (kg)", labelEn: "Weight (kg)" },
  { name: "waist", min: 40, max: 200, step: "0.1", labelEs: "Cintura (cm)", labelEn: "Waist (cm)" },
  { name: "hip", min: 40, max: 200, step: "0.1", labelEs: "Cadera (cm)", labelEn: "Hip (cm)" },
  { name: "neck", min: 20, max: 80, step: "0.1", labelEs: "Cuello (cm)", labelEn: "Neck (cm)" },
  { name: "bodyFat", min: 2, max: 60, step: "0.1", labelEs: "% Grasa (BIA)", labelEn: "Body fat (%)" },
  { name: "restHr", min: 30, max: 200, step: "1", labelEs: "FC reposo", labelEn: "Resting HR" },
  { name: "sleepHours", min: 0, max: 16, step: "0.1", labelEs: "Sueño (horas)", labelEn: "Sleep (hours)" },
  { name: "steps", min: 0, max: 100000, step: "1", labelEs: "Pasos", labelEn: "Steps" },
  { name: "sleepScore", min: 0, max: 100, step: "1", labelEs: "Sleep score", labelEn: "Sleep score" },
  { name: "readiness", min: 0, max: 100, step: "1", labelEs: "Readiness", labelEn: "Readiness" },
  { name: "hrv", min: 0, max: 250, step: "1", labelEs: "HRV (ms)", labelEn: "HRV (ms)" },
  { name: "bodyBattery", min: 0, max: 100, step: "1", labelEs: "Body Battery", labelEn: "Body Battery" },
  { name: "stress", min: 0, max: 100, step: "1", labelEs: "Estrés diario", labelEn: "Daily stress" },
  { name: "sleepStress", min: 0, max: 100, step: "1", labelEs: "Estrés sueño", labelEn: "Sleep stress" },
  { name: "spo2", min: 70, max: 100, step: "0.1", labelEs: "SpO2 (%)", labelEn: "SpO2 (%)" },
  { name: "respiration", min: 5, max: 40, step: "0.1", labelEs: "Respiración (rpm)", labelEn: "Respiration (rpm)" },
  { name: "loadRatio", min: 0, max: 5, step: "0.01", labelEs: "Carga 7d/28d", labelEn: "Load ratio 7d/28d" },
  { name: "acuteLoad", min: 0, max: 5000, step: "1", labelEs: "Carga aguda", labelEn: "Acute load" },
  { name: "chronicLoad", min: 0, max: 5000, step: "1", labelEs: "Carga crónica", labelEn: "Chronic load" },
  { name: "activeKcal", min: 0, max: 8000, step: "1", labelEs: "Kcal activas", labelEn: "Active kcal" },
  { name: "totalKcal", min: 0, max: 10000, step: "1", labelEs: "Kcal totales", labelEn: "Total kcal" },
  { name: "distanceKm", min: 0, max: 100, step: "0.01", labelEs: "Distancia (km)", labelEn: "Distance (km)" },
  { name: "activeMinutes", min: 0, max: 1440, step: "1", labelEs: "Min activos", labelEn: "Active minutes" },
  { name: "vo2max", min: 10, max: 90, step: "0.1", labelEs: "VO2 max", labelEn: "VO2 max" },
];

const PRIMARY_FIELD_NAMES = [
  "weight",
  "waist",
  "bodyFat",
  "restHr",
  "sleepHours",
  "steps",
  "sleepScore",
  "readiness",
];

export default function MetricsLogForm({ metricsLog, onAddEntry, onDeleteEntry, lang }) {
  const clamp = (min, max, v) => Math.max(min, Math.min(max, v));
  const parseOptional = (value, min, max) => {
    if (value === "" || value === null || value === undefined) return null;
    const n = Number(value);
    if (!Number.isFinite(n)) return null;
    return clamp(min, max, n);
  };
  const [form, setForm] = useState({
    date: toLocalDateKey(),
    ...METRIC_FIELDS.reduce((acc, field) => ({ ...acc, [field.name]: "" }), {}),
    notes: "",
  });

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  const onSubmit = (e) => {
    e.preventDefault();
    if (!form.date) return;
    const parsedMetrics = METRIC_FIELDS.reduce((acc, field) => {
      acc[field.name] = parseOptional(form[field.name], field.min, field.max);
      return acc;
    }, {});
    onAddEntry({
      date: form.date,
      ...parsedMetrics,
      notes: form.notes || "",
    });
    setForm((f) => ({
      ...f,
      ...METRIC_FIELDS.reduce((acc, field) => ({ ...acc, [field.name]: "" }), {}),
      notes: "",
    }));
  };

  const entries = [...(metricsLog || [])].sort((a, b) => (a.date < b.date ? 1 : -1));
  const primaryFields = METRIC_FIELDS.filter((field) =>
    PRIMARY_FIELD_NAMES.includes(field.name)
  );
  const advancedFields = METRIC_FIELDS.filter(
    (field) => !PRIMARY_FIELD_NAMES.includes(field.name)
  );
  const entrySummary = (entry) => {
    const labels =
      lang === "en"
        ? [
            ["Weight", entry.weight ? `${entry.weight} kg` : "—"],
            ["Waist", entry.waist ? `${entry.waist} cm` : "—"],
            ["Rest HR", entry.restHr ? `${entry.restHr} bpm` : "—"],
            ["Sleep", entry.sleepHours ? `${entry.sleepHours} h` : "—"],
            ["Steps", entry.steps ? `${entry.steps}` : "—"],
            ["Readiness", entry.readiness ? `${entry.readiness}` : "—"],
          ]
        : [
            ["Peso", entry.weight ? `${entry.weight} kg` : "—"],
            ["Cintura", entry.waist ? `${entry.waist} cm` : "—"],
            ["FC reposo", entry.restHr ? `${entry.restHr} bpm` : "—"],
            ["Sueño", entry.sleepHours ? `${entry.sleepHours} h` : "—"],
            ["Pasos", entry.steps ? `${entry.steps}` : "—"],
            ["Readiness", entry.readiness ? `${entry.readiness}` : "—"],
          ];
    return labels;
  };

  return (
    <div className="metrics-log">
      <div className="metrics-log-head">
        <div>
          <p className="section-eyebrow">
            {lang === "en" ? "Manual tracking" : "Seguimiento manual"}
          </p>
          <h3>{lang === "en" ? "Log Measurements" : "Registrar medidas"}</h3>
          <p className="note">
            {lang === "en"
              ? "Keep the core metrics visible and use advanced fields only when needed."
              : "Deja visibles las métricas clave y abre las avanzadas solo cuando las necesites."}
          </p>
        </div>
      </div>
      <form onSubmit={onSubmit} className="metrics-form">
        <label className="full">
          {lang === "en" ? "Date" : "Fecha"}
          <input type="date" name="date" value={form.date} onChange={onChange} />
        </label>
        {primaryFields.map((field) => (
          <label key={field.name}>
            {lang === "en" ? field.labelEn : field.labelEs}
            <input
              type="number"
              min={field.min}
              max={field.max}
              step={field.step}
              name={field.name}
              value={form[field.name]}
              onChange={onChange}
            />
          </label>
        ))}
        <details className="metrics-advanced full">
          <summary>{lang === "en" ? "Advanced metrics" : "Métricas avanzadas"}</summary>
          <div className="metrics-advanced-grid">
            {advancedFields.map((field) => (
              <label key={field.name}>
                {lang === "en" ? field.labelEn : field.labelEs}
                <input
                  type="number"
                  min={field.min}
                  max={field.max}
                  step={field.step}
                  name={field.name}
                  value={form[field.name]}
                  onChange={onChange}
                />
              </label>
            ))}
          </div>
        </details>
        <label className="full">
          {lang === "en" ? "Notes" : "Notas"}
          <input type="text" name="notes" value={form.notes} onChange={onChange} />
        </label>
        <button className="tiny primary-btn" type="submit">
          {lang === "en" ? "Save" : "Guardar"}
        </button>
      </form>

      {entries.length > 0 && (
        <div className="metrics-list">
          {entries.slice(0, 8).map((e) => (
            <div className="metrics-entry-card" key={e.date}>
              <div className="metrics-entry-head">
                <div>
                  <strong>{e.date}</strong>
                  {e.notes ? <p className="metrics-entry-note">{e.notes}</p> : null}
                </div>
                <button className="tiny" type="button" onClick={() => onDeleteEntry(e.date)}>
                  {lang === "en" ? "Delete" : "Borrar"}
                </button>
              </div>
              <div className="metrics-entry-grid">
                {entrySummary(e).map(([label, value]) => (
                  <div key={`${e.date}-${label}`}>
                    <span>{label}</span>
                    <strong>{value}</strong>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
