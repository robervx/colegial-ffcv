# Implementation Plan: Gestión y seguimiento de decisiones del comité

**Branch**: `007-gestion-decisiones-comite` | **Date**: 2026-08-06 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/007-gestion-decisiones-comite/spec.md`

**Nota sobre la rama**: en el momento de escribir este plan, el checkout compartido del repo está en `001-cuadro-mando-cuarto-arbitro` (otra sesión activa, trabajo en curso sin commitear). La rama `007-gestion-decisiones-comite` se crea desde `main` cuando esa sesión libere el checkout — este plan y sus artefactos no dependen de qué rama esté activa mientras tanto.

## Summary

Página nueva de gestión de capital humano arbitral a nivel de comité: registrar decisiones/acciones/políticas (libres, o campañas de ascenso de categoría con su propio ciclo de fases) dirigidas a un árbitro, una categoría completa o un grupo dentro de una categoría, capturando un snapshot amplio del estado relevante en el momento de decidir, y permitiendo comparar ese snapshot contra el estado real transcurrido un plazo (3 meses por defecto) — el bucle "estimar antes / verificar después" que la spec compara con Football Manager. Enfoque técnico: extender los patrones ya construidos en `specs/003-persistencia-real` (tablas Supabase append-only, `*Repo.js` con convenio `{ ok, ... }`, componente `Vista*` dentro de `CRMExpedientes.jsx`) en vez de introducir arquitectura nueva; la única pieza genuinamente nueva es el modelo de snapshot congelado y su comparación posterior, que no tiene precedente en el proyecto.

## Technical Context

**Language/Version**: JavaScript (ES2022+), React 19 sobre Next.js 16 App Router — mismo stack que el resto de `webapp/`, sin TypeScript salvo que se toque el futuro Route Handler de `004-roles-permisos` (no aplica a esta spec).

**Primary Dependencies**: Next.js 16, React, `@supabase/supabase-js` (cliente ya configurado en `webapp/lib/supabaseClient.js`), Tailwind CSS, Vitest — todas ya presentes en el proyecto, sin dependencias nuevas que añadir a `package.json`.

**Storage**: Supabase (Postgres). Tablas nuevas: `decisiones` (incluye campañas de ascenso vía columna `detalle` JSONB, ver `data-model.md`), `snapshots_arbitro`, `revisiones_impacto`. Todas append-only, mismo patrón que `anotaciones`/`designaciones`/`declaraciones_disponibilidad` (`specs/003-persistencia-real`) — ninguna usa `UPDATE`/`DELETE`, consistente con el endurecimiento de RLS ya aplicado en `0004_endurecer_rls_solo_lectura_insercion.sql`.

**Testing**: Vitest para lógica pura (cálculo de snapshot, comparación de métricas, clasificación de campaña) en `webapp/lib/*.test.js`, mismo patrón que `coberturaCategoria.test.js`/`reglaFestivo.test.js`. Verificación manual en navegador para la UI — no hay e2e todavía en el proyecto (deuda técnica diferida a propósito, `docs/sprints.md`).

**Target Platform**: Web, desplegado en Vercel (`colegial-ffcv-one.vercel.app`), redeploy automático en cada push a `main`.

**Project Type**: Aplicación web monolítica existente (`webapp/`) — no hay separación frontend/backend salvo Route Handlers puntuales (el único hoy planeado es el de `004-roles-permisos`, sin relación con esta spec).

**Performance Goals**: sin requisito de tiempo real. Volumen esperado bajo (decenas de decisiones/mes, no miles); consultas sobre la plantilla de trabajo de ~200 árbitros, mismo orden de magnitud que el resto de la app.

**Constraints**: ningún dato económico ni de designación de partido concreto (fuera de alcance, ver spec Assumptions); todo campo de snapshot y de resultado de pruebas etiquetado real/sintético (Principio VI); ninguna predicción numérica automática de impacto (Principio III); ningún ascenso ni envío de comunicación se ejecuta sin confirmación humana explícita (Principio II).

**Scale/Scope**: 1 página nueva de navegación (`VistaDecisiones`), ubicada en el bloque "Próximas versiones" del sidebar junto a "Consultar con IA" — ese bloque pasa a acoger las páginas de management/gestión del comité en general (decidido por Roberto, ver Project Structure), 4 historias de usuario (2×P1/P2 + 1×P2 + 1×P3), 3 tablas Supabase nuevas, 1 repositorio nuevo (`decisionesRepo.js`).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principio | Evaluación |
|---|---|
| I. FFCV como cliente único | **PASS** — no introduce multi-tenant ni supuestos de otro cliente. |
| II. El técnico decide, el sistema informa | **PASS** — el corte por plazas de una campaña de ascenso exige confirmación humana explícita (FR-008); ninguna decisión "libre" (ej. envío de email) se ejecuta automáticamente, solo se registra la intención y su snapshot (ver spec Assumptions). |
| III. Todo indicador calculado es explicable | **PASS** — cada campo de snapshot es un dato con fuente visible (real/sintético), la clasificación de ascenso muestra su fórmula de orden (nota de pruebas), y la comparación de impacto nunca resume en un índice agregado que oculte qué métrica cambió (FR-005). Ninguna predicción numérica automática (FR-004). |
| IV. Gestión no es clasificación | **PASS** — la clasificación de una campaña de ascenso se basa en resultados de pruebas teóricas/físicas, no en disponibilidad ni disciplina; el snapshot no alimenta `scoreB1` ni ningún score de designación. |
| V. Sin comparación directa entre árbitros | **PASS** — la clasificación de candidatos dentro de una campaña de ascenso es un listado ordenado con filtro (misma categoría, mismo curso), exactamente el patrón ya permitido ("Top 10 por categoría"); no hay ninguna pantalla de comparación 1-a-1 entre dos árbitros concretos. |
| VI. Dato real y sintético, siempre distinguibles | **PASS** — snapshot etiquetado campo a campo; resultado de campaña de ascenso no se presenta como decisión operativa real mientras `pruebasFisicas`/`examenesTeoricos` sigan siendo sintéticas (US3, Acceptance Scenario 4). |
| VII. Nada se construye sobre persistencia que no existe | **PASS** — Supabase real desde la primera historia implementada (US1), mismo patrón que `specs/003-persistencia-real`; ningún botón "Guardar" sobre estado local de React. |

Sin violaciones → no hace falta rellenar Complexity Tracking.

**Re-chequeo tras Fase 1** (`data-model.md`, `contracts/decisiones-repo.md`): el diseño append-only elegido en research.md §4-5 refuerza directamente II y VII (el corte de campaña solo se persiste desde `confirmarCorteAscenso`, nunca implícito; ninguna tabla nueva admite `UPDATE`/`DELETE`). Sin cambios respecto al pre-chequeo, sigue en PASS las 7.

**Observación fuera del gate, digna de nota**: el disparador documentado en `docs/sprints.md` § Deuda técnica diferida para trocear `CRMExpedientes.jsx` ("dos personas necesitando tocar partes distintas del fichero a la vez con frecuencia") ya se está cumpliendo ahora mismo — hay otra sesión activa editando ese mismo fichero en paralelo mientras se escribe este plan. No se actúa sobre eso en esta spec (no es su alcance), pero se deja constancia para que la próxima vez que se retome `sprints.md` no sea una sorpresa.

## Project Structure

### Documentation (this feature)

```text
specs/007-gestion-decisiones-comite/
├── plan.md              # Este fichero
├── research.md          # Fase 0
├── data-model.md         # Fase 1
├── quickstart.md         # Fase 1
├── contracts/
│   └── decisiones-repo.md   # Fase 1
└── tasks.md              # Fase 2 (/speckit-tasks, no se genera aquí)
```

### Source Code (repository root)

No aplica ninguna de las opciones genéricas de la plantilla (no hay separación frontend/backend ni proyectos múltiples) — este es el árbol real que toca la feature, extendiendo el monolito `webapp/` ya existente:

```text
webapp/
├── components/
│   └── CRMExpedientes.jsx      # + función VistaDecisiones (patrón Vista* ya usado
│                                #   por VistaEquipos/VistaPartidos/VistaSeguimientoOperativo),
│                                #   + subcomponentes de detalle de decisión/campaña
├── lib/
│   ├── decisionesRepo.js       # NUEVO — CRUD append-only de decisiones/snapshots/revisiones,
│   │                            #   convenio { ok, ... } como anotacionesRepo.js/designacionesRepo.js
│   ├── resolverObjetivoDecision.js      # NUEVO — función pura: resuelve nivel de objetivo
│   │                            #   (árbitro/categoría/grupo) a una lista concreta de arbitro_id,
│   │                            #   congelada en el momento de decidir (research.md §2)
│   ├── resolverObjetivoDecision.test.js # NUEVO
│   ├── snapshotArbitro.js      # NUEVO — función pura: dado un árbitro + su estado derivado
│   │                            #   (formaCounts, disponibilidad vigente, informes, pruebas),
│   │                            #   construye el objeto de snapshot con etiqueta real/sintético
│   │                            #   por campo. Testeable sin Supabase (mismo patrón que
│   │                            #   coberturaCategoria.js/patronImplicacion.js).
│   ├── snapshotArbitro.test.js # NUEVO
│   ├── compararSnapshots.js    # NUEVO — función pura: compara snapshot inicial vs métricas
│   │                            #   actuales, campo a campo (mejora/empeora/sin_cambio/no_comparable),
│   │                            #   nunca un índice agregado único (research.md §3, FR-005)
│   ├── compararSnapshots.test.js # NUEVO
│   ├── clasificacionAscenso.js # NUEVO — función pura: ordena candidatos de una campaña
│   │                            #   por resultado de pruebas, aplica corte por plazas
│   │                            #   (sin persistir el corte — eso lo hace decisionesRepo
│   │                            #   solo tras confirmación explícita, FR-008)
│   └── clasificacionAscenso.test.js # NUEVO
└── data/                        # sin cambios — esta spec no genera datasets nuevos
```

```text
supabase/
└── migrations/
    └── 0005_decisiones_comite.sql   # NUEVO, en Fase de implementación (tasks.md) — no en este plan
```

**Structure Decision**: se reutiliza el monolito `webapp/components/CRMExpedientes.jsx` con el patrón `Vista*` ya establecido (siete páginas lo siguen hoy: `VistaRoles`, `VistaEquipos`, `VistaPartidos`, `VistaIA`, `VistaSeguimientoOperativo`, `VistaGlosario`, más `Dashboard`/`Listado`/`Ficha` como casos con nombre propio) en vez de introducir un directorio de páginas separado o trocear el componente — no es el momento de pagar ese troceo solo por esta spec (ver Observación en Constitution Check). La lógica de negocio nueva (snapshot, clasificación de campaña) vive en `lib/` como funciones puras testeables, siguiendo el mismo patrón que `coberturaCategoria.js`/`patronImplicacion.js`/`reglaFestivo.js` — la UI nunca calcula directamente, siempre llama a `lib/`.

**Resuelto (6 ago 2026)**: la página vive junto a "Consultar con IA" en el bloque "Próximas versiones" del sidebar — Roberto lo confirmó explícitamente: ese bloque pasa a ser donde viven las páginas de *management y gestión del comité* en general, no solo IA, y esta es la primera en ocuparlo. A diferencia de "Consultar con IA" (que sigue como vista previa bloqueada, `BannerV2`, Principio de Restricciones de Producto), `VistaDecisiones` es funcionalidad real de esta spec, no un candado — pasa a navegación activa dentro de ese mismo bloque del sidebar, mismo tratamiento que ya tuvieron Equipos/Partidos al dejar de ser vista previa bloqueada (`docs/decisiones-producto.md` §25).

## Complexity Tracking

*(vacío — sin violaciones de la constitución que justificar)*
