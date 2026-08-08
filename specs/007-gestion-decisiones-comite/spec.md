# Feature Specification: Gestión y seguimiento de decisiones del comité

**Feature Branch**: `007-gestion-decisiones-comite`

**Created**: 2026-08-06

**Status**: Draft

**Input**: User description: "Añadir una página donde se toman decisiones y se hacen estimaciones de impacto que podrían tener, tipo el videojuego Football Manager, donde se hace seguimiento de las decisiones tomadas y del impacto que tienen — esto va a ser diferencial. Cubre dos tipos de decisión desde el principio: (1) campañas de ascenso de categoría (selección de candidatos → pruebas teóricas/físicas → clasificación → corte por plazas disponibles → ascenso confirmado) y (2) decisiones estratégicas/tácticas/operativas de motivación y seguimiento dirigidas a un árbitro o grupo (ej. email de reactivación). La mecánica central: al registrar cualquier decisión/acción/política queda una 'foto' amplia del estado relevante del árbitro en ese momento — más de lo obviamente relacionado, por si el análisis retrospectivo revela mejoras o efectos colaterales no previstos — que permite, meses después, medir si tuvo efecto real. No cubre impacto económico (Seguimiento operativo) ni decisiones de designación de partido concreto (Designación), que ya existen en otras páginas. Depende de 004-roles-permisos para saber quién del comité registra decisiones."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Registrar una decisión con estimación de impacto y foto del estado (Priority: P1)

Una persona del comité registra una decisión, acción o política — dirigida a un árbitro concreto, a una categoría completa, o a un grupo seleccionado dentro de una categoría — con una estimación cualitativa de qué espera conseguir. Al guardarla, el sistema captura automáticamente una foto amplia del estado relevante de cada árbitro objetivo en ese instante (no solo las 2-3 métricas obviamente relacionadas con la decisión), para poder comparar más adelante.

**Why this priority**: es el mecanismo diferencial completo pedido por el product owner — sin la foto capturada en el momento de decidir, no hay nada contra lo que comparar después; es la pieza mínima que ya aporta valor por sí sola (aunque nunca se revise, deja un registro de qué se decidió y por qué, algo que hoy no existe en ningún sitio del proyecto).

**Independent Test**: registrar una decisión sobre un árbitro concreto y comprobar que queda guardada con su estimación de impacto y un snapshot con varias métricas (estado de forma, disponibilidad vigente, informes acumulados), cada una etiquetada como real o sintética.

**Acceptance Scenarios**:

1. **Given** un árbitro marcado como "en seguimiento", **When** el comité registra una acción de motivación dirigida a él con una estimación de impacto en texto libre, **Then** la decisión queda guardada junto con un snapshot de su estado (estado de forma, disponibilidad vigente, nº de informes) fechado en ese instante.
2. **Given** una categoría completa (p. ej. "Segona FFCV") o un grupo seleccionado dentro de ella (p. ej. "los irregulares de Segona FFCV"), **When** el comité registra una decisión dirigida a ese nivel, **Then** el sistema fija la lista concreta de árbitros afectados en ese momento (no un filtro que se recalcula después) y captura un snapshot por cada uno.
3. **Given** una decisión ya registrada, **When** se abre su detalle, **Then** cada campo del snapshot muestra si es dato real o sintético (Principio VI de la constitución), sin excepción.

---

### User Story 2 - Revisar si el impacto estimado se cumplió (Priority: P2)

Transcurrido un tiempo (por defecto 3 meses, ajustable por decisión), el comité abre una decisión ya registrada y el sistema compara el snapshot inicial contra el estado actual de las mismas métricas para el/los mismo(s) árbitro(s), mostrando qué mejoró, qué empeoró y qué no cambió.

**Why this priority**: cierra el bucle que hace diferencial a este módulo (estimar antes / verificar después, como en Football Manager) — sin esto, la Historia 1 es solo un cuaderno de bitácora, no una herramienta de aprendizaje.

**Independent Test**: sobre una decisión con más de 3 meses de antigüedad, abrir su revisión de impacto y comprobar que aparece, métrica a métrica, el valor inicial, el valor actual y la dirección del cambio.

**Acceptance Scenarios**:

