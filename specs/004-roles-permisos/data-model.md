# Data Model: Cuentas de usuario, roles y panel de administración

Diseño completo, listo para implementar cuando arranque Fase 2 (`spec.md`, Assumptions) — no se crea la migración `.sql` en esta spec (`research.md` §5). `auth.users` (gestionada por Supabase Auth) es la tabla de identidad; todo lo de aquí abajo es nuevo sobre ella.

## `usuarios` (perfil + rol, 1:1 con `auth.users`)

| Columna | Tipo | Notas |
|---|---|---|
| `id` | `uuid` | PK, **igual** a `auth.users.id` (no se genera aparte — `references auth.users(id) on delete cascade` solo por integridad referencial; en la práctica nunca se borra un `auth.users`, se banea, ver `research.md` §4) |
| `email` | `text` | `not null` — copia de conveniencia del email de `auth.users` (evita un join en cada lectura de UI); se mantiene sincronizado en el momento de creación, no cambia después (cambiar el email de alguien es dar de baja + alta, no un `UPDATE`) |
| `rol` | `text` | `not null`, `check (rol in ('admin','directiva','informadores','arbitros','administrativos'))` |
| `arbitro_id` | `integer` | nullable; `check (arbitro_id is not null or rol <> 'arbitros')` — obligatorio solo si `rol = 'arbitros'`. Referencia lógica al roster JSON (`arbitros-200.json[].id` / futuro roster real), sin FK real — mismo criterio que `anotaciones.arbitro_id` en 003 |
| `activo` | `boolean` | `not null default true` — `false` cuando el admin "elimina" la cuenta (en realidad banea, `research.md` §4). Las políticas RLS de todas las tablas comprueban `activo = true`, no solo `rol` |
| `creado_en` | `timestamptz` | `not null default now()` |
| `ultimo_acceso_en` | `timestamptz` | nullable, se actualiza en cada login (ver `historial_uso`, es una vista derivada de ahí en la práctica, pero se cachea aquí para no agregar en cada carga del panel admin) |

**FR-014 (nunca sin admin activo)**: se aplica como regla de aplicación (no como `check` de fila — depende de contar otras filas), tanto en el Route Handler de baja/cambio de rol como, por defecto-en-profundidad, en la función `usuarioRolFn()` de RLS: antes de un `UPDATE`/baja que quite el rol `admin` a alguien, se comprueba `count(*) from usuarios where rol = 'admin' and activo = true` > 1.

## `historial_uso`

| Columna | Tipo | Notas |
|---|---|---|
| `id` | `uuid` | PK, `default gen_random_uuid()` |
| `usuario_id` | `uuid` | `not null references usuarios(id)` |
| `tipo` | `text` | `not null`, `check (tipo in ('login','accion'))` |
| `detalle` | `text` | nullable — para `tipo = 'accion'`, referencia legible a qué se hizo (p. ej. `"designacion:confirmar"`, `"nota:crear"`); para `tipo = 'login'` puede ir vacío |
| `creado_en` | `timestamptz` | `not null default now()` |

Append-only, igual que `anotaciones`/`designaciones`/`declaraciones_disponibilidad` — nunca se actualiza ni se borra una fila (FR-011). Un evento de `tipo = 'accion'` es un registro **complementario** al que ya queda en la tabla de negocio correspondiente (vía `usuario_id`, ver siguiente sección) — `historial_uso` es la vista unificada por usuario que pide el panel de admin (Historia 2, Acceptance Scenario 4), no la fuente de verdad de cada acción.

## Cambios sobre tablas ya existentes (003) — FR-009

Se añade una columna nueva y nullable a cada una de las tres tablas de `003-persistencia-real`, **sin tocar ni renombrar las columnas de texto existentes** (coherente con "nunca se sobrescribe" — las filas ya escritas antes de que exista auth real se quedan tal cual, con su autor de texto genérico):

| Tabla | Columna nueva | Notas |
|---|---|---|
| `anotaciones` | `usuario_id` | `uuid references usuarios(id)`, nullable. Nula en toda fila anterior a esta spec (seed sintético + notas reales de antes de auth); obligatoria en la práctica para toda fila nueva a partir de que la UI exija login (validado en la aplicación, no en la base) |
| `designaciones` | `usuario_id` | idem — sustituye en la práctica a `decidido_por_rol` como fuente de "quién decidió", que se mantiene solo por compatibilidad histórica |
| `declaraciones_disponibilidad` | `usuario_id` | idem — sustituye en la práctica a `autor_rol` |

**SC-003** ("100% de las acciones... referencian un usuario real") se cumple mirando `usuario_id is not null`, no `autor`/`decidido_por_rol`/`autor_rol` (que se quedan como estaban, ya no son la fuente de verdad para filas nuevas).

## Matriz de permisos por rol (implementa FR-003 a FR-008; base para FR-015)

Referencia única para esta spec y las que hereden su vocabulario (`005-equipos`, `006-partidos`, per FR-015 — no reinventar un modelo de acceso propio).

| Sección / dato | admin | directiva | informadores | arbitros | administrativos |
|---|---|---|---|---|---|
| Configuración del sistema / panel de administración (Historia 2) | ✅ | ❌ | ❌ | ❌ | ❌ |
| Ficha de cualquier árbitro (lectura) | ✅ | ✅ | ✅ | solo la propia | ❌ (ver Disponibilidad/Designación) |
| Notas internas / patrón de implicación (heredado de 002 FR-008/FR-009) | ✅ | ✅ | ✅ | ❌ | ❌ |
| Comentarios en ficha (escritura, FR-005) | ✅ | ✅ | ✅ | ❌ | ❌ |
| Disponibilidad y Designación (gestión) | ✅ | ✅ | ❌ | propia disponibilidad únicamente | ✅ |
| Vista económica | ✅ | ✅ | ❌ | ❌ | ✅ (consulta) |
| Equipos / Partidos (`005`/`006`, insights de preparación) | ✅ | ✅ | ✅ | ✅ | ✅ |
| Historial de uso (panel admin) | ✅ | ❌ | ❌ | ❌ | ❌ |

Esta tabla es la que traduce `usuario_rol()` (función SQL, `research.md` §5) a políticas RLS concretas cuando se implemente: cada fila de esta matriz es una política `to authenticated using (...)` por tabla.

## Relación con specs anteriores

```
002-disponibilidad-arbitro / 003-persistencia-real
   └─ anotaciones.autor, designaciones.decidido_por_rol,
      declaraciones_disponibilidad.autor_rol (texto genérico)
      └─ conviven con usuario_id (nuevo, FR-009) — no se migran filas viejas

001-dashboard-operativo, 002, 003 (RLS permisiva `to anon`, migración 0004)
   └─ se sustituye por políticas `to authenticated` basadas en usuario_rol()
      cuando arranque la implementación de esta spec (Fase 2) — research.md §5

005-equipos, 006-partidos
   └─ heredan la Matriz de permisos por rol de aquí arriba (FR-015),
      no definen su propio modelo de acceso
```
