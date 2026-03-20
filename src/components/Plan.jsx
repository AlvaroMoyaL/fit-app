import { useEffect, useMemo, useState } from "react";
import DayCard from "./DayCard";
import { getLevelProgress } from "../utils/levelProgress";
import WorkspaceHeader from "./WorkspaceHeader";
import { buildDayFocusLabel } from "../utils/dayFocus";

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
  exerciseCatalog,
  onAddCoreAlternative,
  selectedDayIndex,
  onSelectDayIndex,
}) {
  const [mobileDayIndex, setMobileDayIndex] = useState(0);
  const [showAllDays, setShowAllDays] = useState(false);
  const appVersion = import.meta.env.VITE_APP_VERSION || "0.0.0";
  const appBuild = import.meta.env.VITE_APP_BUILD || "dev";

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
  const totalDays = Array.isArray(plan?.days) ? plan.days.length : 0;
  const trainDaysCount = Array.isArray(plan?.weekSchedule)
    ? plan.weekSchedule.filter((slot) => slot?.type === "train").length
    : totalDays;
  const weekdayLabels =
    lang === "en"
      ? ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
      : ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
  const selectedDay = totalDays ? plan.days[mobileDayIndex] : null;
  const selectedDayXp = useMemo(() => {
    if (!selectedDay?.exercises?.length) return 0;
    return selectedDay.exercises.reduce((sum, ex) => sum + getExerciseXp(ex), 0);
  }, [getExerciseXp, selectedDay]);
  const selectedDayEarnedXp = useMemo(() => {
    if (!selectedDay?.exercises?.length) return 0;
    return selectedDay.exercises.reduce((sum, ex) => {
      const key = getExerciseKey(selectedDay.title, ex);
      return sum + (completedMap[key] ? getExerciseXp(ex) : 0);
    }, 0);
  }, [completedMap, getExerciseKey, getExerciseXp, selectedDay]);
  const selectedDayCompletedCount = useMemo(() => {
    if (!selectedDay?.exercises?.length) return 0;
    return selectedDay.exercises.reduce((sum, ex) => {
      const key = getExerciseKey(selectedDay.title, ex);
      return sum + (completedMap[key] ? 1 : 0);
    }, 0);
  }, [completedMap, getExerciseKey, selectedDay]);
  const selectedDayCompletionPct = Math.round(
    (selectedDayCompletedCount / Math.max(1, selectedDay?.exercises?.length || 0)) * 100
  );
  const selectedDayFocus = selectedDay
    ? buildDayFocusLabel(selectedDay, lang, selectedDay.focus || "")
    : "—";
  const weekScheduleItems = useMemo(() => {
    const slots = Array.isArray(plan?.weekSchedule) ? plan.weekSchedule : [];
    const dayIndexByTitle = new Map(
      (Array.isArray(plan?.days) ? plan.days : []).map((day, idx) => [day.title, idx])
    );

    return weekdayLabels.map((label, weekIndex) => {
      const slot = slots[weekIndex] || null;
      const linkedDayIndex =
        slot?.type === "train" && slot?.title && dayIndexByTitle.has(slot.title)
          ? dayIndexByTitle.get(slot.title)
          : null;

      return {
        label,
        weekIndex,
        slot,
        linkedDayIndex,
        isToday: weekIndex === todayWeekIndex,
      };
    });
  }, [plan?.days, plan?.weekSchedule, todayWeekIndex, weekdayLabels]);

  if (!plan) return null;

  return (
    <div className="plan workspace-view" id="plan">
      <WorkspaceHeader
        eyebrow="Entrenamiento semanal"
        title="Plan semanal"
        titleTag="h1"
        description="Semana operativa, progreso acumulado y acceso directo a cada día dentro del mismo marco visual que métricas, historial y nutrición."
        tags={[
          `Versión ${appVersion} · build ${appBuild}`,
          activeProfileName || "Sin perfil activo",
        ]}
        stats={[
          { key: "estimated-xp", label: "XP estimado", value: estimatedWeeklyXp },
          { key: "earned-xp", label: "XP logrado", value: weeklyEarnedXp },
          { key: "capacity-xp", label: "Capacidad total", value: totalPossibleXp || 0 },
        ]}
        aside={
          <div className="xp-summary plan-xp-summary">
            <span className="plan-xp-kicker">Rendimiento actual</span>
            <strong>Nivel {level}</strong>
            <span>
              XP nivel: {xpInLevel} / {levelXpRequired}
            </span>
            <small>XP total: {earnedXp}</small>
            <div className="xp-bar">
              <div className="xp-bar-fill" style={{ width: `${progress * 100}%` }} />
            </div>
          </div>
        }
      >
        {gifsLoading && <p className="note">Cargando gifs…</p>}
      </WorkspaceHeader>
      <div className="workspace-layout plan-workspace">
        <div className="workspace-main">
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
                  exerciseCatalog={exerciseCatalog}
                  onAddCoreAlternative={onAddCoreAlternative}
                />
              );
            })}
          </div>
        </div>

        <aside className="workspace-aside plan-aside">
          <section className="workspace-panel workspace-panel-sticky">
            <div className="workspace-section-head">
              <div>
                <p className="workspace-section-kicker">Semana activa</p>
                <h3>Lectura rápida</h3>
                <p className="workspace-section-copy">
                  Selección de día, resumen de la semana y contexto del bloque visible.
                </p>
              </div>
            </div>

            <div className="plan-summary-grid">
              <div className="plan-summary-card">
                <span>Días del plan</span>
                <strong>{totalDays}</strong>
                <small>{trainDaysCount} con entrenamiento</small>
              </div>
              <div className="plan-summary-card">
                <span>Vista actual</span>
                <strong>{showAllDays ? "Todos" : `Día ${mobileDayIndex + 1}`}</strong>
                <small>{showAllDays ? "semana completa" : selectedDay?.title || "sin selección"}</small>
              </div>
              <div className="plan-summary-card">
                <span>Hoy</span>
                <strong>{todayIsRest ? "Descanso" : todaySchedule?.title || "Activo"}</strong>
                <small>{todayIsRest ? "recuperación programada" : "sesión del día"}</small>
              </div>
            </div>

            {weekScheduleItems.length > 0 && (
              <div className="plan-week-schedule-block">
                <div className="workspace-section-head">
                  <div>
                    <p className="workspace-section-kicker">Semana</p>
                    <h3>Secuencia operativa</h3>
                    <p className="workspace-section-copy">
                      Selecciona un día desde la semana completa para mantener contexto de
                      carga y descanso.
                    </p>
                  </div>
                </div>
                <div className="week-schedule plan-week-schedule">
                  {weekScheduleItems.map((item) => {
                    const isActive =
                      Number.isFinite(item.linkedDayIndex) &&
                      item.linkedDayIndex === mobileDayIndex &&
                      !showAllDays;
                    const isTrain = item.slot?.type === "train";
                    return (
                      <button
                        key={`${item.label}-${item.weekIndex}`}
                        type="button"
                        className={`week-day ${isTrain ? "train" : "rest"} ${
                          isActive ? "active" : ""
                        } ${item.isToday ? "today" : ""}`}
                        disabled={!Number.isFinite(item.linkedDayIndex)}
                        onClick={() => {
                          if (!Number.isFinite(item.linkedDayIndex)) return;
                          setMobileDayIndex(item.linkedDayIndex);
                          setShowAllDays(false);
                          onSelectDayIndex?.(item.linkedDayIndex);
                        }}
                      >
                        <span>{item.label}</span>
                        <strong>
                          {isTrain
                            ? item.slot?.title || "Sesión"
                            : lang === "en"
                              ? "Rest"
                              : "Descanso"}
                        </strong>
                        <small>
                          {item.isToday
                            ? lang === "en"
                              ? "Today"
                              : "Hoy"
                            : isTrain && Number.isFinite(item.linkedDayIndex)
                              ? lang === "en"
                                ? `Day ${Number(item.linkedDayIndex) + 1}`
                                : `Día ${Number(item.linkedDayIndex) + 1}`
                              : lang === "en"
                                ? "Recovery"
                                : "Recuperación"}
                        </small>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {plan.days?.length > 1 && (
              <div className="plan-mobile-controls plan-sidebar-controls">
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

            {selectedDay && (
              <div className="plan-summary-card plan-selected-day">
                <span>Día seleccionado</span>
                <strong>{selectedDay.title}</strong>
                <small>{selectedDayFocus}</small>
                <div className="plan-selected-day-meta">
                  <span>
                    {selectedDayCompletedCount}/{selectedDay.exercises?.length || 0} completados
                  </span>
                  <span>
                    {selectedDayEarnedXp}/{selectedDayXp} XP
                  </span>
                </div>
                <div
                  className="plan-selected-day-progress"
                  role="progressbar"
                  aria-valuemin="0"
                  aria-valuemax="100"
                  aria-valuenow={selectedDayCompletionPct}
                  aria-label="Progreso del día seleccionado"
                >
                  <div
                    className="plan-selected-day-progress-fill"
                    style={{ width: `${selectedDayCompletionPct}%` }}
                  />
                </div>
              </div>
            )}

            {todayIsRest && (
              <div className="rest-panel plan-rest-callout">
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
          </section>
        </aside>
      </div>
    </div>
  );
}
