# Data Model: Persistencia real (Sprint 1 + Sprint 2 fusionados)

Tres tablas nuevas en Supabase (esquema `public`), todas de solo-añadir (append-only, ver `research.md` §4). `arbitro_id`, `partido_id`, `ciclo_id` son referencias lógicas al dataset JSON estático — sin `FOREIGN KEY` real, ver `research.md` §2.

## `anotaciones`

| Columna | Tipo | Notas |
|---|---|---|
| `id` | `uuid` | PK, `default gen_random_uuid()` |
| `arbitro_id` | `integer` | referencia lógica a `arbitros-200.json[].id` |
| `etiqueta` | `text` | `check (etiqueta in ('seguimiento','positiva','mejora','disciplinaria'))` — mismos valores que `ETIQUETA_NOTA` en `CRMExpedientes.jsx:107` |
| `texto` | `text` | `not null`, `check (length(trim(texto)) > 0)` |
| `autor_rol` | `text` | `check (autor_rol in ('arbitro','comite'))` — rol activo al guardar |
| `creado_en` | `timestamptz` | `not null default now()` |

Sin concepto de "vigente" — todas las notas se muestran como histórico (FR-001, FR-008 de `spec.md`).

## `designaciones`

| Columna | Tipo | Notas |
|---|---|---|
| `id` | `uuid` | PK, `default gen_random_uuid()` |
| `ciclo_id` | `text` | referencia lógica a `ciclos-asignacion.json[].id` |
| `partido_id` | `text` | referencia lógica a `ciclos-asignacion.json[].partidos[].id` |
| `arbitro_id` | `integer` | candidato finalmente decidido |
| `es_sugerido` | `boolean` | `not null` — `true` si `arbitro_id` coincide con el candidato que el motor sugería en el momento de decidir |
| `motivo` | `text` | `check (es_sugerido = true or motivo is not null)` — obligatorio al cambiar de candidato (FR-003) |
| `decidido_por_rol` | `text` | `check (decidido_por_rol in ('arbitro','comite'))` |
| `decidido_en` | `timestamptz` | `not null default now()` |

**Vigente** = la fila con `decidido_en` más reciente para un `partido_id` dado (`research.md` §4). Índice sobre `(partido_id, decidido_en desc)` para esa consulta.

## `declaraciones_disponibilidad`

Ya diseñada conceptualmente en `specs/002-disponibilidad-arbitro/data-model.md` (`DeclaracionDisponibilidad`) — aquí se le da forma de tabla real, sin cambiar sus campos:

| Columna | Tipo | Notas |
|---|---|---|
| `id` | `uuid` | PK, `default gen_random_uuid()` |
| `arbitro_id` | `integer` | referencia lógica |
| `ciclo_id` | `text` | referencia lógica |
| `autor_rol` | `text` | `check (autor_rol in ('arbitro','comite'))` |
| `tipo` | `text` | `check (tipo in ('disponible','no_disponible','solo_categoria_propia','festivo_solicitado'))` |
| `motivo` | `text` | `check (motivo in ('lesion','baja','urgencia') or motivo is null)`; `check (tipo <> 'no_disponible' or motivo is not null)` |
| `justificada` | `boolean` | solo aplica si `motivo = 'baja'`; `check (motivo = 'baja' or justificada is null)` |
| `creado_en` | `timestamptz` | `not null default now()` |

**Vigente** = la fila con `creado_en` más reciente para `(arbitro_id, ciclo_id)`. La regla de los 15 días de antelación para `festivo_solicitado` (`lib/reglaFestivo.js`, ya construida) se valida en la aplicación antes de insertar — no es expresable como `check` de fila porque depende de `ciclos-asignacion.json[].fechaInicioISO`, que vive fuera de la base de datos.

## RLS

Las tres tablas: `ALTER TABLE ... ENABLE ROW LEVEL SECURITY;` + una política única permisiva por tabla (`FOR ALL TO anon USING (true) WITH CHECK (true)`) — ver `research.md` §3 para el porqué y sus límites conocidos.

## Relación con specs anteriores

```
001-dashboard-operativo/lib/coberturaCategoria.js
   └─ hoy consume lib/disponibilidad.js (sintético)
      └─ pasa a consumir declaraciones_disponibilidad vigentes vía lib/disponibilidadRepo.js (real)

002-disponibilidad-arbitro/contracts/disponibilidad-repo.md
   └─ mismo contrato, ahora con implementación real en vez de stub (research.md §5)

DesignacionInteligente (webapp/components/CRMExpedientes.jsx)
   └─ resultados de asignarJornada() (en vivo)
      └─ fusionados con designaciones vigentes vía lib/designacionesRepo.js (nuevo)
```
