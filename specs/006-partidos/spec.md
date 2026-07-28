# Feature Specification: Preparación de partido por jornada

**Feature Branch**: `006-partidos`

**Created**: 2026-07-28

**Status**: Draft

**Input**: User description: "Página de Partidos: para cada fin de semana, según los equipos que se enfrenten, generar datos de valor para poder actuar y prepararse el partido. Añadir un registro de comentarios por parte de cada árbitro sobre cada equipo, registrado, con una estructura de aporte sugerida y de valor al resto de compañeros. Lo más top va a ser la generación de insight de alto valor que ayude a tomar decisiones de actuación según criterios arbitrales. Relacionado, de menor prioridad: registrar si un árbitro consulta esos insights antes de su partido y con qué antelación, como señal de preparación (descriptiva, nunca comparativa entre árbitros ni parte de scoreB1)."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Ver los datos de valor de un partido antes de dirigirlo o evaluarlo (Priority: P1)

Una persona con acceso a Partidos (árbitro, informador, comité/directiva/admin — ver `004-roles-permisos`) abre un partido concreto del ciclo activo y ve, para los dos equipos que se enfrentan, su perfil disciplinario (reutilizando `005-equipos`) y cualquier insight combinado del cruce.

**Why this priority**: es la razón de ser de la página — sin esto, no hay "preparación de partido", solo un calendario.

**Independent Test**: abrir un partido del ciclo activo y comprobar que aparecen los perfiles de ambos equipos con sus agregados de tarjetas, más al menos un insight sobre el cruce.

**Acceptance Scenarios**:

1. **Given** un partido del ciclo activo con ambos equipos identificados, **When** se abre su detalle, **Then** se ven los agregados disciplinarios de los dos equipos (reutilizando el perfil de `005-equipos`) uno junto a otro, no como comparación cara a cara entre árbitros (Principio V no aplica a equipos, solo prohíbe comparar árbitros entre sí).
2. **Given** el mismo partido, **When** se calcula un insight del cruce (p. ej. conflictividad combinada), **Then** aparece con la cifra concreta que lo sostiene (Principio III).

---

### User Story 2 - Árbitro se prepara para su propio partido (Priority: P1)

Un árbitro con una designación vigente para un partido del ciclo (ver `designacionesRepo` de `003-persistencia-real`) ve ese partido destacado en la página, con los insights que le corresponde consultar antes de dirigirlo.

**Why this priority**: es la aplicación directa de por qué existe esta página para el rol árbitro — sin esto, un árbitro no tiene forma de saber cuál de todos los partidos del ciclo es "el suyo".

**Independent Test**: con una designación vigente para un partido concreto, abrir Partidos con el rol "árbitros" y comprobar que ese partido aparece destacado frente al resto del listado del ciclo.

**Acceptance Scenarios**:

1. **Given** un árbitro con una designación vigente para un partido del ciclo activo, **When** abre la página Partidos, **Then** ese partido aparece destacado sobre el resto.
2. **Given** el mismo árbitro, **When** consulta otros partidos del ciclo sin designación propia, **Then** puede hacerlo en modo consulta, igual que un informador.

---

### User Story 3 - Comentario estructurado de un árbitro sobre un equipo (Priority: P2)

Un árbitro (o informador) deja un comentario sobre un equipo concreto, en el contexto de un partido, siguiendo una estructura de aporte sugerida (no texto libre sin guía) para que sea útil a otros compañeros que dirijan a ese mismo equipo en el futuro.

**Why this priority**: añade valor acumulativo entre compañeros, pero depende de que la Historia 1 (ver datos del partido) ya exista — sin perfil de equipo no hay contexto sobre el que comentar.

**Independent Test**: dejar un comentario estructurado sobre un equipo desde el detalle de un partido, y comprobar que queda registrado con autor, fecha y visible para el resto de compañeros con acceso a Equipos/Partidos.

**Acceptance Scenarios**:

