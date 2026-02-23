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
