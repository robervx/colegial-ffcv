# Contrato: repositorio de anotaciones

`webapp/lib/anotacionesRepo.js`. Habla con la tabla `anotaciones` (`data-model.md`) — la UI (`Ficha`, `CRMExpedientes.jsx`) nunca llama a Supabase directamente.

## `obtenerAnotaciones(arbitroId) => Promise<Anotacion[]>`

Todas las notas de un árbitro, más recientes primero (mismo orden que ya espera la UI hoy en `notas`, ver `CRMExpedientes.jsx:613`).

## `guardarAnotacion({ arbitroId, etiqueta, texto, autorRol }) => Promise<{ ok: true, anotacion } | { ok: false, error: string }>`

Inserta una nota nueva. Nunca actualiza ni borra una existente (append-only). `error` es un mensaje legible pensado para mostrarse tal cual en la UI (FR-007 de `spec.md`) — nunca se lanza una excepción para errores esperables de red/base de datos, igual que ya hace `disponibilidadRepo.js`.
