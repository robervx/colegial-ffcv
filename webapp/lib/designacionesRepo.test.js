import { describe, it, expect } from "vitest";
import { conDecisionVigente, decidir } from "./designacionesRepo";

function resultadoMotor(partidoId) {
  return { partido: { id: partidoId, equipoLocal: "A", equipoVisitante: "B" }, asignado: null, alternativas: [] };
}

describe("conDecisionVigente", () => {
  it("no toca los resultados sin designación vigente", () => {
    const enriquecidos = conDecisionVigente([resultadoMotor("p1")], new Map());
    expect(enriquecidos[0].decisionVigente).toBeNull();
  });

  it("añade decisionVigente cuando existe una designación para ese partido", () => {
    const designacion = { partidoId: "p1", arbitroId: 5, esSugerido: true };
    const vigentes = new Map([["p1", designacion]]);
    const enriquecidos = conDecisionVigente([resultadoMotor("p1"), resultadoMotor("p2")], vigentes);
    expect(enriquecidos[0].decisionVigente).toEqual(designacion);
    expect(enriquecidos[1].decisionVigente).toBeNull();
  });
});

describe("decidir — validación de motivo obligatorio (antes de llamar a Supabase)", () => {
  it("rechaza un cambio de candidato sin motivo", async () => {
    const resultado = await decidir({
      cicloId: "c1", partidoId: "p1", arbitroId: 2, esSugerido: false, motivo: "", decididoPorRol: "comite",
    });
    expect(resultado.ok).toBe(false);
    expect(resultado.error).toMatch(/motivo/i);
  });

  it("rechaza un motivo en blanco (solo espacios)", async () => {
    const resultado = await decidir({
      cicloId: "c1", partidoId: "p1", arbitroId: 2, esSugerido: false, motivo: "   ", decididoPorRol: "comite",
    });
    expect(resultado.ok).toBe(false);
  });
});
