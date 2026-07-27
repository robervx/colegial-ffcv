import { describe, it, expect } from "vitest";
import { conDisponibilidad, estaDisponible } from "./disponibilidad";

function arbitro(overrides = {}) {
  return { id: 2, cat: "Segona FFCV", vetos: [], indisp: 0, ...overrides };
}

describe("conDisponibilidad", () => {
  it("marca indisponible cuando indisp >= 6 y el id es múltiplo de 5", () => {
    const a = arbitro({ id: 5, indisp: 6 });
    expect(conDisponibilidad(a).indisponibleEsteFinde).toBe(true);
  });

  it("marca disponible cuando indisp es alto pero el id no es múltiplo de 5", () => {
    const a = arbitro({ id: 6, indisp: 8 });
    expect(conDisponibilidad(a).indisponibleEsteFinde).toBe(false);
  });

  it("marca disponible cuando indisp está por debajo del umbral aunque el id sea múltiplo de 5", () => {
    const a = arbitro({ id: 5, indisp: 5 });
    expect(conDisponibilidad(a).indisponibleEsteFinde).toBe(false);
  });

  it("añade el veto de ejemplo solo al árbitro id 1", () => {
    const a = arbitro({ id: 1, vetos: [] });
    expect(conDisponibilidad(a).vetos).toHaveLength(1);
    expect(conDisponibilidad(arbitro({ id: 2 })).vetos).toHaveLength(0);
  });

  it("resuelve catNivel a 0 para una categoría desconocida", () => {
    const a = arbitro({ cat: "Categoría inexistente" });
    expect(conDisponibilidad(a).catNivel).toBe(0);
  });
});

describe("estaDisponible", () => {
  it("es el inverso de indisponibleEsteFinde", () => {
    expect(estaDisponible(arbitro({ id: 5, indisp: 6 }))).toBe(false);
    expect(estaDisponible(arbitro({ id: 6, indisp: 6 }))).toBe(true);
  });

  it("con un array vacío no lanza y produce disponibilidad vacía", () => {
    expect([].map(estaDisponible)).toEqual([]);
  });
});
