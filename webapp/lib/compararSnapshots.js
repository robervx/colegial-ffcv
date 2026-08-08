/**
 * Compara un snapshot inicial contra las métricas actuales de un árbitro,
 * campo a campo (specs/007-gestion-decisiones-comite, research.md §3, FR-005).
 * Nunca produce un índice agregado único que oculte qué métrica concreta
 * cambió — el llamador (UI de revisión de impacto) siempre ve el desglose.
 *
 * `disponibilidad_vigente` (categórica, sin orden) y `num_informes` (volumen
 * de seguimiento, no una medida de rendimiento — mismo principio que "más
 * tarjetas no implica peor arbitraje", Principio IV de la constitución)
 * quedan siempre "no_comparable": no se les fuerza una dirección de
 * mejora/empeora que no tienen.
 */
const METRICAS_SIN_DIRECCION = new Set(["disponibilidad_vigente", "num_informes"]);

function compararNumero(inicial, actual) {
  if (inicial === actual) return "sin_cambio";
  return actual > inicial ? "mejora" : "empeora";
}

function valorComparableDeMetrica(clave, campo) {
  if (campo?.valor == null) return null;
  if (clave === "estado_forma") return campo.valor.media;
  if (clave === "ultima_prueba_fisica" || clave === "ultimo_examen_teorico") return campo.valor.nota;
  if (clave === "num_informes") return campo.valor;
  return null;
}

export function compararMetricas(snapshotInicial, metricasActuales) {
  const claves = new Set([
    ...Object.keys(snapshotInicial || {}),
    ...Object.keys(metricasActuales || {}),
  ]);
  const comparacion = {};

  for (const clave of claves) {
    if (METRICAS_SIN_DIRECCION.has(clave)) {
      comparacion[clave] = "no_comparable";
      continue;
    }

    const valorInicial = valorComparableDeMetrica(clave, snapshotInicial?.[clave]);
    const valorActual = valorComparableDeMetrica(clave, metricasActuales?.[clave]);

    comparacion[clave] =
      valorInicial == null || valorActual == null ? "no_comparable" : compararNumero(valorInicial, valorActual);
  }

  return comparacion;
}
