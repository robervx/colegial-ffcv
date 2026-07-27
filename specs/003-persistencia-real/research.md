# Research: Persistencia real (Sprint 1 + Sprint 2 fusionados)

## 1. Cliente de Supabase: un único módulo, clave publicable, sin `@supabase/ssr`

**Decisión**: `webapp/lib/supabaseClient.js` crea un único cliente con `createClient()` de `@supabase/supabase-js`, usando `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (ya en `webapp/.env.local`). No se añade `@supabase/ssr` ni gestión de sesión de servidor — todas las llamadas de esta spec son desde componentes cliente (`"use client"`, ya el patrón de todo `CRMExpedientes.jsx`), sin autenticación real todavía (ver `spec.md` Assumptions).

**Racional**: `@supabase/ssr` resuelve sincronización de sesión de usuario entre servidor y cliente — no aplica aquí porque no hay login. Añadirlo sería complejidad sin problema que resolver todavía.

**Alternativas consideradas**: Route Handlers de Next.js como capa intermedia entre la UI y Supabase — rechazado por ahora: con RLS permisivo (§3) y sin secretos que proteger en el servidor (la clave publicable está diseñada para ir en el cliente), la capa de repositorio (§6) ya da la indirección necesaria sin el coste de mantener endpoints propios. Se reconsideraría si more adelante hace falta lógica de servidor que no pueda vivir en el cliente (p. ej. validaciones que no se puedan hacer con RLS).

## 2. Esquema: solo las entidades de escritura, roster sigue en JSON

**Decisión**: tres tablas nuevas en el esquema `public` de Supabase — `anotaciones`, `designaciones`, `declaraciones_disponibilidad` — ver `data-model.md`. Ninguna tabla para árbitros, equipos, partidos o ciclos: siguen siendo los JSON estáticos ya existentes (`arbitros-200.json`, `ciclos-asignacion.json`), consistente con la Assumption ya fijada en `spec.md`.

**Racional**: son las únicas entidades que un usuario escribe en tiempo de uso (FR-001, FR-002, FR-005 de `spec.md`); el resto es idéntico para cualquiera que abra la misma versión desplegada de la app, así que no necesita vivir en una base de datos para cumplir el objetivo de "varios dispositivos ven lo mismo".

**Consecuencia de diseño**: `arbitro_id`, `partido_id` y `ciclo_id` en las tablas nuevas son **referencias lógicas** a IDs del JSON (un `integer` o `text` sin `FOREIGN KEY` real de Postgres, porque la tabla referenciada no existe en la base de datos) — la validez de esas referencias se comprueba en la capa de aplicación (el repositorio), no con una constraint de base de datos. Se documenta explícitamente para que no se lea como un descuido.

## 3. RLS: activado con política permisiva, documentado como límite conocido

**Decisión**: Row Level Security **activado** en las tres tablas (nunca dejarlas sin RLS, que es el estado por defecto y más inseguro de Supabase), con una política permisiva única (`USING (true)`, `WITH CHECK (true)`) para el rol `anon` — permite leer y escribir sin restricción todavía.

**Racional**: hoy no hay autenticación real (`spec.md` Assumptions), así que no hay ningún criterio de "quién puede escribir qué" que una política más fina pueda expresar sin inventarlo. La primera barrera de acceso real es el propio despliegue: Vercel con contraseña (decisión de Roberto, `decisiones-producto.md` §18). Activar RLS con política abierta dictada explícitamente dice la verdad sobre el estado actual (Principio VI: no aparentar más seguridad de la que hay) sin bloquear el uso del prototipo. Se estrecha el día que exista un modelo de roles/autenticación real (ver `002-disponibilidad-arbitro` FR-012, selector de rol sin login, primer paso hacia ese modelo).

**Alternativas consideradas**: RLS desactivado — funcionalmente idéntico hoy, pero técnicamente indistinguible de "no se pensó en ello"; activarlo con política explícita dice lo mismo sin ambigüedad y no cuesta nada más migrar después.

## 4. Patrón "vigente = la entrada más reciente" para las tres tablas

**Decisión**: las tres tablas son de solo-añadir (append-only, igual que ya decidió `002-disponibilidad-arbitro` para su log) — nunca se actualiza ni se borra una fila. El estado "vigente" de una nota no existe como concepto (todas las notas se muestran, es un histórico); el estado vigente de una designación por partido, o de una disponibilidad por árbitro+ciclo, es la fila con `creado_en`/`decidido_en` más reciente para esa clave lógica.

**Racional**: es exactamente el mismo patrón ya validado en `002-disponibilidad-arbitro` (`data-model.md`, `LogDisponibilidad`) — reutilizarlo en `designaciones` da consistencia y resuelve directamente el edge case de `spec.md` ("dos personas deciden el mismo partido casi a la vez": ninguna escritura se pierde, la última decidida es la vigente, con rastro de ambas).

## 5. Migrar el stub de `lib/disponibilidadRepo.js` a implementación real, sin romper el contrato

**Decisión**: las cuatro funciones de `lib/disponibilidadRepo.js` (`obtenerLog`, `obtenerVigente`, `declararDisponibilidad`, `calcularPatronImplicacion`) se reimplementan contra Supabase, **con la misma firma exacta** que ya define `specs/002-disponibilidad-arbitro/contracts/disponibilidad-repo.md`. `NoImplementadoError` deja de lanzarse. `calcularPatronImplicacion` sigue envolviendo `lib/patronImplicacion.js` (ya construida y testeada, sin cambios) sobre el resultado real de `obtenerLog`.

**Racional**: es exactamente el punto que `research.md` de 002 (§1) anticipó — "rellenar el contrato ya definido, no rediseñar nada". Los tests de `lib/patronImplicacion.js` y `lib/reglaFestivo.js` siguen valiendo tal cual (lógica pura, no dependen de dónde vive el log).

## 6. Nuevos repositorios con el mismo patrón: `anotacionesRepo.js`, `designacionesRepo.js`

**Decisión**: dos módulos nuevos en `lib/`, mismo estilo que `disponibilidadRepo.js` — funciones async que hablan con Supabase, nunca componentes ni la UI directamente. `designacionesRepo.js` incluye una función de fusión (`conDecisionVigente(resultadosMotor, designacionesDelCiclo)`) que combina el resultado en vivo de `asignarJornada()` con la última designación guardada por partido, para que la UI muestre la decisión real cuando existe (FR-004 de `spec.md`: una designación confirmada no se recalcula sola).

**Racional**: mantiene la UI desacoplada de Supabase (igual que ya se hizo para disponibilidad) — si el día de mañana cambia el motor de persistencia, solo cambian estos ficheros.

## 7. Migraciones como ficheros SQL versionados, sincronizados con GitHub

**Decisión**: `supabase/migrations/NNNN_descripcion.sql` en la raíz del repo (convención estándar de Supabase CLI), una migración por tabla/cambio de esquema. El repo ya está conectado a GitHub (`robervx/colegial-ffcv`, privado) y Roberto está conectando la integración GitHub↔Supabase desde el propio dashboard — con eso, las migraciones commiteadas se sincronizan automáticamente.

**Racional**: es el flujo que Supabase espera cuando se conecta a GitHub, y dan control de versiones real sobre el esquema (Principio de la constitución: nada se construye sobre lo que no está documentado/versionado).