1. **Given** una decisión con snapshot inicial y con el plazo de revisión ya cumplido, **When** el comité abre su revisión de impacto, **Then** ve cada métrica del snapshot original junto a su valor actual y si mejoró, empeoró o no cambió — nunca un único índice agregado de "éxito".
2. **Given** esa misma revisión, **When** se muestra el resultado, **Then** el texto deja explícito que es una correlación temporal, no una relación de causa-efecto confirmada (Principio III: no aparentar certeza que no existe).
3. **Given** una decisión sin que haya pasado todavía el plazo de revisión, **When** el comité intenta revisarla, **Then** el sistema permite verla igualmente pero indica que el plazo típico aún no se ha cumplido, sin bloquear la consulta.

---

### User Story 3 - Campaña de ascenso de categoría (Priority: P2)

El comité gestiona el ciclo completo de una campaña de ascenso: selecciona candidatos de una categoría de origen, registra los resultados de sus pruebas teóricas y físicas, el sistema deriva una clasificación, el comité introduce el número de plazas disponibles para la categoría superior, y confirma explícitamente qué candidatos ascienden.

**Why this priority**: es el segundo tipo de decisión pedido explícitamente, con valor de negocio real y verificable (hay un resultado oficial: quién asciende), pero es más complejo que una decisión suelta — depende de que el mecanismo general de la Historia 1 ya exista para heredar el mismo snapshot/estimación de impacto por candidato.

**Independent Test**: crear una campaña, añadir candidatos, registrar notas de pruebas, comprobar que la clasificación se ordena por nota, fijar un número de plazas y confirmar el corte, verificando que solo asciende quien queda dentro de las plazas y solo tras confirmación humana explícita.

**Acceptance Scenarios**:

1. **Given** una categoría de origen con árbitros elegibles, **When** el comité selecciona un subconjunto como candidatos a curso de ascenso, **Then** la campaña queda registrada con esos candidatos y su categoría de destino.
2. **Given** una campaña con candidatos, **When** el comité registra nota de prueba teórica y física de cada uno, **Then** el sistema deriva una clasificación ordenada, visible con su fórmula de orden (Principio III).
3. **Given** una clasificación ya derivada, **When** el comité introduce el número de plazas disponibles y confirma el corte, **Then** solo los candidatos dentro de las plazas quedan marcados como ascendidos — y esto no ocurre nunca de forma automática al completarse la clasificación (Principio II, no negociable).
4. **Given** una campaña de ascenso ya confirmada, **When** se consulta más tarde, **Then** su resultado se muestra explícitamente como basado en pruebas sintéticas mientras `pruebasFisicas`/`examenesTeoricos` no tengan dato real del comité (Principio VI) — el mecanismo es real, el resultado concreto no se presenta como decisión operativa terminada hasta entonces.

---

### User Story 4 - Bitácora de decisiones con pendientes de revisión (Priority: P3)

El comité consulta un listado de todas las decisiones registradas, filtrable por tipo y por si ya tienen revisión de impacto pendiente, para no perder de vista qué queda por evaluar.

**Why this priority**: valor de organización sobre lo ya construido en las historias anteriores — útil pero no bloquea que el mecanismo central (registrar + revisar) ya funcione sin él.

**Independent Test**: con varias decisiones registradas en distintas fechas, abrir la bitácora y comprobar que filtra correctamente por tipo y que señala cuáles superan el plazo de revisión sin haberse revisado todavía.

**Acceptance Scenarios**:

1. **Given** un conjunto de decisiones de distintos tipos y fechas, **When** el comité filtra por tipo, **Then** el listado se reduce a las decisiones de ese tipo.
2. **Given** ese mismo listado, **When** una decisión supera su plazo de revisión sin revisión registrada, **Then** aparece señalada como pendiente de revisión.

---

### Edge Cases

