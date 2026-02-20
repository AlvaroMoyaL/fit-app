import LocalDbStatus from "./LocalDbStatus";
import GifDbStatus from "./GifDbStatus";

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
  profile,
  level,
  earnedXp,
  totalPossibleXp,
  plan,
  completedCount,
  totalExercises,
  onContinuePlan,
  onResetPlan,
  dbStatus,
  onStartDbDownload,
  gifStatus,
  onStartGifDownload,
  lang,
  onChangeLang,
  metricsLog,
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
  onSyncUp,
  onSyncDown,
  canSyncUp,
  authEnabled,
  highContrast,
  onToggleContrast,
}) {
  const progress = totalPossibleXp
    ? Math.min(1, earnedXp / totalPossibleXp)
    : 0;

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

  return (
    <aside className="sidebar">
      <div className="sidebar-section">
        <h3>Cuenta</h3>
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
          </div>
        )}
      </div>
      {dbStatus && (
        <div className="sidebar-section">
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
        <div className="sidebar-section">
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
      <div className="sidebar-section">
        <h3>Idioma</h3>
        <select
          className="lang-select"
          value={lang}
          onChange={(e) => onChangeLang(e.target.value)}
        >
          <option value="es">Español</option>
          <option value="en">English</option>
        </select>
      </div>
      <div className="sidebar-section">
        <h3>Accesibilidad</h3>
        <button type="button" className="tiny" onClick={onToggleContrast}>
          Contraste alto: {highContrast ? "On" : "Off"}
        </button>
      </div>
      <div className="sidebar-section">
        <h3>Perfiles</h3>
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
        </div>
      </div>

      {activeTab === "profile" && (
        <>
          <div className="sidebar-section">
            <h3>Tu perfil</h3>
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
            <h3>Últimas métricas</h3>
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
            <h3>Progreso</h3>
            <div className="sidebar-progress">
              <strong>Nivel {level}</strong>
              <span>
                XP: {earnedXp} / {totalPossibleXp}
              </span>
              <div className="xp-bar">
                <div className="xp-bar-fill" style={{ width: `${progress * 100}%` }} />
              </div>
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
          <h3>Plan</h3>
          <div className="sidebar-actions">
            <button type="button" className="tiny" onClick={onContinuePlan}>
              Continuar plan
            </button>
            <button type="button" className="tiny danger" onClick={onResetPlan}>
              Reiniciar plan
            </button>
          </div>
          <ul className="sidebar-plan">
            {plan?.days?.map((d) => (
              <li key={d.title}>
                <strong>{d.title}</strong>
                <span>{d.exercises.length} ejercicios</span>
              </li>
            )) || <li>Sin plan</li>}
          </ul>
        </div>
      )}

      <div className="sidebar-section">
        <h3>Respaldo</h3>
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
      </div>
    </aside>
  );
}
