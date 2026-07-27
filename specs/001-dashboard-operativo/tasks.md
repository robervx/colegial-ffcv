# Tasks: Dashboard operativo del Comité

**Input**: Design documents from `/specs/001-dashboard-operativo/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, quickstart.md (todos presentes; sin `contracts/`, no aplica — ver plan.md)

**Tests**: SÍ se incluyen tareas de test, pero acotadas a la lógica de cálculo nueva en `lib/` — es requisito explícito de la constitución (Estándares de Interfaz y Código), no un añadido por convención de plantilla. No hay tests de componente/UI en este proyecto (patrón existente: verificación manual en navegador).

**Organization**: tareas agrupadas por user story (US1/US2/US3 de `spec.md`), con una fase de Setup y una Foundational compartidas antes.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: se puede ejecutar en paralelo (ficheros distintos, sin dependencias pendientes)
- **[Story]**: a qué user story pertenece (US1, US2, US3)
- Rutas siempre relativas a `webapp/` salvo que se indique lo contrario

---

## Phase 1: Setup

**Purpose**: preparar el test runner que exige la constitución para la lógica de `lib/` nueva de esta spec (research.md §1)

- [x] T001 Añadir Vitest como devDependency, script `"test": "vitest run"` en `webapp/package.json`, y crear `webapp/vitest.config.js` (configuración mínima, sin jsdom — las funciones nuevas son cálculo puro)

**Checkpoint**: `npx vitest run` ejecuta (aunque sin tests todavía) sin errores de configuración.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: lógica de cálculo compartida por las tres user stories — nada de UI empieza hasta que esto esté hecho y testeado

**⚠️ CRITICAL**: ninguna tarea de US1/US2/US3 puede empezar hasta que esta fase esté completa

- [x] T002 [P] Crear `webapp/lib/categorias.js` exportando `CATEGORIAS` y `NIVEL_CATEGORIA` (movidos desde `webapp/components/CRMExpedientes.jsx:50-51`); actualizar `CRMExpedientes.jsx` para importarlos de ahí en vez de declararlos localmente
- [x] T003 Crear `webapp/lib/disponibilidad.js` extrayendo la función de enriquecimiento de disponibilidad hoy inline como `conExtras()` (`webapp/components/CRMExpedientes.jsx:57-62`), misma lógica sintética (`a.indisp >= 6 && a.id % 5 === 0`); actualizar el uso existente en la página de Designación (`CRMExpedientes.jsx:902`) para importar de `lib/disponibilidad.js` en vez de la función local (depende de T002 para `NIVEL_CATEGORIA`)
- [x] T004 [P] Escribir `webapp/lib/disponibilidad.test.js`: casos borde de `quickstart.md` (array vacío, todos disponibles, todos indisponibles, campo `indisp` en el límite del umbral)
- [x] T005 Crear `webapp/lib/coberturaCategoria.js` implementando `CoberturaCategoria` según `data-model.md` (`partidosADesignar`, `disponiblesCategoriaPropia`, `disponiblesCategoriaInferior`, `totalDisponibles`, `estado`), operando sobre el ciclo activo = `ciclos-asignacion.json[0]` (research.md §3) (depende de T002, T003)
- [x] T006 [P] Escribir `webapp/lib/coberturaCategoria.test.js` cubriendo los 3 casos borde de `data-model.md`/`quickstart.md`: categoría sin partidos programados → `estado: "sin_partidos"` (nunca `"riesgo"`); disponibilidad vacía señalada explícitamente (no como cero indistinguible de cobertura completa); dos categorías que comparten el mismo pool de "también pita inferiores" en riesgo simultáneamente, cada una calculada de forma independiente

**Checkpoint**: `npx vitest run` pasa en verde para `lib/disponibilidad.js` y `lib/coberturaCategoria.js`. A partir de aquí las tres user stories pueden implementarse.

---

## Phase 3: User Story 1 - Saber si hay riesgo de cobertura este fin de semana (Priority: P1) 🎯 MVP

**Goal**: el jefe del comité, al abrir el Dashboard sin filtrar, ve qué categorías están en riesgo de cobertura para el fin de semana ya programado, y por qué.

**Independent Test**: abrir el Dashboard sin aplicar ningún filtro y comprobar que cada categoría con partidos ese fin de semana muestra disponibles vs. partidos a designar, con desglose propia/inferior y señal visual de riesgo cuando aplica (ver `quickstart.md` §US1).

### Implementation for User Story 1

- [x] T007 [US1] En `Dashboard()` (`webapp/components/CRMExpedientes.jsx:215`), calcular la cobertura por categoría con `useMemo`, usando `coberturaCategoria()` sobre `ciclosAsignacion[0]` y `ARBITROS`
- [x] T008 [US1] Añadir panel "Cobertura por categoría" al Dashboard: por cada categoría con partidos, mostrar partidos a designar, total disponibles, y el desglose categoría propia vs. categoría inferior activada (FR-004, FR-005; Acceptance Scenario 2 de US1)
- [x] T009 [US1] Marcar visualmente como en riesgo las categorías con `estado === "riesgo"` (FR-006), reutilizando los tokens de color ya existentes (`N.rojo`/`N.ambar`/`N.verde`) y el patrón de `Chip`/`Semaforo` ya presente en el fichero — sin inventar un componente nuevo
- [x] T010 [US1] Añadir el desglose/fórmula accesible junto a cada indicador de cobertura (FR-007: nunca un número o color aislado) y el aviso textual sobre el pool compartido de categorías inferiores (`data-model.md`, invariante del edge case 4 de `spec.md`)
- [x] T011 [US1] Añadir la marca `· real` / `· sintético` a los indicadores nuevos del panel de cobertura (FR-008), reutilizando el patrón visual ya usado en el propio `Dashboard()` (líneas 291-310) — ver research.md §5
- [x] T012 [US1] Validar manualmente en navegador el escenario completo de `quickstart.md` §US1: sin filtro, categoría en riesgo visible en <10s (SC-001), categorías sanas sin alerta cuando no hay riesgo (Acceptance Scenario 3)

**Checkpoint**: User Story 1 funcional y testeable de forma independiente — MVP entregable.

---

## Phase 4: User Story 2 - Detectar reparto desigual de carga entre árbitros (Priority: P2)

**Goal**: el jefe del comité entiende si la carga de la temporada está repartida de forma razonable, con explicación en lenguaje llano, sin entrar árbitro por árbitro.

**Independent Test**: comprobar que el indicador de equidad muestra su explicación en lenguaje llano junto al número, y las cifras de partidos del árbitro con más y con menos carga (ver `quickstart.md` §US2).

> **Nota de partida**: gran parte de FR-003 ya existe en el `Dashboard()` actual — el `KpiCard` de "Equidad de carga" (`CRMExpedientes.jsx:216-218,237-238`) ya calcula `cvTexto` ("equilibrada"/"desigual"/"muy desigual") y el panel "Insights" (líneas 300-304) ya muestra `max_partidos`/`min_partidos`. Esta fase es de **verificación y cierre de huecos contra los Acceptance Scenarios**, no de construcción desde cero.

### Implementation for User Story 2

- [x] T013 [US2] Revisar el copy actual de "Equidad de carga" (KpiCard y panel Insights) contra los Acceptance Scenarios 1 y 2 de US2 en `spec.md`; si la explicación en lenguaje llano o las cifras de referencia (máx./mín.) no quedan igual de accesibles junto al propio indicador (y no solo en un panel aparte), ajustar el copy o la disposición — sin tocar el cálculo ya existente de `agregados-reales.json.equidad_carga`
- [x] T014 [US2] Validar manualmente en navegador el escenario de `quickstart.md` §US2

**Checkpoint**: User Stories 1 y 2 funcionan de forma independiente.

---

## Phase 5: User Story 3 - Consultar el volumen de partidos del fin de semana por categoría (Priority: P3)

**Goal**: el jefe del comité ve cuántos partidos hay que designar el próximo fin de semana, con filtro por categoría.

**Independent Test**: sin filtro se ve el total de todas las categorías; al aplicar el filtro, el recuento cambia en una sola interacción (ver `quickstart.md` §US3).

### Implementation for User Story 3

- [x] T015 [US3] Añadir filtro de categoría (estado local `useState`, por defecto "Todas") al Dashboard, con recuento de partidos del ciclo activo — reutilizar `CATEGORIAS` de `lib/categorias.js` (T002) y `partidosADesignar` ya calculado por `coberturaCategoria()` (T007) en vez de recalcular el conteo por separado (FR-002; Acceptance Scenarios 1-2 de US3)
- [x] T016 [US3] Validar manualmente en navegador el escenario de `quickstart.md` §US3: el recuento cambia de forma consistente al filtrar (SC-003)

**Checkpoint**: las tres user stories funcionan de forma independiente entre sí.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: cierre transversal de la spec — no añade funcionalidad nueva

- [x] T017 [P] Ejecutar `npx vitest run` en `webapp/` y confirmar que todos los tests de `lib/` (T004, T006) pasan
- [x] T018 [P] Validar en navegador, de forma transversal a las tres historias, FR-007 (explicabilidad, SC-002), FR-008 (distinción real/sintético, SC-004) y FR-009 (sin persistencia: filtrar, refrescar la página, confirmar que no queda nada guardado) — siguiendo `quickstart.md`
- [ ] T019 Actualizar `docs/estado-actual.md` y `docs/decisiones-producto.md` documentando la entrega del Dashboard operativo (spec 001) — convención del proyecto de documentar cada entrega en el momento, ver `feedback-colegial-workflow` en memoria
- [x] T020 Ejecutar `npm run lint` en `webapp/` y confirmar que no hay regresiones de estilo

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: sin dependencias — puede empezar ya
- **Foundational (Phase 2)**: depende de Setup (T001, config de Vitest) para poder correr T004/T006 — bloquea las tres user stories
- **User Stories (Phase 3-5)**: todas dependen de Foundational (Phase 2) completa
  - US1 (P1) y US2 (P2) son independientes entre sí, pero editan el mismo fichero (`CRMExpedientes.jsx`) — se recomienda secuencial (US1 → US2 → US3) para evitar conflictos de merge, aunque no hay dependencia lógica real entre ellas salvo la señalada abajo
  - US3 (T015) reutiliza `partidosADesignar` calculado en T007 (US1) — implementar US1 antes de US3, o duplicar el cálculo si se necesita paralelismo real de equipo
- **Polish (Phase 6)**: depende de que las historias que se vayan a entregar estén completas

### Parallel Opportunities

- T002 y T004 pueden avanzar en paralelo con T001 una vez exista `vitest.config.js` para T004
- T004 y T006 (tests) son ficheros distintos de sus implementaciones y se pueden escribir en paralelo con T005/T003 respectivamente
- T017 y T018 (Polish) son independientes entre sí

---

## Implementation Strategy

### MVP First (User Story 1 solamente)

1. Completar Phase 1 (Setup) y Phase 2 (Foundational — bloqueante)
2. Completar Phase 3 (US1)
3. Parar y validar US1 de forma independiente con `quickstart.md` §US1
4. Esto ya es un incremento demostrable: riesgo de cobertura por categoría, la pregunta operativa de mayor coste de la spec (spec.md, "Por qué esta prioridad" de US1)

### Incremental Delivery

1. Setup + Foundational → base lista
2. US1 → validar → MVP
3. US2 → validar (mayormente verificación de lo ya construido, ver nota en Phase 4)
4. US3 → validar
5. Polish (T017-T020) al cierre
