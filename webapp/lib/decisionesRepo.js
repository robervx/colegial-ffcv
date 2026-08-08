import { supabase } from "./supabaseClient";
import { compararMetricas } from "./compararSnapshots";
import { clasificarCandidatos, calcularCorte } from "./clasificacionAscenso";

/**
 * Repositorio de decisiones del comité — contrato en
 * specs/007-gestion-decisiones-comite/contracts/decisiones-repo.md.
 *
 * `decisiones` es append-only: una campaña de ascenso avanza de fase
 * insertando una fila nueva con el mismo `campana_id`, nunca con UPDATE
 * (research.md §4). La "identidad estable" de una decisión es su
 * `campana_id` si lo tiene, o su propio `id` si no — es lo que referencian
 * `snapshots_arbitro`/`revisiones_impacto`, y lo que ancla el plazo de
 * revisión (siempre la fila ORIGINAL, no la última fase).
 *
 * La construcción de snapshots (qué métricas, con qué fuente) vive en
 * snapshotArbitro.js y la ejecuta quien llama a este repositorio (la UI ya
 * tiene estadoForma()/disponibilidad vigente cargados) — este fichero solo
 * persiste lo que recibe, igual que anotacionesRepo.js/designacionesRepo.js
 * nunca deciden el contenido de lo que guardan, solo lo validan y lo guardan.
 */

function filaADecisionCompleta(original, vigente, todasLasFilas) {
  return {
    id: original.campana_id ?? original.id,
    filaVigenteId: vigente.id,
    campanaId: original.campana_id,
    tipo: vigente.tipo,
    titulo: vigente.titulo,
    objetivoNivel: original.objetivo_nivel,
    objetivoCategoria: original.objetivo_categoria,
    objetivoArbitroIds: original.objetivo_arbitro_ids,
    estimacionImpacto: original.estimacion_impacto,
    plazoRevisionMeses: original.plazo_revision_meses,
    detalle: vigente.detalle,
    autor: original.autor,
    creadoEn: original.creado_en,
    ultimaFaseEn: vigente.creado_en,
    fases: todasLasFilas.map((f) => ({ detalle: f.detalle, creadoEn: f.creado_en })),
  };
}

function filaASnapshot(fila) {
  return {
    id: fila.id,
    decisionId: fila.decision_id,
    arbitroId: fila.arbitro_id,
    metricas: fila.metricas,
    capturadoEn: fila.capturado_en,
  };
}

function filaARevision(fila) {
  return {
    id: fila.id,
    decisionId: fila.decision_id,
    arbitroId: fila.arbitro_id,
    metricasActuales: fila.metricas_actuales,
    comparacion: fila.comparacion,
    revisadoPor: fila.revisado_por,
    revisadoEn: fila.revisado_en,
  };
}

/**
 * Deriva el estado de revisión de una decisión sin tocar Supabase — función
 * pura, testeable sola (T010). `ahora` es inyectable solo para tests.
 */
export function derivarEstadoRevision({ creadoEn, plazoRevisionMeses, tieneRevision }, ahora = new Date()) {
  if (tieneRevision) return "revisada";
  const fechaLimite = new Date(creadoEn);
  fechaLimite.setMonth(fechaLimite.getMonth() + plazoRevisionMeses);
  return ahora >= fechaLimite ? "pendiente" : "plazo_no_cumplido";
}

/**
 * Registra una decisión y, si se le pasan snapshots ya construidos
 * (vía snapshotArbitro.js), los persiste en la misma operación lógica
 * (FR-002). `objetivoArbitroIds` debe llegar ya resuelto y congelado
 * (lib/resolverObjetivoDecision.js, FR-009) — este repositorio no resuelve
 * filtros. Para `tipo: 'campana_ascenso'` genera un id propio para poder
 * fijar `campana_id = id` desde la primera fila.
 */
