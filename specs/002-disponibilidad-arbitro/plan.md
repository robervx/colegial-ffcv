# Implementation Plan: Disponibilidad de árbitro con registro de implicación

**Branch**: `002-disponibilidad-arbitro` | **Date**: 2026-07-27 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/002-disponibilidad-arbitro/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command; its definition describes the execution workflow.

## Summary

Diseña el selector de disponibilidad por ciclo (lesión/baja justificada/urgencia/solo categoría propia/festivo con 15 días de antelación) con log de registro y doble lectura (operativa para 001-dashboard-operativo, evaluativa solo para comité/evaluador). **Este plan deja el diseño completo, pero la implementación queda bloqueada hasta Sprint 1** (persistencia real, ver spec.md Assumptions y research.md §1) — la decisión de Roberto fue avanzar el plan ahora sin esperar a Sprint 1. Enfoque técnico: un contrato de repositorio agnóstico a la tecnología (`contracts/disponibilidad-repo.md`) que hoy solo existe como stub sin implementación, más tres piezas de lógica pura que sí se pueden construir y testear ya (`lib/reglaFestivo.js`, `lib/patronImplicacion.js`, y el campo `fechaInicioISO` nuevo en `ciclos-asignacion.json`). El resto (UI de declaración, selector de rol, sustitución de la disponibilidad sintética de 001) queda diseñado en detalle pero no se construye hasta que el repositorio real exista.

## Technical Context

**Language/Version**: JavaScript (JSX) para componentes y `lib/`, mismo patrón que `001-dashboard-operativo`. Next.js 16.2.11, React 19.2.4.

**Primary Dependencies**: ninguna nueva. Se reutiliza Vitest (introducido en 001) para la lógica pura construible ya. Cuando exista Sprint 1, la tecnología de acceso a datos detrás del repositorio la elige esa decisión, no esta spec (ver research.md §1).

**Storage**: diferido a Sprint 1 — no se fija aquí ninguna tecnología. Este plan define el contrato de datos (`data-model.md`) y el contrato de repositorio (`contracts/disponibilidad-repo.md`) de forma agnóstica; Sprint 1 implementa el repositorio real detrás de esas firmas.

**Testing**: Vitest para `lib/reglaFestivo.js`, `lib/patronImplicacion.js` y el repositorio-stub (`lib/disponibilidadRepo.js`, que debe lanzar `NoImplementadoError` de forma explícita hasta Sprint 1). Sin tests end-to-end de UI todavía — no hay UI real que probar hasta que el repositorio deje de ser un stub (ver `quickstart.md`).

**Target Platform**: navegador de escritorio, mismo alcance que 001. La UI de esta feature (selector en la ficha, selector "ver como") no se construye en esta ronda — queda diseñada pero no implementada, ver Summary.

**Project Type**: web-app frontend-only, misma arquitectura que el resto de `webapp/` — con la salvedad de que esta feature es la primera que requiere una capa de persistencia real detrás, hoy inexistente.

**Performance Goals**: N/A explícito — mismo volumen trivial que 001 (~200 árbitros, unos pocos ciclos).

**Constraints**: Principios I-VII de `.specify/memory/constitution.md` (ver Constitution Check); en particular Principio VII es la razón del bloqueo de implementación, y Principio IV (gestión no es clasificación) condiciona todo el diseño de `PatronImplicacion` (FR-009/FR-010: nunca una cifra que alimente `scoreB1`).

**Scale/Scope**: contrato de datos + contrato de repositorio + 3 módulos de lógica pura construibles ya. La UI completa (selector de declaración, selector de rol, integración con la ficha y con el Dashboard de 001) queda diseñada en este plan pero fuera del alcance de construcción hasta Sprint 1.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principio | Evaluación |
|---|---|
| I. FFCV cliente único | N/A — no se toca theming ni multi-tenant. |
| II. El técnico decide, el sistema informa | Cumple — el comité sigue siendo quien declara/valida disponibilidad en nombre del árbitro cuando aplica (FR-001); `PatronImplicacion` es contexto para que el comité juzgue, nunca una decisión automática (Assumptions de spec.md: sin umbral cerrado, juicio humano). |
| III. Todo indicador es explicable | Cumple por diseño — `PatronImplicacion` (data-model.md) son cifras crudas con su origen siempre visible (conteos directos sobre el log), nunca un score compuesto opaco. |
| IV. Gestión no es clasificación | **Cumple, y es el principio que más ha condicionado este diseño** — FR-009/FR-010 prohíben explícitamente que la disponibilidad o su patrón alimenten `scoreB1` o cualquier ranking; `PatronImplicacion` (data-model.md) se diseña deliberadamente sin campo `score`/`nivel`, solo conteos descriptivos. |
| V. Sin comparación directa | Cumple — no hay ninguna vista que compare la disponibilidad de dos árbitros cara a cara; el patrón se muestra por árbitro, en su propia ficha. |
| VI. Real y sintético distinguibles | Cumple — esta feature existe precisamente para sustituir la disponibilidad sintética de 001 por declaraciones reales (research.md §4); mientras el repositorio sea un stub, la UI no se activa (no hay riesgo de mostrar datos falsos como reales). |
| **VII. Nada sobre persistencia que no existe** | **Gate central de este plan.** La spec ya documenta el bloqueo (Assumptions). Este plan lo respeta activamente: ninguna UI que "parezca guardar" se construye todavía; el repositorio es un stub que falla explícitamente (`NoImplementadoError`) en vez de simular persistencia con `localStorage` o estado de React — evita repetir el defecto ya señalado de "Guardar nota". Ver Complexity Tracking para la justificación formal de avanzar el plan pese al bloqueo. |

