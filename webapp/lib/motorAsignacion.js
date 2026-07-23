/**
 * Motor de designación inteligente — v0.
 *
 * Implementa el esqueleto real acordado en docs/data-model.md, docs/kpis.md y
 * docs/tarifas.md: filtro duro (excluye) → score blando (ordena) → coste
 * desglosado en dos KPIs separados (federación vs. bienestar del árbitro).
 *
 * Simplificaciones explícitas de este v0 (no ocultar, documentar):
 * - B.1 (score de nivel) ya implementa la fórmula real de kpis.md con
 *   shrinkage bayesiano — ver scoreB1() más abajo.
 * - B.3 (idoneidad situacional) NO está implementado: exige historial de
 *   conflictividad por partido que hoy no existe para los 200 árbitros de
 *   trabajo. Se omite en vez de inventarse — mismo principio que kpis.md ya
 *   exige para B.3 con poca muestra ("no debe inventarse confianza donde no
 *   hay datos"), aquí aplicado al caso extremo de cero datos.
 * - A.5 (fiabilidad operativa / tasa de incidencias) tampoco está: no hay
 *   histórico de cancelaciones o no-shows todavía.
 * - La distancia es Haversine (línea recta) entre lat/lon geocodificados,
 *   no el "programa de distancias del Comité" (fuente oficial, no accesible
 *   por API). Se etiqueta siempre como estimación en la UI.
 * - El término municipal se compara por nombre de municipio geocodificado.
 */

const EUR_KM = 0.26;
const MIN_DESPLAZAMIENTO = 4;

