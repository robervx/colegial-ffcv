# Contrato: API de administración de cuentas

`webapp/app/api/admin/usuarios/route.ts` — el único punto del proyecto que usa `SUPABASE_SECRET_KEY` (server-only, `research.md` §3). Cada método exige, antes de nada, verificar el bearer token del que llama contra Supabase (`getUser(token)`) y comprobar que su fila en `usuarios` tiene `rol = 'admin'` y `activo = true` — si no, `403` sin llegar a tocar la Admin API.

## `POST /api/admin/usuarios`

Crea una cuenta (Historia 2, Acceptance Scenario 1).

**Body**: `{ email: string, rol: 'admin'|'directiva'|'informadores'|'arbitros'|'administrativos', arbitroId?: number }`

**Validaciones antes de llamar a la Admin API**:
- `arbitroId` obligatorio si `rol === 'arbitros'` (FR-006), y su email debe ser el oficial verificado por el comité, nunca el sintético de `arbitros-200.json` (FR-012) — esta comprobación es manual por ahora (el admin confirma que el email es real al crear la cuenta), no hay forma automática de verificarlo contra el comité.
- Email no debe pertenecer ya a una cuenta activa.

**Efecto**: `supabase.auth.admin.createUser({ email, email_confirm: true })` (sin contraseña) + insert en `usuarios` con el rol dado. La cuenta queda lista para recibir su primer enlace de acceso (`signInWithOtp` lo dispara la propia persona al intentar entrar, no el admin).

**Respuesta**: `{ ok: true, usuario }` | `{ ok: false, error: string }`.

## `PATCH /api/admin/usuarios/:id`

Cambia el rol de una cuenta existente (Historia 2, Acceptance Scenario 2).

**Body**: `{ rol: '...' }`

**Validación**: si la cuenta objetivo es hoy `admin` y el cambio la baja a otro rol, comprobar FR-014 (queda al menos otro admin activo) antes de aplicar — si no, `{ ok: false, error: "..." }` sin escribir.

## `DELETE /api/admin/usuarios/:id`

"Elimina" una cuenta (Historia 2, Acceptance Scenario 3) — en realidad banea (`research.md` §4): `supabase.auth.admin.updateUserById(id, { ban_duration: '876000h' })` + `usuarios.activo = false`. Nunca un `DELETE` real de fila ni de `auth.users`.

**Validación**: mismo chequeo FR-014 que `PATCH` si la cuenta es `admin`.

## `GET /api/admin/usuarios/:id/historial`

Historial de uso de una cuenta (Historia 2, Acceptance Scenario 4) — lectura de `historial_uso` filtrada por `usuario_id`, más las filas relevantes de `anotaciones`/`designaciones`/`declaraciones_disponibilidad` donde `usuario_id` coincida (unión, ordenada por fecha). Requiere el mismo chequeo de admin que el resto de este contrato — no expuesto vía repo de cliente porque cruza tablas con distinta RLS.
