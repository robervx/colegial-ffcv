# Quickstart: validar Dashboard operativo del Comité

## Prerrequisitos

- `cd webapp && npm install` (incluye Vitest tras esta spec, ver `research.md` §1).
- Comprobar si ya hay un `next dev` corriendo de otra sesión antes de lanzar uno nuevo (`ps aux | grep next`) — el proyecto se trabaja en paralelo desde más de una sesión.

## Arrancar

```bash
cd webapp && npm run dev
```

Abrir `http://localhost:3000` (o el puerto que asigne si 3000 está ocupado) y navegar a Dashboard (pantalla de entrada, sin acción adicional).

## Escenarios a validar (uno por User Story de spec.md)

### US1 — Riesgo de cobertura del fin de semana (P1)

1. Abrir el Dashboard sin aplicar ningún filtro.
2. Verificar que, para cada categoría con partidos en el ciclo activo, se ve: partidos a designar, árbitros disponibles, y si está en riesgo.
3. Confirmar que una categoría en riesgo distingue disponibles de categoría propia vs. categoría inferior activada (Acceptance Scenario 2 de US1).
4. Confirmar que si todas las categorías tienen cobertura suficiente, no aparece ninguna alerta (Acceptance Scenario 3).

**Resultado esperado**: identificar si hay riesgo en menos de 10 segundos (SC-001), sin interacción.

### US2 — Reparto de carga (P2)

1. Localizar el indicador de equidad de carga.
2. Confirmar que además del número (coeficiente de variación) hay una frase en lenguaje llano ("equilibrada"/"desigual"/"muy desigual").
3. Confirmar que se muestra la cifra de partidos del árbitro con más carga y del que tiene menos, como referencia (Acceptance Scenario 2).

### US3 — Volumen de partidos por categoría (P3)

1. Sin filtro: comprobar que se ve el total de partidos de todas las categorías del ciclo activo.
2. Aplicar el filtro de categoría: comprobar que el recuento cambia en una sola interacción (SC-003).

### Explicabilidad y distinción real/sintético (FR-007, FR-008, SC-002, SC-004)

1. Para cada indicador numérico nuevo, comprobar que hay desglose/fórmula accesible (tooltip, texto al pie del panel, o expansión) — no un número aislado.
2. Comprobar visualmente que los indicadores que dependen de disponibilidad sintética llevan la misma marca `· sintético` que ya usa el resto de la app (ficha de árbitro, alertas de forma), y los que dependen de partidos/carga real llevan `· real`.

### Sin persistencia nueva (FR-009)

1. Interactuar con el Dashboard (aplicar filtro de categoría, expandir un desglose).
2. Refrescar la página.
3. Confirmar que nada de lo anterior se guarda entre sesiones (es esperado y correcto — el Dashboard es de consulta, no de edición).

## Verificación de lógica de cálculo

```bash
cd webapp && npx vitest run lib/coberturaCategoria.test.js lib/disponibilidad.test.js
```

Casos borde a cubrir (ver `data-model.md` y Edge Cases de `spec.md`):
- Categoría sin partidos programados → `estado: "sin_partidos"`, nunca `"riesgo"`.
- Dataset de disponibilidad vacío/no cargado → el cálculo lo señala explícitamente, no devuelve un cero indistinguible de cobertura completa.
- Dos categorías que comparten el mismo pool de "también pita inferiores" en riesgo simultáneamente → cada `CoberturaCategoria` se calcula de forma independiente (no se resta el pool ya "usado" por otra categoría), y el copy de UI lo advierte (ver `data-model.md`, invariante del edge case 4).