- ¿Qué pasa si el árbitro objetivo de una decisión causa baja o deja de estar activo antes de que llegue el plazo de revisión? La decisión se conserva con su snapshot inicial y se marca como "no revisable" en vez de ocultarse o forzar una comparación sin sentido.
- ¿Qué pasa si el número de plazas de una campaña de ascenso cambia después de confirmar el corte (la federación comunica una cifra distinta)? El número de plazas es editable con motivo, pero cambiarlo después de confirmar no altera retroactivamente los ascensos ya confirmados — requeriría una decisión nueva y explícita.
- ¿Qué pasa si dos decisiones distintas afectan al mismo árbitro en fechas cercanas? El sistema no atribuye causalidad a ninguna de las dos sobre un cambio observado — ambas quedan visibles en la revisión de impacto de ese árbitro, sin que el sistema decida cuál "causó" el cambio (ver FR-006).
- ¿Qué pasa con un candidato de campaña de ascenso que no completa alguna de las dos pruebas? Queda excluido de la clasificación (no se le asigna una nota estimada ni se le excluye silenciosamente sin explicación) hasta que el comité registre el dato que falta o lo retire explícitamente de la campaña.
- ¿Qué pasa si el comité quiere revisar el impacto antes de que se cumpla el plazo por defecto? Se permite (Historia 2, Acceptance Scenario 3) — el plazo es una referencia, no un bloqueo.
- ¿Qué pasa si una decisión se registró sobre una categoría completa y, antes de la revisión, algún árbitro de esa lista asciende o desciende de categoría (posiblemente por una `CampanaAscenso` de este mismo módulo)? La lista de árbitros afectados no cambia (FR-009) — la revisión de impacto sigue evaluando a esas mismas personas, con su categoría actual visible junto al resultado para que el comité lo interprete con ese contexto, no oculto.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El sistema DEBE permitir registrar una decisión/acción/política con tres niveles de objetivo posibles — un árbitro concreto, una categoría completa, o un grupo seleccionado dentro de una categoría (p. ej. solo los árbitros en seguimiento de esa categoría) — con un tipo extensible, no limitado a una lista cerrada, cubriendo desde el lanzamiento al menos "campaña de ascenso de categoría" y "acción estratégica/táctica/operativa de motivación y seguimiento".
- **FR-002**: Al registrar cualquier decisión, el sistema DEBE capturar automáticamente un snapshot del estado relevante de cada árbitro objetivo en ese instante, más amplio que solo las métricas obviamente ligadas a la decisión, incluyendo como mínimo: estado de forma (`estadoForma()`/`formaCounts`), disponibilidad vigente (tipo/motivo, `specs/002-disponibilidad-arbitro`), número de informes acumulados, y — cuando existan — las últimas notas de pruebas físicas/teóricas.
- **FR-003**: Cada campo del snapshot DEBE quedar etiquetado como real o sintético según su fuente (Principio VI de la constitución), incluso dentro del propio snapshot ya congelado — congelar un dato no le cambia su procedencia.
- **FR-004**: El sistema DEBE permitir registrar, junto a la decisión, una estimación cualitativa del impacto esperado (texto libre y/o señalar qué métrica(s) del snapshot se esperan que cambien) — sin calcular ni mostrar una predicción numérica automática que no esté acordada con el comité (Principio III).
- **FR-005**: El sistema DEBE permitir, en cualquier momento posterior a una decisión, comparar el snapshot inicial contra el estado actual de las mismas métricas para el/los mismo(s) árbitro(s), mostrando la diferencia por métrica (mejoró/empeoró/sin cambio) — nunca un único índice agregado de "éxito" que oculte qué métrica concreta cambió.
- **FR-006**: El sistema NO DEBE presentar ninguna comparación de impacto como relación de causa-efecto confirmada — se muestra como correlación temporal, con el propio texto de la interfaz dejándolo explícito.
- **FR-007**: Para el tipo "campaña de ascenso de categoría", el sistema DEBE modelar su ciclo de vida en fases persistidas: selección de candidatos de una categoría de origen → registro de resultados de pruebas teóricas y físicas por candidato → clasificación derivada de esos resultados → número de plazas disponibles (introducido por el comité, nunca derivado) → confirmación de qué candidatos ascienden.
- **FR-008**: El corte por plazas de una campaña de ascenso DEBE requerir confirmación humana explícita antes de marcar a cualquier candidato como ascendido — el sistema calcula y ordena la clasificación, nunca asciende a nadie de forma automática al completarse (Principio II, no negociable).
- **FR-009**: Cuando el objetivo de una decisión sea una categoría completa o un grupo seleccionado dentro de una categoría, el sistema DEBE fijar la lista concreta de árbitros afectados en el momento de registrar la decisión, no un filtro dinámico que se recalcule en el momento de la revisión — ni siquiera si la composición real de esa categoría/grupo cambia después (altas, bajas, cambios de categoría).
- **FR-010**: El sistema DEBE ofrecer un listado/bitácora de todas las decisiones registradas, filtrable al menos por tipo, que señale cuáles superan su plazo de revisión sin revisión registrada todavía.
- **FR-011**: Ninguna decisión, snapshot o revisión de impacto se muestra como guardada sin persistencia real detrás desde su primera historia implementada (Principio VII) — no se construye como estado local de React.
- **FR-012**: La visibilidad de este módulo (quién puede registrar decisiones, quién solo consulta) DEBE seguir el modelo de roles de `004-roles-permisos` una vez esa spec se implemente; hasta entonces, sigue el mismo criterio de acceso sin cuentas de la Fase 1 de rollout (`docs/decisiones-producto.md` §22).

