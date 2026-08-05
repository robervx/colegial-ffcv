/**
 * Motor de designación por LOTE (jornada completa), no partido a partido.
 *
 * Por qué existe: asignar cada partido de forma aislada permite que el
 * "mejor candidato" salga repetido en varios partidos de la misma jornada —
 * en la práctica, un árbitro tiene como mucho UN partido de su categoría
 * propia por jornada, y opcionalmente UNO extra de categoría inferior si lo
 * tiene activado (ver conversación 22 jul 2026). Este módulo procesa todos
 * los partidos de un fin de semana a la vez y aplica ese límite por árbitro,
 * no solo evita choques de horario exacto (que también comprueba, como red
 * de seguridad adicional).
 *
 * v0 (greedy, no óptimo global): procesa los partidos de categoría más alta
 * primero (son los más restringidos, menos candidatos elegibles). No es el
 * óptimo teórico (eso sería un problema de asignación bipartito, ej.
 * algoritmo húngaro, sobre todos los partidos a la vez) pero es correcto,
 * explicable, y suficiente para 10-15 partidos por jornada. Revisar si el
 * volumen crece — con más partidos el greedy por categoría empieza a dejar
 * huecos que una optimización conjunta evitaría.
 */
import { filtroDuro, calcularCoste, scoreB1, mediaCategoria } from "./motorAsignacion";

const UMBRAL_AMBIGUO = 0.15; // diferencia de score entre 1º y 2º candidato

/**
 * Asigna todos los partidos de un ciclo (fin de semana). Devuelve, por
 * partido: el árbitro asignado (o null si no hay candidatos), el motivo de
 * revisión si aplica, y las alternativas (top 5) para que el humano pueda
 * elegir otra sin recalcular nada.
 */
export function asignarJornada(partidos, arbitros, localidadesGeo, vigentesDisponibilidad) {
  const categorias = [...new Set(arbitros.map((a) => a.cat))];
  const mediasCategoria = Object.fromEntries(categorias.map((c) => [c, mediaCategoria(arbitros, c)]));

  const yaTienePropia = new Set();  // arbitroId con su partido de categoría propia ya asignado esta jornada
  const yaTieneExtra = new Set();   // arbitroId con su partido "extra" de categoría inferior ya asignado esta jornada
  const slotsOcupados = new Map();  // arbitroId -> Set(fecha exacta) — red de seguridad adicional

  const orden = [...partidos].sort((a, b) => b.catNivelMinimo - a.catNivelMinimo);

  const resultados = orden.map((partido) => {
    const destino = localidadesGeo[partido.localidad];

    const evaluados = arbitros.map((a) => {
      const { excluido, motivos } = filtroDuro(a, partido, vigentesDisponibilidad?.get(a.id));
      if (excluido) return { arbitro: a, excluido: true, motivos, score: null };

      const esPropia = a.catNivel === partido.catNivelMinimo;
      if (esPropia && yaTienePropia.has(a.id)) {
        return { arbitro: a, excluido: true,
          motivos: ["Ya tiene su partido de categoría propia asignado en esta jornada"], score: null };
      }
      if (!esPropia && yaTieneExtra.has(a.id)) {
        return { arbitro: a, excluido: true,
          motivos: ["Ya tiene su partido extra de categoría inferior asignado en esta jornada (máximo uno)"], score: null };
      }
      if (slotsOcupados.get(a.id)?.has(partido.fecha)) {
        return { arbitro: a, excluido: true, motivos: ["Ya asignado a otro partido a la misma hora"], score: null };
      }

      const b1 = scoreB1(a, mediasCategoria);
      const origen = localidadesGeo[a.loc];
      return {
        arbitro: a, excluido: false, motivos: [], esPropia,
        score: b1.valor, scoreDesglose: b1.desglose,
        coste: calcularCoste({ origen, destino }),
      };
    });

    const excluidos = evaluados.filter((e) => e.excluido);
    const disponibles = evaluados.filter((e) => !e.excluido).sort((x, y) => y.score - x.score);

    if (disponibles.length === 0) {
      return {
        partido, asignado: null, alternativas: [], excluidos, requiereRevision: true,
        motivoRevision: ["Sin candidatos disponibles: todos excluidos, ya asignados en esta jornada, u ocupados a esta hora"],
      };
    }

    const elegido = disponibles[0];
    if (elegido.esPropia) yaTienePropia.add(elegido.arbitro.id);
    else yaTieneExtra.add(elegido.arbitro.id);
    if (!slotsOcupados.has(elegido.arbitro.id)) slotsOcupados.set(elegido.arbitro.id, new Set());
    slotsOcupados.get(elegido.arbitro.id).add(partido.fecha);

    const motivoRevision = [];
    if (partido.sensible) motivoRevision.push(partido.motivoSensible || "Partido marcado como sensible");
    if (disponibles.length > 1 && disponibles[0].score - disponibles[1].score < UMBRAL_AMBIGUO) {
      motivoRevision.push(`Score muy ajustado entre los dos primeros candidatos (${disponibles[0].score.toFixed(2)} vs ${disponibles[1].score.toFixed(2)})`);
    }
    return {
      partido,
      asignado: elegido,
      alternativas: disponibles.slice(1, 5),
      excluidos,
      requiereRevision: motivoRevision.length > 0,
      motivoRevision,
    };
  });

  // devolver en el orden original del ciclo, no en el orden de procesado
  const porId = new Map(resultados.map((r) => [r.partido.id, r]));
  return partidos.map((p) => porId.get(p.id));
}
