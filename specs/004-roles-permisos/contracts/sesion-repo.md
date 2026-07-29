# Contrato: repositorio de sesión y perfil propio

`webapp/lib/sesionRepo.js`. A diferencia de `admin-usuarios-api.md`, este habla directo con Supabase desde el navegador con la clave pública — cubre lo que cualquier usuario ya autenticado puede hacer sobre **su propia** cuenta, protegido por RLS (`usuario_rol()`, `data-model.md`), nunca por `service_role`.

## `solicitarAcceso(email) => Promise<{ ok: true } | { ok: false, error: string }>`

`supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: window.location.origin, shouldCreateUser: false } })` (`research.md` §1). Si el email no tiene cuenta creada por el admin, Supabase devuelve error — se traduce a un mensaje claro en pantalla (Historia 1, Acceptance Scenario 3), nunca a "cuenta creada".

## `obtenerPerfilActual() => Promise<{ ok: true, usuario: { id, email, rol, arbitroId } } | { ok: false, error: string }>`

Tras el login (sesión ya detectada en la URL por el propio cliente de Supabase, `research.md` §1), consulta la fila propia de `usuarios` (`select * from usuarios where id = auth.uid()`, RLS ya lo restringe a la propia fila para roles no-admin). Es la función que decide qué interfaz de rol se muestra (Historia 1, Acceptance Scenario 1) — sustituye por completo al selector "ver como" sin login de FR-012 de `002-disponibilidad-arbitro`.

## `cerrarSesion() => Promise<void>`

`supabase.auth.signOut()`.

## `registrarAccion(tipo, detalle) => Promise<void>`

Inserta una fila en `historial_uso` (`tipo: 'login' | 'accion'`) con `usuario_id = auth.uid()` (implícito, RLS exige que coincida). Se llama una vez tras cada login exitoso (`tipo: 'login'`) y, en paralelo a cada operación ya existente de `anotacionesRepo`/`designacionesRepo`/`disponibilidadRepo` que hoy no registra autor real, con `tipo: 'accion'` y un `detalle` legible (p. ej. `"nota:crear"`). No sustituye esas escrituras — es un registro complementario, ver `data-model.md`.
