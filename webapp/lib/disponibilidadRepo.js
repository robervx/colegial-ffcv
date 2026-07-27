/**
 * Repositorio de disponibilidad — contrato en
 * specs/002-disponibilidad-arbitro/contracts/disponibilidad-repo.md.
 *
 * Implementación real contra Supabase (specs/003-persistencia-real) —
 * mismas firmas exactas que el contrato ya fijaba cuando esto era un stub
 * que lanzaba NoImplementadoError. Por contrato: obtenerLog/obtenerVigente/
 * calcularPatronImplicacion devuelven el valor directamente y lanzan
 * excepción ante un error de infraestructura; solo declararDisponibilidad
 * usa el patrón { ok, ... } para rechazos de negocio esperados (contrato
 * §Errores).
 */
import { supabase } from "./supabaseClient";
import { validarAntelacionFestivo } from "./reglaFestivo";
import { calcularPatronImplicacion as calcularPatronSobreLog } from "./patronImplicacion";
import ciclosAsignacion from "../data/ciclos-asignacion.json";

function filaADeclaracion(fila) {
  return {
    id: fila.id,
    arbitroId: fila.arbitro_id,
    cicloId: fila.ciclo_id,
    autor: fila.autor_rol,
    tipo: fila.tipo,
    motivo: fila.motivo,
    justificada: fila.justificada,
    fechaDeclaracion: fila.creado_en,
  };
}

/** Todas las declaraciones de un árbitro, ordenadas por fecha ascendente. Lanza si falla la infraestructura. */
export async function obtenerLog(arbitroId) {
  const { data, error } = await supabase
    .from("declaraciones_disponibilidad")
    .select("*")
    .eq("arbitro_id", arbitroId)
    .order("creado_en", { ascending: true });

  if (error) throw new Error(`No se pudo cargar el log de disponibilidad: ${error.message}`);
  return data.map(filaADeclaracion);
}

/** La declaración vigente de un árbitro para un ciclo, o null si no ha declarado nada. Lanza si falla la infraestructura. */
export async function obtenerVigente(arbitroId, cicloId) {
  const { data, error } = await supabase
    .from("declaraciones_disponibilidad")
    .select("*")
    .eq("arbitro_id", arbitroId)
    .eq("ciclo_id", cicloId)
    .order("creado_en", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(`No se pudo consultar la disponibilidad: ${error.message}`);
  return data ? filaADeclaracion(data) : null;
}

/**
 * Valida y persiste una nueva declaración. Nunca sobrescribe una anterior.
 * Rechazos de negocio devuelven { ok: false }, no lanzan.
 * `ahora` es inyectable (por defecto la fecha real) solo para poder testear
 * la validación de antelación sin depender del reloj del sistema.
 */
export async function declararDisponibilidad(declaracion, ahora = new Date()) {
  const { arbitroId, cicloId, autor, tipo, motivo, justificada } = declaracion;

  if (tipo === "festivo_solicitado") {
    const ciclo = ciclosAsignacion.find((c) => c.id === cicloId);
    if (ciclo?.cerrado) {
      return { ok: false, motivoRechazo: "Este ciclo ya está cerrado, no se pueden añadir declaraciones." };
    }
    if (ciclo?.fechaInicioISO) {
      const { valido, diasAntelacion } = validarAntelacionFestivo(ahora.toISOString(), ciclo.fechaInicioISO);
      if (!valido) {
        return {
          ok: false,
          motivoRechazo: `Un festivo solicitado necesita al menos 15 días de antelación (hay ${diasAntelacion}).`,
        };
      }
    }
  }

  const { data, error } = await supabase
    .from("declaraciones_disponibilidad")
    .insert({
      arbitro_id: arbitroId,
      ciclo_id: cicloId,
      autor_rol: autor,
      tipo,
      motivo: motivo ?? null,
      justificada: justificada ?? null,
    })
    .select()
    .single();

  if (error) throw new Error(`No se pudo guardar la declaración: ${error.message}`);
  return { ok: true, declaracion: filaADeclaracion(data) };
}

/** Envoltorio sobre obtenerLog + lib/patronImplicacion.js (función pura, sin cambios). Lanza si falla la infraestructura. */
export async function calcularPatronImplicacion(arbitroId) {
  const log = await obtenerLog(arbitroId);
  return calcularPatronSobreLog(log);
}
