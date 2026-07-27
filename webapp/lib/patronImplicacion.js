/**
 * Resumen descriptivo del patrón de disponibilidad de un árbitro — FR-009,
 * FR-010, specs/002-disponibilidad-arbitro. Deliberadamente sin ningún campo
 * de tipo score/nivel: son cifras crudas para juicio humano del comité,
 * nunca entran en scoreB1 ni en ningún ranking (Principio IV de la
 * constitución).
 */
export function calcularPatronImplicacion(log = []) {
  const bajasNoJustificadas = log.filter((d) => d.motivo === "baja" && d.justificada === false).length;
  const festivosSolicitados = log.filter((d) => d.tipo === "festivo_solicitado").length;
  const urgencias = log.filter((d) => d.motivo === "urgencia").length;

  return { bajasNoJustificadas, festivosSolicitados, urgencias };
}
