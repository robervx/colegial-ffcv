import { describe, it, expect } from "vitest";
import { clasificarCandidatos, calcularCorte } from "./clasificacionAscenso";

describe("clasificarCandidatos", () => {
  it("ordena por nota final (media teórica+física) descendente", () => {
    const { candidatosOrdenados } = clasificarCandidatos([
      { arbitroId: 1, notaTeorica: 6, notaFisica: 6 }, // 6.0
      { arbitroId: 2, notaTeorica: 9, notaFisica: 9 }, // 9.0
      { arbitroId: 3, notaTeorica: 7, notaFisica: 8 }, // 7.5
    ]);
    expect(candidatosOrdenados.map((c) => c.arbitroId)).toEqual([2, 3, 1]);
    expect(candidatosOrdenados[0].notaFinal).toBe(9);
  });

  it("candidato con una sola prueba completa: excluido de la clasificación, no descartado silenciosamente", () => {
    const { candidatosOrdenados, candidatosIncompletos } = clasificarCandidatos([
      { arbitroId: 1, notaTeorica: 8, notaFisica: 8 },
      { arbitroId: 2, notaTeorica: 7, notaFisica: null },
      { arbitroId: 3, notaTeorica: null, notaFisica: 6 },
    ]);
    expect(candidatosOrdenados.map((c) => c.arbitroId)).toEqual([1]);
    expect(candidatosIncompletos.map((c) => c.arbitroId).sort()).toEqual([2, 3]);
  });

  it("empate de notas: orden estable (no lanza, no se pierde ningún candidato)", () => {
    const { candidatosOrdenados } = clasificarCandidatos([
      { arbitroId: 1, notaTeorica: 7, notaFisica: 7 },
      { arbitroId: 2, notaTeorica: 7, notaFisica: 7 },
    ]);
    expect(candidatosOrdenados).toHaveLength(2);
    expect(candidatosOrdenados.map((c) => c.arbitroId)).toEqual([1, 2]);
  });
});

describe("calcularCorte", () => {
  const ordenados = [
    { arbitroId: 2, notaFinal: 9 },
    { arbitroId: 3, notaFinal: 7.5 },
    { arbitroId: 1, notaFinal: 6 },
  ];

  it("plazas menores que candidatos: solo los primeros quedan dentro", () => {
    expect(calcularCorte(ordenados, 2).dentroDeCorte).toEqual([2, 3]);
  });

  it("plazas >= candidatos clasificados: todos dentro", () => {
    expect(calcularCorte(ordenados, 10).dentroDeCorte).toEqual([2, 3, 1]);
  });

  it("plazas = 0: nadie dentro del corte", () => {
    expect(calcularCorte(ordenados, 0).dentroDeCorte).toEqual([]);
  });

  it("plazas negativas: se tratan como 0, no lanza", () => {
    expect(calcularCorte(ordenados, -3).dentroDeCorte).toEqual([]);
  });
});
