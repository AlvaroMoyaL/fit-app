# Project Context: `fit-app`

## Overview
- Stack: React 19 + Vite 7.
- Main app entry: `src/main.jsx`.
- Main orchestration: `src/App.jsx`.
- Goal: fitness planner with profiles, weekly plans, progress tracking, metrics, offline support, and optional cloud sync.

## Core Functional Areas
- Profile + plan generation:
  - `src/components/ProfileForm.jsx`
  - `src/utils/plan.js`
- Plan execution and exercise details:
  - `src/components/Plan.jsx`
  - `src/components/DayCard.jsx`
  - `src/components/ExerciseDrawer.jsx`
  - `src/components/SessionRunner.jsx`
- Progress + analytics:
  - `src/components/HistoryWeek.jsx`
  - `src/components/WeeklyCharts.jsx`
  - `src/components/MetricsLogForm.jsx`
  - `src/components/MetricsCharts.jsx`
  - `src/components/MuscleSummary.jsx`
- Sidebar/account/sync/import-export:
  - `src/components/Sidebar.jsx`

## Data and Persistence
- `localStorage` (per profile):
  - profile, plan, progress, progressDetails, history, metrics log, language.
- IndexedDB (`src/utils/idb.js`):
  - Stores: `exercises`, `gifs`, `meta`.
  - Used for offline exercise DB and gif cache.
- Cloud sync (`src/utils/cloudSync.js`):
  - Upload/download serialized local profile payloads to Supabase table (`fit_cloud`).

## External Integrations
- Exercise API (dev proxy):
  - Config in `vite.config.js` (`/edb` -> ExerciseDB/RapidAPI).
- Supabase:
  - Auth + cloud sync + public gif storage URLs.
  - Client: `src/utils/supabaseClient.js`.

## Environment Variables
- `VITE_RAPIDAPI_KEY`
- `VITE_RAPIDAPI_HOST`
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- Optional server-side script vars (`scripts/upload_gifs.js`):
  - `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE`, `GIF_DIR`, `SUPABASE_GIF_BUCKET`
- Secret management policy:
  - `.env` is local-only and is **not tracked** in git.
  - `.env.example` is the committed template for required variables.

## Offline / PWA
- Service worker: `public/sw.js`.
- Manifest/icons: `public/manifest.webmanifest`, `public/icon-192.svg`, `public/icon-512.svg`.

## Data Sources
- Bundled dataset: `public/data/exercises.json`.
- Local fallback subset: `src/data/exercises.local.js`.

## NPM Scripts
- `npm run dev`
- `npm run build`
- `npm run lint`
- `npm run preview`

## Current Technical Notes
- Build passes (`npm run build`).
- Lint has no errors; 4 hook dependency warnings in `src/App.jsx`.
- `.env` is intentionally untracked; configure real secrets locally and/or in hosting environment variables.
- Sync now includes a basic conflict guard to avoid overwriting cloud data with lower local progress.
- Backup UI supports restoring both latest and previous automatic backup.
- Date grouping in history/weekly charts uses local date keys (not UTC ISO slicing).
- Se agregó trazabilidad visual en miniaturas para depuración: `ID ex`, `ID gif` y `fuente` (`exact`, `exact-local`, `fallback`).
- Carga de GIF prioriza coincidencia exacta por ID de ejercicio; solo usa fallback si no existe el GIF exacto.
- Ajuste de mapeo local: `l019` (Hip Stretch) ahora apunta a `1419` (bodyweight mobility) en lugar de `2202` (roller).
- Generación de plan ajustada para estructura fija por día en templates principales: `3` fuerza + `3` core (6 total), con foco muscular rotativo.
- `HistoryWeek` migrado a formulario visual para registro de ejercicios anteriores (sin prompts), con lista completa de ejercicios por día, guardado por ejercicio, `Guardar todo`, selección por checkbox y botón `Ayuda` que abre drawer.
- Botón de guardado por ejercicio en registro histórico cambia a estado `Guardado` y queda deshabilitado tras guardar.
- Sidebar reestructurado por prioridad de uso: navegación arriba, perfil activo + opciones de perfil colapsables, estado actual, contenido por pestaña, y secciones técnicas colapsables.
- En `Sidebar > Plan`, los días ahora son navegables: seleccionan día en la vista principal y hacen scroll al bloque de plan.
- Se agregó acción `Entreno adicional` en sidebar para crear un nuevo día de entrenamiento y navegar automáticamente a ese día.
- Se añadió indicador visual de día seleccionado en el listado de días del sidebar con relleno completo.
- Vista `Stats` reorganizada por tipo de estadística en un bloque unificado (`Recuperación y sueño`, `Cardio y carga`, `Composición corporal`, `Metabolismo y tendencia`), eliminando separación previa confusa.
- `Stats` ahora incluye las mismas métricas calculadas clave que aparecían en `Plan` (IMC categoría, TMB, TDEE, WHR, masa magra, FFMI), además de peso/cintura visibles.
- Se implementó `StatsMetricDrawer` (`src/components/StatsMetricDrawer.jsx`): al hacer click en tarjetas de stats abre drawer con serie temporal, comparación opcional con otra métrica y tabla de valores por fecha.
- El cruce de métricas en el drawer soporta modo `Auto` con recomendación basada en datos reales (solapamiento temporal + correlación), manteniendo override manual.
- Corregido bug en registro de métricas: campos vacíos ya no se convierten al mínimo por `clamp` (ej. peso 20), y guardado por fecha ahora hace merge sin pisar datos previos cuando un campo llega vacío.
- `Registrar medidas` ahora incluye `Cuello (cm)` por fecha; los cálculos derivados usan `entry.neck` (si existe) con fallback al cuello del perfil.
- Mejoras visuales de selectores/tabs:
  - navegación móvil corregida a 5 columnas reales para evitar espacios desiguales,
  - botones/tabs con ancho/alto uniforme y texto estable (sin solaparse ni cambiar tamaño entre pestañas activas/inactivas).
