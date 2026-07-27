# Quickstart: validar Disponibilidad de árbitro (lo que es construible antes de Sprint 1)

Esta spec está bloqueada para implementación completa hasta que exista persistencia real (Sprint 1, ver `spec.md` Assumptions y `research.md` §1). Lo que sigue valida únicamente la lógica pura que sí se puede construir y testear ya (`research.md` §2) — no hay UI end-to-end que probar en navegador todavía.

## Prerrequisitos

- `cd webapp && npm install` (Vitest ya está instalado desde `001-dashboard-operativo`).
- `generar_jornadas.py` ejecutado con el nuevo campo `fechaInicioISO` en cada ciclo (ver `data-model.md`, "Ciclo (ampliación, no nueva entidad)") — sin esto, `lib/reglaFestivo.js` no tiene fecha real contra la que validar.

## Verificar la regla de los 15 días (FR-004)

```bash
cd webapp && npx vitest run lib/reglaFestivo.test.js
```

Casos a cubrir:
- Declaración con exactamente 15 días de antelación → válida (límite inclusivo).
- Declaración con 14 días → rechazada, con el motivo explicado.
- Declaración con antelación de sobra (30+ días) → válida.

## Verificar el cálculo de PatronImplicacion (FR-009, FR-010)

```bash
cd webapp && npx vitest run lib/patronImplicacion.test.js
```

Casos a cubrir (sobre un `LogDisponibilidad` de ejemplo, en memoria — no hace falta repositorio real):
- Un log sin ninguna baja no justificada ni festivo → `bajasNoJustificadas: 0, festivosSolicitados: 0`.
- Bajas justificadas no cuentan como `bajasNoJustificadas` (Acceptance Scenario 3 de US3).
- El resultado nunca incluye ningún campo `score`/`nivel` — solo cifras descriptivas (verificar la forma del objeto devuelto, no solo los valores).

## Verificar el contrato de repositorio sin implementación real

```bash
cd webapp && npx vitest run lib/disponibilidadRepo.test.js
```

Con el repositorio en su estado "stub" (sin Sprint 1 todavía), cada función del contrato (`contracts/disponibilidad-repo.md`) debe lanzar `NoImplementadoError` de forma explícita y describible — nunca fallar en silencio ni devolver datos falsos que parezcan reales.

## Cuando exista Sprint 1 (fuera de alcance de este quickstart)

En ese momento, este quickstart se amplía con los escenarios end-to-end de `spec.md` (declarar disponibilidad desde la ficha, ver el ratio en el Dashboard de 001, comprobar la visibilidad por rol con el selector "ver como") — no se documentan aquí todavía porque no hay nada que ejecutar en navegador hasta entonces.
