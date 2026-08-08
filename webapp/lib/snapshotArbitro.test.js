import { describe, it, expect } from "vitest";
import { construirSnapshot } from "./snapshotArbitro";

describe("construirSnapshot", () => {
  it("etiqueta disponibilidad_vigente como real y el resto como sintético", () => {
    const arbitro = { numInformes: 4, pruebasFisicas: [], examenesTeoricos: [] };
    const snap = construirSnapshot(arbitro, {
      estadoForma: { color: "verde", media: 8.2 },
      disponibilidadVigente: { tipo: "no_disponible", motivo: "lesion" },
    });

    expect(snap.disponibilidad_vigente.fuente).toBe("real");
    expect(snap.estado_forma.fuente).toBe("sintetico");
    expect(snap.num_informes.fuente).toBe("sintetico");
  });

  it("árbitro sin declaración vigente: asume disponible por defecto (FR-007 de 002)", () => {
    const arbitro = { numInformes: 2, pruebasFisicas: [], examenesTeoricos: [] };
    const snap = construirSnapshot(arbitro, { estadoForma: { color: "ambar", media: 7.2 }, disponibilidadVigente: null });

    expect(snap.disponibilidad_vigente.valor).toEqual({ tipo: "disponible", motivo: null });
  });

  it("árbitro sin pruebas físicas/teóricas registradas: valor null, no un objeto vacío", () => {
    const arbitro = { numInformes: 0, pruebasFisicas: [], examenesTeoricos: [] };
    const snap = construirSnapshot(arbitro, { estadoForma: { color: "rojo", media: 6.1 }, disponibilidadVigente: null });

    expect(snap.ultima_prueba_fisica.valor).toBeNull();
    expect(snap.ultimo_examen_teorico.valor).toBeNull();
    expect(snap.num_informes.valor).toBe(0);
  });

  it("toma el primer elemento del array (asume ya ordenado desc por fecha, mismo criterio que generar_dataset_arbitros.py)", () => {
    const arbitro = {
      numInformes: 3,
      pruebasFisicas: [{ nota: 5.9, fecha: "28/02/2026" }, { nota: 8.1, fecha: "26/09/2025" }],
      examenesTeoricos: [],
    };
    const snap = construirSnapshot(arbitro, { estadoForma: { color: "verde", media: 8.0 }, disponibilidadVigente: null });

    expect(snap.ultima_prueba_fisica.valor.nota).toBe(5.9);
  });
});
