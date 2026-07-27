# Tasks: Persistencia real (Sprint 1 + Sprint 2 fusionados)

**Input**: Design documents from `/specs/003-persistencia-real/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, quickstart.md, contracts/ (anotaciones-repo.md, designaciones-repo.md; disponibilidad-repo.md sigue en `specs/002-disponibilidad-arbitro/contracts/`)

**Tests**: se incluyen tareas de test acotadas a lógica pura (sin red) — `conDecisionVigente`, validaciones de motivo obligatorio. Los repositorios que hablan con Supabase se verifican manualmente contra el proyecto real (`quickstart.md`), no con Postgres de test — decisión ya tomada en `plan.md`.

**Organization**: tareas agrupadas por user story (US1/US2/US3 de `spec.md`), con Setup y Foundational compartidas antes. Rutas relativas a `webapp/` salvo que se indique lo contrario.

## Format: `[ID] [P?] [Story] Description`

---

## Phase 1: Setup

- [ ] T001 Añadir `@supabase/supabase-js` a `webapp/package.json` (`npm install`)
- [ ] T002 Crear `webapp/lib/supabaseClient.js`: único punto de creación del cliente, usando `NEXT_PUBLIC_SUPABASE_URL`/`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` de `.env.local` (research.md §1)
- [ ] T003 [P] Escribir `supabase/migrations/0001_anotaciones.sql`: tabla `anotaciones` completa (`data-model.md`), RLS activado + política permisiva para `anon` (research.md §3)
- [ ] T004 [P] Escribir `supabase/migrations/0002_designaciones.sql`: tabla `designaciones` completa, con el `check` de motivo obligatorio cuando `es_sugerido = false`, índice `(partido_id, decidido_en desc)`, RLS + política permisiva
- [ ] T005 [P] Escribir `supabase/migrations/0003_declaraciones_disponibilidad.sql`: tabla `declaraciones_disponibilidad` completa (mismos campos que `specs/002-disponibilidad-arbitro/data-model.md`), RLS + política permisiva
- [ ] T006 **Acción de Roberto**: aplicar las tres migraciones al proyecto Supabase "RefData" — confirmar que la integración GitHub↔Supabase las aplicó automáticamente al hacer push, o ejecutarlas a mano en el SQL Editor si no. Verificar en Table Editor que las 3 tablas existen con sus columnas.

**Checkpoint**: `npx vitest run` sigue en verde (nada roto todavía), y las 3 tablas existen en Supabase.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: repositorios compartidos por las tres user stories

**⚠️ CRITICAL**: ninguna tarea de US1/US2/US3 puede empezar hasta que esta fase esté completa

- [ ] T007 [P] Crear `webapp/lib/anotacionesRepo.js` implementando `obtenerAnotaciones` y `guardarAnotacion` según `contracts/anotaciones-repo.md` (depende de T002, T003, T006)
- [ ] T008 [P] Crear `webapp/lib/designacionesRepo.js` implementando `obtenerVigentesPorCiclo`, `decidir` y la función pura `conDecisionVigente` según `contracts/designaciones-repo.md` (depende de T002, T004, T006)
- [ ] T009 [P] Escribir `webapp/lib/designacionesRepo.test.js`: tests de `conDecisionVigente` (función pura — un resultado del motor sin designación vigente pasa igual; uno con designación vigente queda enriquecido con `decisionVigente`) y de la validación "motivo obligatorio si `esSugerido` es `false`" antes de llamar a Supabase
- [ ] T010 Reescribir `webapp/lib/disponibilidadRepo.js`: sustituir el stub (`NoImplementadoError`) por la implementación real contra `declaraciones_disponibilidad`, exactamente la misma firma que ya fija `specs/002-disponibilidad-arbitro/contracts/disponibilidad-repo.md` (depende de T002, T005, T006)
- [ ] T011 Actualizar `webapp/lib/disponibilidadRepo.test.js`: retirar los tests que comprobaban `NoImplementadoError` (ya no aplica); mantener solo lo que siga siendo lógica pura sin red, si queda alguna
- [ ] T012 Crear script de seed (p. ej. `generar_seed_anotaciones.py` o un script Node puntual en `webapp/scripts/`) que recorre `arbitros-200.json[].notas` e inserta cada una en `anotaciones` con `fuente: 'sintetico'` y su `autor` original — ejecutarlo una vez contra el proyecto real (depende de T006, T007)

**Checkpoint**: `npx vitest run` en verde para los tests nuevos; `anotaciones` tiene el seed sintético cargado, verificable en el Table Editor de Supabase.

---

## Phase 3: User Story 1 - Una nota de seguimiento sobrevive de verdad (Priority: P1) 🎯 MVP

**Goal**: "Guardar nota" en la ficha de un árbitro persiste de verdad.

**Independent Test**: añadir una nota, refrescar, comprobar que sigue; abrir desde otro dispositivo, comprobar que aparece igual (`quickstart.md` §US1).

### Implementation for User Story 1

- [ ] T013 [US1] En `Ficha()` (`webapp/components/CRMExpedientes.jsx:603`), sustituir `useState(a.notas)` por una carga real vía `anotacionesRepo.obtenerAnotaciones(a.id)` (`useEffect`/estado de carga)
- [ ] T014 [US1] `addNota()` (`CRMExpedientes.jsx:617`) pasa a llamar `anotacionesRepo.guardarAnotacion(...)` de forma async; en éxito, añade la nota devuelta al estado local; en fallo, muestra el mensaje de error de forma clara junto al formulario (FR-007), sin limpiar el campo de texto para no perder lo escrito
- [ ] T015 [US1] Añadir estado de carga (spinner o texto "Guardando…") en el botón "Guardar" mientras la petición está en curso, para que quede claro que la acción es real y no instantánea como antes
- [ ] T016 [US1] Validar manualmente en navegador el escenario de `quickstart.md` §US1 (dos dispositivos/navegadores distintos)

**Checkpoint**: User Story 1 funcional de forma independiente — MVP entregable.

---

## Phase 4: User Story 2 - Confirmar o cambiar el candidato de una designación, con motivo (Priority: P2)

**Goal**: la página "Designación" pasa de informativa a poder tomar y persistir decisiones reales.

**Independent Test**: confirmar un candidato, refrescar, comprobar que persiste; cambiar a una alternativa sin motivo, comprobar que el sistema lo bloquea; con motivo, comprobar que persiste con el motivo asociado, incluso desde otro dispositivo (`quickstart.md` §US2).

### Implementation for User Story 2

- [ ] T017 [US2] En `DesignacionInteligente()` (`CRMExpedientes.jsx:971`), cargar `designacionesRepo.obtenerVigentesPorCiclo(cicloId)` y fusionar con `resultados` vía `conDecisionVigente()` antes de pasarlos a `FilaJornada`
- [ ] T018 [US2] En `FilaJornada()` (`CRMExpedientes.jsx:896`), añadir botón "Confirmar" sobre el candidato sugerido cuando no hay `decisionVigente` — llama a `designacionesRepo.decidir({ ..., esSugerido: true })`
- [ ] T019 [US2] En la lista de alternativas de `FilaJornada()`, añadir una acción "Elegir este candidato" por alternativa — al pulsarla, pide un motivo (campo de texto) antes de habilitar el guardado; llama a `designacionesRepo.decidir({ ..., esSugerido: false, motivo })`
- [ ] T020 [US2] Cuando existe `decisionVigente` para un partido, la fila deja de mostrar el estado "Auto-confirmable"/"Revisar" calculado en vivo y muestra en su lugar la decisión ya tomada (candidato, quién, cuándo, y motivo si aplica) — implementa FR-004, ningún recálculo automático la sustituye
- [ ] T021 [US2] Validar manualmente en navegador los 4 Acceptance Scenarios de US2 en `quickstart.md` §US2, incluyendo el bloqueo por falta de motivo y la persistencia cruzada entre dispositivos

**Checkpoint**: User Stories 1 y 2 funcionan de forma independiente.

---

## Phase 5: User Story 3 - Disponibilidad de árbitro, completamente operativa (Priority: P3)

**Goal**: completar la implementación de `002-disponibilidad-arbitro` (selector, log, patrón de implicación, selector de rol), ya diseñada y con la lógica pura ya construida — ahora con persistencia real detrás.

**Independent Test**: declarar disponibilidad, comprobar que aparece en el log y en el Dashboard de 001; comprobar la visibilidad diferenciada por rol (`quickstart.md` §US3, mismos escenarios que `specs/002-disponibilidad-arbitro/quickstart.md`).

### Implementation for User Story 3

- [ ] T022 [US3] Añadir selector "ver como: árbitro / comité" (estado local, sin persistencia — research.md de esta spec §... ver `002-disponibilidad-arbitro` FR-012) en la cabecera de `Ficha()`
- [ ] T023 [US3] Añadir selector de disponibilidad (disponible / no disponible con motivo / solo categoría propia / festivo solicitado) en `Ficha()`, usando `lib/reglaFestivo.js` (ya construida) para validar la antelación antes de llamar a `disponibilidadRepo.declararDisponibilidad(...)`
- [ ] T024 [US3] Mostrar el log de disponibilidad del árbitro en su ficha (histórico, visible en ambos roles) y, solo cuando el selector está en "comité", el resumen de `calcularPatronImplicacion` (usando `lib/patronImplicacion.js`, ya construida) — nunca visible en modo "árbitro" (FR-008 de 002)
- [ ] T025 [US3] En `Dashboard()` (`001-dashboard-operativo`), sustituir la llamada a `conDisponibilidad` sintética dentro de `coberturaPorCategoria` por la disponibilidad real vía `disponibilidadRepo` para el ciclo activo (research.md de esta spec §4/§5) — `lib/coberturaCategoria.js` no cambia de forma, solo su fuente de datos
- [ ] T026 [US3] Validar manualmente en navegador los escenarios de `specs/002-disponibilidad-arbitro/quickstart.md` (ahora ejecutables de principio a fin) y el de `quickstart.md` §US3 de esta spec

**Checkpoint**: las tres user stories funcionan de forma independiente entre sí — `002-disponibilidad-arbitro` queda completa (SC-002 de esta spec).

---

## Phase 6: Polish & Cross-Cutting Concerns

- [ ] T027 [P] Ejecutar `npx vitest run` completo y confirmar que todo pasa (001 + 002 + 003)
- [ ] T028 [P] Validar en navegador, de forma transversal, FR-006 (distinción real/sintético visible en las notas seed), FR-007 (mensaje de error claro simulando una caída de red/credenciales inválidas) y FR-008 (autoría y fecha en cualquier registro de las 3 tablas)
- [ ] T029 Ejecutar `npm run lint` y confirmar que no hay regresiones
- [ ] T030 Actualizar `docs/estado-actual.md` y `docs/decisiones-producto.md` documentando la entrega (spec 003) — convención del proyecto de documentar cada entrega en el momento

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: sin dependencias, salvo T006 que requiere acción de Roberto (aplicar migraciones) — bloquea Foundational
- **Foundational (Phase 2)**: depende de Setup completo — bloquea las tres user stories
- **User Stories (Phase 3-5)**: todas dependen de Foundational
  - US1 y US2 son independientes entre sí en lógica, pero comparten fichero (`CRMExpedientes.jsx`) — secuencial recomendado
  - US3 reutiliza el patrón de "ver como" y la lógica pura ya construida en 002 — puede ir en paralelo a US2 si hay más de una persona, ya que toca partes distintas del componente (Ficha vs. Designación)
- **Polish (Phase 6)**: depende de que las historias que se vayan a entregar estén completas

### Parallel Opportunities

- T003, T004, T005 (migraciones SQL) son ficheros distintos, en paralelo
- T007, T008 (repositorios nuevos) en paralelo; T009 depende de T008
- T010 (disponibilidadRepo real) es independiente de T007/T008, en paralelo
- US2 (Designación) y US3 (Ficha: disponibilidad) tocan partes distintas del mismo fichero — coordinar si hay más de una persona trabajando a la vez

---

## Implementation Strategy

### MVP First (User Story 1 solamente)

1. Setup + Foundational (con T006 hecho por Roberto)
2. US1 (nota persistida) → validar con `quickstart.md` §US1
3. Esto ya prueba que Supabase funciona de extremo a extremo — desbloquea confianza para US2/US3

### Incremental Delivery

1. Setup + Foundational → base lista (requiere que Roberto aplique migraciones, T006)
2. US1 → validar → primera prueba real de persistencia
3. US2 → validar → el principio nº1 de producto (Principio II) por fin operativo
4. US3 → validar → `002-disponibilidad-arbitro` completa de principio a fin
5. Polish (T027-T030) al cierre
