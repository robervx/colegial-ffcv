# Quickstart: validar 004-roles-permisos

Se ejecuta cuando arranque la implementación (Fase 2 de `spec.md` — no ahora). Requiere, además de lo ya configurado para 003:

- `SUPABASE_SECRET_KEY` en `.env.local` (server-only, nunca `NEXT_PUBLIC_`) — Dashboard de Supabase → Project Settings → API Keys → "Secret key". Añadir también en Vercel → Project Settings → Environment Variables (nunca en un `.env` commiteado).
- Session Timebox configurado (Dashboard → Authentication → Sessions, `research.md` §2).
- Al menos una cuenta `admin` creada a mano una vez, directamente en el dashboard de Supabase (Authentication → Users → Invite) + una fila correspondiente en `usuarios` — el propio panel de administración no puede crear al primer admin porque requiere ya estar autenticado como admin (huevo y gallina, resuelto una sola vez fuera de la app).

## Escenario 1 — login con cuenta ya creada (Historia 1)

1. Admin crea una cuenta de prueba con rol `directiva` desde el panel (Escenario 2 más abajo, o directo en Supabase la primera vez).
2. Desde un navegador limpio, pedir acceso con ese email en la pantalla de login.
3. Abrir el enlace recibido → debe entrar directo a la interfaz de `directiva` (todo salvo configuración, `data-model.md` Matriz de permisos).
4. Repetir el paso 2 con un email sin cuenta → debe rechazarse con mensaje claro, sin crear nada (comprobar en Supabase que no aparece un `auth.users` nuevo).

## Escenario 2 — admin gestiona cuentas (Historia 2)

1. Como admin, crear una cuenta nueva (`POST /api/admin/usuarios`) con rol `informadores`.
2. Iniciar sesión con esa cuenta (Escenario 1) → confirmar que ve fichas + puede comentar, no ve Designación/Disponibilidad de gestión.
3. Cambiarle el rol a `administrativos` (`PATCH`) → repetir login → la interfaz ahora es la de `administrativos`, no la de `informadores`.
4. Eliminarla (`DELETE`) → intentar pedir un enlace de acceso con ese email → debe fallar. Comprobar en Supabase que el usuario sigue existiendo pero baneado (`banned_until` en el futuro), no borrado.
5. Abrir su historial de uso desde el panel → debe verse el login del paso 2 y la acción del paso 3 con fecha.

## Escenario 3 — protección de configuración (Historia 3)

1. Con la cuenta `directiva` del Escenario 1, comprobar que no hay ningún enlace ni ruta accesible al panel de administración.
2. Con una cuenta `admin`, comprobar que sí.

## Escenario 4 — árbitro ve solo su ficha (Historia 4)

1. Crear una cuenta `arbitros` vinculada a un `arbitroId` real de prueba (usar un email propio para la prueba, nunca el sintético de `arbitros-200.json`, FR-012).
2. Login → debe abrir directo en su ficha, sin listado ni selector.
3. Confirmar que no hay forma de navegar a la URL/estado de otra ficha (ni manualmente).
4. Nota para quien ejecute esto: recordar el límite conocido de `research.md` §6 (el roster sigue siendo JSON estático) — este escenario valida la interfaz, no una garantía de que el dato de otros árbitros sea inaccesible a nivel de red.

## Escenario 5 — SC-003 (trazabilidad real)

1. Con una cuenta cualquiera de gestión, guardar una nota nueva y confirmar una designación.
2. Comprobar en Supabase que ambas filas tienen `usuario_id` relleno (no solo `autor`/`decidido_por_rol` de texto).
