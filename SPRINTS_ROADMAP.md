# Roadmap de Sprints: `fit-app`

## Supuestos
- Cadencia sugerida: **1 semana por sprint**.
- Equipo pequeño (1-2 personas), priorizando estabilidad y velocidad.
- Este roadmap parte desde Sprint 0 y llega a una v1 sólida.

## Sprint 0 (Fundación)
- Duración: 1 semana
- Objetivo: alinear dirección técnica y contexto compartido.
- Tareas:
  - Consolidar contexto técnico del proyecto.
  - Definir criterios de calidad (`build`, `lint`, tests mínimos).
  - Crear backlog inicial priorizado.
  - Acordar reglas de cambios (sync, persistencia, secrets).
- DoD:
  - Documento de contexto actualizado.
  - Backlog priorizado disponible.
  - Criterios de aceptación de sprint definidos.

## Sprint 1 (Estabilización)
- Duración: 1 semana
- Objetivo: corregir fallos funcionales críticos y dejar base estable.
- Tareas:
  - Corregir flujo de sesión guiada.
  - Corregir apertura de modal de métricas desde pestaña Plan.
  - Ajustar sync local/cloud para reflejar cambios clave.
  - Limpiar errores de lint (mantener warnings controlados).
- DoD:
  - `npm run build` OK.
  - `npm run lint` sin errores.
  - Flujos críticos funcionando en QA manual.

## Sprint 2 (Refactor App.jsx Fase 1)
- Duración: 1 semana
- Objetivo: reducir complejidad del orquestador principal.
- Tareas:
  - Extraer `useProfiles`.
  - Extraer `useProgress` (completed, details, history, metrics log).
  - Extraer utilidades de persistencia por perfil.
- DoD:
  - `src/App.jsx` reduce tamaño y responsabilidad.
  - Hooks reutilizables con interfaces claras.
  - Sin regresión funcional.

## Sprint 3 (Refactor App.jsx Fase 2)
- Duración: 1 semana
- Objetivo: separar dominios restantes.
- Tareas:
  - Extraer `usePlan`.
  - Extraer `useCloudSync`.
  - Extraer `useReminders` y manejo de notificaciones.
- DoD:
  - `App.jsx` queda como composición de hooks + UI.
  - Sync y reminders aislados y testeables.
  - Build/lint OK.

## Sprint 4 (Pruebas Críticas)
- Duración: 1 semana
- Objetivo: cubrir riesgos altos con tests.
- Tareas:
  - Tests: generar plan.
  - Tests: completar ejercicios y guardar progreso.
  - Tests: import/export.
  - Tests: sync básico cloud/local.
- DoD:
  - Suite de tests automatizados para flujos críticos.
  - Cobertura mínima acordada (ej. rutas críticas).
  - Pipeline local reproducible.

## Sprint 5 (UX Móvil + Accesibilidad)
- Duración: 1 semana
- Objetivo: mejorar experiencia real en dispositivos pequeños.
- Tareas:
  - Revisar navegación móvil (sidebar/menu/plan/session).
  - Mejorar estados vacíos y mensajes de error.
  - Mejoras a11y: foco, teclado, labels, contraste.
- DoD:
  - Flujo principal usable en móvil sin bloqueos.
  - Checklist a11y básico cumplido.
  - Validación manual en breakpoints clave.

## Sprint 6 (Rendimiento y Datos)
- Duración: 1 semana
- Objetivo: optimizar carga e interacción.
- Tareas:
  - Reducir renders innecesarios.
  - Optimizar hidratación inicial de datos.
  - Revisar estrategia de gifs y cache local.
- DoD:
  - Mejoras medibles en tiempo de interacción.
  - Sin degradación funcional.
  - Build/lint/tests OK.

## Sprint 7 (Sync Robusto)
- Duración: 1 semana
- Objetivo: fortalecer recuperación y consistencia de datos.
- Tareas:
  - Definir estrategia de conflicto (local vs cloud).
  - Mejorar UX de estado de sync.
  - Reforzar backup/restore (incluyendo edge cases).
- DoD:
  - Sync confiable bajo escenarios comunes de conflicto.
  - Restauración validada manualmente.
  - Mensajería de estado clara.

## Sprint 8 (Hardening y Observabilidad)
- Duración: 1 semana
- Objetivo: preparar operación continua.
- Tareas:
  - Estandarizar manejo de errores UI.
  - Añadir logging/telemetría básica de fallos.
  - Checklist técnico de release.
- DoD:
  - Errores críticos capturados con contexto útil.
  - Checklist de release listo.
  - Riesgos principales documentados.

## Sprint 9 (Release Candidata v1)
- Duración: 1 semana
- Objetivo: cerrar versión estable de producto.
- Tareas:
  - Congelar features nuevas.
  - QA integral (regresión funcional + smoke tests).
  - Documentar operación y despliegue.
- DoD:
  - Candidate v1 aprobada por criterios de calidad.
  - Documentación de uso/operación al día.
  - Backlog post-v1 preparado.

---

## Definición de Fin de Proyecto (v1)
- Arquitectura mantenible (lógica central desacoplada de `App.jsx`).
- Flujos críticos cubiertos por pruebas.
- UX móvil estable y accesible.
- Sync cloud/local robusto y recuperable.
- Release candidata lista para operación continua.
