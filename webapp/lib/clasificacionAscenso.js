/**
 * Clasificación de candidatos de una campaña de ascenso — función pura, sin
 * I/O (specs/007-gestion-decisiones-comite, research.md §5). Ordena por nota
 * final (media de teórica+física) descendente; excluye de la clasificación
 * — sin descartar silenciosamente — a quien todavía no tenga ambas notas.
 *
 * No persiste nada: decisionesRepo.confirmarCorteAscenso es el único punto
 * que guarda un corte, y solo tras confirmación humana explícita (FR-008,
 * Principio II) — esta función solo calcula, nunca decide por sí sola.
 */
export function clasificarCandidatos(candidatos) {
  const completos = candidatos.filter((c) => c.notaTeorica != null && c.notaFisica != null);
  const incompletos = candidatos.filter((c) => c.notaTeorica == null || c.notaFisica == null);

  const candidatosOrdenados = completos
    .map((c) => ({ ...c, notaFinal: (c.notaTeorica + c.notaFisica) / 2 }))
    .sort((a, b) => b.notaFinal - a.notaFinal);

  return { candidatosOrdenados, candidatosIncompletos: incompletos };
}

/** Dada una clasificación ya ordenada y un número de plazas, quién quedaría dentro del corte — previsualización, no persistencia. */
export function calcularCorte(candidatosOrdenados, plazasDisponibles) {
  const plazas = Math.max(0, plazasDisponibles ?? 0);
  return {
    plazas,
    dentroDeCorte: candidatosOrdenados.slice(0, plazas).map((c) => c.arbitroId),
  };
}
