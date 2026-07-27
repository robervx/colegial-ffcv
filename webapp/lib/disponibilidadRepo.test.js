import { describe, it, expect } from "vitest";
import {
  obtenerLog,
  obtenerVigente,
  declararDisponibilidad,
  calcularPatronImplicacion,
  NoImplementadoError,
} from "./disponibilidadRepo";

describe("disponibilidadRepo (stub, sin Sprint 1 todavía)", () => {
  it("obtenerLog lanza NoImplementadoError de forma explícita", () => {
    expect(() => obtenerLog(1)).toThrow(NoImplementadoError);
  });

  it("obtenerVigente lanza NoImplementadoError de forma explícita", () => {
    expect(() => obtenerVigente(1, "c1")).toThrow(NoImplementadoError);
  });

  it("declararDisponibilidad lanza NoImplementadoError de forma explícita", () => {
    expect(() => declararDisponibilidad({ arbitroId: 1, cicloId: "c1" })).toThrow(NoImplementadoError);
  });

  it("calcularPatronImplicacion lanza NoImplementadoError de forma explícita", () => {
    expect(() => calcularPatronImplicacion(1)).toThrow(NoImplementadoError);
  });

  it("el mensaje de error señala dónde está el contrato y por qué está bloqueado", () => {
    try {
      obtenerLog(1);
      throw new Error("no debería llegar aquí");
    } catch (e) {
      expect(e.message).toMatch(/persistencia real/);
      expect(e.message).toMatch(/disponibilidad-repo\.md/);
    }
  });
});
