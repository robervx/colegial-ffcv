# Feature Specification: Disponibilidad de árbitro con registro de implicación

**Feature Branch**: `002-disponibilidad-arbitro`

**Created**: 2026-07-27

**Status**: Draft

**Input**: User description: "Selector de disponibilidad de árbitro en su ficha, con log de registro. El árbitro (o el comité en su nombre) declara su disponibilidad para el próximo fin de semana con un motivo: lesión, baja (debe ir justificada), urgencia, o 'solo pito mi categoría' (no acepta extras de categoría inferior). También puede declarar festivo solicitado con un mínimo de 15 días de antelación. Cada cambio de disponibilidad queda registrado en un log (quién, cuándo, motivo). El dato tiene doble propósito: operativo (saber el ratio de árbitros disponibles por categoría y fin de semana, alimenta el motor de designación y el dashboard de cobertura de la spec 001) y evaluativo (registro de implicación/disposición real del árbitro — un motivo no justificado, sin cuidarse, o abuso de festivos solicitados es una señal negativa comentable). El propio árbitro nunca ve la lectura evaluativa de su disponibilidad, solo el comité/evaluadores la ven. Esta es la primera funcionalidad del proyecto que necesita distinguir explícitamente entre el rol árbitro y el rol comité/evaluador en la UI."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Declarar disponibilidad de un ciclo con motivo (Priority: P1)

Un árbitro, o el comité en su nombre, declara para el próximo ciclo de designación si está disponible, no disponible (con motivo: lesión, baja, urgencia), disponible solo para su categoría propia, o si solicita festivo con la antelación mínima exigida.

**Why this priority**: es el acto fundacional de toda la feature — sin esta declaración no existe ningún dato de entrada, ni operativo ni evaluativo.

**Independent Test**: desde la ficha del árbitro, seleccionar un motivo de indisponibilidad o un festivo solicitado, guardar, y comprobar que la ficha refleja el nuevo estado y que aparece una entrada nueva en el log con autor, fecha y motivo.

**Acceptance Scenarios**:

1. **Given** un árbitro disponible sin restricciones, **When** se marca "de baja" con un motivo, **Then** la ficha refleja "no disponible" para el ciclo correspondiente y el log añade una entrada con fecha, autor y motivo.
2. **Given** se intenta declarar "festivo solicitado" con menos de 15 días de antelación respecto al fin de semana del ciclo, **When** se envía la declaración, **Then** el sistema la rechaza y explica la antelación mínima exigida.
3. **Given** un árbitro activa "solo pito mi categoría", **When** se guarda, **Then** la ficha refleja que no está disponible para partidos de categoría inferior ese ciclo, aunque sigue disponible para la suya.

---

### User Story 2 - Ratio operativo de disponibilidad por categoría y ciclo (Priority: P2)

El comité necesita que el ratio de árbitros disponibles por categoría y fin de semana (el panel "Cobertura por categoría" de `001-dashboard-operativo`) se calcule a partir de declaraciones reales, no de la simulación sintética usada hasta ahora.

**Why this priority**: es el propósito operativo explícito de esta feature — sin agregación, cada declaración individual no ayuda a decidir nada de cobertura.

**Independent Test**: declarar indisponibilidad para varios árbitros del ciclo activo y comprobar que el panel de cobertura del Dashboard refleja esas declaraciones reales al recalcularse.

**Acceptance Scenarios**:

1. **Given** varios árbitros han declarado indisponibilidad para el ciclo activo, **When** se abre el Dashboard, **Then** el ratio de disponibles por categoría refleja esas declaraciones, no la simulación sintética anterior.
2. **Given** un árbitro no ha declarado nada para el ciclo activo, **When** se calcula su disponibilidad, **Then** se asume disponible por defecto — la ausencia de declaración nunca se interpreta como indisponibilidad.

---

### User Story 3 - Patrón de implicación visible solo para comité/evaluador (Priority: P3)

El comité o un evaluador, al abrir la ficha de un árbitro, ve un resumen descriptivo de su patrón de disponibilidad a lo largo de la temporada (bajas no justificadas repetidas, festivos solicitados con frecuencia) como contexto de su implicación real. El propio árbitro, al consultar su ficha, ve su historial de disponibilidad pero nunca esa lectura evaluativa.

**Why this priority**: es el propósito evaluativo que motivó originalmente pedir esta feature — de menor urgencia operativa que declarar (P1) y agregar (P2), pero es la razón de negocio de fondo.