- Vista `Plan` simplificada: se eliminaron métricas calculadas y selector semanal de días dentro del contenido principal para reducir ruido.
- `Sidebar > Plan` ahora concentra navegación diaria: cada botón muestra día, fecha (`dd/mm`), tipo (`Entreno`/`Descanso`/`Extra`) y cantidad de ejercicios.
- Cabecera de `Plan` mejor alineada:
  - título más destacado,
  - subtítulo con nombre del perfil activo,
  - chips informativos con `XP estimado de la semana` y `XP que se lleva en la semana`.
- Barra de XP en `Plan` corregida para reflejar progreso del nivel actual (igual criterio que sidebar) y con tamaño visual ajustado.
- Cambio mayor de progresión de niveles:
  - se reemplazó umbral fijo de `300 XP` por curva progresiva centralizada en `src/utils/levelProgress.js`,
  - tramos actuales: 800, 1000, 1200, 1500, y luego +300 por nivel,
  - `App`, `Sidebar` y `Plan` usan la misma utilidad para nivel, XP en nivel y porcentaje de barra.
- Fix de sincronización cloud/local en `applyCloudPayload` (`src/utils/cloudSync.js`):
  - si el payload no trae `profiles`, ahora reconstruye la lista desde `dataByProfile`,
  - asegura `activeProfileId` válido tras restaurar,
  - evita el caso de "Datos restaurados ✓" sin perfiles visibles en el listado.
- Fix adicional en descarga/restauración cloud (`src/utils/cloudSync.js`):
  - `downloadCloud` ahora filtra por `user_id` del usuario autenticado para evitar restaurar payload ambiguo/no correspondiente,
  - restauración de métricas soporta tanto `metricsLog` como fallback `metrics` para compatibilidad de payloads antiguos.
- UX de sincronización reforzada en sidebar:
  - tras restaurar desde nube se guarda un resumen persistente (`fit_last_sync_restore_summary`) con `perfiles`, `métricas` y hora de la última descarga,
  - el resumen se muestra en `Cuenta` bajo los botones `Subir/Descargar` para validar rápidamente qué se restauró.
- Foco muscular por día mejorado:
  - se añadió `src/utils/dayFocus.js` para derivar el foco real desde ejercicios del día (bodyPart/target/category),
  - se muestra en `DayCard` y en tarjetas de `Sidebar > Plan`,
  - se corrigió sesgo de clasificación que mostraba `Pierna` en todos los días.
- Generación de plan (`goal`) ajustada para rotación muscular real:
  - el blueprint diario ahora restringe explícitamente fuerza a grupos del ciclo (`pecho/espalda`, `pierna`, `hombros/brazos`) + `core`,
  - evita días etiquetados con un foco pero construidos con otro grupo muscular dominante.
- Nueva acción `Regenerar plan` (sin borrar progreso histórico):
  - recalcula solo el plan actual del perfil activo,
  - mantiene historial, métricas y cuenta,
  - conserva el día seleccionado cuando es posible.
- UX de regeneración reforzada:
  - estado visible `Regenerando...` / `Plan regenerado ✓`,
  - fallback automático a `forceLocal: true` si falla la regeneración estándar,
  - mensaje de error real visible para diagnóstico.
- Fix de cuota `localStorage` en guardado de plan:
  - `stripGifs` ahora persiste el plan sin `pool` pesado (`pool: []`),
  - evita error `Setting the value ... exceeded the quota` al regenerar.
- Versionado visible en cabecera de `Plan`:
  - bajo `Tu plan inicial` se muestra `Version X.Y.Z`,
  - versión inyectada desde `package.json` vía `vite.config.js` (`import.meta.env.VITE_APP_VERSION`).
- Identificación por commit para validar despliegues:
  - se agregó `import.meta.env.VITE_APP_BUILD` (hash corto de commit) en `vite.config.js`,
  - cabecera de `Plan` ahora muestra `Version X.Y.Z · build abc1234`.
