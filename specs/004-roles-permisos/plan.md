# Implementation Plan: Cuentas de usuario, roles y panel de administración

**Branch**: `004-roles-permisos` | **Date**: 2026-07-29 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/004-roles-permisos/spec.md`

## Summary

Sustituye el selector "ver como" sin login (FR-012 de `002-disponibilidad-arbitro`) por cuentas reales: Supabase Auth con enlace mágico (sin contraseña), un panel de administración para que el admin cree/edite/dé de baja cuentas y consulte su historial de uso, y cinco roles (`admin`, `directiva`, `informadores`, `arbitros`, `administrativos`) que determinan qué ve y puede hacer cada persona. Es la primera spec del proyecto que necesita código servidor real — hasta ahora todo era navegador hablando directo con Supabase mediante la clave pública; dar de alta o de baja una cuenta exige la Admin API de Supabase, que exige la clave `service_role`, que no puede vivir en el navegador. **Esta spec se planifica ahora pero no se implementa hasta Fase 2** del rollout (`spec.md`, Assumptions) — el objetivo de este plan es dejar el diseño listo para entonces, no construir nada todavía.

## Technical Context

**Language/Version**: JavaScript (JSX) para `lib/`/componentes existentes, mismo patrón que 001-003. **Nuevo**: TypeScript para el único Route Handler server-side (`app/api/admin/usuarios/route.ts`), siguiendo la convención ya presente en `app/layout.tsx`/`app/page.tsx` (el `app/` del proyecto ya es `.tsx`, solo `components/`/`lib/` son `.jsx`/`.js`). Next.js 16.2.11, React 19.2.4.

**Primary Dependencies**: ninguna nueva — `@supabase/supabase-js` (ya instalado) cubre tanto el cliente de navegador (`signInWithOtp`, sesión) como el cliente servidor con `service_role` del Route Handler (mismo paquete, cliente distinto). No se añade `@supabase/ssr`: no hay Server Components/Actions que necesiten leer la sesión, la app sigue siendo un SPA cliente (`research.md` §1).

**Storage**: Supabase (Postgres + Auth), ya en uso desde 003. Dos tablas nuevas (`usuarios`, `historial_uso`) + una columna nueva (`usuario_id`) en las tres tablas de 003 — ver `data-model.md`. `auth.users` (gestionada por Supabase) es la identidad; `usuarios` es el perfil/rol sobre ella.

**Testing**: Vitest para lógica pura sin red — la Matriz de permisos por rol (`data-model.md`) como funciones puras testeables (`puedeVer(rol, seccion)`), y la regla FR-014 ("nunca sin admin activo") como función pura sobre una lista de cuentas. El Route Handler y el flujo de login real se verifican contra el proyecto Supabase real en `quickstart.md`, mismo criterio que 003 (sin entorno de Postgres de test separado).

**Target Platform**: navegador (SPA), + el único endpoint server-side corriendo en el runtime Node de Vercel (no Edge — la Admin API de Supabase no es compatible con Edge Runtime).

**Project Type**: web-app frontend con backend gestionado (Supabase), **y ahora también un punto de backend propio** (un Route Handler) — primera vez que el proyecto tiene código que no es ni JSON estático ni navegador-hablando-con-Supabase.

**Performance Goals**: N/A explícito — volumen del prototipo (unas pocas decenas de cuentas en Fase 2/3) trivial.

**Constraints**: Principios I-VII de la constitución (ver Constitution Check). Next.js 16 renombró `middleware.ts` a `proxy.ts` y su propia documentación desaconseja usarlo como única defensa de autorización (`research.md` §7) — no se usa en este diseño, la autorización real vive en RLS.

**Scale/Scope**: 2 tablas nuevas, 1 columna nueva en 3 tablas existentes, 1 Route Handler (primera pieza server-side del proyecto), 2 módulos de repositorio cliente (`sesionRepo.js`, más lectura de `historial_uso` desde el panel admin), 1 panel de administración nuevo en la UI, 5 roles aplicados a toda la navegación existente. **No incluye** crear ninguna cuenta real todavía (Fase 1 sigue sin cuentas, `spec.md`).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principio | Evaluación |
|---|---|
| I. FFCV cliente único | N/A — no se toca theming ni multi-tenant. |
| II. El técnico decide, el sistema informa | N/A directo (no hay decisión de designación/evaluación nueva aquí) — pero FR-002 (nadie se autorregistra, solo el admin da de alta) es la misma filosofía de control humano aplicada a quién entra al sistema. |
| III. Todo indicador es explicable | N/A — no se añade ningún indicador calculado. |
| IV. Gestión no es clasificación | N/A — no se toca ningún score. |
| V. Sin comparación directa | **Cumple, y lo refuerza**: FR-006 impide a un árbitro navegar a la ficha de otro, a nivel de cuenta además de a nivel de interfaz (con el límite conocido de research.md §6). |
| VI. Dato real y sintético distinguibles | **Cumple, es explícito en la propia spec**: FR-012 bloquea crear cuentas de árbitro con el email sintético de `arbitros-200.json` — se documenta también, sin disimularlo, el límite de research.md §6 (roster aún en JSON estático) en vez de prometer una protección de datos que esta spec por sí sola no da. |
| VII. Nada sobre persistencia que no existe | **Cumple**: ninguna acción de cuenta (crear, banear, cambiar rol) se expone en la UI sin persistencia real detrás desde el primer momento en que se implemente — mismo criterio que ya resolvió 003 para notas/designaciones/disponibilidad. |

**Resultado**: sin violaciones de principios. Dos decisiones de alcance sí requieren justificación explícita, no por contradecir un principio sino por ser la primera vez que el proyecto las necesita — ver Complexity Tracking.

## Project Structure

### Documentation (this feature)

```text
specs/004-roles-permisos/
├── plan.md                              # This file (/speckit-plan command output)
├── research.md                          # Phase 0 output
├── data-model.md                        # Phase 1 output
├── quickstart.md                        # Phase 1 output
└── contracts/
    ├── admin-usuarios-api.md            # Phase 1 output — Route Handler server-side
    └── sesion-repo.md                   # Phase 1 output — repo cliente (login, perfil propio)
    # tasks.md: Phase 2 output (/speckit-tasks) — pendiente, y deliberadamente
    # no se genera hasta que arranque Fase 2 del rollout (spec.md)
