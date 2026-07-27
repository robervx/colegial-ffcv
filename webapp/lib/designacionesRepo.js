import { supabase } from "./supabaseClient";

/**
 * Repositorio de decisiones de designación — contrato en
 * specs/003-persistencia-real/contracts/designaciones-repo.md.
 */

function filaADesignacion(fila) {
  return {
    id: fila.id,
    cicloId: fila.ciclo_id,
    partidoId: fila.partido_id,
    arbitroId: fila.arbitro_id,
    esSugerido: fila.es_sugerido,
    motivo: fila.motivo,
    decididoPorRol: fila.decidido_por_rol,
    decididoEn: fila.decidido_en,
  };
}

/**
 * La designación vigente (más reciente) de cada partido del ciclo,
 * indexada por partido_id — pensada para fusionarse con asignarJornada().
 */
export async function obtenerVigentesPorCiclo(cicloId) {
  const { data, error } = await supabase
    .from("designaciones")
    .select("*")
    .eq("ciclo_id", cicloId)
    .order("decidido_en", { ascending: false });

  if (error) {
    return { ok: false, error: `No se pudieron cargar las designaciones: ${error.message}` };
  }

  const vigentesPorPartido = new Map();
  for (const fila of data) {
    if (!vigentesPorPartido.has(fila.partido_id)) {
      vigentesPorPartido.set(fila.partido_id, filaADesignacion(fila));
    }
  }
  return { ok: true, vigentesPorPartido };
}

/** Guarda una decisión (confirmar el sugerido, o cambiar a una alternativa). Nunca sobrescribe una fila anterior. */
export async function decidir({ cicloId, partidoId, arbitroId, esSugerido, motivo, decididoPorRol }) {
  if (!esSugerido && !(motivo ?? "").trim()) {
    return { ok: false, error: "Hace falta un motivo para elegir un candidato distinto del sugerido." };
  }

  const { data, error } = await supabase
    .from("designaciones")
    .insert({
      ciclo_id: cicloId,
      partido_id: partidoId,
      arbitro_id: arbitroId,
      es_sugerido: esSugerido,
      motivo: esSugerido ? null : motivo.trim(),
      decidido_por_rol: decididoPorRol,
    })
    .select()
    .single();

  if (error) {
    return { ok: false, error: `No se pudo guardar la designación: ${error.message}` };
  }
  return { ok: true, designacion: filaADesignacion(data) };
}

/**
 * Función pura: enriquece cada resultado del motor con decisionVigente
 * (la Designacion guardada para ese partido, o null si nadie ha decidido
 * todavía). No habla con Supabase.
 */
export function conDecisionVigente(resultadosMotor, vigentesPorPartido) {
  return resultadosMotor.map((r) => ({
    ...r,
    decisionVigente: vigentesPorPartido.get(r.partido.id) ?? null,
  }));
}