**Independent Test**: abrir la ficha de un árbitro con histórico de bajas no justificadas o festivos repetidos como comité/evaluador y comprobar que aparece un resumen del patrón; abrir la misma ficha como árbitro y comprobar que esa lectura no aparece en ningún punto.

**Acceptance Scenarios**:

1. **Given** un árbitro con varias bajas no justificadas o festivos solicitados en la temporada, **When** el comité/evaluador abre su ficha, **Then** ve un resumen o anotación de ese patrón junto al historial de disponibilidad.
2. **Given** el mismo árbitro consulta su propia ficha, **When** la abre, **Then** ve su propio historial de disponibilidad (fechas, motivos, quién lo declaró) pero ninguna valoración o comentario evaluativo derivado de él.
3. **Given** una baja está marcada como justificada, **When** se calcula el patrón, **Then** no cuenta como señal negativa — solo las bajas no justificadas o el exceso de festivos se destacan.

---

### Edge Cases

- ¿Qué pasa si el comité y el árbitro declaran disponibilidad contradictoria para el mismo ciclo casi a la vez? La última declaración por fecha es la vigente; ambas quedan en el log, ninguna se pierde.
- ¿Se puede editar retroactivamente la disponibilidad de un ciclo ya cerrado? No — el log es histórico inmutable una vez cerrado el ciclo, para que no se pueda reescribir el pasado y maquillar un patrón.
- ¿Qué pasa si un árbitro nunca declara nada en toda la temporada? Se asume disponible siempre por defecto (FR-007) — el silencio no es, por sí mismo, una señal negativa.
- ¿Cómo se distingue una baja "justificada" de una que no lo está, si justificar formalmente implicaría gestionar partes médicos u otros documentos? Fuera de alcance de esta spec: solo se registra si la baja se marcó como justificada o no en el momento de la declaración, sin gestión de adjuntos.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El sistema DEBE permitir al árbitro, o al comité en su nombre, declarar disponibilidad para un ciclo de designación concreto (no un estado general sin fecha asociada).
- **FR-002**: El sistema DEBE ofrecer, como motivo de no disponibilidad, como mínimo: lesión, baja, urgencia; una baja DEBE marcarse además como justificada o no justificada.
- **FR-003**: El sistema DEBE permitir declarar disponibilidad restringida a "solo categoría propia" (sin extras de categoría inferior) de forma independiente de estar disponible o no para su propia categoría.
- **FR-004**: El sistema DEBE permitir declarar "festivo solicitado" únicamente cuando la antelación respecto al fin de semana del ciclo es de 15 días naturales o más; si es menor, DEBE rechazar la declaración y explicar el motivo del rechazo.
- **FR-005**: Cada declaración DEBE registrarse en un log con autor (árbitro o comité), fecha de la declaración y motivo — nunca se sobrescribe una declaración anterior sin dejar rastro de ella.
- **FR-006**: El sistema DEBE calcular, para cada ciclo, el conjunto de árbitros disponibles por categoría a partir de estas declaraciones, sustituyendo la simulación sintética usada hasta ahora en el cálculo de disponibilidad de `001-dashboard-operativo`.
- **FR-007**: Un árbitro sin ninguna declaración para un ciclo dado DEBE considerarse disponible por defecto.
- **FR-008**: El sistema DEBE mostrar al propio árbitro su historial de disponibilidad (fechas, motivos, quién lo declaró) sin ninguna valoración, etiqueta o comentario evaluativo derivado de patrones.
- **FR-009**: El sistema DEBE mostrar al comité/evaluador, además del historial, un resumen descriptivo de patrones potencialmente relevantes (bajas no justificadas repetidas, festivos solicitados con frecuencia) como anotación de contexto — nunca como una cifra que alimente el score de clasificación del árbitro (Principio IV de la constitución: la disponibilidad es dato de gestión, nunca de clasificación; mismo tratamiento que ya recibe la disciplina, descriptiva y no evaluativa).
- **FR-010**: El sistema NO DEBE usar la disponibilidad declarada, sus motivos, ni el patrón de festivos/bajas, como entrada de `scoreB1` ni de ningún otro cálculo de ranking o clasificación existente.
- **FR-011**: El sistema DEBE distinguir visualmente, tanto en el historial del árbitro como en el resumen del comité, qué bajas están marcadas como justificadas frente a las que no.
- **FR-012**: El sistema DEBE ofrecer un selector de "ver como: árbitro / comité" (sin autenticación real detrás) que oculte o muestre el resumen evaluativo (FR-009) según el rol elegido — resuelve la distinción de rol sin depender de un sistema de login que hoy no existe, y sirve de base directa cuando llegue autenticación real.
- **FR-013**: El log de disponibilidad DEBE persistir de forma real, sobreviviendo a un refresco de página y a sesiones futuras. La implementación de esta spec queda bloqueada hasta que exista persistencia real en la aplicación (Sprint 1 de `docs/sprints.md`) — no se construye como estado local de React, para no repetir el defecto ya señalado del botón "Guardar nota" (Principio VII de la constitución).

