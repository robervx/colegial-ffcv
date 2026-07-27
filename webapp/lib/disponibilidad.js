import { NIVEL_CATEGORIA } from "./categorias";

/**
 * Enriquece un árbitro con datos sintéticos de disponibilidad/vetos usados por
 * el Dashboard (cobertura por categoría) y la Designación inteligente.
 *
 * indisponibleEsteFinde es una simplificación deliberada (indisp alto esta
 * temporada -> más probable que esté indisponible este fin de semana concreto),
 * no disponibilidad real por fecha (eso necesita el dato real de Novanet, ver
 * docs/tarifas.md). Ver docs/decisiones-producto.md §6 y specs/001-dashboard-operativo/research.md §2.
 */
export function conDisponibilidad(a) {
  // id 1 lleva un veto de ejemplo fijo contra "CD Buñol" para que el filtro duro
  // sea comprobable en la demo de Designación inteligente sin depender del azar.
  const vetos = a.id === 1 ? [...a.vetos, { equipo: "CD Buñol", motivo: "Incidente en banquillo · jornada 9 (dato de ejemplo)" }] : a.vetos;
  return { ...a, vetos, catNivel: NIVEL_CATEGORIA[a.cat] ?? 0, indisponibleEsteFinde: a.indisp >= 6 && a.id % 5 === 0 };
}

/** true cuando el árbitro cuenta como disponible este fin de semana (ver conDisponibilidad). */
export function estaDisponible(a) {
  return !conDisponibilidad(a).indisponibleEsteFinde;
}
