# Data Model: Dashboard operativo del Comité

No hay persistencia nueva (FR-009, Principio VII). Todas las entidades de abajo son **derivadas en memoria** a partir de datos ya existentes en `webapp/data/*.json` — ninguna se escribe a disco ni sobrevive a un refresco de página. Esto no es una tabla de base de datos, es la forma que toman los datos calculados dentro del componente/`lib/`.

## ArbitroDisponible (derivada)

Extiende un registro de `arbitros-200.json` con el flag de disponibilidad, hoy sintético.

| Campo | Tipo | Origen | Fuente |
|---|---|---|---|
| `id`, `n`, `cat`, `catNivel`, `loc` | — | `arbitros-200.json` | real (identidad/carga) |
| `disponibleCategoriasInferiores` | boolean | `arbitros-200.json` | sintético |
| `indisponibleEsteFinde` | boolean | calculado por `lib/disponibilidad.js` (extraído de `conExtras()`, ver research.md §2) | sintético |

**Regla derivada**: un árbitro cuenta como "disponible" para un ciclo cuando `!indisponibleEsteFinde`. No se persiste — se recalcula cada vez que se abre el Dashboard.

## CoberturaCategoria (derivada, nueva — `lib/coberturaCategoria.js`)

Para una categoría y el ciclo activo (primer elemento de `ciclos-asignacion.json`, ver research.md §3):

| Campo | Tipo | Cómo se calcula | Fuente |
|---|---|---|---|
| `categoria` | string | una de `CATEGORIAS` (excluyendo "Todas") | — |
| `partidosADesignar` | number | count de partidos del ciclo activo con `categoriaMinima === categoria` | real |
| `disponiblesCategoriaPropia` | number | count de `ArbitroDisponible` con `cat === categoria` y `!indisponibleEsteFinde` | sintético |
| `disponiblesCategoriaInferior` | number | count de `ArbitroDisponible` con `catNivel > nivel(categoria)`, `disponibleCategoriasInferiores === true` y `!indisponibleEsteFinde` | sintético |
| `totalDisponibles` | number | `disponiblesCategoriaPropia + disponiblesCategoriaInferior` | derivado |
| `estado` | `"riesgo" \| "ajustado" \| "holgada" \| "sin_partidos"` | `sin_partidos` si `partidosADesignar === 0`; si no: `riesgo` si `totalDisponibles < partidosADesignar`, `ajustado` si `===`, `holgada` si `>` (umbral documentado como punto de partida ajustable, ver spec.md Assumptions) | derivado |

**Invariante de Edge Case (spec.md, 4º edge case)**: un árbitro que cubre dos categorías por "también pita inferiores" se cuenta en el `disponiblesCategoriaInferior` de **cada** categoría inferior elegible por separado (para que cada cobertura individual sea correcta), pero la UI debe dejar explícito con texto que ese mismo árbitro no puede cubrir dos partidos simultáneos de dos categorías distintas el mismo fin de semana — es una señal de disponibilidad potencial por categoría, no una suma agregable de "soluciones" sin solapamiento. No se resuelve con una cifra única "sin doble conteo" en esta spec (eso requeriría el motor de asignación real, fuera de alcance); se resuelve con copy explicativo junto al indicador (FR-007).

## IndicadorEquidad (ya existente, sin cambios de forma)

Se reutiliza tal cual `agregados-reales.json.equidad_carga` (ya consumido por el `Dashboard()` actual). Esta spec solo añade el copy explicativo en lenguaje llano que exige FR-003 (US2) — no cambia el cálculo ya existente (`coeficiente_variacion`, `media_partidos_por_arbitro`, `max_partidos`, `min_partidos`).

## Relaciones

```
ciclos-asignacion.json (activo = [0])
   └─ partidos[] ── agrupados por categoriaMinima ──▶ CoberturaCategoria.partidosADesignar

arbitros-200.json ── + lib/disponibilidad.js ──▶ ArbitroDisponible[]
   └─ agrupados por cat / disponibleCategoriasInferiores ──▶ CoberturaCategoria.disponibles*

agregados-reales.json.equidad_carga ──▶ IndicadorEquidad (sin cambios, solo nuevo copy)
```

No hay transiciones de estado (no hay persistencia ni ciclo de vida — todo se recalcula on-render).
