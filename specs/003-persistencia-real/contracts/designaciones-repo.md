# Contrato: repositorio de designaciones

`webapp/lib/designacionesRepo.js`. Habla con la tabla `designaciones` (`data-model.md`).

## `obtenerVigentesPorCiclo(cicloId) => Promise<Map<partidoId, Designacion>>`

La designación vigente (más reciente) de cada partido del ciclo, indexada por `partido_id` — pensada para fusionarse en un solo paso con el resultado de `asignarJornada()`.

## `decidir({ cicloId, partidoId, arbitroId, esSugerido, motivo, decididoPorRol }) => Promise<{ ok: true, designacion } | { ok: false, error: string }>`

Guarda una decisión (confirmar el sugerido, o cambiar a una alternativa). Reglas que valida antes de escribir, replicando FR-003 también en esta capa (no solo en el formulario):
- Si `esSugerido` es `false`, `motivo` es obligatorio y no puede estar vacío — si falta, devuelve `{ ok: false, error: "..." }` sin llegar a escribir.
- Nunca sobrescribe una fila anterior — cada llamada inserta una fila nueva (append-only, ver `research.md` §4); la vigente pasa a ser esta.

## `conDecisionVigente(resultadosMotor, vigentesPorPartido) => resultadosMotor con cada fila enriquecida`

Función pura (no habla con Supabase): recibe la salida de `asignarJornada()` y el `Map` de `obtenerVigentesPorCiclo()`, y devuelve cada resultado con un campo añadido `decisionVigente` (la `Designacion` guardada para ese partido, o `null` si nadie ha decidido todavía). La UI usa `decisionVigente` para mostrar la decisión real en vez de la sugerencia en vivo cuando existe — implementa FR-004 (`spec.md`: una designación confirmada no se recalcula sola).