1. **Given** el detalle de un partido, **When** un árbitro deja un comentario sobre uno de los dos equipos usando la estructura sugerida, **Then** el comentario queda registrado con autor, fecha, y equipo al que se refiere.
2. **Given** un equipo con comentarios previos de otros compañeros, **When** se abre su perfil (`005-equipos`) o el detalle de un partido suyo, **Then** esos comentarios son visibles, ordenados cronológicamente, sin que ninguno se pierda o se sobrescriba (append-only, Principio VII).

---

### User Story 4 - Señal de preparación: consultas de un árbitro antes de su partido (Priority: P3)

El sistema registra cuándo un árbitro consulta los insights de su propio partido antes de dirigirlo — cuántas veces y con qué antelación fue la última consulta respecto a la hora del partido. Es una señal descriptiva de preparación, nunca una cifra de tiempo en pantalla ni un dato que entre en `scoreB1` o cualquier ranking.

**Why this priority**: es la de menor prioridad de las cuatro — el valor principal de la página (Historias 1-3) no depende de esto, y es la más nueva/experimental de las ideas capturadas.

**Independent Test**: con un árbitro que tiene una designación vigente, abrir varias veces el detalle de su partido antes de la fecha del encuentro, y comprobar que el propio árbitro ve su registro de consultas (número y antelación de la última); comprobar que el comité ve el mismo dato como contexto agregado, nunca como un listado comparando a varios árbitros entre sí.

**Acceptance Scenarios**:

1. **Given** un árbitro abre el detalle de su partido designado, **When** lo hace más de una vez antes del encuentro, **Then** cada apertura queda registrada con fecha/hora, sin registrar "tiempo en pantalla" (no es una métrica fiable en navegador).
2. **Given** ese mismo árbitro, **When** consulta su propio historial de preparación, **Then** ve cuántas veces consultó y con qué antelación fue la última consulta respecto al partido.
3. **Given** el rol comité/directiva/informadores, **When** consulta la preparación de un árbitro concreto, **Then** ve ese mismo dato como contexto descriptivo (nunca una cifra que puntúe), y en ningún caso ve un listado que compare la preparación de varios árbitros entre sí (Principio V).

---

### Edge Cases

- ¿Qué pasa si uno de los dos equipos de un partido tiene muy pocos partidos en el dataset (recién ascendido)? El insight del cruce declara confianza reducida, heredando el mismo criterio ya fijado en `005-equipos` (Historia 3, Acceptance Scenario 2).
- ¿Qué pasa si dos árbitros distintos comentan el mismo equipo en el mismo partido? Ambos comentarios quedan, ninguno sustituye al otro (mismo principio append-only que ya rige `anotaciones` en `003-persistencia-real`).
- ¿Qué pasa si un árbitro abre el detalle de un partido que no es el suyo, antes de tener designación? Se cuenta igual que cualquier consulta de un informador — la Historia 4 solo registra consultas de un árbitro sobre **su propio** partido designado, no sobre partidos ajenos.
- ¿Qué pasa con la estructura sugerida del comentario si un compañero prefiere no seguirla? El campo de texto libre sigue existiendo — la estructura es una guía de valor, no una validación bloqueante (a diferencia del motivo obligatorio de `designaciones`, que sí bloquea).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El sistema DEBE mostrar, para cada partido del ciclo activo, los perfiles agregados de ambos equipos enfrentados, reutilizando `005-equipos` sin duplicar su cálculo.
- **FR-002**: El sistema DEBE generar al menos un insight descriptivo del cruce entre los dos equipos de un partido, siempre con la cifra concreta visible (Principio III) y con confianza reducida declarada cuando la muestra de alguno de los dos equipos sea insuficiente.
- **FR-003**: Un árbitro con una designación vigente (`designacionesRepo` de `003-persistencia-real`) para un partido del ciclo activo DEBE ver ese partido destacado frente al resto del listado.
- **FR-004**: El sistema DEBE permitir a árbitros e informadores dejar un comentario sobre un equipo en el contexto de un partido, con una estructura de aporte sugerida (no bloqueante) pensada para que sea útil a otros compañeros — persistido con autor, fecha y equipo al que se refiere, nunca sobrescrito (append-only, Principio VII).
- **FR-005**: Los comentarios de equipo DEBEN ser visibles tanto desde el detalle del partido como desde el perfil del equipo en `005-equipos`, ordenados cronológicamente.
- **FR-006**: La visibilidad de Partidos DEBE seguir el modelo de `004-roles-permisos`: árbitros ven su partido designado destacado y el resto en consulta; informadores y comité/directiva/admin ven el listado completo del ciclo; administrativos no la necesitan por defecto (igual que en `005-equipos`).
- **FR-007** *(Historia 4, prioridad P3)*: El sistema PUEDE registrar, para un árbitro con designación vigente, cada apertura del detalle de su propio partido antes de la fecha del encuentro — como evento con fecha/hora, nunca como duración de sesión ni "tiempo en pantalla".
- **FR-008** *(Historia 4)*: El registro de consultas de preparación DEBE mostrarse como dato descriptivo (conteo de consultas, antelación de la última) — NUNCA como entrada de `scoreB1` ni de ningún ranking automático (Principio IV), y NUNCA como listado comparativo entre varios árbitros (Principio V); cada árbitro ve solo su propio registro, el comité lo ve como contexto individual por árbitro, nunca como tabla comparativa.

