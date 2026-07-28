/**
 * Cobertura de árbitros disponibles por categoría para un ciclo (fin de
 * semana) — spec 001-dashboard-operativo, ver data-model.md.
 *
 * "Categoría inferior" sigue exactamente el mismo criterio que ya usa el
 * filtro duro del motor de designación (lib/motorAsignacion.js filtroDuro):
 * catNivel del árbitro por encima del nivel de la categoría, con
 * disponibleCategoriasInferiores activado — sin límite de cuántos niveles,
 * para no introducir una regla nueva que el motor real no aplica.
 */
import { CATEGORIAS, NIVEL_CATEGORIA } from "./categorias";
import { conDisponibilidad } from "./disponibilidad";

function contarPartidosPorCategoria(partidos, categoria) {
  return partidos.filter((p) => p.categoriaMinima === categoria).length;
}

function estadoCobertura(partidosADesignar, totalDisponibles) {
  if (partidosADesignar === 0) return "sin_partidos";
  if (totalDisponibles < partidosADesignar) return "riesgo";
  if (totalDisponibles === partidosADesignar) return "ajustado";
  return "holgada";
}

/**
 * Sustituye, para un árbitro dado, el indisponibleEsteFinde/disponibleCategoriasInferiores
 * sintéticos por la declaración real vigente de disponibilidadRepo.obtenerVigentesPorCiclo
 * (specs/002-disponibilidad-arbitro) — sin declaración, disponible por defecto (FR-007).
 * "festivo_solicitado" cuenta como indisponible igual que "no_disponible" (el árbitro no
 * estará ese fin de semana); "solo_categoria_propia" anula el extra de categoría inferior
 * solo para este ciclo, sin tocar la preferencia general del árbitro.
 */
function conDisponibilidadReal(a, declaracionVigente) {
  const base = conDisponibilidad(a);
  if (!declaracionVigente) return { ...base, indisponibleEsteFinde: false };
  const { tipo } = declaracionVigente;
  return {
    ...base,
    indisponibleEsteFinde: tipo === "no_disponible" || tipo === "festivo_solicitado",
    disponibleCategoriasInferiores: tipo === "solo_categoria_propia" ? false : base.disponibleCategoriasInferiores,
  };
}

/**
 * @param {object[]} arbitrosRaw - dataset de árbitros (arbitros-200.json), sin enriquecer
 * @param {{partidos: object[]}} ciclo - ciclo activo de ciclos-asignacion.json (ej. ciclosAsignacion[0])
 * @param {Map<number, object>|null} [vigentesPorArbitro] - declaraciones reales de disponibilidadRepo.obtenerVigentesPorCiclo
 *   para este ciclo, indexadas por arbitroId; si se omite, usa la disponibilidad sintética de siempre (lib/disponibilidad.js)
 * @returns {{ datasetDisponibilidadVacio: boolean, porCategoria: object[] }}
 */
export function coberturaPorCategoria(arbitrosRaw, ciclo, vigentesPorArbitro = null) {
  const partidos = ciclo?.partidos ?? [];
  const arbitros = vigentesPorArbitro
    ? arbitrosRaw.map((a) => conDisponibilidadReal(a, vigentesPorArbitro.get(a.id)))
    : arbitrosRaw.map(conDisponibilidad);
  const categorias = CATEGORIAS.filter((c) => c !== "Todas");

  const porCategoria = categorias.map((categoria) => {
    const nivel = NIVEL_CATEGORIA[categoria];
    const partidosADesignar = contarPartidosPorCategoria(partidos, categoria);

    const disponiblesCategoriaPropia = arbitros.filter(
      (a) => a.cat === categoria && !a.indisponibleEsteFinde
    ).length;

    const disponiblesCategoriaInferior = arbitros.filter(
      (a) => a.catNivel > nivel && a.disponibleCategoriasInferiores && !a.indisponibleEsteFinde
    ).length;

    const totalDisponibles = disponiblesCategoriaPropia + disponiblesCategoriaInferior;

    return {
      categoria,
      partidosADesignar,
      disponiblesCategoriaPropia,
      disponiblesCategoriaInferior,
      totalDisponibles,
      estado: estadoCobertura(partidosADesignar, totalDisponibles),
    };
  });

  return { datasetDisponibilidadVacio: arbitrosRaw.length === 0, porCategoria };
}