- Versión actual de app definida en `package.json`: `0.9.1`.
- Consistencia de versión local/prod:
  - `vite.config.js` ahora resuelve `VITE_APP_VERSION` con fallback a `package.json` (evita mostrar `0.0.0` en local cuando no viene `npm_package_version`).
- Service Worker en local:
  - registro de SW limitado a producción (`import.meta.env.PROD`) para evitar cache viejo en `localhost`.
- Coherencia de métricas en sidebar:
  - `Racha actual` ahora toma racha consecutiva desde último día entrenado (no cae a `0` solo por no entrenar hoy),
  - `Ejercicios X/Y` cruza historial vs plan por nombre normalizado para reflejar mejor ejercicios ya registrados.
- Selector de equipo del día refinado:
  - se removió el selector manual de “equipo del día” y se consolidó en `¿Tienes equipo?` + checklist.
  - `Modo silencioso` se movió al encabezado del día para mejorar jerarquía visual.
- Lógica de equipo/core actualizada:
  - fuerza prioriza equipo seleccionado;
  - core mantiene bloque base en `bodyweight` (3/3 cuando hay pool), usando otras opciones solo como fallback.
  - regeneración al cambiar equipo/modo/quiet usa pool global + blueprint del día para mantener split (`3 fuerza + 3 core`) y evitar sesgos por usar solo ejercicios del día.
- Alternativas de core con equipo:
  - en `DayCard` se muestra bloque “Alternativas de core con equipo (opcional)” con acciones `Ver` y `Agregar`.
  - `Ver` abre drawer; `Agregar` inserta el ejercicio al día si no existe.
  - se corrigió carga de gif para vista previa de alternativas (incluye casos fuera del plan actual).
- Filtros de equipo normalizados (sin duplicados visuales):
  - deduplicación por clave canónica (`barbell`, `dumbbell`, etc.) para evitar repeticiones tipo `barra`/`banda`.
  - recuperación de opción `Bola medicinal` en checklist y normalización de `medicine ball` en motor.
- Dev server:
  - se mantiene decisión previa de integración: `port 5175` y `strictPort: true` en `vite.config.js`.

## Conventions for Future Changes
- Do not hardcode secrets.
- Keep profile-specific state keys consistent with `profileKeys(...)` in `src/App.jsx`.
- Prefer updating plan state and persisted plan together.
- Any local data mutation that should sync to cloud should also update local sync timestamp.

## Decisiones Tomadas
- Se usa `PROJECT_CONTEXT.md` como referencia principal de contexto entre sesiones.
- `src/App.jsx` sigue siendo el orquestador principal por ahora (sin refactor por módulos todavía).
- El estado de plan/progreso continúa guardándose por perfil en `localStorage` con claves derivadas por `profileKeys(...)`.
- IndexedDB se mantiene como cache offline para ejercicios y gifs.
- Sync cloud se mantiene opcional y activado solo cuando Supabase está configurado.
- Se corrigió la apertura de sesión para usar `SessionRunner` (en vez de abrir el drawer).
- Se habilitó el modal de métricas desde cualquier pestaña donde se dispare `showInfo`.
- Se ajustó la trazabilidad de cambios locales para mejorar autosync/backup.
- Se añadió protección de sincronización: antes de subir, compara progreso local vs nube y pide confirmación si la nube parece tener más avance.
- Se evitó marcar cambios locales falsos durante hidratación de perfil para no alterar prioridad de sync.
- Se añadió recuperación directa desde UI con dos opciones: `Restaurar último` y `Restaurar anterior`.
- Se añadió acción `Entreno libre hoy` cuando el día actual está marcado como descanso (sesión temporal sin modificar el plan base).
- Se corrigió el desfase de día por zona horaria en vistas de historial y resumen semanal.
- Se añadió diagnóstico visible en miniaturas para validar mapeo ejercicio↔gif durante pruebas.
- Se reforzó la resolución de gifs para preferir `exact` antes de `fallback`.
- Se corrigió el caso reportado de `l019` para mejorar coherencia del gif en local fallback.
- Se consolidó el registro de entrenamientos pasados en una UX consistente con el registro diario (campos por serie/tiempo y acceso al drawer de ayuda).
- Se priorizó la navegación operativa del sidebar (uso diario primero; cuenta/datos offline/respaldo como colapsables).

## Pendientes Priorizados
1. Refactor de `src/App.jsx` (extraer lógica a hooks/servicios por dominio: profiles, plan, sync, metrics).
2. Resolver warnings de `react-hooks/exhaustive-deps` en `src/App.jsx` sin introducir loops ni side effects indeseados.
3. Agregar tests mínimos de flujos críticos:
   - generar plan,
   - marcar progreso,
   - import/export,
   - sync nube↔local.
4. Revisar UX de móvil para menú/plan/sesión en pantallas pequeñas.
5. Documentar esquema esperado de tabla `fit_cloud` y bucket de gifs en Supabase.