### Key Entities *(include if feature involves data)*

- **ComentarioEquipoPartido**: entidad nueva, persistida (append-only, mismo patrón que `anotaciones`) — `arbitro_id`/autor, `rol` (de `004-roles-permisos`), `partido_id`, `equipo_id`, texto (con estructura sugerida de campos, a detallar en el plan técnico), `creado_en`.
- **ConsultaPreparacion** *(Historia 4, menor prioridad — puede diferirse a una iteración posterior de esta misma spec)*: `arbitro_id`, `partido_id`, `timestamp` de cada apertura del detalle del partido propio — de ahí se derivan "número de consultas" y "antelación de la última", nunca duración.
- **InsightCruce** (derivado, no persistido como entidad propia): cifra descriptiva sobre el cruce de dos equipos, calculada sobre los `AgregadoDisciplinaEquipo` ya definidos en `005-equipos`.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Abrir el detalle de un partido del ciclo activo muestra los perfiles de ambos equipos y al menos un insight del cruce sin más demora que abrir hoy la ficha de un árbitro.
- **SC-002**: El 100% de los comentarios de equipo quedan registrados con autor, fecha y equipo — ninguno se pierde ni se sobrescribe silenciosamente.
- **SC-003**: Un árbitro con designación vigente encuentra su partido destacado en menos de 5 segundos al abrir Partidos, sin tener que buscarlo entre el resto del ciclo.
- **SC-004**: Ninguna vista de la app, en ningún rol, muestra una tabla que compare la preparación (consultas) de varios árbitros entre sí — verificable revisando toda pantalla que use `ConsultaPreparacion`.

## Assumptions

- Esta spec depende de `005-equipos` (perfil de equipo) y de `004-roles-permisos` (modelo de visibilidad) — ambas en estado Draft en el momento de escribir esta spec; se referencia su vocabulario tal cual quedó redactado, sin duplicar su contenido.
- La "estructura de aporte sugerida" del comentario (Historia 3) se detalla en el plan técnico, no en esta spec — aquí se fija que debe existir una guía de campos, no el listado exacto de campos (eso es diseño de UI/datos, no alcance de producto).
- La Historia 4 (registro de consultas de preparación) es la idea más nueva y menos madura de esta spec — puede entregarse en una iteración posterior sin bloquear las Historias 1-3, que son las que dan valor inmediato a la página.
- El ciclo y el concepto de "fin de semana" reutilizan `ciclos-asignacion.json`, ya establecido por `001-dashboard-operativo` — no se introduce un calendario nuevo.
- Los datos de ambos equipos de un partido (identidad, agregados de tarjetas) son reales, igual que en `005-equipos` — esta spec no añade ninguna capa sintética nueva.
