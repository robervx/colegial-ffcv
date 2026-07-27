# Research: Dashboard operativo del Comité

## 1. Framework de test para lógica de cálculo (`lib/`)

**Decisión**: añadir Vitest como devDependency, configuración mínima (sin jsdom — las funciones nuevas son puro cálculo sobre JSON, no DOM).

**Racional**: la constitución (Estándares de Interfaz y Código) exige que la lógica de cálculo en `lib/` tenga tests de casos borde. Hoy el proyecto no tiene ningún test runner instalado (`package.json` sin `test` script, sin jest/vitest). Esta spec introduce la primera lógica de cálculo nueva desde el motor de designación (`coberturaCategoria()`), así que es el punto natural para resolver el hueco. Vitest se elige sobre Jest porque el proyecto ya usa Next.js 16 + ESM nativo y Vitest no requiere configuración de transformación adicional para eso; es más ligero que montar Jest+Babel para un puñado de funciones puras.

**Alternativas consideradas**:
- No añadir test runner y verificar solo a mano en navegador — rechazado: incumple el estándar de la constitución explícitamente para lógica de `lib/`, y esta spec añade una función con casos borde reales (categoría sin partidos, dataset de disponibilidad vacío, pool compartido entre categorías) que son exactamente el tipo de caso que un test evita romper en el futuro.
- Jest — rechazado por fricción de configuración con Next 16/ESM frente a Vitest para este alcance mínimo.

## 2. Concepto de "árbitro disponible" y su relación con `indisponibleEsteFinde`

**Decisión**: extraer la función `conExtras()` (hoy inline en `components/CRMExpedientes.jsx:57`, usada solo por la página de Designación en la línea 902) a `lib/disponibilidad.js`, y reutilizarla desde el Dashboard. No se cambia su lógica sintética actual (`a.indisp >= 6 && a.id % 5 === 0`) — sigue siendo una simplificación declarada, no dato real por fecha.

**Racional**: el Dashboard (FR-001, FR-004) y la página de Designación necesitan exactamente el mismo concepto de "¿está disponible este árbitro este fin de semana?". Hoy solo existe dentro del componente de Designación; duplicarlo en el Dashboard violaría DRY y generaría el riesgo de que ambas pantallas diverjan en qué cuenta como disponible. Moverlo a `lib/` también lo alinea con el estándar de la constitución (cálculo vive en `lib/`, testeable).

**Alternativas consideradas**:
- Duplicar el cálculo inline en `Dashboard()` — rechazado: riesgo de divergencia entre pantallas, va contra el principio de una sola fuente de verdad para "disponible".
- Añadir un campo `disponible` precalculado al JSON del dataset (`arbitros-200.json`) — rechazado: el dataset se regenera desde Python (`generar_dataset_arbitros.py`); mezclar en él una heurística de "este fin de semana" (que depende del ciclo activo, no es un atributo fijo del árbitro) contamina el dataset de identidad/carga con lógica de UI. Se mantiene como cálculo derivado en JS.

## 3. "Próximo fin de semana" / ciclo no cerrado

**Decisión**: el "próximo fin de semana" es el primer elemento de `ciclos-asignacion.json` (ya ordenado cronológicamente, `c1` primero). Ningún ciclo tiene hoy el campo `cerrado` (los tres existentes son `false`/ausente), así que "no cerrado" se resuelve simplemente como "el primero de la lista" hasta que exista lógica de cierre de ciclo — no se añade un campo `cerrado` nuevo en esta spec porque no hay ningún flujo todavía que lo escriba (eso es Sprint 2, gestión de designación real).

**Racional**: coincide con la Asunción ya escrita en `spec.md` ("mismo concepto de ciclo que ya usa el motor de designación existente"). Añadir un campo `cerrado` sin ningún productor de ese dato sería introducir estado que nadie mantiene — contradice el principio de no construir sobre datos que no existen.

**Alternativas consideradas**:
- Añadir campo `cerrado: boolean` a `ciclos-asignacion.json` ahora — rechazado, prematuro sin un flujo que lo cierre.

## 4. Agrupación de partidos por categoría dentro de un ciclo

**Decisión**: usar el campo ya existente `categoriaMinima` (string) de cada partido en `ciclos-asignacion.json` para agrupar y contar partidos por categoría (FR-002, FR-004). No se introduce un campo nuevo.

**Racional**: el dato ya existe y es el mismo que usa `asignarJornada()` (`catNivelMinimo`) para el filtro duro — reutilizarlo mantiene un único criterio de categoría en toda la app.

## 5. Distinción visual real/sintético para los nuevos indicadores

**Decisión**: reutilizar el patrón ya establecido en el Dashboard actual y en la ficha de árbitro: etiqueta de texto pequeña `· real` / `· sintético` en color `N.ink40`/`N.ambar` junto al valor o en el pie del panel (ver `Dashboard()` líneas 291-310 de `components/CRMExpedientes.jsx`, ya usa exactamente este patrón). No se diseña un componente nuevo de badge — se extiende el patrón existente a los indicadores nuevos de cobertura por categoría (que son parcialmente sintéticos, ver FR-008: partidos=real, disponibilidad=sintético).

**Racional**: la constitución (Principio VI) exige distinción consistente con el resto de la app — inventar un badge visual distinto para esta pantalla generaría inconsistencia en vez de reforzar la convención ya aprendida por el usuario.
