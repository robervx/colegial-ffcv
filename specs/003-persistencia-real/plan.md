# Implementation Plan: Persistencia real (Sprint 1 + Sprint 2 fusionados)

**Branch**: `003-persistencia-real` | **Date**: 2026-07-27 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/003-persistencia-real/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command; its definition describes the execution workflow.

## Summary

Da persistencia real, por primera vez en el proyecto, a tres acciones de usuario: notas de seguimiento (US1), decisiones de designación — confirmar o cambiar candidato, con motivo obligatorio (US2) — y declaraciones de disponibilidad de `002-disponibilidad-arbitro` (US3). Backend: Supabase/Postgres (proyecto `colegial-ffcv`, ya creado por Roberto). Enfoque técnico: tres tablas nuevas de solo-añadir (`anotaciones`, `designaciones`, `declaraciones_disponibilidad`), con RLS activado y política permisiva documentada como límite conocido (sin autenticación real todavía); acceso desde la UI siempre a través de módulos de repositorio en `lib/` (mismo patrón ya validado en 002), nunca Supabase directamente desde componentes. El roster de árbitros/ciclos/partidos sigue siendo JSON estático — no se migra en esta spec.

## Technical Context

**Language/Version**: JavaScript (JSX) para componentes y `lib/`, mismo patrón que 001/002. Next.js 16.2.11, React 19.2.4.

**Primary Dependencies**: **nueva** — `@supabase/supabase-js` (cliente oficial). Sin `@supabase/ssr` (no hay sesión de servidor que sincronizar, ver research.md §1). Se reutiliza Vitest.

**Storage**: Supabase (Postgres gestionado) — decidido en `decisiones-producto.md` §18. Tres tablas nuevas, ver `data-model.md`. Sin FK reales hacia el roster (que sigue en JSON) — referencias lógicas, ver research.md §2.

**Testing**: Vitest para lógica pura sin dependencia de red (validación de motivo obligatorio, fusión `conDecisionVigente`, reglas ya existentes de `lib/reglaFestivo.js`/`lib/patronImplicacion.js`, sin cambios). Los repositorios que sí hablan con Supabase se verifican con el proyecto real en `quickstart.md` (no hay entorno de Postgres de test separado en esta spec — el volumen y el estado del prototipo no lo justifican todavía).

**Target Platform**: navegador, con foco explícito en multi-dispositivo (móvil para árbitro/informadores, escritorio para gestión) — es la razón de negocio de toda esta spec (`spec.md`, Input).

**Project Type**: web-app frontend con backend gestionado (Supabase) — primera vez que el proyecto dependeix de un servicio externo real, no solo JSON estático generado localmente.

**Performance Goals**: N/A explícito — volumen del prototipo (200 árbitros, unos pocos ciclos) trivial para Postgres.

**Constraints**: Principios I-VII de la constitución (ver Constitution Check). Principio VII es el que motiva toda la spec; Principio II condiciona el diseño de US2 (el sistema nunca decide por su cuenta, FR-004); Principio IV condiciona que `declaraciones_disponibilidad`/`designaciones` sigan sin alimentar ningún score (heredado de 002, sin cambios aquí).

**Scale/Scope**: 3 tablas nuevas, 3 módulos de repositorio (`anotacionesRepo.js`, `designacionesRepo.js`, `disponibilidadRepo.js` pasando de stub a real), 2 superficies de UI nuevas/ampliadas (Ficha → notas ya conectadas a Supabase; Designación inteligente → botones Confirmar/Cambiar nuevos), más lo ya diseñado de 002 (selector "ver como", selector de disponibilidad) que ahora se puede construir.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principio | Evaluación |
|---|---|
| I. FFCV cliente único | N/A — no se toca theming ni multi-tenant. |
| II. El técnico decide, el sistema informa | **Cumple, es el eje de US2** — el motor calcula y sugiere, pero nunca persiste una decisión por su cuenta; solo una acción humana explícita (Confirmar/Cambiar) escribe en `designaciones`, y una vez escrita no se recalcula sola (FR-004). Motivo obligatorio al cambiar de sugerido, validado también en el repositorio (FR-003), no solo en el formulario. |
| III. Todo indicador es explicable | N/A directo — esta spec no añade indicadores calculados nuevos (los de 001/002 no cambian de forma). |
| IV. Gestión no es clasificación | Cumple — ninguna de las tres tablas nuevas alimenta `scoreB1` ni ranking alguno; `declaraciones_disponibilidad` hereda esa restricción de 002 sin cambios. |
| V. Sin comparación directa | N/A — no se añade ninguna vista comparativa. |
| VI. Real y sintético distinguibles | Cumple — FR-006 explícito; el seed de notas/histórico sintético existente se carga etiquetado igual que hoy en el JSON (ver `quickstart.md`). |
| **VII. Nada sobre persistencia que no existe** | **Es el principio que esta spec resuelve.** Antes de esta spec, "Guardar nota" y cualquier futura acción de designación violarían este principio; después, no. RLS permisivo (research.md §3) es un límite documentado explícitamente, no una persistencia falsa — la acción sí persiste de verdad, lo que falta es control de acceso fino, y eso se declara abiertamente en vez de aparentar más seguridad de la que hay. |

