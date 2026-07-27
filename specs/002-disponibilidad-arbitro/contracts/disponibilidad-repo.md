# Contrato: repositorio de disponibilidad

Interfaz que consume la UI (ficha de árbitro, Dashboard). Agnóstica a la tecnología de persistencia — Sprint 1 decide qué hay detrás (Supabase, otra base de datos, etc.), esta feature solo depende de estas firmas. Hasta Sprint 1, `webapp/lib/disponibilidadRepo.js` existe con estas firmas mismas pero cada función lanza `NoImplementadoError` — la UI que las llama queda escrita y testeada contra el contrato, pero deshabilitada/oculta en producción hasta que el repositorio real exista (ver `plan.md`, Constitution Check).

## `obtenerLog(arbitroId) => DeclaracionDisponibilidad[]`

Todas las declaraciones históricas de un árbitro, ordenadas por `fechaDeclaracion` ascendente. Nunca filtra ni oculta entradas — el log completo es siempre el mismo para árbitro y comité (lo que difiere es la interpretación en `PatronImplicacion`, no el log en sí — ver FR-008 vs. FR-009).

## `obtenerVigente(arbitroId, cicloId) => DeclaracionDisponibilidad | null`

La declaración vigente de un árbitro para un ciclo concreto (la de `fechaDeclaracion` más reciente entre las que tengan ese `cicloId`), o `null` si no ha declarado nada — en cuyo caso el llamador debe asumir "disponible" (FR-007), esta función no decide ese default.

## `declararDisponibilidad(declaracion: Omit<DeclaracionDisponibilidad, "id">) => { ok: true, declaracion } | { ok: false, motivoRechazo: string }`

Valida y persiste una nueva declaración:
- Rechaza si `tipo === "festivo_solicitado"` y no se cumple la antelación mínima (`lib/reglaFestivo.js`, FR-004).
- Rechaza si el `cicloId` referenciado ya está cerrado (inmutabilidad, ver `data-model.md`).
- En cualquier otro caso, añade la entrada al log — nunca sobrescribe ni elimina una anterior (FR-005).

## `calcularPatronImplicacion(arbitroId) => PatronImplicacion`

Envoltorio sobre `obtenerLog` + `lib/patronImplicacion.js` (función pura ya construible hoy, ver `research.md` §2) — separado en el contrato para que el repositorio pueda optimizarlo (ej. calcularlo en la base de datos) sin que la UI conozca la diferencia.

## Errores

Todas las funciones que escriben (`declararDisponibilidad`) devuelven un resultado con `ok`, nunca lanzan excepción para casos de negocio esperados (antelación insuficiente, ciclo cerrado) — solo un error real de infraestructura (repositorio no disponible) se propaga como excepción.