export async function registrarDecision({
  tipo,
  titulo,
  objetivoNivel,
  objetivoCategoria = null,
  objetivoArbitroIds,
  estimacionImpacto,
  plazoRevisionMeses = 3,
  autor,
  detalle = {},
  snapshots = [],
}) {
  if (!objetivoArbitroIds?.length) {
    return { ok: false, error: "La decisión necesita al menos un árbitro objetivo." };
  }
  if (!(titulo ?? "").trim()) {
    return { ok: false, error: "El título no puede estar vacío." };
  }

  const id = crypto.randomUUID();
  const campanaId = tipo === "campana_ascenso" ? id : null;

  const { data, error } = await supabase
    .from("decisiones")
    .insert({
      id,
      campana_id: campanaId,
      tipo,
      titulo: titulo.trim(),
      objetivo_nivel: objetivoNivel,
      objetivo_categoria: objetivoCategoria,
      objetivo_arbitro_ids: objetivoArbitroIds,
      estimacion_impacto: estimacionImpacto,
      plazo_revision_meses: plazoRevisionMeses,
      detalle,
      autor,
    })
    .select()
    .single();

  if (error) return { ok: false, error: `No se pudo guardar la decisión: ${error.message}` };

  if (snapshots.length) {
    const filasSnapshot = snapshots.map(({ arbitroId, metricas }) => ({
      decision_id: id,
      arbitro_id: arbitroId,
      metricas,
    }));
    const { error: errorSnapshots } = await supabase.from("snapshots_arbitro").insert(filasSnapshot);
    if (errorSnapshots) {
      return {
        ok: false,
        error: `La decisión se guardó pero falló la captura del snapshot: ${errorSnapshots.message}`,
      };
    }
  }

  return { ok: true, decision: filaADecisionCompleta(data, data, [data]) };
}

/**
 * La decisión completa (todas sus fases si es una campaña) junto con sus
 * snapshots iniciales y su historial de revisiones de impacto ya registradas
 * (puede haber más de una, T023) — el llamador deriva estadoRevision con
 * derivarEstadoRevision() a partir de decision.creadoEn/plazoRevisionMeses y
 * revisiones.length, sin reimplementar la lógica de plazos.
 */
export async function obtenerDecision(decisionId) {
  const { data, error } = await supabase
    .from("decisiones")
    .select("*")
    .or(`id.eq.${decisionId},campana_id.eq.${decisionId}`)
    .order("creado_en", { ascending: true });

  if (error) return { ok: false, error: `No se pudo cargar la decisión: ${error.message}` };
  if (!data.length) return { ok: false, error: "Decisión no encontrada." };

  const original = data[0];
  const vigente = data[data.length - 1];

  const { data: snapshotsData, error: errorSnapshots } = await supabase
    .from("snapshots_arbitro")
    .select("*")
    .eq("decision_id", decisionId);

  if (errorSnapshots) return { ok: false, error: `No se pudieron cargar los snapshots: ${errorSnapshots.message}` };

  const { data: revisionesData, error: errorRevisiones } = await supabase
    .from("revisiones_impacto")
    .select("*")
    .eq("decision_id", decisionId)
    .order("revisado_en", { ascending: false });

  if (errorRevisiones) return { ok: false, error: `No se pudieron cargar las revisiones: ${errorRevisiones.message}` };

  return {
    ok: true,
    decision: filaADecisionCompleta(original, vigente, data),
    snapshots: snapshotsData.map(filaASnapshot),
    revisiones: revisionesData.map(filaARevision),
  };
}

/**
 * Listado para la bitácora (US4), una fila por decisión (identidad estable,
 * no por fase de campaña) con su estadoRevision ya derivado.
 */
