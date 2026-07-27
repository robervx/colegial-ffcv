/* eslint-disable @typescript-eslint/no-unused-vars -- las firmas documentan el contrato de specs/002-disponibilidad-arbitro/contracts/disponibilidad-repo.md aunque el stub no las use todavía */
/**
 * Repositorio de disponibilidad — contrato en
 * specs/002-disponibilidad-arbitro/contracts/disponibilidad-repo.md.
 *
 * Sin implementación real todavía: requiere persistencia real, que hoy no
 * existe (Principio VII de la constitución, bloqueado hasta Sprint 1 de
 * docs/sprints.md). Cada función falla de forma explícita en vez de simular
 * un guardado que no es real — mismo criterio que evita repetir el defecto
 * ya señalado del botón "Guardar nota".
 */
export class NoImplementadoError extends Error {
  constructor(fn) {
    super(
      `disponibilidadRepo.${fn}() no tiene implementación real todavía — requiere persistencia real (Sprint 1, ver docs/sprints.md). Contrato: specs/002-disponibilidad-arbitro/contracts/disponibilidad-repo.md`
    );
    this.name = "NoImplementadoError";
  }
}

export function obtenerLog(arbitroId) {
  throw new NoImplementadoError("obtenerLog");
}

export function obtenerVigente(arbitroId, cicloId) {
  throw new NoImplementadoError("obtenerVigente");
}

export function declararDisponibilidad(declaracion) {
  throw new NoImplementadoError("declararDisponibilidad");
}

export function calcularPatronImplicacion(arbitroId) {
  throw new NoImplementadoError("calcularPatronImplicacion");
}
