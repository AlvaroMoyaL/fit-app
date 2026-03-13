import LocalDbStatus from "./LocalDbStatus";
import GifDbStatus from "./GifDbStatus";
import { getLevelProgress } from "../utils/levelProgress";
import { buildDayFocusLabel } from "../utils/dayFocus";
import { getMeals } from "../utils/nutritionStorage";
import { calculateDailyTotals, getMealsForDate } from "../utils/nutritionUtils";
import { calculateCalorieBalance, calculateTDEEDynamic } from "../utils/metabolism";

function startOfWeek(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = (day === 0 ? -6 : 1) - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

export default function Sidebar({
  profiles,
  activeProfileId,
  onSwitchProfile,
  onAddProfile,
  onRenameProfile,
  onDeleteProfile,
  newProfileName,
  onChangeNewProfileName,
  renameProfileName,
  onChangeRenameProfileName,
  activeTab,
  onChangeTab,
  nutritionSection,
  onChangeNutritionSection,
  profile,
  metrics,
  level,
  earnedXp,
  totalPossibleXp,
  plan,
  completedCount,
  totalExercises,
  trainedDaysTotal,
  trainedDaysThisMonth,
  trainingStreak,
  selectedPlanDayIndex,
  onResetPlan,
  onRegeneratePlan,
  loadingPlan,
  planActionStatus,
  onGoToPlanDay,
  onAddExtraDay,
  dbStatus,
  onStartDbDownload,
  gifStatus,
  onStartGifDownload,
  lang,
  onChangeLang,
  metricsLog,
  history,
  onExport,
  onImport,
  onRestoreBackup,
  onRestorePrevBackup,
  backupLastLabel,
  backupPrevLabel,
  authUser,
  authReady,
  authForm,
  onAuthChange,
  onSignIn,
  onSignUp,
  onMagicLink,
  onSignOut,
  authLoading,
  authError,
  syncStatus,
  syncIndicator,
  syncRestoreSummary,
  onSyncUp,
  onSyncDown,
  canSyncUp,
  authEnabled,
  highContrast,
  onToggleContrast,
  themeMode,
  onToggleTheme,
}) {
  const levelProgress = getLevelProgress(earnedXp);
  const xpInLevel = levelProgress.xpInLevel;
  const levelXpRequired = levelProgress.levelXpRequired;
  const progress = levelProgress.progress;

  const lastMetric = metricsLog && metricsLog.length > 0 ? metricsLog[metricsLog.length - 1] : null;
  const prevMetric = metricsLog && metricsLog.length > 1 ? metricsLog[metricsLog.length - 2] : null;
  const canStartDownload =
    dbStatus && dbStatus.state !== "downloading" && dbStatus.state !== "paused";
  const downloadLabel =
    dbStatus?.state === "ready" ? "Re-descargar ejercicios" : "Descargar ejercicios";
  const canStartGifDownload =
    gifStatus && gifStatus.state !== "downloading" && gifStatus.state !== "paused";
  const gifDownloadLabel =
    gifStatus?.state === "ready" ? "Re-descargar gifs" : "Descargar gifs";

  const trend = (key) => {
    if (!lastMetric || !prevMetric) return "";
    const a = Number(lastMetric[key] || 0);
    const b = Number(prevMetric[key] || 0);
    if (!a || !b) return "";
    if (a > b) return "↑";
    if (a < b) return "↓";
    return "→";
  };
  const healthClass = (status) => {
    if (status === "ok") return "ok";
    if (status === "warn") return "warn";
    if (status === "bad") return "bad";
    return "neutral";
  };
  const trendClass = (key, invert = false) => {
    if (!lastMetric || !prevMetric) return "neutral";
    const a = Number(lastMetric[key] || 0);
    const b = Number(prevMetric[key] || 0);
    if (!a || !b) return "neutral";
    if (a === b) return "neutral";
    if (invert) return a < b ? "ok" : "bad";
    return a > b ? "ok" : "bad";
  };
  const bmiValue = Number(metrics?.bmi || 0);
  const whtrValue = Number(metrics?.whtr || 0);
  const bodyFatValue = Number(metrics?.bodyFat || 0);
  const restHrValue = Number(lastMetric?.restHr || 0);
  const bmiStatus =
    !bmiValue ? "neutral" : bmiValue < 18.5 ? "warn" : bmiValue < 25 ? "ok" : bmiValue < 30 ? "warn" : "bad";
  const whtrStatus =
    !whtrValue ? "neutral" : whtrValue < 0.5 ? "ok" : whtrValue < 0.6 ? "warn" : "bad";
  const bfStatus =
    !bodyFatValue
      ? "neutral"
      : bodyFatValue < 12
      ? "warn"
      : bodyFatValue <= 28
      ? "ok"
      : bodyFatValue <= 35
      ? "warn"
      : "bad";
  const hrStatus =
    !restHrValue
      ? "neutral"
      : restHrValue <= 60
      ? "ok"
      : restHrValue <= 75
      ? "warn"
      : "bad";
  const activeProfile = profiles.find((p) => p.id === activeProfileId);
  const activeProfileName = activeProfile?.name || "—";
  const weekStart = startOfWeek(new Date());
  const dayDateFormatter = new Intl.DateTimeFormat(lang === "en" ? "en-US" : "es-ES", {
    day: "2-digit",
    month: "2-digit",
  });
  const getPlanDateLabel = (index) => {
    const date = new Date(weekStart);
    date.setDate(weekStart.getDate() + index);
    return dayDateFormatter.format(date);
  };
  const getPlanDayType = (index) => {
    const slot = Array.isArray(plan?.weekSchedule) ? plan.weekSchedule[index] : null;
    if (!slot) return "extra";
    return slot.type === "rest" ? "rest" : "train";
  };
  const getPlanDayTypeLabel = (index) => {
    const type = getPlanDayType(index);
    if (type === "rest") return "Descanso";
    if (type === "train") return "Entreno";
    return "Extra";
  };
  const toDateKey = (date) =>
    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
      date.getDate()
    ).padStart(2, "0")}`;
  const todayKey = toDateKey(new Date());
  const metricToday =
    [...(Array.isArray(metricsLog) ? metricsLog : [])]
      .reverse()
      .find((entry) => entry?.date === todayKey) || null;
  const metricForNutrition = metricToday || {};
  const allMeals = activeProfileId ? getMeals(activeProfileId) : [];
  const mealsToday = getMealsForDate(allMeals, todayKey);
  const nutritionTotals = calculateDailyTotals(mealsToday);
  const nutritionTdee = calculateTDEEDynamic(profile, {
    steps: Number(metricForNutrition?.steps || 0),
    activeKcal: Number(metricForNutrition?.activeKcal || 0),
  });
  const nutritionBalance = calculateCalorieBalance(nutritionTotals.calories, nutritionTdee);
  const caloriesRemaining = Math.max(0, Math.round(nutritionTdee - nutritionTotals.calories));
  const calorieProgress =
    nutritionTdee > 0 ? Math.min(1, nutritionTotals.calories / nutritionTdee) : 0;
  const nutritionStatusLabel =
    nutritionBalance.status === "deficit"
      ? "Déficit"
      : nutritionBalance.status === "surplus"
      ? "Superávit"
      : "Mantenimiento";
  const nutritionBalanceLabel = `${nutritionBalance.balance >= 0 ? "+" : ""}${Math.round(
    nutritionBalance.balance
  )} kcal`;
  const normalizeName = (value) =>
    String(value || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim();
  const isPlanDayComplete = (day, index) => {
    const planned = Array.isArray(day?.exercises) ? day.exercises : [];
    if (!planned.length) return false;
    if (getPlanDayType(index) === "rest") return false;

    const date = new Date(weekStart);
    date.setDate(weekStart.getDate() + index);
    const key = toDateKey(date);
    const items = Array.isArray(history?.[key]?.items) ? history[key].items : [];
    if (!items.length) return false;

    const plannedCount = new Map();
    planned.forEach((ex) => {
      const name = normalizeName(ex?.name || ex?.name_es || ex?.name_en || "");
      if (!name) return;
      plannedCount.set(name, (plannedCount.get(name) || 0) + 1);
    });
    if (!plannedCount.size) return false;

    const doneCount = new Map();
    items.forEach((it) => {
      if (it?.type === "replace") return;
      const name = normalizeName(it?.name || it?.name_es || it?.name_en || "");
      if (!name) return;
      doneCount.set(name, (doneCount.get(name) || 0) + 1);
    });

    let done = 0;
    plannedCount.forEach((count, name) => {
      done += Math.min(count, doneCount.get(name) || 0);
    });
    return done >= planned.length;
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="sidebar-brand-mark">FA</div>
        <div className="sidebar-brand-copy">
          <span>Fit App</span>
          <strong>
            {activeTab === "nutrition"
              ? "Fuel and planning"
              : activeTab === "stats"
              ? "Performance lab"
              : activeTab === "history"
              ? "Training archive"
              : activeTab === "plan"
              ? "Weekly control room"
              : "Profile and setup"}
          </strong>
        </div>
      </div>
      <div className="sidebar-section">
        <div className="sidebar-tabs">
          <button
            type="button"
            className={`tab ${activeTab === "profile" ? "active" : ""}`}
            onClick={() => onChangeTab("profile")}
          >
            Perfil
          </button>
          <button
            type="button"
            className={`tab ${activeTab === "plan" ? "active" : ""}`}
            onClick={() => onChangeTab("plan")}
          >
            Plan
          </button>
          <button
            type="button"
            className={`tab ${activeTab === "history" ? "active" : ""}`}
            onClick={() => onChangeTab("history")}
          >
            Historial
          </button>
          <button
            type="button"
            className={`tab ${activeTab === "stats" ? "active" : ""}`}
            onClick={() => onChangeTab("stats")}
          >
            Stats
          </button>
          <button
            type="button"
            className={`tab ${activeTab === "nutrition" ? "active" : ""}`}
            onClick={() => onChangeTab("nutrition")}
          >
            Nutrición
          </button>
        </div>
      </div>

      <div className="sidebar-section active-profile-section">
        <span className="active-profile-label">Perfil activo</span>
        <strong className="active-profile-name">{activeProfileName}</strong>
      </div>

      <div className="sidebar-section">
        <div className="sidebar-section-head">
          <h3>{activeTab === "nutrition" ? "Estado nutricional" : "Estado actual"}</h3>
          <span className="sidebar-section-kicker">
            {activeTab === "nutrition" ? "Hoy" : "Resumen"}
          </span>
        </div>
        {activeTab === "nutrition" ? (
          <>
            <div className="sidebar-progress">
              <strong>
                Calorías: {Math.round(nutritionTotals.calories)} /{" "}
                {nutritionTdee ? Math.round(nutritionTdee) : "—"} kcal
              </strong>
              <span>Consumidas: {Math.round(nutritionTotals.calories)} kcal</span>
              <span>Restantes: {caloriesRemaining} kcal</span>
              <div className="xp-bar">
                <div className="xp-bar-fill" style={{ width: `${calorieProgress * 100}%` }} />
              </div>
            </div>
            <div className="sidebar-kv">
              <div>
                <span>Estado</span>
                <strong>{nutritionStatusLabel}</strong>
              </div>
              <div>
                <span>Balance</span>
                <strong>{nutritionBalanceLabel}</strong>
              </div>
              <div>
                <span>Comidas hoy</span>
                <strong>{nutritionTotals.mealsCount}</strong>
              </div>
              <div>
                <span>Pasos (stats)</span>
                <strong>{Math.round(Number(metricForNutrition?.steps || 0))}</strong>
              </div>
              <div>
                <span>Proteína</span>
                <strong>{Math.round(nutritionTotals.protein)} g</strong>
              </div>
              <div>
                <span>Carbs</span>
                <strong>{Math.round(nutritionTotals.carbs)} g</strong>
              </div>
              <div>
                <span>Grasas</span>
                <strong>{Math.round(nutritionTotals.fat)} g</strong>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="sidebar-progress">
              <strong>Nivel {level}</strong>
              <span>
                XP nivel: {xpInLevel} / {levelXpRequired}
              </span>
              <span>XP total: {earnedXp}</span>
              <div className="xp-bar">
                <div className="xp-bar-fill" style={{ width: `${progress * 100}%` }} />
              </div>
            </div>
            <div className="sidebar-kv">
              <div>
                <span>Días entrenados</span>
                <strong>{trainedDaysTotal || 0}</strong>
              </div>
              <div>
                <span>Este mes</span>
                <strong>{trainedDaysThisMonth || 0}</strong>
              </div>
              <div>
                <span>Racha actual</span>
                <strong>{trainingStreak || 0}</strong>
              </div>
              <div>
                <span>Ejercicios</span>
                <strong>
                  {completedCount} / {totalExercises}
                </strong>
              </div>
            </div>
          </>
        )}
        {plan && activeTab !== "nutrition" && (
          <div className="sidebar-actions">
            <button type="button" className="tiny" onClick={onAddExtraDay}>
              Entreno adicional
            </button>
          </div>
        )}
      </div>

      {activeTab === "profile" && (
        <>
          <div className="sidebar-section">
            <div className="sidebar-section-head">
              <h3>Tu perfil</h3>
              <span className="sidebar-section-kicker">Base</span>
            </div>
            <div className="sidebar-kv">
              <div>
                <span>Nombre</span>
                <strong>{profile?.nombre || "—"}</strong>
              </div>
              <div>
                <span>Edad</span>
                <strong>{profile?.edad || "—"}</strong>
              </div>
              <div>
                <span>Peso</span>
                <strong>{profile?.peso ? profile.peso + " kg" : "—"}</strong>
              </div>
              <div>
                <span>Altura</span>
                <strong>{profile?.altura ? profile.altura + " cm" : "—"}</strong>
              </div>
            </div>
          </div>

          <div className="sidebar-section">
            <div className="sidebar-section-head">
              <h3>Últimas métricas</h3>
              <span className="sidebar-section-kicker">Reciente</span>
            </div>
            {metricsLog && metricsLog.length > 0 ? (
              <div className="sidebar-metrics">
                <div>
                  <span>Peso</span>
                  <strong>
                    {lastMetric?.weight || "—"} kg {trend("weight")}
                  </strong>
                </div>
                <div>
                  <span>Cintura</span>
                  <strong>
                    {lastMetric?.waist || "—"} cm {trend("waist")}
                  </strong>
                </div>
                <div>
                  <span>% Grasa</span>
                  <strong>
                    {lastMetric?.bodyFat || lastMetric?.bodyFatNavy || "—"} % {trend("bodyFat")}
                  </strong>
                </div>
                <div>
                  <span>FC reposo</span>
                  <strong>
                    {lastMetric?.restHr || "—"} bpm {trend("restHr")}
                  </strong>
                </div>
              </div>
            ) : (
              <p className="note">Sin métricas aún.</p>
            )}
          </div>

          <div className="sidebar-section">
            <div className="sidebar-section-head">
              <h3>Progreso</h3>
              <span className="sidebar-section-kicker">Plan</span>
            </div>
            <div className="sidebar-kv">
              <div>
                <span>Ejercicios</span>
                <strong>
                  {completedCount} / {totalExercises}
                </strong>
              </div>
              <div>
                <span>Días plan</span>
                <strong>{plan?.days?.length || 0}</strong>
              </div>
            </div>
          </div>
        </>
      )}

      {activeTab === "plan" && (
        <div className="sidebar-section">
          <div className="sidebar-section-head">
            <h3>Plan</h3>
            <span className="sidebar-section-kicker">Acciones</span>
          </div>
          <div className="sidebar-actions">
            <button type="button" className="tiny" onClick={onAddExtraDay}>
              Entreno adicional
            </button>
            <button type="button" className="tiny" onClick={onRegeneratePlan} disabled={loadingPlan}>
              {loadingPlan ? "Regenerando..." : "Regenerar plan"}
            </button>
            <button type="button" className="tiny danger" onClick={onResetPlan}>
              Reiniciar plan
            </button>
          </div>
          {planActionStatus && <p className="note">{planActionStatus}</p>}
          <details className="sidebar-collapsible" open>
            <summary>Seleccionar día</summary>
            <ul className="sidebar-plan">
              {plan?.days?.map((d, index) => {
                const dayDone = isPlanDayComplete(d, index);
                return (
                <li key={d.title}>
                  <button
                    type="button"
                    className={`sidebar-plan-day-btn ${
                      Number(selectedPlanDayIndex) === index ? "active" : ""
                    } ${dayDone ? "done" : ""}`}
                    onClick={() => onGoToPlanDay && onGoToPlanDay(index)}
                  >
                    <span className="sidebar-day-kicker">
                      {lang === "en" ? `Day ${index + 1}` : `Día ${index + 1}`}
                    </span>
                    <div className="sidebar-day-topline">
                      <strong>{d.title}</strong>
                      <span className={`sidebar-day-type ${getPlanDayType(index)}`}>
                        {getPlanDayTypeLabel(index)}
                      </span>
                    </div>
                    <div className="sidebar-day-meta-row">
                      <span>{getPlanDateLabel(index)}</span>
                      <span>{d.exercises.length} ejercicios</span>
                    </div>
                    <span className="sidebar-day-focus">
                      {buildDayFocusLabel(d, lang, d.focus || "")}
                    </span>
                    {dayDone && <span className="sidebar-day-done">Completado ✓</span>}
                  </button>
                </li>
              )}) || <li>Sin plan</li>}
            </ul>
          </details>
        </div>
      )}

      {activeTab === "stats" && (
        <div className="sidebar-section">
          <div className="sidebar-section-head">
            <h3>Estadísticas</h3>
            <span className="sidebar-section-kicker">Salud</span>
          </div>
          <div className="sidebar-metric-cards">
            <div className={`sidebar-metric-card ${healthClass(bmiStatus)}`}>
              <span>IMC</span>
              <strong>{bmiValue ? bmiValue.toFixed(1) : "—"}</strong>
              <em className={`trend ${trendClass("bmi", true)}`}>{trend("bmi")}</em>
            </div>
            <div className={`sidebar-metric-card ${healthClass(whtrStatus)}`}>
              <span>WHtR</span>
              <strong>{whtrValue ? whtrValue.toFixed(2) : "—"}</strong>
              <em className={`trend ${trendClass("whtr", true)}`}>{trend("whtr")}</em>
            </div>
            <div className={`sidebar-metric-card ${healthClass(bfStatus)}`}>
              <span>% Grasa</span>
              <strong>{bodyFatValue ? `${bodyFatValue.toFixed(1)}%` : "—"}</strong>
              <em className={`trend ${trendClass("bodyFat", true)}`}>{trend("bodyFat")}</em>
            </div>
            <div className={`sidebar-metric-card ${healthClass(hrStatus)}`}>
              <span>FC reposo</span>
              <strong>{restHrValue || "—"} bpm</strong>
              <em className={`trend ${trendClass("restHr", true)}`}>{trend("restHr")}</em>
            </div>
          </div>
          <p className="note">
            Verde: bien, ámbar: revisar, rojo: prioridad de mejora.
          </p>
        </div>
      )}

      {activeTab === "profile" && (
        <>
      <details className="sidebar-section sidebar-collapsible">
        <summary>Cuenta</summary>
        {!authEnabled && (
          <p className="note">
            Configura Supabase en .env para activar login.
          </p>
        )}
        {authEnabled && !authReady && (
          <div className="auth-box">
            <span className="note">Comprobando sesión…</span>
          </div>
        )}
        {authEnabled && authReady && !authUser && (
          <div className="auth-box">
            <input
              name="email"
              placeholder="Email"
              value={authForm.email}
              onChange={onAuthChange}
            />
            <input
              name="password"
              type="password"
              placeholder="Contraseña"
              value={authForm.password}
              onChange={onAuthChange}
            />
            {authError && <span className="note">{authError}</span>}
            <div className="sidebar-actions">
              <button type="button" className="tiny" onClick={onSignIn} disabled={authLoading}>
                Entrar
              </button>
              <button type="button" className="tiny" onClick={onSignUp} disabled={authLoading}>
                Crear cuenta
              </button>
              <button type="button" className="tiny" onClick={onMagicLink} disabled={authLoading}>
                Enviar link
              </button>
            </div>
          </div>
        )}
        {authEnabled && authUser && (
          <div className="auth-box">
            <span className="note">Conectado: {authUser.email}</span>
            <span className="note">Estado sync: {syncIndicator || "—"}</span>
            <div className="sidebar-actions">
              <button type="button" className="tiny" onClick={onSyncUp} disabled={!canSyncUp}>
                Subir
              </button>
              <button type="button" className="tiny" onClick={onSyncDown}>
                Descargar
              </button>
              <button type="button" className="tiny danger" onClick={onSignOut}>
                Salir
              </button>
            </div>
            {syncStatus && <span className="note">{syncStatus}</span>}
            {syncRestoreSummary && <span className="note">{syncRestoreSummary}</span>}
          </div>
        )}
      </details>

      <details className="sidebar-section sidebar-collapsible">
        <summary>Opciones de perfil</summary>
        <div className="profile-list">
          {profiles.map((p) => (
            <button
              key={p.id}
              type="button"
              className={`profile-item ${p.id === activeProfileId ? "active" : ""}`}
              onClick={() => onSwitchProfile(p.id)}
            >
              {p.name}
            </button>
          ))}
        </div>
        <div className="profile-new">
          <input
            placeholder="Nuevo perfil"
            value={newProfileName}
            onChange={(e) => onChangeNewProfileName(e.target.value)}
          />
          <button type="button" className="tiny" onClick={onAddProfile}>
            Crear
          </button>
        </div>
        <div className="profile-actions">
          <input
            placeholder="Renombrar perfil"
            value={renameProfileName}
            onChange={(e) => onChangeRenameProfileName(e.target.value)}
          />
          <div className="profile-action-buttons">
            <button type="button" className="tiny" onClick={onRenameProfile}>
              Renombrar
            </button>
            <button type="button" className="tiny danger" onClick={onDeleteProfile}>
              Eliminar
            </button>
          </div>
        </div>
      </details>

      {(dbStatus || gifStatus) && (
        <details className="sidebar-section sidebar-collapsible">
          <summary>Datos offline</summary>
          {dbStatus && (
            <div className="sidebar-offline-block">
              <LocalDbStatus status={dbStatus} />
              <div className="sidebar-actions">
                <button
                  type="button"
                  className="tiny"
                  onClick={onStartDbDownload}
                  disabled={!canStartDownload}
                >
                  {downloadLabel}
                </button>
              </div>
            </div>
          )}
          {gifStatus && (
            <div className="sidebar-offline-block">
              <GifDbStatus status={gifStatus} />
              <div className="sidebar-actions">
                <button
                  type="button"
                  className="tiny"
                  onClick={onStartGifDownload}
                  disabled={!canStartGifDownload}
                >
                  {gifDownloadLabel}
                </button>
              </div>
            </div>
          )}
        </details>
      )}

      <div className="sidebar-section">
        <h3>Configuración</h3>
        <div className="sidebar-actions">
          <select
            className="lang-select"
            value={lang}
            onChange={(e) => onChangeLang(e.target.value)}
          >
            <option value="es">Español</option>
            <option value="en">English</option>
          </select>
          <button type="button" className="tiny" onClick={onToggleContrast}>
            Contraste alto: {highContrast ? "On" : "Off"}
          </button>
          <button
            type="button"
            className="tiny"
            onClick={() => onToggleTheme?.()}
            disabled={typeof onToggleTheme !== "function"}
          >
            Tema: {themeMode === "dark" ? "Oscuro" : "Claro"}
          </button>
        </div>
      </div>

      <details className="sidebar-section sidebar-collapsible">
        <summary>Respaldo</summary>
        <div className="sidebar-actions">
          <button type="button" className="tiny" onClick={onExport}>
            Exportar
          </button>
          <button type="button" className="tiny" onClick={onRestoreBackup}>
            Restaurar último
          </button>
          <button type="button" className="tiny" onClick={onRestorePrevBackup}>
            Restaurar anterior
          </button>
          <button
            type="button"
            className="tiny"
            onClick={() => document.getElementById("import-backup")?.click()}
          >
            Importar
          </button>
          <input
            id="import-backup"
            type="file"
            accept="application/json"
            onChange={onImport}
            style={{ display: "none" }}
          />
        </div>
        <div className="sidebar-kv">
          <div>
            <span>Último</span>
            <strong>{backupLastLabel || "—"}</strong>
          </div>
          <div>
            <span>Anterior</span>
            <strong>{backupPrevLabel || "—"}</strong>
          </div>
        </div>
      </details>
        </>
      )}
    </aside>
  );
}