### Key Entities *(include if feature involves data)*

- **DeclaracionDisponibilidad**: árbitro, ciclo (fin de semana al que aplica), autor (árbitro | comité), tipo (disponible | no_disponible | solo_categoria_propia | festivo_solicitado), motivo (lesión | baja | urgencia | — si tipo=disponible), justificada (booleano, solo aplica a baja), fecha de la declaración.
- **LogDisponibilidad**: colección de `DeclaracionDisponibilidad` de un árbitro, ordenada cronológicamente, inmutable una vez cerrado el ciclo al que corresponde cada entrada.
- **PatronImplicacion** (derivada, no es una entidad persistida de forma independiente): resumen calculado sobre el `LogDisponibilidad` de un árbitro a lo largo de la temporada (conteo de bajas no justificadas, festivos solicitados) — visible solo para comité/evaluador, siempre descriptivo, nunca entra en `scoreB1` ni en ningún ranking.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Declarar una indisponibilidad con motivo, y verla reflejada en la ficha y en el log, tarda menos de 30 segundos.
- **SC-002**: El 100% de las declaraciones de disponibilidad quedan trazadas en el log con autor, fecha y motivo — ninguna se pierde ni se sobrescribe de forma silenciosa.
- **SC-003**: El ratio de disponibles del Dashboard (`001-dashboard-operativo`) para el ciclo activo coincide exactamente con las declaraciones reales vigentes de ese ciclo, sin depender ya de la simulación sintética anterior.
- **SC-004**: Un evaluador puede identificar si un árbitro tiene un patrón de bajas no justificadas o festivos repetidos en menos de 10 segundos al abrir su ficha, sin tener que repasar el log entero a mano.
- **SC-005**: El propio árbitro, al consultar su ficha en cualquier punto de la interfaz, no encuentra ninguna valoración o comentario derivado de su patrón de disponibilidad.

## Assumptions

- La ausencia de declaración para un ciclo se interpreta siempre como disponible (FR-007) — el silencio nunca se penaliza por sí mismo.
- "Justificada" para una baja se registra como un campo marcado en el momento de la declaración o su revisión posterior, sin gestión de documentos adjuntos (partes médicos u otros) — queda fuera de alcance de esta spec.
- El ciclo y el concepto de "fin de semana" son los mismos ya establecidos por `001-dashboard-operativo` (`ciclos-asignacion.json`) — no se introduce un calendario nuevo.
- No se fija en esta spec un umbral numérico cerrado de "abuso" de festivos o bajas no justificadas. El comité revisa el log y el resumen de patrón con juicio humano (Principio II, human-in-the-loop); una regla automática de umbral podría añadirse más adelante si el comité la pide expresamente, y solo con datos reales suficientes que la respalden — mismo criterio que `kpis.md` ya aplica a B.3 (no inventar confianza sin datos suficientes).
- Esta feature depende de `001-dashboard-operativo` (reutiliza su concepto de ciclo activo y sustituye la disponibilidad sintética de `lib/disponibilidad.js` por declaraciones reales) — no se puede planificar de forma aislada sin esa base.
- **Bloqueante de implementación (decidido 27 jul 2026)**: esta spec queda completa como documento (spec + plan + tasks), pero su construcción real no arranca hasta que exista persistencia real en la aplicación (Sprint 1, `docs/sprints.md`) — el log de disponibilidad es un registro de auditoría, no tiene sentido como estado local de React que se pierde al refrescar. `/speckit-plan` sobre esta spec puede seguir adelante para dejar el diseño listo, pero `/speckit-tasks`/implementación esperan a Sprint 1.
- **Visibilidad por rol (decidido 27 jul 2026)**: sin sistema de login, se resuelve con un selector "ver como: árbitro / comité" sin autenticación real detrás — ver FR-012. Es la primera vez que la UI distingue roles; sienta el patrón para cuando exista autenticación real.
