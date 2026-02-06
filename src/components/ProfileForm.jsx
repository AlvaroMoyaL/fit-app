import MetricsPanel from "./MetricsPanel";

export default function ProfileForm({
  form,
  niveles,
  actividad,
  planTemplates,
  metrics,
  loading,
  error,
  onChange,
  onToggleTrainDay,
  onChangeReminderEnabled,
  onChangeReminderTime,
  onSubmit,
  onInfo,
}) {
  const weekLabels = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

  return (
    <form onSubmit={onSubmit}>
      <div className="grid">
        <label className="field">
          Nombre
          <input
            name="nombre"
            value={form.nombre}
            onChange={onChange}
            placeholder="Ej: Alex"
          />
        </label>

        <label className="field">
          Edad (años)
          <input
            name="edad"
            type="number"
            value={form.edad}
            onChange={onChange}
            placeholder="Ej: 28"
          />
        </label>

        <label className="field">
          Sexo
          <select name="sexo" value={form.sexo} onChange={onChange}>
            <option>Hombre</option>
            <option>Mujer</option>
          </select>
        </label>

        <label className="field">
          <span className="field-label">
            Peso (kg)
            <button type="button" className="help-icon" onClick={onInfo}>
              ?
            </button>
          </span>
          <input
            name="peso"
            type="number"
            value={form.peso}
            onChange={onChange}
            placeholder="Ej: 72"
          />
        </label>

        <label className="field">
          <span className="field-label">
            Altura (cm)
            <button type="button" className="help-icon" onClick={onInfo}>
              ?
            </button>
          </span>
          <input
            name="altura"
            type="number"
            value={form.altura}
            onChange={onChange}
            placeholder="Ej: 175"
          />
        </label>

        <label className="field">
          <span className="field-label">
            Cintura (cm)
            <button type="button" className="help-icon" onClick={onInfo}>
              ?
            </button>
          </span>
          <input
            name="cintura"
            type="number"
            value={form.cintura}
            onChange={onChange}
            placeholder="Ej: 82"
          />
        </label>

        <label className="field">
          <span className="field-label">
            Cadera (cm)
            <button type="button" className="help-icon" onClick={onInfo}>
              ?
            </button>
          </span>
          <input
            name="cadera"
            type="number"
            value={form.cadera}
            onChange={onChange}
            placeholder="Ej: 98"
          />
        </label>

        <label className="field">
          <span className="field-label">
            Cuello (cm)
            <button type="button" className="help-icon" onClick={onInfo}>
              ?
            </button>
          </span>
          <input
            name="cuello"
            type="number"
            value={form.cuello}
            onChange={onChange}
            placeholder="Ej: 38"
          />
        </label>

        <label className="field">
          Condición física
          <select name="nivel" value={form.nivel} onChange={onChange}>
            {niveles.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          Nivel de actividad
          <select
            name="actividadFactor"
            value={form.actividadFactor}
            onChange={onChange}
          >
            {actividad.map((a) => (
              <option key={a.value} value={a.value}>
                {a.label}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          Objetivo
          <select name="objetivo" value={form.objetivo} onChange={onChange}>
            <option>Salud</option>
            <option>Perder grasa</option>
            <option>Ganar músculo</option>
            <option>Resistencia</option>
            <option>Movilidad</option>
          </select>
        </label>

        <label className="field">
          Plantilla de entrenamiento
          <select
            name="planTemplate"
            value={form.planTemplate || "goal"}
            onChange={onChange}
          >
            {planTemplates.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <MetricsPanel metrics={metrics} onInfo={onInfo} />

      <div className="rest-panel">
        <h3>Días a entrenar</h3>
        <div className="rest-days">
          {weekLabels.map((label, idx) => (
            <label key={label} className="check">
              <input
                type="checkbox"
                checked={form.trainDays?.includes(idx)}
                onChange={() => onToggleTrainDay(idx)}
              />
              {label}
            </label>
          ))}
        </div>
        <div className="train-actions">
          <button
            type="button"
            className="tiny"
            onClick={() => onToggleTrainDay("all")}
          >
            Marcar todos
          </button>
          <button
            type="button"
            className="tiny"
            onClick={() => onToggleTrainDay("none")}
          >
            Limpiar
          </button>
        </div>
        <p className="note">
          Selecciona los días en los que quieres entrenar.
        </p>
        <div className="reminder">
          <label className="check">
            <input
              type="checkbox"
              checked={Boolean(form.reminderEnabled)}
              onChange={(e) => onChangeReminderEnabled(e.target.checked)}
            />
            Activar recordatorio
          </label>
          <input
            type="time"
            value={form.reminderTime || "19:00"}
            onChange={(e) => onChangeReminderTime(e.target.value)}
          />
        </div>
      </div>

      <div className="rest-panel">
        <h3>Metas semanales</h3>
        <div className="goal-grid">
          <label>
            XP objetivo
            <input
              type="number"
              name="weeklyXpGoal"
              value={form.weeklyXpGoal || 0}
              onChange={onChange}
              min="0"
            />
          </label>
          <label>
            Minutos objetivo
            <input
              type="number"
              name="weeklyMinutesGoal"
              value={form.weeklyMinutesGoal || 0}
              onChange={onChange}
              min="0"
            />
          </label>
        </div>
      </div>

      {error && <p className="error">{error}</p>}

      <button className="primary full" type="submit" disabled={loading}>
        {loading ? "Generando..." : "Guardar y generar plan"}
      </button>
    </form>
  );
}
