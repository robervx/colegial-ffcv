import { describe, it, expect } from "vitest";
import { validarAntelacionFestivo } from "./reglaFestivo";

describe("validarAntelacionFestivo", () => {
  it("es válida con exactamente 15 días de antelación (límite inclusivo)", () => {
    const { valido, diasAntelacion } = validarAntelacionFestivo("2026-07-11", "2026-07-26");
    expect(diasAntelacion).toBe(15);
    expect(valido).toBe(true);
  });

  it("se rechaza con 14 días de antelación", () => {
    const { valido, diasAntelacion } = validarAntelacionFestivo("2026-07-12", "2026-07-26");
    expect(diasAntelacion).toBe(14);
    expect(valido).toBe(false);
  });

  it("es válida con antelación de sobra", () => {
    const { valido, diasAntelacion } = validarAntelacionFestivo("2026-06-01", "2026-08-09");
    expect(diasAntelacion).toBeGreaterThan(15);
    expect(valido).toBe(true);
  });

  it("se rechaza si la declaración es posterior al inicio del ciclo", () => {
    const { valido, diasAntelacion } = validarAntelacionFestivo("2026-08-10", "2026-08-09");
    expect(diasAntelacion).toBeLessThan(0);
    expect(valido).toBe(false);
  });
});