export async function listarDecisiones({ tipo } = {}) {
  const { data, error } = await supabase.from("decisiones").select("*").order("creado_en", { ascending: true });

  if (error) return { ok: false, error: `No se pudieron cargar las decisiones: ${error.message}` };

  const porIdentidad = new Map();
  for (const fila of data) {
    const identidad = fila.campana_id ?? fila.id;
    if (!porIdentidad.has(identidad)) {
      porIdentidad.set(identidad, { original: fila, vigente: fila });
    } else {
      porIdentidad.get(identidad).vigente = fila;
    }
  }

  const identidades = [...porIdentidad.keys()];
  const { data: revisiones, error: errorRevisiones } = await supabase
    .from("revisiones_impacto")
    .select("decision_id")
    .in("decision_id", identidades.length ? identidades : ["00000000-0000-0000-0000-000000000000"]);

  if (errorRevisiones) {
    return { ok: false, error: `No se pudieron cargar las revisiones: ${errorRevisiones.message}` };
  }
  const idsConRevision = new Set((revisiones ?? []).map((r) => r.decision_id));

  let resumenes = [...porIdentidad.entries()].map(([identidad, { original, vigente }]) => ({
    id: identidad,
    tipo: vigente.tipo,
    titulo: vigente.titulo,
    objetivoNivel: original.objetivo_nivel,
    objetivoCategoria: original.objetivo_categoria,
    creadoEn: original.creado_en,
    autor: original.autor,
    estadoRevision: derivarEstadoRevision({
      creadoEn: original.creado_en,
      plazoRevisionMeses: original.plazo_revision_meses,
      tieneRevision: idsConRevision.has(identidad),
    }),
  }));

  if (tipo) resumenes = resumenes.filter((d) => d.tipo === tipo);
  resumenes.sort((a, b) => new Date(b.creadoEn) - new Date(a.creadoEn));

  return { ok: true, decisiones: resumenes };
}

/**
 * Recalcula el impacto de una decisión: recibe las métricas actuales ya
 * construidas (metricasActualesPorArbitroId — null para un árbitro no
 * comparable, ej. dado de baja del colegio, Edge Case de spec.md), las
 * compara contra el snapshot inicial (compararSnapshots.js) y persiste una
 * fila nueva por árbitro en revisiones_impacto. Se puede llamar más de una
 * vez sobre la misma decisión — cada llamada añade revisiones, no sustituye.
 */
export async function revisarImpacto(decisionId, { metricasActualesPorArbitroId = {}, revisadoPor }) {
  const { data: snapshotsData, error: errorSnapshots } = await supabase
    .from("snapshots_arbitro")
    .select("*")
    .eq("decision_id", decisionId);

  if (errorSnapshots) return { ok: false, error: `No se pudieron cargar los snapshots: ${errorSnapshots.message}` };
  if (!snapshotsData.length) return { ok: false, error: "Esta decisión no tiene snapshot inicial que revisar." };

  const filas = snapshotsData.map((s) => {
    const actuales = metricasActualesPorArbitroId[s.arbitro_id] ?? null;
    const comparacion = actuales
      ? compararMetricas(s.metricas, actuales)
      : Object.fromEntries(Object.keys(s.metricas).map((clave) => [clave, "no_comparable"]));
    return {
      decision_id: decisionId,
      arbitro_id: s.arbitro_id,
      metricas_actuales: actuales ?? {},
      comparacion,
      revisado_por: revisadoPor,
    };
  });

  const { data, error } = await supabase.from("revisiones_impacto").insert(filas).select();
  if (error) return { ok: false, error: `No se pudo guardar la revisión: ${error.message}` };

  return { ok: true, revisiones: data.map(filaARevision) };
}

async function cargarFasesCampana(campanaId) {
  return supabase.from("decisiones").select("*").eq("campana_id", campanaId).order("creado_en", { ascending: true });
}

