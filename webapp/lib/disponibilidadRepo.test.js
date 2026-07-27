import { describe, it, expect } from "vitest";
import { declararDisponibilidad } from "./disponibilidadRepo";

/**
 * Solo se testea aquí lo que no depende de red: el rechazo de "festivo
 * solicitado" por antelación insuficiente corta antes de llamar a Supabase
 * (ver disponibilidadRepo.js). El resto (obtenerLog, obtenerVigente,
 * declararDisponibilidad con éxito, calcularPatronImplicacion) se verifica
 * contra el proyecto real en specs/003-persistencia-real/quickstart.md —
 * decisión ya tomada en plan.md (sin Postgres de test en esta spec).
 */
describe("declararDisponibilidad — rechazo de festivo por antelación (sin red)", () => {
  it("rechaza un festivo con menos de 15 días de antelación, sin intentar guardar", async () => {
    // c1 en ciclos-asignacion.json: fechaInicioISO "2026-07-26"
    const ahora = new Date("2026-07-20T00:00:00Z"); // 6 días de antelación
    const resultado = await declararDisponibilidad(
      { arbitroId: 1, cicloId: "c1", autor: "arbitro", tipo: "festivo_solicitado" },
      ahora
    );
    expect(resultado.ok).toBe(false);
    expect(resultado.motivoRechazo).toMatch(/15 días/);
  });
});