### Key Entities *(include if feature involves data)*

- **Decision**: tipo (extensible), título/descripción libre, nivel de objetivo (árbitro individual / categoría completa / grupo seleccionado dentro de una categoría) resuelto a una lista fija de árbitros en el momento del registro, fecha de registro, autor (persona del comité — depende de `004-roles-permisos` para ser una cuenta real), estimación de impacto declarada (texto y/o métricas señaladas), plazo de revisión (por defecto 3 meses, ajustable), estado (registrada / revisada / no revisable).
- **SnapshotArbitro**: asociado a una `Decision` y a un árbitro objetivo concreto; fecha de captura y el conjunto de métricas capturadas en ese instante (estado de forma, disponibilidad vigente, nº de informes, últimas notas de pruebas si existen), cada campo con su etiqueta real/sintético.
- **RevisionImpacto**: asociada a una `Decision`, creada al revisarla; fecha de revisión, snapshot "actual" recalculado en ese momento, y la comparación campo a campo contra el `SnapshotArbitro` inicial (delta y dirección por métrica).
- **CampanaAscenso** (una `Decision` con estructura propia): categoría de origen, categoría de destino, candidatos seleccionados, resultado de pruebas teórica/física por candidato, clasificación derivada, número de plazas (introducido por el comité), lista final de ascendidos confirmados.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Un miembro del comité puede registrar una decisión y confirmar que su snapshot se capturó correctamente (con todos los campos etiquetados real/sintético) sin más pasos de los que hoy exige registrar una anotación de seguimiento en la ficha de árbitro.
- **SC-002**: El 100% de las decisiones registradas conservan su snapshot inicial sin alterarse aunque el estado real del árbitro cambie después — verificable comparando en cualquier momento el snapshot congelado contra el estado en vivo del árbitro.
- **SC-003**: Para cualquier decisión con el plazo de revisión cumplido, el comité puede saber en 3 clics o menos desde la bitácora si ya tiene revisión de impacto o sigue pendiente.
- **SC-004**: En ninguna campaña de ascenso queda un candidato marcado como ascendido sin que exista una confirmación explícita del comité registrada — verificable inspeccionando que no hay ninguna vía de la interfaz que complete el ascenso automáticamente al terminar la clasificación.
- **SC-005**: El 100% de las revisiones de impacto mostradas incluyen lenguaje explícito de correlación/no-causalidad, verificable inspeccionando el copy de cualquier revisión abierta.

## Assumptions

- El plazo por defecto de revisión de impacto es 3 meses (cifra explícita del product owner), configurable por decisión — no un valor fijo en el código sin posibilidad de ajuste.
- Las pruebas físicas/teóricas usadas en la campaña de ascenso siguen siendo sintéticas (`pruebasFisicas`/`examenesTeoricos`, generadas por `generar_dataset_arbitros.py`) hasta que el comité aporte resultados reales — el mecanismo de campaña es funcional desde ya, pero su resultado concreto no se presenta como ascenso operativo real hasta tener ese dato (Principio VI), igual que ya se hizo con "sanciones" en `specs/005-equipos`.
- El "tipo de decisión" extensible no implica un configurador visual de tipos en esta spec — añadir un tercer tipo más allá de los dos iniciales es trabajo de desarrollo futuro, no algo que el comité configure desde la interfaz todavía.
- Esta spec depende de `004-roles-permisos` para modelar con una cuenta real quién del comité registra cada decisión; mientras esa spec no se implemente (Fase 1 de rollout), la autoría puede quedar como campo simple sin autenticación real, igual que ya ocurre en el resto del prototipo de demo.
- No se construye una fórmula automática de "impacto esperado" — la estimación de impacto es cualitativa y declarada por el comité, no calculada por el sistema (Principio III: no aparentar una certeza predictiva que no existe).
- El envío real de comunicaciones (p. ej. el email de reactivación usado como ejemplo) no se implementa en esta spec — se registra la decisión de enviarlo y su snapshot; el envío en sí, si se construye, seguirá el mismo patrón ya establecido en la ficha de árbitro (`mailto:`, revisión humana obligatoria, nunca automático).
- Impacto económico y decisiones de designación de partido concreto quedan explícitamente fuera de alcance — viven en Seguimiento operativo y en Designación (`specs/003-persistencia-real`) respectivamente, esta spec no los duplica.
