/**
 * Regla de antelación mínima para declarar "festivo solicitado" — FR-004,
 * specs/002-disponibilidad-arbitro. Límite inclusivo: exactamente 15 días
 * de antelación es válido.
 */
const UMBRAL_DIAS_FESTIVO = 15;
const MS_POR_DIA = 24 * 60 * 60 * 1000;

export function validarAntelacionFestivo(fechaDeclaracion, fechaInicioCiclo) {
  const declaracion = new Date(fechaDeclaracion);
  const inicioCiclo = new Date(fechaInicioCiclo);
  const diasAntelacion = Math.floor((inicioCiclo - declaracion) / MS_POR_DIA);
  return {
    valido: diasAntelacion >= UMBRAL_DIAS_FESTIVO,
    diasAntelacion,
  };
}
