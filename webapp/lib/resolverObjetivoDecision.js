/**
 * Resuelve el nivel de objetivo de una decisión (árbitro / categoría completa /
 * grupo dentro de una categoría) a una lista concreta de arbitro_id — UNA
 * SOLA VEZ, en el momento de registrar la decisión (specs/007-gestion-decisiones-comite,
 * research.md §2, FR-009). El resultado se persiste tal cual; esta función no
 * se vuelve a llamar en la revisión de impacto.
 *
 * Para "grupo_categoria" los ids ya vienen elegidos por la persona del comité
 * en la UI (checkboxes) — aquí solo se valida que pertenezcan a la categoría.
 */
export function resolverObjetivoArbitros({ nivel, categoria, arbitroId, seleccionIds }, arbitros) {
  let arbitroIds;

  if (nivel === "arbitro") {
    arbitroIds = arbitros.some((a) => a.id === arbitroId) ? [arbitroId] : [];
  } else if (nivel === "categoria") {
    arbitroIds = arbitros.filter((a) => a.cat === categoria).map((a) => a.id);
  } else if (nivel === "grupo_categoria") {
    const idsDeCategoria = new Set(arbitros.filter((a) => a.cat === categoria).map((a) => a.id));
    arbitroIds = (seleccionIds || []).filter((id) => idsDeCategoria.has(id));
  } else {
    arbitroIds = [];
  }

  return {
    arbitroIds,
    valido: arbitroIds.length > 0,
    motivoRechazo: arbitroIds.length > 0 ? null : "El objetivo seleccionado no resuelve a ningún árbitro.",
  };
}