```

### Source Code (repository root)

Extiende `webapp/` sin nuevos paquetes ni monorepo. Único cambio estructural real: primer código bajo `app/api/`.

```text
webapp/
├── .env.local                       # + SUPABASE_SECRET_KEY (NUEVO, server-only, nunca NEXT_PUBLIC_)
├── .env.example                     # + plantilla de SUPABASE_SECRET_KEY sin secreto
├── app/
│   ├── api/
│   │   └── admin/
│   │       └── usuarios/
│   │           └── route.ts         # NUEVO — ver contracts/admin-usuarios-api.md
│   └── page.tsx                     # SIN CAMBIOS DE RUTA — el callback del enlace mágico
│                                     # lo resuelve el propio cliente de Supabase en la
│                                     # página existente (research.md §1), no una ruta nueva
├── lib/
│   ├── sesionRepo.js                # NUEVO — ver contracts/sesion-repo.md
│   ├── sesionRepo.test.js           # NUEVO — solo la parte pura si la hay
│   ├── permisos.js                  # NUEVO — Matriz de permisos (data-model.md) como funciones puras
│   ├── permisos.test.js             # NUEVO
│   ├── anotacionesRepo.js           # MODIFICADO — insert incluye usuario_id
│   ├── designacionesRepo.js         # MODIFICADO — idem
│   └── disponibilidadRepo.js        # MODIFICADO — idem
├── components/
│   └── CRMExpedientes.jsx           # MODIFICADO — pantalla de login, panel de administración
│                                     # nuevo, selector "ver como" (FR-012 de 002) retirado y
│                                     # sustituido por el rol real de sesionRepo.obtenerPerfilActual()
├── package.json                     # sin nuevas dependencias
└── supabase/
    └── migrations/
        └── 0005_usuarios_roles.sql  # NO SE CREA EN ESTA SPEC — diseño en data-model.md,
                                      # migración real cuando arranque la implementación
                                      # (Fase 2), mismo criterio que research.md §5
```

**Structure Decision**: se extiende `webapp/` igual que 001-003, con una única pieza nueva de tipo distinto: `app/api/admin/usuarios/route.ts`, el primer código del proyecto que corre en servidor con un secreto que el navegador nunca ve. Todo lo demás sigue el patrón de repositorio en `lib/` ya establecido.

## Complexity Tracking

Sin violaciones del Constitution Check. Se documentan, no obstante, dos decisiones que amplían el alcance técnico del proyecto más allá de lo que 001-003 necesitaron:

| Decisión | Por qué se necesita | Alternativa más simple rechazada porque |
|---|---|---|
| Primer código server-side del proyecto (Route Handler + `service_role`) | Crear/banear cuentas de Supabase Auth exige la Admin API, que exige `service_role`, que no puede vivir en el navegador (research.md §3) | Gestionar cuentas a mano desde el dashboard de Supabase sin panel propio — rechazado porque la spec pide explícitamente un panel con historial de uso integrado (US2), y porque no habría dónde aplicar el chequeo FR-014 (nunca sin admin activo) de forma centralizada |
| Roster de árbitros sigue en JSON estático — FR-006/SC-005 solo se cumplen a nivel de interfaz, no de acceso a datos (research.md §6) | Resolverlo de verdad exigiría migrar el roster completo a una tabla con RLS, fuera del alcance que Roberto ha pedido para esta spec | Acoplar esa migración aquí haría 004 desproporcionadamente más grande sin habérselo pedido; se documenta el límite explícitamente en vez de prometer una protección que esta spec no da (Principio VI) — mismo criterio ya usado con la RLS permisiva de 0001-0004 |
