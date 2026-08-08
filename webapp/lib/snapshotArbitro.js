/**
 * Construye el snapshot de un árbitro en el momento de registrar una decisión
 * (specs/007-gestion-decisiones-comite, research.md §3) — la "foto" que
 * permite comparar más adelante (FR-002). Cada campo lleva su propia etiqueta
 * de fuente (Principio VI): hoy solo `disponibilidad_vigente` es real
 * (declaraciones_disponibilidad, specs/002-disponibilidad-arbitro); el resto
 * deriva de `forma[]`/`notas`/`pruebasFisicas`/`examenesTeoricos`, sintéticos
 * hasta que exista dato real del comité (docs/estado-actual.md §3).
 *
 * `contexto.estadoForma` y `contexto.disponibilidadVigente` se calculan fuera
 * (la UI ya tiene `estadoForma()` y la disponibilidad vigente cargada) — esta
 * función no depende de Supabase ni de ningún estado de React, es pura y
 * testeable sola.
 */
export function construirSnapshot(arbitro, contexto = {}) {
  const { estadoForma = null, disponibilidadVigente = null } = contexto;
  const ultimaPruebaFisica = arbitro.pruebasFisicas?.[0] ?? null;
  const ultimoExamenTeorico = arbitro.examenesTeoricos?.[0] ?? null;

  return {
    estado_forma: {
      valor: estadoForma ? { color: estadoForma.color, media: estadoForma.media } : null,
      fuente: "sintetico",
    },
    disponibilidad_vigente: {
      valor: disponibilidadVigente
        ? { tipo: disponibilidadVigente.tipo, motivo: disponibilidadVigente.motivo ?? null }
        : { tipo: "disponible", motivo: null },
      fuente: "real",
    },
    num_informes: {
      valor: arbitro.numInformes ?? 0,
      fuente: "sintetico",
    },
    ultima_prueba_fisica: {
      valor: ultimaPruebaFisica ? { nota: ultimaPruebaFisica.nota, fecha: ultimaPruebaFisica.fecha } : null,
      fuente: "sintetico",
    },
    ultimo_examen_teorico: {
      valor: ultimoExamenTeorico ? { nota: ultimoExamenTeorico.nota, fecha: ultimoExamenTeorico.fecha } : null,
      fuente: "sintetico",
    },
  };
}
