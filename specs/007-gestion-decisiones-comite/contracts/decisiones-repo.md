# Contrato: repositorio de decisiones

Interfaz que consumirá la UI (`VistaDecisiones` y su detalle). Ninguna función lanza excepción — todas devuelven `{ ok: true, ... }` o `{ ok: false, error }`, mismo convenio que `anotacionesRepo.js`/`designacionesRepo.js`/`disponibilidadRepo.js`. Agnóstica a la tecnología detrás (Supabase hoy, ver `data-model.md`).

**Ajuste durante la implementación (8 ago 2026)**: `estadoForma()` vive dentro de `CRMExpedientes.jsx` (no es importable desde `lib/`) y la disponibilidad vigente exige una llamada async a `disponibilidadRepo` con un ciclo de referencia — por eso `snapshotArbitro.js`/`compararSnapshots.js` **no los invoca este repositorio internamente**: el llamador (la UI, que ya tiene ambos datos) construye los objetos `metricas`/snapshots con esas funciones puras y se los pasa ya hechos a `registrarDecision`/`revisarImpacto`. Este repositorio solo persiste y compara, nunca decide qué contiene un snapshot. Los tipos de abajo reflejan la firma real implementada.

## `registrarDecision({ tipo, titulo, objetivoNivel, objetivoCategoria, objetivoArbitroIds, estimacionImpacto, plazoRevisionMeses, autor, detalle, snapshots }) => Promise<{ ok: true, decision } | { ok: false, error: string }>`

Persiste la decisión y, en la misma operación lógica, las filas de `snapshots_arbitro` que se le pasen en `snapshots: [{ arbitroId, metricas }]` (cada `metricas` ya construido por el llamador vía `lib/snapshotArbitro.js`, research.md §3). Si falla la inserción de los snapshots, la función devuelve `{ ok: false, error }` — la decisión ya quedó guardada pero el error se propaga para que la UI lo muestre (no hay transacción real entre las dos tablas en Supabase sin una función de base de datos, fuera de alcance de esta spec).

`objetivoArbitroIds` llega ya resuelto por el llamador (la UI resuelve "categoría"/"grupo" contra el dataset justo antes de llamar, vía `lib/resolverObjetivoDecision.js`, research.md §2) — este contrato no resuelve filtros, solo persiste la lista ya concreta. Para `tipo: 'campana_ascenso'`, genera un `id` propio (`crypto.randomUUID()`) y fija `campana_id = id` desde la primera fila, para que las fases posteriores (`registrarFaseCampana`) puedan agruparse por ese valor.

## `obtenerDecision(decisionId) => Promise<{ ok: true, decision, snapshots: SnapshotArbitro[], revisiones: RevisionImpacto[] } | { ok: false, error: string }>`

`decisionId` es la **identidad estable** de la decisión (`campana_id` si es una campaña, o el propio `id` si no) — nunca el `id` de una fase intermedia. Devuelve la decisión con su fila original (título/objetivo/snapshot de referencia) y su fila vigente (última fase: `detalle`/`titulo` actuales), todos los snapshots capturados en el registro original, y el historial completo de revisiones ya hechas (puede haber más de una, más recientes primero) — el llamador deriva `estadoRevision` con `derivarEstadoRevision({ creadoEn: decision.creadoEn, plazoRevisionMeses: decision.plazoRevisionMeses, tieneRevision: revisiones.length > 0 })`.

## `listarDecisiones({ tipo? }) => Promise<{ ok: true, decisiones: DecisionResumen[] } | { ok: false, error: string }>`

Para la bitácora (US4), una fila por identidad estable (no por fase de campaña). Cada `DecisionResumen` incluye el campo derivado `estadoRevision: 'pendiente' | 'plazo_no_cumplido' | 'revisada'`, calculado por la función pura y exportada `derivarEstadoRevision()` (`lib/decisionesRepo.js`, testeada en `decisionesRepo.test.js` sin red) — la UI nunca reimplementa la lógica de plazos.

## `revisarImpacto(decisionId, { metricasActualesPorArbitroId, revisadoPor }) => Promise<{ ok: true, revisiones: RevisionImpacto[] } | { ok: false, error: string }>`

`metricasActualesPorArbitroId` lo construye el llamador (mismo patrón que `registrarDecision`): un objeto `{ [arbitroId]: metricas }` con las métricas actuales ya calculadas vía `lib/snapshotArbitro.js` para cada árbitro objetivo — `null` o ausente para un árbitro no comparable (p. ej. dado de baja del colegio, Edge Case de `spec.md`). El repositorio compara cada snapshot inicial contra sus métricas actuales vía `lib/compararSnapshots.js` (`mejora`/`empeora`/`sin_cambio`/`no_comparable`) y persiste una fila nueva en `revisiones_impacto` por árbitro; un árbitro sin métricas actuales queda con todas sus métricas en `no_comparable`, sin excluirlo silenciosamente. Se puede llamar más de una vez sobre la misma decisión — cada llamada añade revisiones nuevas, no sustituye las anteriores.

## `registrarFaseCampana(campanaId, cambios: Partial<DetalleCampanaAscenso>) => Promise<{ ok: true, decision } | { ok: false, error: string }>`

Inserta una fila nueva de `decisiones` para el mismo `campanaId` con el `detalle` actualizado (research.md §4 — nunca `UPDATE`). Usada para: añadir/quitar candidatos, registrar nota de prueba, fijar plazas disponibles. Rechaza (`ok: false`) si se intenta modificar una campaña cuya última fase ya tiene `corte_confirmado: true` (una campaña confirmada es inmutable).

## `confirmarCorteAscenso(campanaId, { plazasDisponibles }) => Promise<{ ok: true, decision } | { ok: false, motivoRechazo: string }>`

Único punto de la interfaz que puede dejar `corte_confirmado: true` y rellenar `ascendidos_arbitro_ids` — llamada aparte y explícita de `registrarFaseCampana` a propósito (research.md §5, FR-008/Principio II), nunca implícita al completar notas o clasificación. Calcula el corte con `lib/clasificacionAscenso.js` (función pura, no persiste por sí sola) y persiste el resultado en la misma operación que marca `corte_confirmado`.

## `obtenerClasificacionCampana(campanaId) => { candidatosOrdenados, dentroDeCorte }` (síncrona, pura)

No es parte de `decisionesRepo.js` — vive en `lib/clasificacionAscenso.js`, sin I/O, para poder mostrar la clasificación en vivo mientras el comité aún no ha confirmado el corte (research.md §5). `decisionesRepo.confirmarCorteAscenso` la reutiliza internamente.

## Errores

Ninguna función lanza. `{ ok: false, error }` para fallos de infraestructura o de negocio no distinguidos (mismo criterio que `anotacionesRepo.js`); `confirmarCorteAscenso` usa `motivoRechazo` en vez de `error`, igual que `disponibilidadRepo.declararDisponibilidad`, porque su rechazo más común es de negocio (campaña ya confirmada, plazas inválidas) y conviene poder mostrarlo directamente en la UI sin traducirlo.
