# Research: Gestión y seguimiento de decisiones del comité

No queda ningún `NEEDS CLARIFICATION` en el Technical Context del plan — todas las decisiones técnicas se resuelven reutilizando patrones ya validados en `specs/002-disponibilidad-arbitro` y `specs/003-persistencia-real`. Este documento registra las decisiones específicas de esta spec que sí son nuevas.

## 1. Cómo modelar un "tipo de decisión" extensible sin migración por tipo nuevo

**Decisión**: una única tabla `decisiones` con columna `tipo` (`text`, sin `check` cerrado — a diferencia de `declaraciones_disponibilidad.tipo`, que sí es una lista cerrada) y una columna `detalle` (`jsonb`) donde vive la estructura específica de cada tipo (p. ej. fases de una campaña de ascenso). Los campos comunes a cualquier decisión (objetivo, autor, fecha, estimación de impacto, plazo de revisión) son columnas propias de la tabla, no van dentro del JSONB.

**Rationale**: FR-001 exige explícitamente que el modelo de datos soporte tipos futuros sin que cada uno requiera su propia tabla. Postgres/Supabase soportan `jsonb` con índices GIN si en el futuro hace falta consultar dentro del detalle — no se necesita ahora, el volumen esperado es bajo (Technical Context, decenas/mes).

**Alternatives considered**:
- *Tabla por tipo* (`decisiones_ascenso`, `decisiones_motivacion`, ...): descartada — cada tipo nuevo exigiría una migración, justo lo que FR-001 pide evitar.
- *Tabla única con columnas nullable para cada posible campo de cada tipo*: descartada — con solo 2 tipos ya generaría columnas huérfanas (`plazas_disponibles` sin sentido para una decisión de motivación), y escala mal a un tercer tipo futuro.

## 2. Cómo fijar (congelar) la lista de árbitros de una categoría o grupo en el momento de decidir

**Decisión**: al registrar una decisión con objetivo "categoría completa" o "grupo dentro de una categoría", se resuelve el filtro **una sola vez** contra el dataset en ese instante y se persiste como array de `arbitro_id` (columna `objetivo_arbitro_ids integer[]` en `decisiones`) — no se guarda el filtro en sí (p. ej. "categoría = Segona FFCV AND estado = irregular"), se guarda su resultado ya resuelto.

**Rationale**: FR-009 exige explícitamente que la lista no se recalcule dinámicamente en el momento de la revisión, ni siquiera si la composición real cambia (altas/bajas/ascensos) — guardar el filtro en vez de su resultado violaría ese requisito la primera vez que alguien lo evaluara de nuevo.

**Alternatives considered**: tabla puente `decision_arbitro` (una fila por árbitro afectado) en vez de array — se descartó por sobreingeniería para este caso: no hay atributos propios por fila más allá del id (a diferencia de `snapshots_arbitro`, que sí necesita ser tabla propia porque cada fila lleva su propio conjunto de métricas). Un array de enteros es más simple y suficiente; se puede migrar a tabla puente después si algún caso de uso futuro lo exige.

## 3. Formato del snapshot (la pieza sin precedente en el proyecto)

**Decisión**: `snapshots_arbitro` guarda una fila por `(decision_id, arbitro_id)` con una columna `metricas jsonb` — un objeto donde cada clave es el nombre de una métrica (`estado_forma`, `disponibilidad_vigente`, `num_informes`, `ultima_prueba_fisica`, `ultimo_examen_teorico`, ...) y cada valor incluye tanto el dato como su etiqueta de fuente: `{ "valor": ..., "fuente": "real" | "sintetico" }`. La función pura `lib/snapshotArbitro.js` es la única responsable de construir este objeto — la UI nunca ensambla el snapshot a mano, para que añadir una métrica nueva en el futuro sea un cambio en un solo sitio.

**Rationale**: FR-002 pide capturar "más de lo obviamente relacionado" — un esquema de columnas fijas obligaría a decidir de antemano qué métricas importan y a migrar cada vez que se añada una. JSONB con `fuente` embebida por campo cumple FR-003 (etiquetado real/sintético) sin depender de que quien lea el snapshot sepa de antemano qué claves esperar.

**Alternatives considered**: replicar el propio objeto `arbitro` completo del dataset tal cual — descartado porque mezclaría campos irrelevantes para la decisión (ej. contacto, plantillas de email) con las métricas que sí importan, dificultando la lectura de la revisión de impacto; y porque el dataset del árbitro no lleva ya una etiqueta real/sintético por campo, habría que añadirla en dos sitios en vez de uno.

## 4. Cómo derivar "revisada" / "pendiente de revisión" sin `UPDATE`

**Decisión**: `decisiones` no tiene columna `estado` que se actualice — el estado se deriva en el momento de consultar: "pendiente" si no existe ninguna fila en `revisiones_impacto` con ese `decision_id`; "revisada" si existe al menos una; "plazo no cumplido" si `now() < fecha_registro + plazo_meses`. `revisiones_impacto` es puramente append-only (permite revisar la misma decisión más de una vez, ej. a los 3 y a los 6 meses, sin ningún esquema adicional).

**Rationale**: mantiene las tres tablas nuevas coherentes con el patrón ya aplicado a `anotaciones`/`designaciones`/`declaraciones_disponibilidad` — ninguna usa `UPDATE` ni `DELETE`, lo que significa que la política RLS ya endurecida en `0004_endurecer_rls_solo_lectura_insercion.sql` (solo `SELECT`+`INSERT` para `anon`) se puede aplicar a las tablas nuevas sin ninguna excepción ni política adicional.

**Alternatives considered**: columna `estado` con `UPDATE` al revisar — descartada por romper el único patrón de persistencia que el proyecto ha usado hasta ahora sin necesidad real (el estado es 100% derivable de datos que ya existen).

## 5. "Corte por plazas" de una campaña de ascenso — cómo no automatizarlo

**Decisión**: `lib/clasificacionAscenso.js` es una función pura que, dados los candidatos con sus notas y un número de plazas, **calcula y devuelve** quién quedaría dentro del corte — pero no persiste nada. Persistir el ascenso confirmado es una llamada aparte y explícita de `decisionesRepo.js` (`confirmarCorteAscenso(...)`) que solo se dispara desde un botón de confirmación en la UI, nunca automáticamente al completarse la clasificación.

**Rationale**: FR-008 / Principio II exigen confirmación humana explícita — separar "calcular" de "persistir" en dos funciones distintas hace estructuralmente imposible que un futuro cambio de UI dispare el ascenso sin pasar por el paso de confirmación, en vez de depender de que cada pantalla que use la clasificación recuerde no autoejecutarla.

**Alternatives considered**: que `clasificacionAscenso.js` persista directamente — descartada por la razón anterior; acoplar cálculo y persistencia es exactamente el tipo de atajo que un cambio futuro de UI podría atravesar sin querer.

## 6. Ubicación en el sidebar

**No resuelto en este documento** — ver "Pregunta abierta para Roberto" en `plan.md`. No es una decisión técnica (no afecta a datos, contratos ni pruebas), así que no bloquea Fase 1 ni `/speckit-tasks`; se resuelve con Roberto antes o durante la implementación de `VistaDecisiones`.
