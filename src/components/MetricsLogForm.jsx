import { useState } from "react";

export default function MetricsLogForm({ metricsLog, onAddEntry, onDeleteEntry, lang }) {
  const clamp = (min, max, v) => Math.max(min, Math.min(max, v));
  const [form, setForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    weight: "",
    waist: "",
    hip: "",
    bodyFat: "",
    restHr: "",
    sleepHours: "",
    steps: "",
    notes: "",
  });

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  const onSubmit = (e) => {
    e.preventDefault();
    if (!form.date) return;
    const weight = clamp(20, 300, Number(form.weight || 0));
    const waist = clamp(40, 200, Number(form.waist || 0));
    const hip = clamp(40, 200, Number(form.hip || 0));
    const bodyFat = clamp(2, 60, Number(form.bodyFat || 0));
    const restHr = clamp(30, 200, Number(form.restHr || 0));
    const sleepHours = clamp(0, 16, Number(form.sleepHours || 0));
    const steps = clamp(0, 100000, Number(form.steps || 0));
    onAddEntry({
      date: form.date,
      weight,
      waist,
      hip,
      bodyFat,
      restHr,
      sleepHours,
      steps,
      notes: form.notes || "",
    });
    setForm((f) => ({
      ...f,
      weight: "",
      waist: "",
      hip: "",
      bodyFat: "",
      restHr: "",
      sleepHours: "",
      steps: "",
      notes: "",
    }));
  };

  const entries = [...(metricsLog || [])].sort((a, b) => (a.date < b.date ? 1 : -1));

  return (
    <div className="metrics-log">
      <h3>{lang === "en" ? "Log Measurements" : "Registrar medidas"}</h3>
      <form onSubmit={onSubmit} className="metrics-form">
        <label>
          {lang === "en" ? "Date" : "Fecha"}
          <input type="date" name="date" value={form.date} onChange={onChange} />
        </label>
        <label>
          {lang === "en" ? "Weight (kg)" : "Peso (kg)"}
          <input type="number" min="20" max="300" name="weight" value={form.weight} onChange={onChange} />
        </label>
        <label>
          {lang === "en" ? "Waist (cm)" : "Cintura (cm)"}
          <input type="number" min="40" max="200" name="waist" value={form.waist} onChange={onChange} />
        </label>
        <label>
          {lang === "en" ? "Hip (cm)" : "Cadera (cm)"}
          <input type="number" min="40" max="200" name="hip" value={form.hip} onChange={onChange} />
        </label>
        <label>
          {lang === "en" ? "Body fat (%)" : "% Grasa (BIA)"}
          <input
            type="number"
            min="2"
            max="60"
            name="bodyFat"
            value={form.bodyFat}
            onChange={onChange}
          />
        </label>
        <label>
          {lang === "en" ? "Resting HR" : "FC reposo"}
          <input type="number" min="30" max="200" name="restHr" value={form.restHr} onChange={onChange} />
        </label>
        <label>
          {lang === "en" ? "Sleep (hours)" : "Sueño (horas)"}
          <input
            type="number"
            min="0"
            max="16"
            name="sleepHours"
            value={form.sleepHours}
            onChange={onChange}
          />
        </label>
        <label>
          {lang === "en" ? "Steps" : "Pasos"}
          <input type="number" min="0" max="100000" name="steps" value={form.steps} onChange={onChange} />
        </label>
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
            <div className="metrics-row" key={e.date}>
              <strong>{e.date}</strong>
              <span>{e.weight ? `${e.weight} kg` : "-"}</span>
              <span>{e.waist ? `${e.waist} cm` : "-"}</span>
              <span>{e.hip ? `${e.hip} cm` : "-"}</span>
              <span>{e.bodyFat ? `${e.bodyFat}%` : "-"}</span>
              <span>{e.restHr ? `${e.restHr} bpm` : "-"}</span>
              <span>{e.sleepHours ? `${e.sleepHours} h` : "-"}</span>
              <span>{e.steps ? `${e.steps}` : "-"}</span>
              <button className="tiny" type="button" onClick={() => onDeleteEntry(e.date)}>
                {lang === "en" ? "Delete" : "Borrar"}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