**Resultado**: sin violaciones. La única decisión que requiere justificación explícita no es una violación de principio, sino de alcance (ver Complexity Tracking): fusionar Sprint 1 y Sprint 2 en una sola spec, más grande que 001/002.

## Project Structure

### Documentation (this feature)

```text
specs/003-persistencia-real/
├── plan.md                              # This file (/speckit-plan command output)
├── research.md                          # Phase 0 output (/speckit-plan command)
├── data-model.md                        # Phase 1 output (/speckit-plan command)
├── quickstart.md                        # Phase 1 output (/speckit-plan command)
├── contracts/
│   ├── anotaciones-repo.md              # Phase 1 output
│   └── designaciones-repo.md            # Phase 1 output
│   # disponibilidad-repo.md sigue en specs/002-disponibilidad-arbitro/contracts/ —
│   # el contrato no cambia, solo su implementación (research.md §5)
└── tasks.md                             # Phase 2 output (/speckit-tasks) — pendiente
```

### Source Code (repository root)

Misma app Next.js frontend-only (`webapp/`) que 001/002, con la primera dependencia real hacia un servicio externo (Supabase):

```text
webapp/
├── .env.local                       # YA CREADO — credenciales reales de Supabase (fuera de git)
├── .env.example                     # plantilla sin secretos, para nuevos colaboradores
├── lib/
│   ├── supabaseClient.js            # NUEVO — único punto de creación del cliente Supabase
│   ├── anotacionesRepo.js           # NUEVO — ver contracts/anotaciones-repo.md
│   ├── anotacionesRepo.test.js      # NUEVO (lógica pura testeable sin red, si la hay)
│   ├── designacionesRepo.js         # NUEVO — ver contracts/designaciones-repo.md
│   ├── designacionesRepo.test.js    # NUEVO — sobre todo conDecisionVigente() (pura)
│   └── disponibilidadRepo.js        # MODIFICADO — dejar de ser stub, misma firma
│       (disponibilidadRepo.test.js se reescribe: ya no comprueba NoImplementadoError,
│        comprueba comportamiento real contra Supabase, ver quickstart.md)
├── components/
│   └── CRMExpedientes.jsx           # MODIFICADO — Ficha (notas → anotacionesRepo),
│                                     # DesignacionInteligente/FilaJornada (botones
│                                     # Confirmar/Cambiar → designacionesRepo), y las
│                                     # piezas de UI de 002 (selector de disponibilidad,
│                                     # selector "ver como") que ya estaban diseñadas
├── package.json                     # + @supabase/supabase-js
└── supabase/
    └── migrations/
        ├── 0001_anotaciones.sql
        ├── 0002_designaciones.sql
        └── 0003_declaraciones_disponibilidad.sql
```

**Structure Decision**: se extiende `webapp/` sin nuevos paquetes. La única pieza estructural realmente nueva es `supabase/migrations/` (esquema versionado, sincronizado con GitHub — research.md §7) y `lib/supabaseClient.js` como único punto de entrada al backend — todo lo demás sigue el patrón de repositorio ya establecido en 002.

## Complexity Tracking

Sin violaciones del Constitution Check. Se documenta, no obstante, por qué esta spec es más grande que 001/002:

| Decisión | Por qué se necesita | Alternativa más simple rechazada porque |
|---|---|---|
| Fusionar Sprint 1 (backend) y Sprint 2 (flujo de decisión de designación) en una sola spec | Roberto lo decidió explícitamente (27 jul 2026, ver spec.md Assumptions) para que el prototipo sea testeable de principio a fin cuanto antes por otras personas, en vez de entregarlo en dos incrementos | Entregar solo el backend sin el flujo de Confirmar/Cambiar dejaría "Designación" igual de no-operativa que hoy para quien la pruebe — el valor de negocio más alto (Principio II) seguiría sin materializarse |
| RLS con política permisiva en vez de reglas de autorización por rol | No existe todavía ningún modelo de roles con autenticación real sobre el que basar una política más fina (`002-disponibilidad-arbitro` FR-012 es un selector de UI, no auth) | Diseñar RLS por rol ahora sería inventar una autorización que no existe — se revisita cuando haya autenticación real, sin necesidad de rediseñar el esquema |