**Resultado**: sin violaciones activas — el diseño está construido explícitamente para no violar el Principio VII pese a que la feature completa dependa de resolverlo. Ver Complexity Tracking para documentar por qué se avanza igualmente con el plan.

## Project Structure

### Documentation (this feature)

```text
specs/002-disponibilidad-arbitro/
├── plan.md                          # This file (/speckit-plan command output)
├── research.md                      # Phase 0 output (/speckit-plan command)
├── data-model.md                    # Phase 1 output (/speckit-plan command)
├── quickstart.md                    # Phase 1 output (/speckit-plan command)
├── contracts/
│   └── disponibilidad-repo.md       # Phase 1 output — contrato agnóstico a la tecnología de persistencia
└── tasks.md                         # Phase 2 output (/speckit-tasks) — NO se genera todavía, ver Summary
```

### Source Code (repository root)

Misma app Next.js frontend-only que `001-dashboard-operativo` (`webapp/`), sin nuevas rutas ni paquetes. Lo nuevo de esta feature, dividido en lo construible ya y lo diferido:

```text
webapp/
├── lib/
│   ├── reglaFestivo.js              # NUEVO, construible ya — valida antelación de 15 días (FR-004)
│   ├── reglaFestivo.test.js         # NUEVO, construible ya
│   ├── patronImplicacion.js         # NUEVO, construible ya — cálculo puro sobre un log (FR-009/FR-010)
│   ├── patronImplicacion.test.js    # NUEVO, construible ya
│   ├── disponibilidadRepo.js        # NUEVO, construible ya como STUB — lanza NoImplementadoError,
│   │                                 # implementación real detrás de contracts/disponibilidad-repo.md
│   │                                 # queda para Sprint 1
│   ├── disponibilidadRepo.test.js   # NUEVO, construible ya (verifica el comportamiento del stub)
│   └── coberturaCategoria.js        # DIFERIDO — cambio de una línea cuando exista el repo real
│                                     # (research.md §4), no se toca en esta ronda
├── components/
│   └── CRMExpedientes.jsx           # DIFERIDO — selector de disponibilidad en la ficha, selector
│                                     # "ver como: árbitro/comité", panel de log y de PatronImplicacion;
│                                     # nada de esto se construye hasta que disponibilidadRepo.js
│                                     # tenga una implementación real detrás (Sprint 1)
└── generar_jornadas.py              # AMPLIACIÓN, construible ya — añade fechaInicioISO a cada ciclo
                                      # de ciclos-asignacion.json (data-model.md, "Ciclo")
```

**Structure Decision**: se extiende `webapp/` sin nuevos paquetes, igual que 001. La novedad estructural es que, por primera vez, una parte del árbol (`lib/coberturaCategoria.js`, `components/CRMExpedientes.jsx`) se documenta como **diferida** en vez de implementarse en la misma ronda que su plan — consecuencia directa del Principio VII, no una costumbre nueva del proyecto.

## Complexity Tracking

No hay violaciones activas del Constitution Check (tabla de arriba) — todos los principios se cumplen tal como está diseñado. Lo que sí requiere justificación explícita es **avanzar el plan de una feature cuya implementación completa está bloqueada**, en vez de esperar a Sprint 1 para todo:

| Decisión | Por qué se necesita | Alternativa más simple rechazada porque |
|---|---|---|
| Diseñar y documentar `contracts/disponibilidad-repo.md` + `data-model.md` ahora, sin repositorio real detrás | Roberto decidió explícitamente (27 jul 2026) avanzar el plan ahora para no perder el hilo de la sesión y dejar el diseño listo para cuando Sprint 1 exista | Esperar a Sprint 1 para todo el plan dejaría sin documentar decisiones ya tomadas (visibilidad por rol, forma de `PatronImplicacion`, regla de los 15 días) que no dependen de la persistencia y se perderían del contexto de esta sesión |
| Construir `lib/reglaFestivo.js`, `lib/patronImplicacion.js` y `lib/disponibilidadRepo.js` (stub) como código real ya, antes de Sprint 1 | Es lógica pura, testeable, sin ningún riesgo de simular una acción "guardada" que no lo está (Principio VII habla de acciones de usuario, no de funciones sin UI) | No construirlas ahora obligaría a repetir este mismo análisis de diseño más adelante, sin ganar nada a cambio — el riesgo que el Principio VII quiere evitar no existe en código sin interfaz de usuario |
