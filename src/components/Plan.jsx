import { useEffect, useMemo, useState } from "react";
import DayCard from "./DayCard";
import { getLevelProgress } from "../utils/levelProgress";

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
  activeProfileName,
  activeExerciseKey,
  equipmentGroups,
  selectedDayIndex,
  onSelectDayIndex,
}) {
  const [mobileDayIndex, setMobileDayIndex] = useState(0);
  const [showAllDays, setShowAllDays] = useState(false);
  const appVersion = import.meta.env.VITE_APP_VERSION || "0.0.0";

  useEffect(() => {
    if (!Number.isFinite(selectedDayIndex)) return;
    const total = Array.isArray(plan?.days) ? plan.days.length : 0;
    if (!total) return;
    const next = Math.max(0, Math.min(total - 1, Number(selectedDayIndex)));
    setMobileDayIndex(next);
    setShowAllDays(false);
  }, [selectedDayIndex, plan?.days?.length]);

  const levelProgress = useMemo(() => getLevelProgress(earnedXp), [earnedXp]);
  const xpInLevel = levelProgress.xpInLevel;
  const levelXpRequired = levelProgress.levelXpRequired;
  const progress = levelProgress.progress;
  const estimatedWeeklyXp = useMemo(() => {
    if (!plan) return 0;
    if (!Array.isArray(plan.weekSchedule) || !Array.isArray(plan.days)) return Number(plan.totalXp || 0);
    const xpByTitle = new Map(plan.days.map((d) => [d.title, Number(d.xp || 0)]));
    return plan.weekSchedule.reduce((sum, slot) => {
      if (slot?.type !== "train") return sum;
      return sum + Number(xpByTitle.get(slot.title) || 0);
    }, 0);
  }, [plan]);
  const weeklyEarnedXp = useMemo(() => {
    if (!plan || !Array.isArray(plan.days)) return 0;
    const trainTitles = new Set(
      Array.isArray(plan.weekSchedule)
        ? plan.weekSchedule
            .filter((slot) => slot?.type === "train" && slot.title)
            .map((slot) => slot.title)
        : plan.days.map((d) => d.title)
    );
    return plan.days.reduce((sum, day) => {
      if (!trainTitles.has(day.title)) return sum;
      const dayEarned = day.exercises.reduce((acc, ex) => {
        const key = getExerciseKey(day.title, ex);
        return acc + (completedMap[key] ? getExerciseXp(ex) : 0);
      }, 0);
      return sum + dayEarned;
    }, 0);
  }, [plan, completedMap, getExerciseKey, getExerciseXp]);
  const todayWeekIndex = (new Date().getDay() + 6) % 7;
  const todaySchedule = Array.isArray(plan?.weekSchedule)
    ? plan.weekSchedule[todayWeekIndex]
    : null;
  const todayIsRest = todaySchedule?.type === "rest";

  if (!plan) return null;

  return (
    <div className="plan" id="plan">
      <div className="plan-head">
        <div className="plan-head-main">
          <h2 className="plan-title">Tu plan inicial</h2>
          <p className="plan-version">Version {appVersion}</p>
          {activeProfileName && <p className="plan-subtitle">{activeProfileName}</p>}
          <div className="plan-head-meta">
            <span>XP estimado de la semana: {estimatedWeeklyXp}</span>
            <span>XP que se lleva en la semana: {weeklyEarnedXp}</span>
          </div>
          {gifsLoading && <p className="note">Cargando gifs…</p>}
        </div>
        <div className="xp-summary plan-xp-summary">
          <strong>Nivel {level}</strong>
          <span>
            XP nivel: {xpInLevel} / {levelXpRequired}
          </span>
          <small>XP total: {earnedXp}</small>
          <div className="xp-bar">
            <div className="xp-bar-fill" style={{ width: `${progress * 100}%` }} />
          </div>
        </div>
      </div>
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
              onChange={(e) => {
                const next = Number(e.target.value);
                setMobileDayIndex(next);
                onSelectDayIndex?.(next);
              }}
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
