# Data Model: Disponibilidad de árbitro con registro de implicación

A diferencia de `001-dashboard-operativo` (todo derivado, sin persistencia), estas entidades **sí necesitan persistir de verdad** — son el motivo del bloqueo hasta Sprint 1 (ver `research.md` §1). Lo que sigue es el contrato de datos que Sprint 1 debe implementar detrás de `contracts/disponibilidad-repo.md`, no un esquema de base de datos concreto todavía.

## DeclaracionDisponibilidad

| Campo | Tipo | Notas |
|---|---|---|
| `id` | string | identificador único de la declaración |
| `arbitroId` | number | referencia a `arbitros-200.json[].id` (o el ID real que exista cuando haya roster real del comité) |
| `cicloId` | string | referencia a `ciclos-asignacion.json[].id` — el fin de semana al que aplica |
| `autor` | `"arbitro" \| "comite"` | quién hizo la declaración |
| `tipo` | `"disponible" \| "no_disponible" \| "solo_categoria_propia" \| "festivo_solicitado"` | FR-001, FR-003, FR-004 |
| `motivo` | `"lesion" \| "baja" \| "urgencia" \| null` | obligatorio si `tipo === "no_disponible"`; `null` en el resto |
| `justificada` | boolean \| null | solo aplica si `motivo === "baja"`; `null` en cualquier otro caso |
| `fechaDeclaracion` | ISO 8601 (datetime) | cuándo se hizo la declaración — no cuándo aplica |

**Validación (FR-004)**: si `tipo === "festivo_solicitado"`, `fechaInicioCiclo - fechaDeclaracion >= 15 días` (ver `lib/reglaFestivo.js`, research.md §2). Si no se cumple, la declaración se rechaza — no se persiste.

**Inmutabilidad (Edge Case, spec.md)**: una vez el ciclo referenciado por `cicloId` está cerrado, no se permiten nuevas declaraciones ni ediciones para ese `cicloId` — el repositorio debe rechazar el intento, no sobrescribir.

## LogDisponibilidad

No es una tabla aparte — es la consulta `obtenerLog(arbitroId)`: todas las `DeclaracionDisponibilidad` de un árbitro, ordenadas por `fechaDeclaracion` ascendente. Nunca se borra una entrada (FR-005); una declaración posterior para el mismo `cicloId` no sustituye a la anterior en el log, solo determina cuál es la **vigente** para el cálculo de disponibilidad de ese ciclo (la de `fechaDeclaracion` más reciente).

## PatronImplicacion (derivada, calculada — no persistida como entidad propia)

Calculada por `lib/patronImplicacion.js` sobre el `LogDisponibilidad` de un árbitro:

| Campo | Tipo | Cómo se calcula |
|---|---|---|
| `bajasNoJustificadas` | number | count de declaraciones con `motivo === "baja"` y `justificada === false` |
| `festivosSolicitados` | number | count de declaraciones con `tipo === "festivo_solicitado"` |
| `urgencias` | number | count de declaraciones con `motivo === "urgencia"` — informativo, sin calificar por sí solo |

Sin campo `score` ni `nivel` — deliberadamente. FR-009/FR-010 y Principio IV de la constitución exigen que esto sea siempre descriptivo (cifras crudas para juicio humano del comité), nunca una cifra que alimente `scoreB1` ni ranking alguno. La UI (ficha de árbitro, vista comité) es responsable de presentar estas cifras como contexto, no como veredicto.

## Relación con `001-dashboard-operativo`

```
DeclaracionDisponibilidad (vigente por arbitroId + cicloId)
   └─ sustituye a conDisponibilidad()/indisponibleEsteFinde (lib/disponibilidad.js, sintético)
        └─ consumido por lib/coberturaCategoria.js (sin cambios de forma, solo de origen del dato)
```

## Ciclo (ampliación, no nueva entidad)

`ciclos-asignacion.json[].fechaInicioISO` (nuevo campo, `YYYY-MM-DD`) — necesario para que `lib/reglaFestivo.js` pueda calcular antelación real; hoy el ciclo solo tiene `finDeSemana` como texto libre en español. Se genera en `generar_jornadas.py` junto al resto de campos del ciclo — no requiere backend, es la misma clase de dato estático que ya existe.
