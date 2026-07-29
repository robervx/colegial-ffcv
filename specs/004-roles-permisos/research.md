# Research: Cuentas de usuario, roles y panel de administración

## 1. Mecanismo de login — enlace mágico (Supabase Auth, PKCE)

**Decisión**: `supabase.auth.signInWithOtp({ email, options: { emailRedirectTo, shouldCreateUser: false } })`, con la app siguiendo usando `createClient()` normal del lado del navegador (flujo PKCE por defecto, `detectSessionInUrl: true`). El cliente ya detecta el `?code=` de la URL al volver del enlace y crea la sesión solo — no hace falta ninguna ruta nueva en `app/` para el callback, la propia página única (`app/page.tsx` → `CRMExpedientes`) ya sirve como destino.

**Por qué**: la app es hoy un SPA 100% cliente (`"use client"` en `CRMExpedientes.jsx`, sin rutas server ni Server Actions) — mantener el login también resuelto en cliente evita introducir Server Components/Actions solo para esto, que sería una segunda arquitectura conviviendo con la actual sin necesidad real.

**`shouldCreateUser: false` es la pieza que implementa FR-002** (nadie se autorregistra): por defecto Supabase crea la cuenta de `auth.users` la primera vez que alguien pide un enlace a un email nuevo; desactivarlo hace que pedir un enlace a un email sin cuenta ya creada por el admin falle con un error claro (Historia 1, Acceptance Scenario 3) en vez de dar de alta a quien lo pida.

**Alternativas consideradas**: email+contraseña (rechazado explícitamente en el Input de la spec, "sin contraseña"); NextAuth/Auth.js u otro proveedor (rechazado — Supabase Auth ya viene con el proyecto existente, añadir un segundo sistema de identidad sería complejidad especulativa sin beneficio, mismo criterio del Principio I de la constitución aplicado aquí por analogía).

## 2. Expiración de sesión (US1, Acceptance Scenario 2)

**Decisión**: usar el ajuste nativo de Supabase Auth **"Session Timebox"** (Dashboard → Authentication → Sessions) en vez de código propio — fuerza reautenticación pasado un tiempo fijo desde el login, independientemente de la actividad. Es un ajuste de proyecto (como los de RLS o los de Deployment Protection en Vercel), no una tarea de ingeniería.

**Por qué**: el SDK de `supabase-js` refresca la sesión sola de forma indefinida mientras el token de refresco siga vivo (`autoRefreshToken: true` por defecto) — sin tocar nada, la sesión no caducaría nunca, lo que incumpliría directamente el Acceptance Scenario 2. Timebox resuelve esto sin escribir lógica de expiración a mano (JWT propio, cookies firmadas, etc.), que sería reinventar algo que el proveedor de auth ya resuelve.

**Alternativas consideradas**: sesión propia con JWT firmado y cookie `httpOnly` (patrón que documenta la guía oficial de Next.js 16 para auth "hecha a mano") — rechazado, es la complejidad que se evita precisamente por depender de un proveedor de auth (Supabase) en vez de construir una propia.

## 3. Alta/gestión de cuentas por el admin — Route Handler + `service_role`, primera pieza server-side del proyecto

**Decisión**: crear un único Route Handler (`app/api/admin/usuarios/route.ts`, métodos `POST`/`PATCH`/`DELETE`) que use la clave `service_role` (Supabase la llama hoy "Secret key") para llamar a `supabase.auth.admin.createUser/updateUserById/...`. Esta clave vive **solo** en variable de entorno de servidor (`SUPABASE_SECRET_KEY`, sin prefijo `NEXT_PUBLIC_`) — nunca llega al navegador. El propio Route Handler valida primero, con la petición ya autenticada (token del usuario que llama, verificado con `supabase.auth.getUser(token)` usando la clave pública), que quien pide la acción tiene rol `admin` en la tabla `usuarios` — dos comprobaciones, no una (mismo patrón de "two-tier security check" que documenta la propia guía de auth de Next.js 16).

**Por qué es la decisión técnica más grande de esta spec**: hasta hoy el proyecto no tiene ni una sola línea de código servidor — todo es JSON estático + navegador hablando directo con Supabase usando la clave pública, protegido solo por RLS (`decisiones-producto.md` §18, `research.md` de 003 §3). Crear o eliminar una cuenta de Supabase Auth **requiere sí o sí** la Admin API, que **requiere sí o sí** `service_role` — no existe forma de hacerlo con la clave pública, ni siquiera con RLS bien diseñado (RLS protege filas de tablas, no la gestión de `auth.users`). Es la primera vez que "no hay backend" deja de ser cierto para el proyecto.

**Alternativas consideradas**: hacerlo a mano desde el propio dashboard de Supabase (Authentication → Users → Invite) sin construir panel — descartado porque la spec pide explícitamente un panel dentro de la app con historial de uso integrado (US2), y porque el admin de este proyecto no es necesariamente cómodo operando directamente en el dashboard de un proveedor externo cada vez.

## 4. Baja de cuentas — "banear", no borrar (integridad del historial)

**Decisión**: la acción "Eliminar cuenta" del panel (FR-010) ejecuta `supabase.auth.admin.updateUserById(id, { ban_duration: '876000h' })` (~100 años, "para siempre" en la práctica) en vez de `deleteUser`. La fila de `usuarios` (perfil/rol) tampoco se borra, se marca (`activo = false`). Login queda bloqueado igual que con un borrado real (Acceptance Scenario 3 de Historia 2), pero las referencias ya escritas en `anotaciones.usuario_id`/`designaciones.usuario_id`/`declaraciones_disponibilidad.usuario_id`/`historial_uso.usuario_id` (FR-009, FR-011) no quedan huérfanas ni pierden su autor.

