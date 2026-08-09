import { useEffect } from "react";
import { useSyncExternalStore } from "react";
import { obtenerVigentesPorCiclo } from "./designacionesRepo";

/**
 * Caché compartida de designaciones vigentes por ciclo, para que confirmar o
 * cambiar un candidato en una pantalla (Designación) se refleje al instante
 * en cualquier otra que dependa del mismo dato (Seguimiento operativo,
 * Partidos) sin recargar la página — antes cada pantalla pedía su propia
 * copia a Supabase con su propio useEffect y no se enteraban entre sí.
 *
 * Sigue el mismo contrato que designacionesRepo.js (specs/003-persistencia-real):
 * el día que la fuente de estas decisiones deje de ser designacionesRepo.js
 * (p.ej. si Novanet pasa a ser el sistema oficial de designación), solo hay
 * que cambiar la función `cargar` de aquí abajo — ningún componente que
 * consuma useVigentesPorCiclo/useVigentesPorCiclos tiene que cambiar.
 */

let version = 0;
const cache = new Map(); // cicloId -> { estado: "cargando"|"listo"|"error", vigentesPorPartido: Map }
const listeners = new Set();

function emitirCambio() {
  version += 1;
  for (const listener of listeners) listener();
}

function suscribir(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function obtenerVersion() {
  return version;
}

function entradaCiclo(cicloId) {
  return cache.get(cicloId) ?? { estado: "cargando", vigentesPorPartido: new Map() };
}

function asegurarCargado(cicloId) {
  if (cache.has(cicloId)) return;
  cache.set(cicloId, { estado: "cargando", vigentesPorPartido: new Map() });
  obtenerVigentesPorCiclo(cicloId).then((resultado) => {
    cache.set(
      cicloId,
      resultado.ok
        ? { estado: "listo", vigentesPorPartido: resultado.vigentesPorPartido }
        : { estado: "error", vigentesPorPartido: new Map() }
    );
    emitirCambio();
  });
}

/** Llamar tras decidir() con éxito para que todas las pantallas se enteren sin refetch. */
export function registrarDecision(cicloId, partidoId, designacion) {
  const actual = entradaCiclo(cicloId);
  const nuevoMapa = new Map(actual.vigentesPorPartido).set(partidoId, designacion);
  cache.set(cicloId, { estado: "listo", vigentesPorPartido: nuevoMapa });
  emitirCambio();
}

/** Fuerza recarga desde el repo, por si otra sesión/dispositivo cambió algo (no usado hoy, disponible para cuando haga falta). */
export function invalidarCiclo(cicloId) {
  cache.delete(cicloId);
  asegurarCargado(cicloId);
}

export function useVigentesPorCiclo(cicloId) {
  useSyncExternalStore(suscribir, obtenerVersion, obtenerVersion);
  useEffect(() => {
    if (!cicloId) return;
    asegurarCargado(cicloId);
  }, [cicloId]);
  return entradaCiclo(cicloId);
}

export function useVigentesPorCiclos(cicloIds) {
  useSyncExternalStore(suscribir, obtenerVersion, obtenerVersion);
  const clave = cicloIds.join(",");
  useEffect(() => {
    cicloIds.forEach(asegurarCargado);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clave]);
  return cicloIds.map((cicloId) => ({ cicloId, ...entradaCiclo(cicloId) }));
}
