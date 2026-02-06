import DayCard from "./DayCard";

export default function Plan({
  plan,
  onChangeDayMode,
  onToggleQuiet,
  onSelectExercise,
  completedMap,
  completedDetails,
  onUpdateDetail,
  getExerciseKey,
  getExerciseXp,
  earnedXp,
  totalPossibleXp,
  level,
  gifsLoading,
  lang,
  onStartSession,
  metrics,
  onInfoMetrics,
  activeExerciseKey,
}) {
  if (!plan) return null;

  const progress = totalPossibleXp ? Math.min(1, earnedXp / totalPossibleXp) : 0;

  return (
    <div className="plan" id="plan">
      <div className="plan-head">
        <div>
          <h2>Tu plan inicial</h2>
          <p className="note">XP total estimado: {plan.totalXp}</p>
          {gifsLoading && <p className="note">Cargando gifs…</p>}
        </div>
        <div className="xp-summary">
          <strong>Nivel {level}</strong>
          <span>
            XP: {earnedXp} / {totalPossibleXp}
          </span>
          <div className="xp-bar">
            <div className="xp-bar-fill" style={{ width: `${progress * 100}%` }} />
          </div>
        </div>
      </div>
      {metrics && (
        <div className="plan-metrics">
          <div className="plan-metrics-head">
            <h3>Métricas calculadas</h3>
            <button type="button" className="link" onClick={onInfoMetrics}>
              ¿Qué significan estas métricas?
            </button>
          </div>
          <div className="metrics-grid">
            <div>
              <span>IMC</span>
              <strong>{metrics.bmi.toFixed(1)}</strong>
            </div>
            <div>
              <span>Categoría IMC</span>
              <strong>{metrics.bmiCat}</strong>
            </div>
            <div>
              <span>TMB (BMR)</span>
              <strong>{Math.round(metrics.bmr)} kcal</strong>
            </div>
            <div>
              <span>TDEE</span>
              <strong>{Math.round(metrics.tdee)} kcal</strong>
            </div>
            <div>
              <span>WHtR</span>
              <strong>{metrics.whtr.toFixed(2)}</strong>
            </div>
            <div>
              <span>WHR</span>
              <strong>{metrics.whr.toFixed(2)}</strong>
            </div>
            <div>
              <span>% Grasa</span>
              <strong>
                {metrics.bodyFat ? metrics.bodyFat.toFixed(1) + "%" : "—"}
              </strong>
            </div>
            <div>
              <span>Masa magra</span>
              <strong>
                {metrics.leanMass ? metrics.leanMass.toFixed(1) + " kg" : "—"}
              </strong>
            </div>
            <div>
              <span>FFMI</span>
              <strong>{metrics.ffmi ? metrics.ffmi.toFixed(1) : "—"}</strong>
            </div>
          </div>
          <p className="note">
            * Las métricas son aproximadas y no sustituyen consejo médico.
          </p>
        </div>
      )}
      {plan.weekSchedule && (
        <div className="week-schedule">
          {plan.weekSchedule.map((d) => (
            <div
              key={d.label}
              className={`week-day ${d.type === "rest" ? "rest" : "train"}`}
            >
              <span>{d.label}</span>
              <strong>{d.type === "rest" ? "Descanso" : d.title}</strong>
            </div>
          ))}
        </div>
      )}
      <div className="plan-grid">
        {plan.days.map((day, index) => (
          <DayCard
            key={day.title}
            day={day}
            index={index}
            onChangeMode={onChangeDayMode}
            onToggleQuiet={onToggleQuiet}
            onSelectExercise={onSelectExercise}
            completedMap={completedMap}
            completedDetails={completedDetails}
            onUpdateDetail={onUpdateDetail}
            getExerciseKey={getExerciseKey}
            getExerciseXp={getExerciseXp}
            lang={lang}
            onStartSession={onStartSession}
            activeExerciseKey={activeExerciseKey}
          />
        ))}
      </div>
    </div>
  );
}
