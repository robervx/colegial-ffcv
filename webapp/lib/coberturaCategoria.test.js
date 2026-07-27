import { describe, it, expect } from "vitest";
import { coberturaPorCategoria } from "./coberturaCategoria";

function arbitro(overrides = {}) {
  return { id: 1, cat: "Segona FFCV", vetos: [], indisp: 0, disponibleCategoriasInferiores: false, ...overrides };
}

function ciclo(partidos) {
  return { id: "c-test", partidos };
}

function partido(categoriaMinima) {
  return { id: `p-${categoriaMinima}`, categoriaMinima, equipoLocal: "A", equipoVisitante: "B" };
}

describe("coberturaPorCategoria", () => {
  it("marca sin_partidos una categoría sin partidos programados, nunca riesgo", () => {
    const { porCategoria } = coberturaPorCategoria([arbitro()], ciclo([partido("Segona FFCV")]));
    const primeraFFCV = porCategoria.find((c) => c.categoria === "Primera FFCV");
    expect(primeraFFCV.partidosADesignar).toBe(0);
    expect(primeraFFCV.estado).toBe("sin_partidos");
  });

  it("señala explícitamente un dataset de disponibilidad vacío", () => {
    const { datasetDisponibilidadVacio, porCategoria } = coberturaPorCategoria([], ciclo([partido("Segona FFCV")]));
    expect(datasetDisponibilidadVacio).toBe(true);
    const segona = porCategoria.find((c) => c.categoria === "Segona FFCV");
    expect(segona.totalDisponibles).toBe(0);
    expect(segona.estado).toBe("riesgo");
  });

  it("distingue disponibles de categoría propia de los de categoría inferior activada", () => {
    const arbitros = [
      arbitro({ id: 1, cat: "Segona FFCV" }), // propia
      arbitro({ id: 2, cat: "Primera FFCV", disponibleCategoriasInferiores: true }), // cubre Segona como inferior
      arbitro({ id: 3, cat: "Primera FFCV", disponibleCategoriasInferiores: false }), // no cubre Segona
    ];
    const { porCategoria } = coberturaPorCategoria(arbitros, ciclo([partido("Segona FFCV")]));
    const segona = porCategoria.find((c) => c.categoria === "Segona FFCV");
    expect(segona.disponiblesCategoriaPropia).toBe(1);
    expect(segona.disponiblesCategoriaInferior).toBe(1);
    expect(segona.totalDisponibles).toBe(2);
  });

  it("calcula riesgo/ajustado/holgada según disponibles vs. partidos a designar", () => {
    const unArbitro = [arbitro({ id: 1, cat: "Segona FFCV" })];
    const riesgo = coberturaPorCategoria(unArbitro, ciclo([partido("Segona FFCV"), partido("Segona FFCV")]));
    expect(riesgo.porCategoria.find((c) => c.categoria === "Segona FFCV").estado).toBe("riesgo");

    const ajustado = coberturaPorCategoria(unArbitro, ciclo([partido("Segona FFCV")]));
    expect(ajustado.porCategoria.find((c) => c.categoria === "Segona FFCV").estado).toBe("ajustado");

    const holgada = coberturaPorCategoria(unArbitro, ciclo([]));
    expect(holgada.porCategoria.find((c) => c.categoria === "Segona FFCV").estado).toBe("sin_partidos");
  });

  it("no descuenta el pool compartido entre dos categorías que dependen del mismo árbitro de categoría inferior activada", () => {
    const arbitros = [arbitro({ id: 1, cat: "Lliga Comunitat", disponibleCategoriasInferiores: true })];
    const { porCategoria } = coberturaPorCategoria(
      arbitros,
      ciclo([partido("Segona FFCV"), partido("Primera FFCV")])
    );
    const segona = porCategoria.find((c) => c.categoria === "Segona FFCV");
    const primera = porCategoria.find((c) => c.categoria === "Primera FFCV");
    // el mismo árbitro cuenta en ambas categorías de forma independiente —
    // es una señal de disponibilidad potencial por categoría, no una suma sin solapamiento
    expect(segona.disponiblesCategoriaInferior).toBe(1);
    expect(primera.disponiblesCategoriaInferior).toBe(1);
  });

  it("respeta indisponibleEsteFinde: un árbitro indisponible no cuenta en ninguna categoría", () => {
    const arbitros = [arbitro({ id: 5, cat: "Segona FFCV", indisp: 6 })]; // id 5, indisp>=6 -> indisponible
    const { porCategoria } = coberturaPorCategoria(arbitros, ciclo([partido("Segona FFCV")]));
    expect(porCategoria.find((c) => c.categoria === "Segona FFCV").disponiblesCategoriaPropia).toBe(0);
  });
});
