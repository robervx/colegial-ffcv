import { supabase } from "./supabaseClient";

/**
 * Repositorio de notas de seguimiento — contrato en
 * specs/003-persistencia-real/contracts/anotaciones-repo.md.
 * La UI (Ficha, components/CRMExpedientes.jsx) nunca llama a Supabase
 * directamente, siempre a través de estas dos funciones.
 */

function filaAAnotacion(fila) {
  return {
    id: fila.id,
    arbitroId: fila.arbitro_id,
    etiqueta: fila.etiqueta,
    texto: fila.texto,
    autor: fila.autor,
    fuente: fila.fuente,
    creadoEn: fila.creado_en,
  };
}

/** Todas las notas de un árbitro, más recientes primero. */
export async function obtenerAnotaciones(arbitroId) {
  const { data, error } = await supabase
    .from("anotaciones")
    .select("*")
    .eq("arbitro_id", arbitroId)
    .order("creado_en", { ascending: false });

  if (error) {
    return { ok: false, error: `No se pudieron cargar las notas: ${error.message}` };
  }
  return { ok: true, anotaciones: data.map(filaAAnotacion) };
}

/** Recuento total de notas registradas (todos los árbitros) — para el panel de seguimiento operativo. */
export async function contarAnotaciones() {
  const { count, error } = await supabase
    .from("anotaciones")
    .select("*", { count: "exact", head: true });

  if (error) {
    return { ok: false, error: `No se pudo contar las notas: ${error.message}` };
  }
  return { ok: true, total: count };
}

/** Inserta una nota nueva. fuente siempre "real": toda nota guardada desde la UI es una acción genuina. */
export async function guardarAnotacion({ arbitroId, etiqueta, texto, autor }) {
  const textoLimpio = (texto ?? "").trim();
  if (!textoLimpio) {
    return { ok: false, error: "La nota no puede estar vacía." };
  }

  const { data, error } = await supabase
    .from("anotaciones")
    .insert({ arbitro_id: arbitroId, etiqueta, texto: textoLimpio, autor, fuente: "real" })
    .select()
    .single();

  if (error) {
    return { ok: false, error: `No se pudo guardar la nota: ${error.message}` };
  }
  return { ok: true, anotacion: filaAAnotacion(data) };
}
