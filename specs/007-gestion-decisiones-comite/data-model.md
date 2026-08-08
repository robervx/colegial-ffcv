# Data Model: Gestión y seguimiento de decisiones del comité

Tres tablas nuevas en Supabase (esquema `public`), todas **append-only** (ver `research.md` §4) — mismo criterio ya usado por `anotaciones`/`designaciones`/`declaraciones_disponibilidad` (`specs/003-persistencia-real`). `arbitro_id` es referencia lógica al dataset JSON estático (`arbitros-200.json[].id`), sin `FOREIGN KEY` real, mismo patrón que el resto del proyecto.

## `decisiones`

| Columna | Tipo | Notas |
|---|---|---|
| `id` | `uuid` | PK, `default gen_random_uuid()` |
| `tipo` | `text` | `not null` — sin `check` cerrado (FR-001, extensible); valores usados hoy: `'campana_ascenso'`, `'accion_motivacion'` |
| `titulo` | `text` | `not null`, `check (length(trim(titulo)) > 0)` — descripción libre |
| `objetivo_nivel` | `text` | `not null`, `check (objetivo_nivel in ('arbitro','categoria','grupo_categoria'))` |
| `objetivo_categoria` | `text` | `null` si `objetivo_nivel = 'arbitro'`; en otro caso, una de `CATEGORIAS` (`lib/categorias.js`) |
| `objetivo_arbitro_ids` | `integer[]` | `not null` — lista de árbitros afectados, **ya resuelta y congelada** en el momento del registro (research.md §2), nunca un filtro dinámico |
| `estimacion_impacto` | `text` | `not null` — texto libre declarado por el comité; puede incluir qué claves de `metricas` (ver `snapshots_arbitro`) se esperan que cambien, pero como texto, no como predicción numérica calculada (FR-004) |
| `plazo_revision_meses` | `integer` | `not null default 3` |
| `detalle` | `jsonb` | `not null default '{}'` — estructura específica del `tipo` (ver "Campaña de ascenso" más abajo); vacío para tipos sin estructura propia |
| `autor` | `text` | `not null` — texto libre hasta que `004-roles-permisos` exista, mismo criterio que `anotaciones.autor` |
| `creado_en` | `timestamptz` | `not null default now()` |

**Sin columna `estado`** — se deriva en consulta (research.md §4): pendiente / revisada (existe fila en `revisiones_impacto`) / plazo no cumplido (`now() < creado_en + plazo_revision_meses meses`).

### `detalle` para `tipo = 'campana_ascenso'`

```json
{
  "categoria_origen": "Segona FFCV",
  "categoria_destino": "Primera FFCV",
  "candidatos": [
    { "arbitro_id": 42, "nota_teorica": null, "nota_fisica": null }
  ],
  "plazas_disponibles": null,
  "corte_confirmado": false,
  "ascendidos_arbitro_ids": []
}
```

Cada fase de la campaña (añadir candidato, registrar nota, fijar plazas, confirmar corte) se persiste como una **fila nueva** en `decisiones` con el mismo `objetivo_categoria`/`titulo` pero `detalle` actualizado y `creado_en` más reciente — exactamente el patrón "vigente = fila más reciente" ya usado por `designaciones`/`declaraciones_disponibilidad`, en vez de un `UPDATE` sobre la fila original (research.md §4). Un campo `campana_id uuid` (igual en todas las filas de la misma campaña, distinto de `id`) agrupa las fases entre sí — `campana_id = id` de la primera fila.

`corte_confirmado` solo pasa a `true` en una fila insertada desde la acción explícita de confirmación (FR-008) — nunca se calcula ni se infiere de que `candidatos` ya tenga notas completas.

## `snapshots_arbitro`

| Columna | Tipo | Notas |
|---|---|---|
| `id` | `uuid` | PK, `default gen_random_uuid()` |
| `decision_id` | `uuid` | referencia lógica a `decisiones.id` (la fila que originó el registro, no una fase posterior de campaña) |
| `arbitro_id` | `integer` | uno de `decisiones.objetivo_arbitro_ids` |
| `metricas` | `jsonb` | `not null` — `{ "<nombre_metrica>": { "valor": ..., "fuente": "real" \| "sintetico" } }`, construido únicamente por `lib/snapshotArbitro.js` (research.md §3) |
| `capturado_en` | `timestamptz` | `not null default now()` |

Una fila por `(decision_id, arbitro_id)`, escrita una única vez al registrar la decisión — nunca se vuelve a escribir para la misma pareja (es la "foto", no puede cambiar retroactivamente).

## `revisiones_impacto`

| Columna | Tipo | Notas |
|---|---|---|
| `id` | `uuid` | PK, `default gen_random_uuid()` |
| `decision_id` | `uuid` | referencia lógica a `decisiones.id` |
| `arbitro_id` | `integer` | uno de `decisiones.objetivo_arbitro_ids` |
| `metricas_actuales` | `jsonb` | mismo formato que `snapshots_arbitro.metricas`, recalculado en el momento de la revisión |
| `comparacion` | `jsonb` | `{ "<nombre_metrica>": "mejora" \| "empeora" \| "sin_cambio" \| "no_comparable" }` — derivado de comparar `metricas_actuales` contra el `snapshots_arbitro` correspondiente; `"no_comparable"` cuando una métrica no admite orden claro (ver Assumptions de `spec.md`) |
| `revisado_por` | `text` | texto libre, mismo criterio que `decisiones.autor` |
| `revisado_en` | `timestamptz` | `not null default now()` |

Permite múltiples revisiones de la misma decisión en el tiempo (a los 3 meses, luego a los 6...) — cada una es una fila nueva, ninguna sobrescribe la anterior.

**"No revisable"** (árbitro dado de baja del colegio antes del plazo, ver Edge Cases de `spec.md`) no es una fila de `revisiones_impacto` — es un estado derivado en la UI al comprobar que el árbitro ya no está activo en el dataset, no requiere persistencia propia.

## RLS

Las tres tablas: `ALTER TABLE ... ENABLE ROW LEVEL SECURITY;` + políticas `SELECT`+`INSERT` para `anon`, sin `UPDATE`/`DELETE` — mismo patrón ya endurecido en `0004_endurecer_rls_solo_lectura_insercion.sql`, aplicado desde el primer día en vez de necesitar una migración de endurecimiento posterior (las tres tablas son append-only por diseño, research.md §4).

## Relación con specs anteriores

```
webapp/components/CRMExpedientes.jsx (estadoForma/formaCounts)
webapp/lib/disponibilidadRepo.js (specs/002-disponibilidad-arbitro, ya real)
webapp/lib/anotacionesRepo.js (numInformes)
webapp/data/arbitros-200.json (pruebasFisicas/examenesTeoricos, sintético)
   └─ consumidos por lib/snapshotArbitro.js (nuevo)
      └─ persistido vía lib/decisionesRepo.js → snapshots_arbitro (nuevo)
         └─ comparado más tarde contra el estado en vivo (mismas fuentes)
            → revisiones_impacto (nuevo)

lib/categorias.js (CATEGORIAS, ya existente)
   └─ resuelve objetivo_nivel = 'categoria'/'grupo_categoria' a objetivo_arbitro_ids (research.md §2)

004-roles-permisos (sin implementar todavía)
   └─ futuro: decisiones.autor pasa de texto libre a cuenta real (FR-012)
```
