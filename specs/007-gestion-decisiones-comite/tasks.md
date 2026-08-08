# Tasks: Gestión y seguimiento de decisiones del comité

**Input**: Design documents from `/specs/007-gestion-decisiones-comite/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/decisiones-repo.md, quickstart.md

**Tests**: se incluyen tareas de test acotadas a lógica pura (sin red) — `resolverObjetivoDecision`, `snapshotArbitro`, `compararSnapshots`, `clasificacionAscenso` — mismo criterio que `specs/003-persistencia-real` (constitución, "Lógica de cálculo vive en `lib/` con tests de casos borde"). `decisionesRepo.js` (habla con Supabase) se verifica manualmente contra el proyecto real vía `quickstart.md`, no con Postgres de test.

**Organization**: tareas agrupadas por user story (US1-US4 de `spec.md`), con Setup y Foundational compartidas antes. Rutas relativas a `webapp/` salvo que se indique lo contrario.

**Nota (post `/speckit-analyze`, 8 ago 2026)**: renumerado tras aplicar las correcciones INC1/COV1/CON1/INC2/USP1/AMB1 del informe de análisis — ninguna tarea estaba iniciada todavía, así que renumerar no rompe nada en curso.

## Format: `[ID] [P?] [Story] Description`

---

## Phase 1: Setup

- [ ] T001 Escribir `supabase/migrations/0005_decisiones_comite.sql`: tablas `decisiones`, `snapshots_arbitro`, `revisiones_impacto` completas (`data-model.md`), RLS activado con políticas `SELECT`+`INSERT` para `anon` desde el primer día (sin `UPDATE`/`DELETE`, research.md §4) — no reutilizar el patrón permisivo `FOR ALL` que sí usaron `0001`-`0003` antes de endurecerse en `0004`
- [ ] T002 **Acción de Roberto**: aplicar la migración `0005` al proyecto Supabase real — confirmar que la integración GitHub↔Supabase la aplicó automáticamente al hacer push, o ejecutarla a mano en el SQL Editor. Verificar en Table Editor que las 3 tablas existen con sus columnas y RLS activo.

**Checkpoint**: `npx vitest run` sigue en verde (nada roto todavía), y las 3 tablas existen en Supabase.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: piezas puras y el repositorio compartidos por las cuatro user stories

**⚠️ CRITICAL**: ninguna tarea de US1-US4 puede empezar hasta que esta fase esté completa

- [ ] T003 [P] Crear `webapp/lib/resolverObjetivoDecision.js`: función pura `resolverObjetivoArbitros({ nivel, categoria, grupo }, ARBITROS)` que resuelve "árbitro" / "categoría completa" / "grupo dentro de categoría" a una lista concreta de `arbitro_id` (research.md §2) — nunca se vuelve a llamar después del registro, solo en el momento de decidir
- [ ] T004 [P] Crear `webapp/lib/resolverObjetivoDecision.test.js`: casos borde — categoría sin árbitros elegibles, grupo que resulta vacío (debe rechazarse antes de llegar a `decisionesRepo`, no crear una decisión con `objetivo_arbitro_ids: []`)
- [ ] T005 [P] Crear `webapp/lib/snapshotArbitro.js`: función pura `construirSnapshot(arbitro, contexto)` → objeto `metricas` con `estado_forma`, `disponibilidad_vigente`, `num_informes`, `ultima_prueba_fisica`, `ultimo_examen_teorico`, cada uno `{ valor, fuente: 'real'|'sintetico' }` (research.md §3, contracts/decisiones-repo.md)
- [ ] T006 [P] Crear `webapp/lib/snapshotArbitro.test.js`: casos borde — árbitro sin declaración de disponibilidad vigente (default disponible, mismo criterio que `disponibilidadRepo`), sin pruebas físicas registradas, con `numInformes = 0`
- [ ] T007 [P] Crear `webapp/lib/compararSnapshots.js`: función pura `compararMetricas(snapshotInicial, metricasActuales)` → `{ "<metrica>": "mejora"|"empeora"|"sin_cambio"|"no_comparable" }` (data-model.md, `revisiones_impacto.comparacion`) — nunca produce un índice agregado único (FR-005)
- [ ] T008 [P] Crear `webapp/lib/compararSnapshots.test.js`: casos borde — métrica categórica sin orden claro (p. ej. `disponibilidad_vigente`, tipo) marcada `no_comparable` en vez de forzar mejora/empeora; métrica ausente en uno de los dos snapshots
- [ ] T009 Crear `webapp/lib/decisionesRepo.js` implementando `registrarDecision`, `obtenerDecision`, `listarDecisiones`, `revisarImpacto` según `contracts/decisiones-repo.md` (usa T003, T005, T007; depende de T001, T002) — `listarDecisiones` deriva `estadoRevision` (`pendiente`/`plazo_no_cumplido`/`revisada`) como función pura interna, testeable sin red
- [ ] T010 [P] Crear `webapp/lib/decisionesRepo.test.js`: tests de la función pura de derivación de `estadoRevision` (plazo cumplido sin revisión → `pendiente`; plazo no cumplido → `plazo_no_cumplido`; con al menos una fila de revisión → `revisada`), sin llamar a Supabase

**Checkpoint**: `npx vitest run` en verde para los tests nuevos; foundation lista para las 4 historias.

---

## Phase 3: User Story 1 - Registrar una decisión con snapshot (Priority: P1) 🎯 MVP

**Goal**: el comité registra una decisión (tipo "acción de motivación/seguimiento") dirigida a un árbitro, categoría o grupo, y el sistema captura su snapshot.

**Independent Test**: registrar una decisión sobre un árbitro concreto, comprobar snapshot con campos etiquetados real/sintético; repetir a nivel categoría/grupo y comprobar que la lista de afectados queda fija (`quickstart.md` §US1).

### Implementation for User Story 1

- [ ] T011 [US1] Añadir entrada de navegación "Decisiones" (o nombre definitivo a acordar) en el bloque "Próximas versiones" del sidebar, junto a "Consultar con IA" — a diferencia de esa, sin `BannerV2`/candado, navegación activa (`CRMExpedientes.jsx`, plan.md)
- [ ] T012 [US1] Dejar explícito en el código (comentario corto) y en la UI de `VistaDecisiones` que esta página no tiene control de acceso propio todavía (FR-012) — mismo criterio sin cuentas de la Fase 1 de rollout que el resto del prototipo (`docs/decisiones-producto.md` §22), hasta que `004-roles-permisos` exista; no bloquea nada, es solo dejar la limitación trazable en vez de implícita
- [ ] T013 [US1] Crear función `VistaDecisiones({ T })` en `webapp/components/CRMExpedientes.jsx` (patrón `Vista*` ya usado por `VistaEquipos`/`VistaPartidos`) con estado vacío/carga inicial
- [ ] T014 [US1] Formulario de registro: tipo (fijo a `accion_motivacion` en esta historia), título libre, selector de nivel de objetivo (árbitro / categoría / grupo dentro de categoría, usando `resolverObjetivoDecision.js` de T003), estimación de impacto en texto libre (campo de texto plano, sin ningún control numérico/slider que sugiera una predicción calculada — FR-004, ver spec.md Assumptions) — llama a `decisionesRepo.registrarDecision`
- [ ] T015 [US1] Selector de "grupo dentro de una categoría": lista de árbitros de la categoría elegida con filtro por `estadoForma()` (irregular/en seguimiento/verde), casillas de selección múltiple
- [ ] T016 [US1] Vista de detalle de una decisión: título, objetivo (con la lista de árbitros resuelta, no el filtro), estimación de impacto, y el snapshot de cada árbitro con cada campo mostrando su etiqueta real/sintético (`DarkTag`/patrón ya usado en el Cuadro de Mando, o el equivalente que exista en el sistema de diseño vigente en el momento de implementar)
- [ ] T017 [US1] Estados de carga y error del formulario y de la carga del detalle (constitución: "Estados vacío, carga y error son obligatorios en toda pantalla nueva antes de mergear")
- [ ] T018 [US1] Verificar manualmente en navegador el escenario de `quickstart.md` §US1 (los tres niveles de objetivo, recarga de página para confirmar persistencia real)

**Checkpoint**: User Story 1 funcional de forma independiente — MVP entregable (deja un registro de decisiones con snapshot, aunque nunca se revise).

---

## Phase 4: User Story 2 - Revisar si el impacto estimado se cumplió (Priority: P2)

**Goal**: comparar el snapshot inicial de una decisión contra el estado actual, mostrando mejora/empeora/sin cambio por métrica.

**Independent Test**: sobre una decisión con snapshot y plazo cumplido, revisar y comprobar la comparación campo a campo con lenguaje de correlación, no causalidad (`quickstart.md` §US2).

### Implementation for User Story 2

- [ ] T019 [US2] Botón "Revisar impacto" en el detalle de decisión (T016) — llama a `decisionesRepo.revisarImpacto`, deshabilitado con explicación si `estadoRevision === 'plazo_no_cumplido'` salvo que el comité fuerce la revisión anticipada (Historia 2, Acceptance Scenario 3)
- [ ] T020 [US2] UI de comparación: por cada árbitro objetivo y cada métrica, valor inicial / valor actual / dirección (`mejora`/`empeora`/`sin_cambio`/`no_comparable`), nunca un índice agregado único
- [ ] T021 [US2] Texto fijo y visible en toda revisión: "correlación temporal, no relación de causa-efecto confirmada" (FR-006, SC-005)
- [ ] T022 [US2] Manejo de árbitro no activo en el dataset al revisar: mostrar `no_comparable` con motivo "árbitro no activo" en vez de excluirlo silenciosamente (Edge Case de `spec.md`)
- [ ] T023 [US2] Verificar manualmente en navegador `quickstart.md` §US2, incluida una segunda revisión sobre la misma decisión (no debe sobrescribir la primera)

**Checkpoint**: User Story 1 y 2 juntas cierran el bucle "estimar antes / verificar después" completo.

---

## Phase 5: User Story 3 - Campaña de ascenso de categoría (Priority: P2)

**Goal**: ciclo completo de una campaña de ascenso — candidatos, pruebas, clasificación, plazas, corte confirmado.

**Independent Test**: crear campaña, registrar notas (dejando una incompleta a propósito), fijar plazas, confirmar corte, comprobar que solo asciende quien queda dentro y solo tras confirmación explícita (`quickstart.md` §US3).

### Implementation for User Story 3

- [ ] T024 [P] [US3] Crear `webapp/lib/clasificacionAscenso.js`: función pura que, dados candidatos con `nota_teorica`/`nota_fisica` y un nº de plazas, devuelve `{ candidatosOrdenados, dentroDeCorte }` — excluye de la clasificación (no descarta silenciosamente) a quien no tenga ambas notas (research.md §5, Edge Case de `spec.md`). Sin dependencia técnica de Foundational (T003-T010) más allá de convenciones compartidas — puede desarrollarse en paralelo a esa fase si hay capacidad, aunque quede numerada dentro de US3 por pertenecer conceptualmente a esta historia
- [ ] T025 [P] [US3] Crear `webapp/lib/clasificacionAscenso.test.js`: casos borde — candidato con una sola prueba completa, empate de notas, plazas ≥ candidatos clasificados (todos dentro), plazas = 0
- [ ] T026 [US3] Extender `webapp/lib/decisionesRepo.js`: `registrarFaseCampana` (nueva fila por fase, nunca `UPDATE`, rechaza si la última fase ya tiene `corte_confirmado: true`) y `confirmarCorteAscenso` (única función que persiste `corte_confirmado`/`ascendidos_arbitro_ids`, usa `clasificacionAscenso.js` internamente) — depende de T009, T024
- [ ] T027 [US3] UI: crear campaña — categoría de origen/destino, selección de candidatos elegibles de esa categoría
- [ ] T028 [US3] UI: registrar nota de prueba teórica y física por candidato, con aviso visible de que son notas sintéticas (`pruebasFisicas`/`examenesTeoricos` de `arbitros-200.json`) mientras no haya dato real del comité
- [ ] T029 [US3] UI: clasificación en vivo (ordenada, candidato incompleto señalado) + selector de plazas disponibles, mostrando quién quedaría dentro del corte como **previsualización**, sin ascender a nadie todavía
- [ ] T030 [US3] UI: botón de confirmación explícita del corte (`confirmarCorteAscenso`); tras confirmar, la campaña queda inmutable (T026) y el resultado se muestra explícitamente etiquetado como basado en pruebas sintéticas
- [ ] T031 [US3] Verificar manualmente en navegador `quickstart.md` §US3 completo, incluido el intento de modificar una campaña ya confirmada (debe rechazarse)

**Checkpoint**: las tres historias de mayor prioridad (registrar, revisar, campaña de ascenso) funcionan de forma independiente entre sí.

---

## Phase 6: User Story 4 - Bitácora de decisiones (Priority: P3)

**Goal**: listado filtrable de todas las decisiones con señal de pendiente de revisión.

**Independent Test**: con varias decisiones de distinto tipo/fecha, filtrar por tipo y comprobar que las pendientes de revisión quedan señaladas (`quickstart.md` §US4).

### Implementation for User Story 4

- [ ] T032 [US4] Vista de listado en `VistaDecisiones` (o subvista propia) usando `decisionesRepo.listarDecisiones({ tipo })`, con filtro por tipo y **estado vacío explícito** ("todavía no hay decisiones registradas") cuando la lista esté vacía — mismo mandato constitucional que T017 aplicado aquí
- [ ] T033 [US4] Señalización visual de `estadoRevision` (`pendiente` destacado, `plazo_no_cumplido` neutro, `revisada` resuelto) — verificable en 3 clics o menos desde la bitácora (SC-003)
- [ ] T034 [US4] Verificar manualmente en navegador `quickstart.md` §US4

**Checkpoint**: las cuatro historias funcionan de forma independiente y conjunta.

---

## Phase 7: Polish & Cross-Cutting Concerns

- [ ] T035 [P] `npm run lint` sin errores ni warnings nuevos
- [ ] T036 [P] `npx vitest run` completo en verde (suite existente + los tests nuevos de T004/T006/T008/T010/T025)
- [ ] T037 Registrar el resultado de esta spec en `docs/estado-actual.md` y `docs/decisiones-producto.md` (§ siguiente disponible) — pendiente de que la sesión paralela activa en este mismo repo libere esos ficheros, ver plan.md
- [ ] T038 Revisar `docs/sprints.md`: aclarar la relación entre el placeholder "Simulaciones" ya anotado ahí y este módulo (¿lo sustituye, es complementario?) para que no queden dos ideas sin reconciliar

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: sin dependencias — puede empezar en cuanto la rama `007-gestion-decisiones-comite` exista
- **Foundational (Phase 2)**: depende de Setup (la migración debe estar aplicada, T002, antes de que `decisionesRepo.js` pueda verificarse de verdad) — BLOQUEA las 4 historias
- **User Stories (Phase 3-6)**: todas dependen de Foundational. US1 es la única con cero dependencia de otra historia; US2 depende de que existan decisiones con snapshot (US1) para tener algo que revisar, pero su código no depende de que US1 esté "terminada" en el sentido de UI — puede desarrollarse en paralelo si hay datos de prueba. US3 es independiente de US1/US2 en código (usa `decisionesRepo`/`clasificacionAscenso` propios) pero comparte el mismo repositorio base — sus dos tareas puras (T024/T025) no dependen técnicamente de Foundational y podrían adelantarse, aunque viven numeradas en la fase de US3 por pertenecer conceptualmente a esa historia (ver nota en T024). US4 depende de que exista más de una decisión para ser útil, pero su código no depende de US1-US3.
- **Polish (Phase 7)**: depende de las historias que se decida entregar

### Parallel Opportunities

- T003, T005, T007 (las tres funciones puras de Foundational) son paralelas entre sí — ficheros distintos, sin dependencias cruzadas
- T004, T006, T008, T010 (sus tests) son paralelos entre sí y respecto a otras tareas no relacionadas
- T024/T025 (clasificación de ascenso) son paralelas al resto de Foundational/US1/US2 en términos de fichero — no comparten ninguno, aunque están numeradas dentro de US3
- Una vez Foundational (Phase 2) está completa, US1/US3/US4 pueden avanzar en paralelo si hay más de una persona; US2 avanza mejor después de tener alguna decisión real de US1 para probar contra ella

---

## Parallel Example: Foundational

```bash
# Lanzar juntas las funciones puras de Foundational:
Task: "Crear webapp/lib/resolverObjetivoDecision.js"
Task: "Crear webapp/lib/snapshotArbitro.js"
Task: "Crear webapp/lib/compararSnapshots.js"

