# Implementation Plan: Dashboard operativo del Comité

**Branch**: `001-dashboard-operativo` | **Date**: 2026-07-27 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-dashboard-operativo/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command; its definition describes the execution workflow.

## Summary

Ampliar el `Dashboard()` ya existente (`webapp/components/CRMExpedientes.jsx:215`) para que el jefe del comité vea, sin filtrar, el riesgo de cobertura por categoría del próximo fin de semana (US1/P1), el reparto de carga explicado en lenguaje llano (US2/P2, reutilizando `agregados-reales.json.equidad_carga` ya calculado) y el volumen de partidos filtrable por categoría (US3/P3). Enfoque técnico: extraer a `lib/disponibilidad.js` el concepto de "árbitro disponible este fin de semana" (hoy duplicable solo dentro de la página de Designación) y añadir `lib/coberturaCategoria.js` como nueva función pura y testeada que cruza `ciclos-asignacion.json` (partidos reales del ciclo activo) con la disponibilidad sintética por árbitro. Sin backend, sin persistencia nueva, sin dependencias nuevas más allá de un test runner (Vitest) para cumplir el estándar de la constitución sobre lógica de `lib/`.

## Technical Context

**Language/Version**: JavaScript (JSX) para componentes y `lib/`, siguiendo el patrón ya establecido en el proyecto (no TypeScript salvo en el scaffolding mínimo de `app/layout.tsx`/`app/page.tsx`, que esta spec no toca). Next.js 16.2.11, React 19.2.4.

**Primary Dependencies**: Next.js 16 (App Router), React 19, Recharts 3 (gráficas ya usadas en `Dashboard()`), lucide-react (iconos), Tailwind CSS 4. Nueva: Vitest (devDependency) para tests de `lib/` — ver `research.md` §1.

**Storage**: N/A — todo el dato es estático (`webapp/data/*.json`, generado por scripts Python fuera de esta spec). No se añade persistencia (FR-009, Principio VII de la constitución).

**Testing**: Vitest para funciones puras nuevas en `lib/` (`coberturaCategoria.js`, `disponibilidad.js`), casos borde de `data-model.md`/`quickstart.md`. Verificación visual manual en navegador para el propio Dashboard (patrón ya seguido en el resto del proyecto, ver `feedback-colegial-workflow` — no hay tests de componente/UI en el proyecto hoy y esta spec no los introduce).

**Target Platform**: navegador de escritorio, mismo alcance responsive que el resto de la app hoy (el bug conocido de responsive 550-900px, `estado-actual.md` §5, no se resuelve en esta spec — fuera de alcance).

**Project Type**: web-app de una sola página (frontend-only, sin backend separado) — Next.js App Router sirviendo un único componente cliente (`CRMExpedientes.jsx`) con varias "páginas" internas conmutadas por estado, no por rutas.

**Performance Goals**: N/A explícito — el cálculo opera sobre 200 árbitros y ~10-15 partidos por ciclo, órdenes de magnitud triviales para cálculo síncrono en cliente; no hay objetivo de latencia a validar.

**Constraints**: Principios I-VII de `.specify/memory/constitution.md` (ver Constitution Check abajo); FR-007/FR-008 (explicabilidad y distinción real/sintético) condicionan el diseño de cada indicador nuevo, no son un añadido posterior.

