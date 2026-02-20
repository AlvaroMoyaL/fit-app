import { useMemo, useState } from "react";
import DayCard from "./DayCard";

function startOfWeek(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = (day === 0 ? -6 : 1) - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

export default function Plan({
  plan,
  onChangeDayMode,
  onToggleQuiet,
  onChangeDayEquipment,
  onSelectExercise,
  completedMap,
  getExerciseKey,
  getExerciseXp,
  earnedXp,
  totalPossibleXp,
  level,
  gifsLoading,
  lang,
  onStartSession,
  onStartFreeSession,
  metrics,
  onInfoMetrics,
  activeExerciseKey,
  equipmentGroups,
}) {
  const [mobileDayIndex, setMobileDayIndex] = useState(0);
  const [showAllDays, setShowAllDays] = useState(false);

  const progress = totalPossibleXp ? Math.min(1, earnedXp / totalPossibleXp) : 0;
  const weekStart = startOfWeek(new Date());
  const dateFormatter = useMemo(() => {
    const locale = lang === "es" ? "es-ES" : "en-US";
    return new Intl.DateTimeFormat(locale, { weekday: "short", day: "numeric" });
  }, [lang]);
  const getDateLabel = (index) => {
    const date = new Date(weekStart);
    date.setDate(weekStart.getDate() + index);
    return dateFormatter.format(date);
  };
  const todayWeekIndex = (new Date().getDay() + 6) % 7;
  const todaySchedule = Array.isArray(plan?.weekSchedule)
    ? plan.weekSchedule[todayWeekIndex]
    : null;
  const todayIsRest = todaySchedule?.type === "rest";

  if (!plan) return null;

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
          {plan.weekSchedule.map((d, index) => {
            const dateLabel = getDateLabel(index);
            const isSelected = index === mobileDayIndex;
            return (
            <div
              key={d.label}
              className={`week-day ${d.type === "rest" ? "rest" : "train"} ${
                isSelected ? "active" : ""
              }`}
              role="button"
              tabIndex={0}
              onClick={() => {
                setMobileDayIndex(index);
                setShowAllDays(false);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setMobileDayIndex(index);
                  setShowAllDays(false);
                }
              }}
            >
              <span className="week-date">{dateLabel}</span>
              <strong>{d.type === "rest" ? "Descanso" : d.title}</strong>
            </div>
            );
          })}
        </div>
      )}
      {todayIsRest && (
        <div className="rest-panel">
          <p className="note">
            {lang === "en"
              ? "Today is a rest day in your plan."
              : "Hoy es día de descanso en tu plan."}
          </p>
          <button type="button" className="tiny primary-btn" onClick={onStartFreeSession}>
            {lang === "en" ? "Free workout today" : "Entreno libre hoy"}
          </button>
        </div>
      )}
      {plan.days?.length > 1 && (
        <div className="plan-mobile-controls">
          <div className="plan-day-select">
            <label>Ver día</label>
            <select
              value={mobileDayIndex}
              onChange={(e) => setMobileDayIndex(Number(e.target.value))}
            >
              {plan.days.map((day, index) => (
                <option key={day.title} value={index}>
                  {day.title}
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            className="tiny"
            onClick={() => setShowAllDays((v) => !v)}
          >
            {showAllDays ? "Ver 1 día" : "Ver todos"}
          </button>
        </div>
      )}
      <div className="plan-grid">
        {plan.days.map((day, index) => {
          if (!showAllDays && index !== mobileDayIndex) return null;
          return (
            <DayCard
              key={day.title}
              day={day}
              index={index}
              dayLabel={getDateLabel(index)}
              onChangeMode={onChangeDayMode}
              onToggleQuiet={onToggleQuiet}
              onChangeEquipment={onChangeDayEquipment}
              onSelectExercise={onSelectExercise}
              completedMap={completedMap}
              getExerciseKey={getExerciseKey}
              getExerciseXp={getExerciseXp}
              lang={lang}
              onStartSession={onStartSession}
              activeExerciseKey={activeExerciseKey}
              equipmentGroups={equipmentGroups}
            />
          );
        })}
      </div>
    </div>
  );
}