/** Inserta una fase nueva de campaña — nunca UPDATE (research.md §4). Copia los campos comunes de la fase vigente, solo cambia `detalle`. */
async function insertarNuevaFaseCampana(campanaId, vigente, detalleNuevo) {
  return supabase
    .from("decisiones")
    .insert({
      id: crypto.randomUUID(),
      campana_id: campanaId,
      tipo: vigente.tipo,
      titulo: vigente.titulo,
      objetivo_nivel: vigente.objetivo_nivel,
      objetivo_categoria: vigente.objetivo_categoria,
      objetivo_arbitro_ids: vigente.objetivo_arbitro_ids,
      estimacion_impacto: vigente.estimacion_impacto,
      plazo_revision_meses: vigente.plazo_revision_meses,
      detalle: detalleNuevo,
      autor: vigente.autor,
    })
    .select()
    .single();
}

/**
 * Añade una fase a una campaña de ascenso (añadir/quitar candidatos, registrar
 * nota de prueba, fijar plazas disponibles) — nunca cambia `corte_confirmado`
 * (eso es solo cosa de confirmarCorteAscenso). Rechaza si la campaña ya está
 * confirmada (inmutable).
 */
export async function registrarFaseCampana(campanaId, cambios) {
  const { data: filas, error: errorLectura } = await cargarFasesCampana(campanaId);
  if (errorLectura) return { ok: false, error: `No se pudo cargar la campaña: ${errorLectura.message}` };
  if (!filas.length) return { ok: false, error: "Campaña no encontrada." };

  const original = filas[0];
  const vigente = filas[filas.length - 1];
  if (vigente.detalle?.corte_confirmado) {
    return { ok: false, error: "Esta campaña ya tiene el corte confirmado — es inmutable." };
  }

  const detalleNuevo = { ...vigente.detalle, ...cambios };
  const { data: nuevaFila, error } = await insertarNuevaFaseCampana(campanaId, vigente, detalleNuevo);
  if (error) return { ok: false, error: `No se pudo actualizar la campaña: ${error.message}` };

  return { ok: true, decision: filaADecisionCompleta(original, nuevaFila, [...filas, nuevaFila]) };
}

/**
 * Único punto que puede dejar `corte_confirmado: true` — calcula el corte con
 * clasificacionAscenso.js (función pura, no persiste por sí sola) y persiste
 * el resultado en la misma fase, solo tras esta llamada explícita (FR-008,
 * Principio II no negociable: nunca implícito al completar notas/clasificación).
 */
export async function confirmarCorteAscenso(campanaId, { plazasDisponibles }) {
  const { data: filas, error: errorLectura } = await cargarFasesCampana(campanaId);
  if (errorLectura) return { ok: false, motivoRechazo: `No se pudo cargar la campaña: ${errorLectura.message}` };
  if (!filas.length) return { ok: false, motivoRechazo: "Campaña no encontrada." };

  const original = filas[0];
  const vigente = filas[filas.length - 1];
  if (vigente.detalle?.corte_confirmado) {
    return { ok: false, motivoRechazo: "Esta campaña ya tiene el corte confirmado." };
  }
  if (plazasDisponibles == null || plazasDisponibles < 0) {
    return { ok: false, motivoRechazo: "El número de plazas debe ser 0 o mayor." };
  }

  const candidatos = vigente.detalle?.candidatos ?? [];
  const { candidatosOrdenados } = clasificarCandidatos(candidatos);
  const { dentroDeCorte } = calcularCorte(candidatosOrdenados, plazasDisponibles);

  const detalleNuevo = {
    ...vigente.detalle,
    plazas_disponibles: plazasDisponibles,
    corte_confirmado: true,
    ascendidos_arbitro_ids: dentroDeCorte,
  };
  const { data: nuevaFila, error } = await insertarNuevaFaseCampana(campanaId, vigente, detalleNuevo);
  if (error) return { ok: false, motivoRechazo: `No se pudo confirmar el corte: ${error.message}` };

  return { ok: true, decision: filaADecisionCompleta(original, nuevaFila, [...filas, nuevaFila]) };
}
