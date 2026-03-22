export default function AccountPanel({
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
  compact = false,
  title = "Cuenta y sincronizacion",
  description = "Accede aqui y gestiona la sincronizacion del perfil activo.",
}) {
  const Wrapper = compact ? "div" : "section";
  const authStateLabel = !authEnabled
    ? "Login desactivado"
    : !authReady
    ? "Comprobando"
    : authUser
    ? "Conectado"
    : "Sin sesion";
  const rootClassName = [
    "account-panel",
    compact ? "account-panel-compact" : "rest-panel",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <Wrapper className={rootClassName}>
      {!compact && (
        <div className="account-panel-head">
          <div className="account-panel-copy">
            <h3>{title}</h3>
            {description ? <p className="note">{description}</p> : null}
          </div>
          <span className={`account-panel-status ${authUser ? "is-connected" : "is-idle"}`}>
            {authStateLabel}
          </span>
        </div>
      )}

      {!authEnabled && (
        <p className="note">
          Configura Supabase en <code>.env</code> para activar login.
        </p>
      )}

      {authEnabled && !authReady && (
        <div className="auth-box">
          <span className="note">Comprobando sesion...</span>
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
            placeholder="Contrasena"
            value={authForm.password}
            onChange={onAuthChange}
          />
          {authError ? <span className="note">{authError}</span> : null}
          <div className="sidebar-actions">
            <button
              type="button"
              className={compact ? "tiny" : "tiny primary-btn"}
              onClick={onSignIn}
              disabled={authLoading}
            >
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
          <span className="note">Estado sync: {syncIndicator || "-"}</span>
          <div className="sidebar-actions">
            <button
              type="button"
              className={compact ? "tiny" : "tiny primary-btn"}
              onClick={onSyncUp}
              disabled={!canSyncUp}
            >
              Subir
            </button>
            <button type="button" className="tiny" onClick={onSyncDown}>
              Descargar
            </button>
            <button type="button" className="tiny danger" onClick={onSignOut}>
              Salir
            </button>
          </div>
          {syncStatus ? <span className="note">{syncStatus}</span> : null}
          {syncRestoreSummary ? <span className="note">{syncRestoreSummary}</span> : null}
        </div>
      )}
    </Wrapper>
  );
}
