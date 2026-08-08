# Contrato: repositorio de decisiones

Interfaz que consumirá la UI (`VistaDecisiones` y su detalle). Ninguna función lanza excepción — todas devuelven `{ ok: true, ... }` o `{ ok: false, error }`, mismo convenio que `anotacionesRepo.js`/`designacionesRepo.js`/`disponibilidadRepo.js`. Agnóstica a la tecnología detrás (Supabase hoy, ver `data-model.md`).

## `registrarDecision({ tipo, titulo, objetivoNivel, objetivoCategoria, objetivoArbitroIds, estimacionImpacto, plazoRevisionMeses, autor, detalle }) => Promise<{ ok: true, decision } | { ok: false, error: string }>`

Persiste la decisión y, en la misma operación lógica, captura y persiste un `SnapshotArbitro` (vía `lib/snapshotArbitro.js`, research.md §3) para cada id de `objetivoArbitroIds`. Si falla la captura de algún snapshot individual, la función devuelve `{ ok: false, error }` completo — no se admite una decisión registrada con snapshots parciales (rompería la comparación de FR-005 para los árbitros sin snapshot).

`objetivoArbitroIds` llega ya resuelto por el llamador (la UI resuelve "categoría"/"grupo" contra el dataset justo antes de llamar, vía `lib/resolverObjetivoDecision.js`, research.md §2) — este contrato no resuelve filtros, solo persiste la lista ya concreta. La captura de cada `SnapshotArbitro` usa internamente `lib/snapshotArbitro.js` (research.md §3).

## `obtenerDecision(decisionId) => Promise<{ ok: true, decision, snapshots: SnapshotArbitro[] } | { ok: false, error: string }>`

La decisión (última fase si es una campaña de ascenso, ver más abajo) junto con todos sus snapshots iniciales.

## `listarDecisiones({ tipo? }) => Promise<{ ok: true, decisiones: DecisionResumen[] } | { ok: false, error: string }>`

Para la bitácora (US4). Cada `DecisionResumen` incluye el campo derivado `estadoRevision: 'pendiente' | 'plazo_no_cumplido' | 'revisada'` (research.md §4) — el repositorio lo calcula, la UI no reimplementa la lógica de plazos.

## `revisarImpacto(decisionId) => Promise<{ ok: true, revision: RevisionImpacto } | { ok: false, error: string }>`

Recalcula el snapshot actual de cada árbitro objetivo (misma función `lib/snapshotArbitro.js` que se usó al registrar), lo compara campo a campo contra el `SnapshotArbitro` original vía `lib/compararSnapshots.js` (`mejora`/`empeora`/`sin_cambio`/`no_comparable`, research.md §3) y persiste una fila nueva en `revisiones_impacto` por árbitro. Se puede llamar más de una vez sobre la misma decisión (revisiones sucesivas, `data-model.md`). Un árbitro que ya no está activo en el dataset se marca `no_comparable` con motivo `"árbitro no activo"`, no se excluye silenciosamente.

## `registrarFaseCampana(campanaId, cambios: Partial<DetalleCampanaAscenso>) => Promise<{ ok: true, decision } | { ok: false, error: string }>`

Inserta una fila nueva de `decisiones` para el mismo `campanaId` con el `detalle` actualizado (research.md §4 — nunca `UPDATE`). Usada para: añadir/quitar candidatos, registrar nota de prueba, fijar plazas disponibles. Rechaza (`ok: false`) si se intenta modificar una campaña cuya última fase ya tiene `corte_confirmado: true` (una campaña confirmada es inmutable).

## `confirmarCorteAscenso(campanaId, { plazasDisponibles }) => Promise<{ ok: true, decision } | { ok: false, motivoRechazo: string }>`

Único punto de la interfaz que puede dejar `corte_confirmado: true` y rellenar `ascendidos_arbitro_ids` — llamada aparte y explícita de `registrarFaseCampana` a propósito (research.md §5, FR-008/Principio II), nunca implícita al completar notas o clasificación. Calcula el corte con `lib/clasificacionAscenso.js` (función pura, no persiste por sí sola) y persiste el resultado en la misma operación que marca `corte_confirmado`.

## `obtenerClasificacionCampana(campanaId) => { candidatosOrdenados, dentroDeCorte }` (síncrona, pura)

No es parte de `decisionesRepo.js` — vive en `lib/clasificacionAscenso.js`, sin I/O, para poder mostrar la clasificación en vivo mientras el comité aún no ha confirmado el corte (research.md §5). `decisionesRepo.confirmarCorteAscenso` la reutiliza internamente.

## Errores

Ninguna función lanza. `{ ok: false, error }` para fallos de infraestructura o de negocio no distinguidos (mismo criterio que `anotacionesRepo.js`); `confirmarCorteAscenso` usa `motivoRechazo` en vez de `error`, igual que `disponibilidadRepo.declararDisponibilidad`, porque su rechazo más común es de negocio (campaña ya confirmada, plazas inválidas) y conviene poder mostrarlo directamente en la UI sin traducirlo.
