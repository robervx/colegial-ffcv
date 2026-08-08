import { describe, it, expect } from "vitest";
import { resolverObjetivoArbitros } from "./resolverObjetivoDecision";

const ARBITROS = [
  { id: 1, cat: "Segona FFCV" },
  { id: 2, cat: "Segona FFCV" },
  { id: 3, cat: "Primera FFCV" },
];

describe("resolverObjetivoArbitros", () => {
  it("nivel arbitro: resuelve al id dado si existe", () => {
    const r = resolverObjetivoArbitros({ nivel: "arbitro", arbitroId: 2 }, ARBITROS);
    expect(r).toEqual({ arbitroIds: [2], valido: true, motivoRechazo: null });
  });

  it("nivel arbitro: id inexistente resuelve vacío y rechaza", () => {
    const r = resolverObjetivoArbitros({ nivel: "arbitro", arbitroId: 999 }, ARBITROS);
    expect(r.valido).toBe(false);
    expect(r.arbitroIds).toEqual([]);
    expect(r.motivoRechazo).toBeTruthy();
  });

  it("nivel categoria: resuelve a todos los árbitros de esa categoría", () => {
    const r = resolverObjetivoArbitros({ nivel: "categoria", categoria: "Segona FFCV" }, ARBITROS);
    expect(r.arbitroIds.sort()).toEqual([1, 2]);
    expect(r.valido).toBe(true);
  });

  it("nivel categoria sin árbitros elegibles: rechaza en vez de crear objetivo vacío", () => {
    const r = resolverObjetivoArbitros({ nivel: "categoria", categoria: "Tercera Federación" }, ARBITROS);
    expect(r.valido).toBe(false);
    expect(r.arbitroIds).toEqual([]);
  });

  it("nivel grupo_categoria: filtra la selección a los que pertenecen a la categoría", () => {
    const r = resolverObjetivoArbitros(
      { nivel: "grupo_categoria", categoria: "Segona FFCV", seleccionIds: [1, 3] },
      ARBITROS
    );
    // el 3 es de Primera FFCV, no pertenece a la categoría elegida
    expect(r.arbitroIds).toEqual([1]);
    expect(r.valido).toBe(true);
  });

  it("nivel grupo_categoria: selección resultante vacía se rechaza", () => {
    const r = resolverObjetivoArbitros(
      { nivel: "grupo_categoria", categoria: "Segona FFCV", seleccionIds: [3] },
      ARBITROS
    );
    expect(r.valido).toBe(false);
    expect(r.motivoRechazo).toBeTruthy();
  });
});
