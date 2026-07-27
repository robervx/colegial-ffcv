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
 * @param {object[]} arbitrosRaw - dataset de árbitros (arbitros-200.json), sin enriquecer
 * @param {{partidos: object[]}} ciclo - ciclo activo de ciclos-asignacion.json (ej. ciclosAsignacion[0])
 * @returns {{ datasetDisponibilidadVacio: boolean, porCategoria: object[] }}
 */
export function coberturaPorCategoria(arbitrosRaw, ciclo) {
  const partidos = ciclo?.partidos ?? [];
  const arbitros = arbitrosRaw.map(conDisponibilidad);
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
