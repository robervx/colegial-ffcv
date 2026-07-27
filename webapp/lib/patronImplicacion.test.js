import { describe, it, expect } from "vitest";
import { calcularPatronImplicacion } from "./patronImplicacion";

function declaracion(overrides = {}) {
  return { arbitroId: 1, cicloId: "c1", autor: "arbitro", tipo: "no_disponible", motivo: null, justificada: null, fechaDeclaracion: "2026-07-01T10:00:00Z", ...overrides };
}

describe("calcularPatronImplicacion", () => {
  it("devuelve todo a cero para un log vacío o sin argumento", () => {
    expect(calcularPatronImplicacion([])).toEqual({ bajasNoJustificadas: 0, festivosSolicitados: 0, urgencias: 0 });
    expect(calcularPatronImplicacion()).toEqual({ bajasNoJustificadas: 0, festivosSolicitados: 0, urgencias: 0 });
  });

  it("cuenta solo las bajas NO justificadas", () => {
    const log = [
      declaracion({ motivo: "baja", justificada: false }),
      declaracion({ motivo: "baja", justificada: true }),
      declaracion({ motivo: "baja", justificada: false }),
    ];
    expect(calcularPatronImplicacion(log).bajasNoJustificadas).toBe(2);
  });

  it("cuenta los festivos solicitados", () => {
    const log = [
      declaracion({ tipo: "festivo_solicitado", motivo: null }),
      declaracion({ tipo: "festivo_solicitado", motivo: null }),
      declaracion({ tipo: "no_disponible", motivo: "lesion" }),
    ];
    expect(calcularPatronImplicacion(log).festivosSolicitados).toBe(2);
  });

  it("cuenta las urgencias de forma informativa, separada de las bajas", () => {
    const log = [declaracion({ motivo: "urgencia" }), declaracion({ motivo: "urgencia" })];
    const patron = calcularPatronImplicacion(log);
    expect(patron.urgencias).toBe(2);
    expect(patron.bajasNoJustificadas).toBe(0);
  });

  it("nunca incluye un campo score o nivel", () => {
    const patron = calcularPatronImplicacion([declaracion({ motivo: "baja", justificada: false })]);
    expect(patron).not.toHaveProperty("score");
    expect(patron).not.toHaveProperty("nivel");
  });
});