# Y sus tests, también en paralelo entre sí:
Task: "Crear webapp/lib/resolverObjetivoDecision.test.js"
Task: "Crear webapp/lib/snapshotArbitro.test.js"
Task: "Crear webapp/lib/compararSnapshots.test.js"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Completar Phase 1: Setup (migración `0005` aplicada)
2. Completar Phase 2: Foundational
3. Completar Phase 3: User Story 1
4. **PARAR Y VALIDAR**: probar US1 de forma independiente (`quickstart.md` §US1)
5. Enseñar a Roberto — ya hay valor real (registro de decisiones con snapshot) aunque US2-US4 no existan todavía

### Incremental Delivery

1. Setup + Foundational → base lista
2. US1 → validar → demo (MVP)
3. US2 → validar → demo (cierra el bucle diferencial "estimar/verificar")
4. US3 → validar → demo (campaña de ascenso, el segundo tipo de decisión pedido)
5. US4 → validar → demo (bitácora, valor de organización sobre lo ya construido)

---

## Notes

- [P] = ficheros distintos, sin dependencias entre sí
- La etiqueta [Story] mapea cada tarea a su historia de `spec.md` para trazabilidad
- Cada historia debe quedar completable y probable de forma independiente
- Commitear tras cada tarea o grupo lógico, en la rama `007-gestion-decisiones-comite`
- Evitar: tareas vagas, conflictos de mismo fichero entre tareas paralelas, dependencias cruzadas entre historias que rompan su independencia