**Scale/Scope**: una pantalla (Dashboard), 3 user stories, 9 requisitos funcionales. Dos módulos nuevos en `lib/` (~50-80 líneas cada uno estimado, en línea con `motorAsignacion.js`/`asignarJornada.js` existentes), extensión del `Dashboard()` actual (no una página nueva).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principio | Evaluación |
|---|---|
| I. FFCV cliente único | N/A — no se toca theming ni multi-tenant. |
| II. El técnico decide, el sistema informa | Cumple — el Dashboard es de consulta pura (FR-009), no ejecuta ni recomienda ninguna designación; no aplica el requisito de motivo de override porque no hay ninguna acción que revertir. |
| III. Todo indicador es explicable | Cumple por diseño — FR-007 es requisito explícito y `data-model.md` define de dónde sale cada campo de `CoberturaCategoria`; el "estado" (riesgo/ajustado/holgada) siempre se acompaña del desglose numérico que lo genera, nunca solo un color. |
| IV. Gestión no es clasificación | Cumple — disponibilidad/indisponibilidad siguen siendo dato de gestión (cobertura operativa), no entran en ningún score de clasificación; el Dashboard no toca `scoreB1` ni el motor de designación. |
| V. Sin comparación directa | Cumple — todos los indicadores son agregados por categoría o por colectivo, ningún componente nuevo recibe dos `arbitro_id` para comparar cara a cara. |
| VI. Real y sintético distinguibles | Cumple por diseño — FR-008 explícito; se reutiliza el patrón visual ya validado en el resto de la app (`research.md` §5) en vez de inventar uno nuevo. |
| VII. Nada sobre persistencia que no existe | Cumple — FR-009 explícito, ninguna acción del Dashboard se presenta como guardada; los filtros son estado local de React efímero, igual que el resto de la app ya hace para filtros de listado. |

**Resultado**: sin violaciones. No se requiere tabla de Complexity Tracking.

## Project Structure

### Documentation (this feature)

```text
specs/001-dashboard-operativo/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md         # Phase 1 output (/speckit-plan command)
├── quickstart.md         # Phase 1 output (/speckit-plan command)
└── tasks.md              # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

Sin `contracts/`: no hay interfaz externa (API, CLI, contrato de librería) que documentar — es una pantalla interna de una app frontend-only sin backend, ver Storage: N/A en Technical Context.

### Source Code (repository root)

No aplica ninguna de las opciones estándar (single project / web app con backend separado / mobile+API) — el proyecto ya existe como una única app Next.js frontend-only sin backend (`webapp/`), con todo el "backend" siendo scripts Python generadores de JSON estático fuera de esta spec. Estructura real que toca esta feature:

```text
webapp/
├── app/                          # App Router (layout.tsx, page.tsx) — sin cambios
├── components/
│   └── CRMExpedientes.jsx        # Dashboard() (línea 215) se amplía in-place; se
│                                  # reutilizan Panel/KpiCard/Semaforo/Eyebrow ya
│                                  # existentes en el mismo fichero
├── lib/
│   ├── motorAsignacion.js        # sin cambios
│   ├── asignarJornada.js         # sin cambios (conExtras() se saca de CRMExpedientes.jsx
│   │                              # a disponibilidad.js, no vive aquí)
│   ├── disponibilidad.js         # NUEVO — extraído de conExtras() (ver research.md §2)
│   ├── disponibilidad.test.js    # NUEVO
│   ├── coberturaCategoria.js     # NUEVO — ver data-model.md
│   └── coberturaCategoria.test.js # NUEVO
├── data/                         # sin cambios — no se añade fuente de dato nueva
│   ├── agregados-reales.json     # reutilizado (equidad_carga)
│   ├── arbitros-200.json         # reutilizado (disponibleCategoriasInferiores, cat, catNivel)
│   └── ciclos-asignacion.json    # reutilizado (partidos del ciclo activo, categoriaMinima)
└── vitest.config.js              # NUEVO — configuración mínima, sin jsdom
```

**Structure Decision**: se extiende la app Next.js existente en `webapp/` sin crear módulos, rutas ni paquetes nuevos. El único fichero de UI que cambia es `components/CRMExpedientes.jsx` (función `Dashboard()`), siguiendo el patrón ya establecido del proyecto de mantener todas las pantallas en ese componente. La única adición estructural real es `lib/` (dos ficheros de cálculo puro + sus tests) y la configuración de Vitest — justificado en `research.md` porque es lógica de cálculo nueva sujeta al estándar de tests de la constitución, y porque el concepto de "disponible" debe compartirse entre Dashboard y Designación sin duplicarse.

## Complexity Tracking

Sin violaciones — no aplica (ver tabla de Constitution Check arriba).
