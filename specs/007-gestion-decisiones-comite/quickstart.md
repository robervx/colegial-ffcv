# Quickstart: validar Gestión y seguimiento de decisiones del comité

Guía de validación manual end-to-end una vez implementadas las historias — no sustituye los tests unitarios de `lib/*.test.js` (`data-model.md`, `contracts/decisiones-repo.md`), es la comprobación en navegador exigida por el flujo de trabajo del proyecto (`CLAUDE.md`: "verificar en navegador antes de decir que algo funciona").

## Prerrequisitos

- `webapp/.env.local` con credenciales reales de Supabase (mismas que ya usan `anotaciones`/`designaciones`).
- Migración `0005_decisiones_comite.sql` aplicada contra el proyecto Supabase real (mismo paso manual ya usado para `0001`-`0004`).
- `npm run dev` en `webapp/` (comprobar antes si ya hay un proceso corriendo, `ps aux | grep next` — `CLAUDE.md`).

## US1 — Registrar una decisión con snapshot

1. Abrir la nueva página de decisiones.
2. Registrar una decisión de tipo "acción de motivación" dirigida a un árbitro concreto marcado como "en seguimiento", con una estimación de impacto en texto libre.
3. **Esperado**: la decisión aparece guardada; al abrir su detalle, se ve un snapshot con al menos estado de forma, disponibilidad vigente y nº de informes, cada campo con su etiqueta real/sintético visible.
4. Repetir dirigiendo la decisión a una categoría completa y a un grupo dentro de una categoría (p. ej. "irregulares de Segona FFCV").
5. **Esperado**: en ambos casos, la lista de árbitros afectados queda fija en ese momento (verificable: si después cambia el estado de forma de alguno, la lista de la decisión no cambia, solo su snapshot sigue siendo el original).
6. Recargar la página (F5) y volver a abrir la misma decisión.
7. **Esperado**: sigue ahí con los mismos datos (persistencia real, Principio VII) — no es estado local de React.

## US2 — Revisar impacto

1. Sobre la decisión de US1, forzar (en entorno de prueba) que su `creado_en` sea de hace más de 3 meses, o usar el botón "revisar antes de plazo" si la UI lo ofrece (Historia 2, Acceptance Scenario 3).
2. Pulsar "revisar impacto".
3. **Esperado**: aparece, métrica a métrica, el valor inicial junto al valor actual y si mejoró/empeoró/sin cambio — nunca un único número de "éxito". El texto dice explícitamente que es correlación, no causalidad confirmada.
4. Repetir la revisión una segunda vez sobre la misma decisión.
5. **Esperado**: se guarda como una revisión nueva, sin sustituir ni perder la anterior.

## US3 — Campaña de ascenso

1. Crear una campaña de ascenso desde una categoría de origen, seleccionar 3-4 candidatos.
2. Registrar nota de prueba teórica y física de cada candidato (dejar uno sin completar una prueba).
3. **Esperado**: la clasificación se muestra ordenada por nota, con el candidato incompleto excluido y señalado como tal, no oculto silenciosamente.
4. Fijar el número de plazas disponibles (menor que el nº de candidatos clasificados).
5. **Esperado**: se ve quién quedaría dentro del corte, pero nadie aparece todavía como "ascendido" — es una previsualización.
6. Confirmar el corte explícitamente.
7. **Esperado**: solo entonces los candidatos dentro de las plazas quedan marcados como ascendidos; el resultado se muestra etiquetado como basado en pruebas sintéticas (mientras `arbitros-200.json` no tenga notas reales).
8. Intentar modificar la campaña ya confirmada (añadir un candidato, cambiar una nota).
9. **Esperado**: rechazado — una campaña con corte confirmado es inmutable (`contracts/decisiones-repo.md`).

## US4 — Bitácora

1. Con varias decisiones de distintos tipos y fechas ya registradas, abrir el listado general.
2. Filtrar por tipo.
3. **Esperado**: el listado se reduce correctamente.
4. **Esperado**: cualquier decisión con el plazo cumplido y sin revisión aparece señalada como pendiente, sin más de 3 clics desde la bitácora hasta verlo (SC-003).

## Verificación de consola

En cada paso: sin errores en la consola del navegador, `npm run lint` y `npm test` (Vitest) en verde antes de dar por buena la historia — mismo criterio que el resto del proyecto.