**Por qué**: el proyecto ya tiene un principio establecido — "nunca se sobrescribe" (append-only, `anotaciones`/`designaciones`/`declaraciones_disponibilidad`, `research.md` de 003 §4) y "todo indicador con su fuente visible" (Principio III). Borrar de verdad una cuenta de `auth.users` rompería silenciosamente ese historial (¿qué autor mostraría una nota antigua de alguien ya borrado?) — banear consigue el mismo efecto observable para el usuario final ("ya no puede entrar") sin ese coste.

**Alternativas consideradas**: `deleteUser` con `usuario_id` como `ON DELETE SET NULL` en las FK — rechazado, perdería la trazabilidad de quién hizo cada acción histórica, justo lo que FR-009/FR-011 piden garantizar.

## 5. RLS por rol — diseño ahora, migración cuando arranque Fase 2

**Decisión**: el esquema de RLS por rol (función SQL `usuario_rol()` que resuelve el rol del `auth.uid()` actual contra `usuarios`, usada en cada política) se documenta en `data-model.md` de esta spec, pero **no se escribe la migración `.sql` todavía** — mismo criterio que ya se aplicó al resto de esta spec: Fase 1 no se implementa (`spec.md`, Corrección de alcance). Es exactamente el disparador ya anotado en `docs/sprints.md` → "Deuda técnica diferida a propósito" → RLS por rol: "cuando arranque su implementación (Fase 2/3)".

**Por qué**: escribir la migración ahora sin auth real todavía activa sería o bien no aplicable (no hay `auth.uid()` real que probar) o, peor, dejar una política a medio construir en producción. El diseño completo sí se deja listo (ver `data-model.md`) para que implementarlo cuando llegue el momento sea "rellenar el contrato ya escrito", no rediseñar — mismo patrón que ya funcionó con `disponibilidad-repo.md` de 002 (`decisiones-producto.md` §18).

## 6. Límite conocido: el roster de árbitros sigue siendo JSON estático — FR-006/SC-005 solo se cumplen a nivel de interfaz, no de acceso a datos

**Hallazgo, no solo decisión** (documentado explícitamente en vez de disimulado, Principio VI): `arbitros-200.json` (y su futura ampliación a ~1208, Sprint 3) se importa hoy de forma estática y viaja entero en el bundle de JavaScript que recibe cualquier navegador, sea cual sea su rol. FR-006 exige que un árbitro "nunca vea la ficha de otro árbitro" — con esta arquitectura, esa restricción solo puede implementarse **ocultando en la interfaz** las fichas ajenas (filtrando en el componente qué se renderiza), no impidiendo que el dato llegue al navegador. Alguien con conocimientos técnicos y una cuenta de árbitro real podría inspeccionar el bundle o la memoria de la página y ver el JSON completo de los ~1208 árbitros.

**Por qué se documenta y no se resuelve aquí**: resolverlo de verdad exige mover el roster de árbitros de JSON estático a una fuente que sí pueda filtrar por servidor (tabla en Supabase con RLS, o un Route Handler que sirva solo el subconjunto autorizado) — es decir, hacer para el roster lo que Sprint 3 ya tiene pendiente (ampliar a ~1208 reales) más una migración de almacenamiento que esa tarea no contemplaba. Acoplar ambas cosas en 004 la haría desproporcionadamente más grande sin que Roberto lo haya pedido. Se deja como **limitación conocida y explícita** (ver Complexity Tracking de `plan.md`), con el mismo criterio que ya se aplicó a la política RLS permisiva de 0001-0003: un límite real, declarado, no una protección que aparenta ser más fuerte de lo que es.

**Nota importante para no sobre-reaccionar**: esto no es peor que la situación actual — hoy, sin ningún tipo de cuenta, cualquier visitante con la contraseña única de Vercel ya ve el JSON completo. 004 no introduce esta exposición, la hereda; lo que 004 no puede es prometer haberla resuelto solo con roles de interfaz.

## 7. Next.js 16: `proxy.ts` (antes `middleware.ts`) — evaluado y descartado por ahora

**Decisión**: no se usa `proxy.ts` en el diseño de esta spec. La guía oficial de Next.js 16 (`node_modules/next/dist/docs/01-app/02-guides/authentication.md`, sección "Optimistic checks with Proxy") es explícita: Proxy sirve para redirecciones optimistas basadas en cookie, pero "no debe ser tu única línea de defensa" — la protección real debe vivir cerca de la fuente de datos. Como esta app no tiene rutas server que proteger (una sola página, todo el control de qué se ve por rol ocurre ya dentro del componente cliente) y la protección real de los datos ya vive en RLS/Postgres (decisión §5) y no en Next.js, añadir `proxy.ts` no aportaría una capa de seguridad adicional real — solo una redirección cosmética que el propio fabricante avisa que no basta.

**Por qué es relevante dejarlo escrito**: Next.js 16 renombró `middleware.ts` a `proxy.ts` (mismo comportamiento, nombre nuevo) — quien retome esta spec debe saber que cualquier ejemplo o tutorial que hable de "middleware" para auth en Next.js está desactualizado para esta versión del proyecto, y que aun así no era el mecanismo elegido aquí.
