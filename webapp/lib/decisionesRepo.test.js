import { describe, it, expect } from "vitest";
import { derivarEstadoRevision } from "./decisionesRepo";

describe("derivarEstadoRevision", () => {
  const ahora = new Date("2026-08-08T00:00:00Z");

  it("con revisión ya registrada: revisada, sin importar el plazo", () => {
    const r = derivarEstadoRevision(
      { creadoEn: "2026-08-01T00:00:00Z", plazoRevisionMeses: 3, tieneRevision: true },
      ahora
    );
    expect(r).toBe("revisada");
  });

  it("plazo cumplido sin revisión: pendiente", () => {
    const r = derivarEstadoRevision(
      { creadoEn: "2026-01-01T00:00:00Z", plazoRevisionMeses: 3, tieneRevision: false },
      ahora
    );
    expect(r).toBe("pendiente");
  });

  it("plazo no cumplido sin revisión: plazo_no_cumplido", () => {
    const r = derivarEstadoRevision(
      { creadoEn: "2026-08-01T00:00:00Z", plazoRevisionMeses: 3, tieneRevision: false },
      ahora
    );
    expect(r).toBe("plazo_no_cumplido");
  });

  it("plazo exactamente cumplido hoy: pendiente (límite inclusivo)", () => {
    const r = derivarEstadoRevision(
      { creadoEn: "2026-05-08T00:00:00Z", plazoRevisionMeses: 3, tieneRevision: false },
      ahora
    );
    expect(r).toBe("pendiente");
  });
});