export function haversineKm(a, b) {
  if (!a || !b) return null;
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLon = ((b.lon - a.lon) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.asin(Math.sqrt(h));
}

/** Bandas de dieta "resto de categorías" — docs/tarifas.md §1 (RFEF/Div.Honor Juvenil llevan baremo propio, no incluido en este v0). */
const BANDAS_DIETA_RESTO = [
  { hastaKm: 150, importe: 0 },
  { hastaKm: 200, importe: 19 },
  { hastaKm: 300, importe: 12 },
  { hastaKm: 450, importe: 20 },
  { hastaKm: Infinity, importe: 31 },
];

function dietaPorBanda(kmIdaVuelta) {
  const banda = BANDAS_DIETA_RESTO.find((b) => kmIdaVuelta <= b.hastaKm);
  return banda ? banda.importe : 31;
}

/**
 * Coste de una designación, separado en dos KPIs que nunca se deben fundir
 * (docs/data-model.md "Nota sobre bienestar vs. coste federación").
 */
export function calcularCoste({ origen, destino }) {
  const distanciaKm = haversineKm(origen, destino); // aproximación, no oficial
  const dentroTermino =
    origen?.municipio &&
    destino?.municipio &&
    origen.municipio.split(" / ")[0] === destino.municipio.split(" / ")[0];

  if (dentroTermino) {
    return {
      dentroTermino: true,
      distanciaKmAprox: distanciaKm != null ? Math.round(distanciaKm * 10) / 10 : null,
      dietaEstimada: 0,
      kilometrajeEstimado: 0,
      costeFederacionEstimado: 0,
      // el bienestar sigue existiendo aunque el coste federación sea 0
      cargaBienestarKm: distanciaKm != null ? Math.round(distanciaKm * 10) / 10 : null,
    };
  }

  const kmIdaVuelta = distanciaKm != null ? distanciaKm * 2 : null;
  const dieta = kmIdaVuelta != null ? dietaPorBanda(kmIdaVuelta) : null;
  const kilometraje =
    kmIdaVuelta != null ? Math.max(MIN_DESPLAZAMIENTO, kmIdaVuelta * EUR_KM) : null;

  return {
    dentroTermino: false,
    distanciaKmAprox: distanciaKm != null ? Math.round(distanciaKm * 10) / 10 : null,
    dietaEstimada: dieta,
    kilometrajeEstimado: kilometraje != null ? Math.round(kilometraje * 100) / 100 : null,
    costeFederacionEstimado:
      dieta != null && kilometraje != null ? Math.round((dieta + kilometraje) * 100) / 100 : null,
    cargaBienestarKm: distanciaKm != null ? Math.round(distanciaKm * 10) / 10 : null,
  };
}

/**
 * Filtro duro: excluye, no puntúa. Nunca debe aparecer un árbitro excluido
 * en el ranking con una puntuación baja — desaparece de la lista con motivo.
 */
export function filtroDuro(arbitro, partido) {
  const motivos = [];
  const vetoActivo = (arbitro.vetos || []).find((v) => v.equipo === partido.equipoLocal || v.equipo === partido.equipoVisitante);
  if (vetoActivo) motivos.push(`Veto activo con ${vetoActivo.equipo} (${vetoActivo.motivo})`);
  if (arbitro.indisponibleEsteFinde) motivos.push("Indisponibilidad declarada este fin de semana");
  if (arbitro.catNivel < partido.catNivelMinimo) {
    motivos.push("Categoría insuficiente para este partido");
  } else if (arbitro.catNivel > partido.catNivelMinimo && !arbitro.disponibleCategoriasInferiores) {
    motivos.push("Categoría inferior a la suya y no tiene activado pitar categorías inferiores");
  }
  return { excluido: motivos.length > 0, motivos };
}

/**
 * Consistencia (cuarto componente de B.1, kpis.md): un árbitro que oscila
 * mucho de partido a partido es menos fiable que uno estable en el mismo
 * nivel. No hay una definición cerrada en kpis.md de cómo calcularla —
 * heurística explícita de este v0: 10 menos la desviación típica de los
 * últimos informes (forma[]), escalada. Documentado como heurística propia,
 * no como fórmula acordada, para que quede claro que es candidata a revisión.
 */
export function consistencia(forma) {
  if (!forma || forma.length < 2) return 7; // sin histórico suficiente, valor neutro
  const media = forma.reduce((a, b) => a + b, 0) / forma.length;
  const varianza = forma.reduce((a, b) => a + (b - media) ** 2, 0) / forma.length;
  const desviacion = Math.sqrt(varianza);
  return Math.max(0, Math.min(10, 10 - desviacion * 4));
}

/** Media de la categoría, para el shrinkage bayesiano — kpis.md B.1. */
export function mediaCategoria(arbitros, categoria) {
  const enCategoria = arbitros.filter((a) => a.cat === categoria);
  if (!enCategoria.length) return 7;
  const suma = enCategoria.reduce((s, a) => {
    const ultima = a.hist?.[a.hist.length - 1]?.media;
    return s + (ultima ?? 7);
  }, 0);
  return suma / enCategoria.length;
}

/** Peso del dato propio vs. la media de categoría — kpis.md B.1, shrinkage bayesiano. */
export function pesoPropio(numInformes) {
  if (numInformes >= 4) return 1;
  if (numInformes === 3) return 0.7;
  return 0.5; // 1-2 informes
}

/**
 * B.1 — Score de nivel general, kpis.md:
 *   Score = 0.40·nota_evaluaciones + 0.20·prueba_física + 0.20·prueba_teórica + 0.20·consistencia
 * con shrinkage bayesiano hacia la media de categoría según nº de informes.
 * Penalización por cancelaciones/incidencias: no implementada (no hay ese dato
 * todavía) — deliberadamente en 0, no inventada.
 * Devuelve el desglose completo para que la UI pueda explicar el número, no
 * solo mostrarlo (principio "explicable siempre" de la guía de frontend).
 */
export function scoreB1(arbitro, mediasCategoria) {
  const notaEvaluaciones = arbitro.hist?.[arbitro.hist.length - 1]?.media ?? 7;
  const pruebaFisica = arbitro.fis ?? 7;
  const pruebaTeorica = arbitro.tec ?? 7;
  const cons = consistencia(arbitro.forma);
  const propio = 0.4 * notaEvaluaciones + 0.2 * pruebaFisica + 0.2 * pruebaTeorica + 0.2 * cons;

  const numInformes = arbitro.numInformes ?? 6;
  const peso = pesoPropio(numInformes);
  const mediaCat = mediasCategoria[arbitro.cat] ?? 7;
  const final = peso * propio + (1 - peso) * mediaCat;

  return {
    valor: Math.round(final * 100) / 100,
    desglose: {
      notaEvaluaciones, pruebaFisica, pruebaTeorica, consistencia: Math.round(cons * 100) / 100,
      propio: Math.round(propio * 100) / 100, numInformes, pesoPropio: peso,
      mediaCategoria: Math.round(mediaCat * 100) / 100,
    },
  };
}

export function rankCandidatos(arbitros, partido, localidadesGeo) {
  const destino = localidadesGeo[partido.localidad];
  // media de categoría precalculada una vez, no por candidato (O(n) en vez de O(n²))
  const categorias = [...new Set(arbitros.map((a) => a.cat))];
  const mediasCategoria = Object.fromEntries(categorias.map((c) => [c, mediaCategoria(arbitros, c)]));

  const evaluados = arbitros.map((a) => {
    const { excluido, motivos } = filtroDuro(a, partido);
    const origen = localidadesGeo[a.loc];
    const coste = calcularCoste({ origen, destino });
    const b1 = excluido ? null : scoreB1(a, mediasCategoria);
    return {
      arbitro: a,
      excluido,
      motivos,
      score: b1?.valor ?? null,
      scoreDesglose: b1?.desglose ?? null,
      coste,
    };
  });
  const excluidos = evaluados.filter((e) => e.excluido);
  const candidatos = evaluados
    .filter((e) => !e.excluido)
    .sort((x, y) => (y.score ?? 0) - (x.score ?? 0));
  return { candidatos, excluidos };
}
