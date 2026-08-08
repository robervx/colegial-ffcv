import { describe, it, expect } from "vitest";
import { compararMetricas } from "./compararSnapshots";

describe("compararMetricas", () => {
  it("estado_forma: media más alta es mejora, más baja es empeora", () => {
    const inicial = { estado_forma: { valor: { color: "ambar", media: 7.2 }, fuente: "sintetico" } };
    const mejor = { estado_forma: { valor: { color: "verde", media: 8.1 }, fuente: "sintetico" } };
    const peor = { estado_forma: { valor: { color: "rojo", media: 6.5 }, fuente: "sintetico" } };

    expect(compararMetricas(inicial, mejor).estado_forma).toBe("mejora");
    expect(compararMetricas(inicial, peor).estado_forma).toBe("empeora");
  });

  it("misma media: sin_cambio", () => {
    const snap = { estado_forma: { valor: { color: "verde", media: 8.0 }, fuente: "sintetico" } };
    expect(compararMetricas(snap, snap).estado_forma).toBe("sin_cambio");
  });

  it("disponibilidad_vigente siempre no_comparable, aunque cambie el tipo", () => {
    const inicial = { disponibilidad_vigente: { valor: { tipo: "disponible", motivo: null }, fuente: "real" } };
    const actual = { disponibilidad_vigente: { valor: { tipo: "no_disponible", motivo: "lesion" }, fuente: "real" } };
    expect(compararMetricas(inicial, actual).disponibilidad_vigente).toBe("no_comparable");
  });

  it("num_informes siempre no_comparable (volumen, no rendimiento — Principio IV)", () => {
    const inicial = { num_informes: { valor: 2, fuente: "sintetico" } };
    const actual = { num_informes: { valor: 6, fuente: "sintetico" } };
    expect(compararMetricas(inicial, actual).num_informes).toBe("no_comparable");
  });

  it("métrica ausente en uno de los dos snapshots: no_comparable, no lanza", () => {
    const inicial = { ultima_prueba_fisica: { valor: null, fuente: "sintetico" } };
    const actual = { ultima_prueba_fisica: { valor: { nota: 7.5, fecha: "1/1/2027" }, fuente: "sintetico" } };
    expect(compararMetricas(inicial, actual).ultima_prueba_fisica).toBe("no_comparable");
    expect(compararMetricas({}, actual).ultima_prueba_fisica).toBe("no_comparable");
  });

  it("nunca produce un índice agregado — el resultado es siempre un objeto por métrica", () => {
    const inicial = { estado_forma: { valor: { color: "verde", media: 8.0 }, fuente: "sintetico" } };
    const actual = { estado_forma: { valor: { color: "verde", media: 8.5 }, fuente: "sintetico" } };
    const resultado = compararMetricas(inicial, actual);
    expect(typeof resultado).toBe("object");
    expect(resultado).not.toHaveProperty("indice");
    expect(resultado).not.toHaveProperty("total");
  });
});
