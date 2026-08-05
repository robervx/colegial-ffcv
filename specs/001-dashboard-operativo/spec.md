# Feature Specification: Dashboard operativo del Comité

**Feature Branch**: `001-dashboard-operativo`

**Created**: 2026-07-24

**Status**: Draft

**Input**: User description: "Dashboard ampliado para el jefe del Comité Técnico de Árbitros (FFCV). Objetivo: que cada vez que entre a la app tenga de un vistazo el estado operativo de su comité, con indicadores reales cuando el dato existe y sintéticos claramente marcados cuando no. Debe mostrar: árbitros disponibles, partidos por fin de semana con filtro por categoría, ratio de equidad de carga, y ratio de disponibilidad/capacidad operativa por categoría (distinguiendo árbitros que solo pitan su categoría de los que también pitan categorías inferiores). Todo indicador calculado debe ser explicable. No incluye persistencia nueva ni las páginas de Equipos/Partidos/Simulaciones/Económico."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Saber si hay riesgo de cobertura este fin de semana (Priority: P1)

El jefe del comité entra a la aplicación un lunes cualquiera y, sin filtrar ni navegar a ninguna otra pantalla, sabe si alguna categoría se va a quedar corta de árbitros para los partidos ya programados ese fin de semana — y si el motivo es que faltan árbitros disponibles en general o que los disponibles no cubren esa categoría concreta.

**Por qué esta prioridad**: es la pregunta operativa de mayor coste si se responde tarde — descubrir un jueves que faltan árbitros para el domingo deja muy poco margen de reacción. Es el motivo de negocio por el que existe este dashboard.

**Prueba independiente**: se puede validar entrando al dashboard sin aplicar ningún filtro y comprobando que, para cada categoría con partidos ese fin de semana, se ve cuántos árbitros hacen falta frente a cuántos hay disponibles, con una señal visual clara para las categorías en riesgo.

**Acceptance Scenarios**:

1. **Given** hay categorías donde el número de árbitros disponibles es menor que los partidos a designar ese fin de semana, **When** el jefe del comité abre el dashboard, **Then** esas categorías aparecen marcadas como en riesgo, con el número exacto de árbitros disponibles y de partidos pendientes de designar.
2. **Given** una categoría tiene árbitros disponibles suficientes solo gracias a colegiados que también pitan categorías inferiores, **When** se muestra su cobertura, **Then** el indicador distingue cuántos son de la categoría propia y cuántos vienen de "también pita categorías inferiores".
3. **Given** todas las categorías tienen cobertura suficiente, **When** se abre el dashboard, **Then** no aparece ninguna alerta de riesgo y se muestra el estado como saludable.

---

### User Story 2 - Detectar reparto desigual de carga entre árbitros (Priority: P2)

El jefe del comité quiere saber, sin tener que entrar árbitro por árbitro, si la carga de partidos de la temporada está repartida de forma razonable o si unos pocos colegiados están asumiendo muchos más partidos que el resto.

**Por qué esta prioridad**: la sobrecarga de unos pocos árbitros y la infrautilización de otros es un problema de gestión del colectivo que hoy no tiene ninguna visibilidad agregada — es el segundo indicador de mayor impacto de gestión, justo detrás de la cobertura del fin de semana inmediato.

**Prueba independiente**: se puede validar comprobando que el indicador de equidad cambia (y su explicación con él) al recalcularlo sobre distintos subconjuntos de árbitros con cargas conocidas.

**Acceptance Scenarios**:

1. **Given** la carga de partidos de la temporada por árbitro, **When** se muestra el ratio de equidad, **Then** se acompaña de una explicación en lenguaje llano de qué significa ese valor (reparto equilibrado, desigual o muy desigual), no solo el número.
2. **Given** el jefe del comité quiere entender el número, **When** consulta el indicador de equidad, **Then** puede ver también la cifra de partidos del árbitro con más carga y la del que tiene menos, como referencia concreta detrás del ratio agregado.

---

### User Story 3 - Consultar el volumen de partidos del fin de semana por categoría (Priority: P3)

El jefe del comité quiere ver cuántos partidos hay que designar el próximo fin de semana, filtrando por categoría, como vista de apoyo para planificar antes de entrar al detalle de designación.

**Por qué esta prioridad**: es información de apoyo — útil, pero no urgente ni crítica como las dos anteriores; sin ella el jefe del comité igualmente puede operar, aunque con menos comodidad.

**Prueba independiente**: se puede validar aplicando el filtro de categoría y comprobando que el recuento de partidos mostrado cambia de forma consistente con esa categoría.

**Acceptance Scenarios**:

1. **Given** el fin de semana tiene partidos de varias categorías, **When** no se aplica ningún filtro, **Then** se muestra el total de partidos de todas las categorías.
2. **Given** se selecciona una categoría concreta, **When** se aplica el filtro, **Then** el recuento y el listado se actualizan para mostrar solo esa categoría.

---

### User Story 4 - Ver la salud general del comité de un vistazo (Priority: P2)

**Añadida 4 ago 2026** (enmienda posterior a la implementación inicial, ver `docs/decisiones-producto.md` §30). El jefe del comité quiere ver, sin entrar a ningún árbitro concreto, cuántos colegiados están en buena forma, cuántos irregulares y cuántos en seguimiento, y cuántos están disponibles para el ciclo activo frente a los que no lo están y por qué motivo — como fotografía agregada de la plantilla, distinta de la cobertura por categoría (User Story 1) o de la equidad de carga (User Story 2).

**Por qué esta prioridad**: es la pregunta de "cómo está mi gente" antes de entrar en el detalle operativo de un fin de semana concreto — apoya la gestión del colectivo, más frecuente de consultar que el resto de indicadores de apoyo pero no tan urgente como el riesgo de cobertura inmediato.

**Prueba independiente**: se puede validar comprobando que la suma de los recuentos de cada estado de forma (y de cada motivo de no disponibilidad) coincide siempre con el total de la plantilla activa, sin depender de ningún filtro aplicado.

**Acceptance Scenarios**:

1. **Given** la plantilla activa de árbitros, **When** el jefe del comité abre el Cuadro de Mando, **Then** ve el recuento exacto de árbitros en cada estado de forma (en forma / irregular / en seguimiento) sin necesidad de filtrar.
2. **Given** la disponibilidad declarada para el ciclo activo, **When** se muestra el indicador de disponibilidad, **Then** ve el recuento de disponibles frente a no disponibles, desglosado por motivo real (lesión, baja, urgencia, festivo solicitado).
3. **Given** estado de forma y disponibilidad son preguntas de negocio distintas (rendimiento vs. logística operativa), **When** se muestran ambos indicadores, **Then** aparecen como dos widgets visualmente separados, nunca combinados en un único valor o gráfico.

---

### Edge Cases

- ¿Qué se muestra cuando una categoría no tiene ningún partido programado el fin de semana en curso? (no debe aparecer como "en riesgo" por ausencia de datos — riesgo solo aplica cuando hay partidos a cubrir).
- ¿Qué se muestra cuando no hay ningún árbitro disponible sintético cargado todavía (dataset vacío o no generado)? El dashboard debe indicarlo explícitamente en vez de mostrar un cero indistinguible de "cobertura completa".
- ¿Cómo se distingue visualmente un indicador que depende de dato sintético (disponibilidad, bajas) de uno que depende de dato real (partidos, carga histórica), para que el jefe del comité no confunda ambos niveles de confianza?
- ¿Qué ocurre si dos categorías comparten el mismo pool de árbitros (los que pitan categorías inferiores) y ambas están en riesgo a la vez? El indicador debe dejar claro que ese pool no se puede contar dos veces como solución a las dos categorías simultáneamente.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El sistema DEBE mostrar, sin necesidad de aplicar ningún filtro, el número total de árbitros disponibles frente al total de la plantilla activa.
- **FR-002**: El sistema DEBE mostrar el número de partidos a designar el próximo fin de semana, con un filtro por categoría que el usuario pueda cambiar libremente.
- **FR-003**: El sistema DEBE calcular y mostrar un ratio de equidad de carga de partidos entre árbitros de la temporada, acompañado de una explicación en lenguaje llano de su significado (no solo el número).
- **FR-004**: El sistema DEBE mostrar, para cada categoría con partidos programados el próximo fin de semana, la relación entre árbitros disponibles para esa categoría y partidos a designar en ella.
- **FR-005**: El sistema DEBE distinguir, dentro del cálculo de disponibilidad por categoría, entre árbitros cuya categoría propia es esa y árbitros que la cubren solo por tener activado "pitar categorías inferiores".
- **FR-006**: El sistema DEBE marcar visualmente como en riesgo cualquier categoría donde los árbitros disponibles no cubran los partidos a designar ese fin de semana.
- **FR-007**: Todo indicador calculado DEBE mostrar de dónde sale su valor (fórmula o desglose accesible), nunca un número o color aislado sin explicación.
- **FR-008**: El sistema DEBE marcar visualmente qué indicadores se apoyan en dato sintético (disponibilidad, bajas, lesión, indisponibilidad) frente a los que se apoyan en dato real (partidos, carga histórica), de forma consistente con cómo ya se distingue en el resto de la aplicación.
- **FR-009**: El sistema NO DEBE persistir ningún cambio de estado nuevo como resultado de ver el dashboard (es una vista de consulta, no de edición).
- **FR-010** *(User Story 4, añadida 4 ago 2026)*: El sistema DEBE mostrar, sin necesidad de filtrar, el estado de forma agregado de la plantilla activa (en forma / irregular / en seguimiento) con el **recuento exacto** de árbitros en cada estado — nunca solo un porcentaje o índice compuesto (mismo principio de "sin falsa precisión" ya aplicado al resto del dashboard, ver `docs/decisiones-producto.md` §27).
- **FR-011** *(User Story 4, añadida 4 ago 2026)*: El sistema DEBE mostrar, sin necesidad de filtrar, la disponibilidad agregada de la plantilla para el ciclo activo, desglosada por motivo real (`lesión`, `baja`, `urgencia`, `festivo solicitado`, ver `specs/002-disponibilidad-arbitro/data-model.md`) frente a disponibles, con el recuento exacto de cada categoría.
- **FR-012** *(User Story 4, añadida 4 ago 2026)*: Estado de forma (FR-010) y disponibilidad (FR-011) DEBEN presentarse como dos indicadores visualmente separados — nunca combinados en un único valor, gráfico o gauge, para no mezclar rendimiento con disponibilidad operativa (son ejes de negocio distintos).

### Key Entities

- **Cobertura de categoría**: para una categoría y un fin de semana dados, relaciona partidos a designar (real) con árbitros disponibles (sintético hasta tener dato real de bajas/indisponibilidad), y desglosa cuántos de esos disponibles son de categoría propia frente a categoría inferior activada.
- **Indicador de equidad de carga**: resumen agregado (ya existente como cálculo, ver `agregados-reales.json`) de cómo se reparten los partidos de la temporada entre los árbitros activos.
- **Árbitro disponible**: un árbitro de la plantilla de trabajo que no está de baja, lesionado, ni ha declarado indisponibilidad para el fin de semana en cuestión (hoy sintético en su totalidad — no existe ese dato en ningún sistema real todavía).
- **Estado de forma agregado del comité** *(User Story 4)*: recuento de la plantilla activa por estado de forma (`estadoForma()`, `lib` de `CRMExpedientes.jsx`), ya calculado hoy como `formaCounts` — este indicador solo lo visualiza de forma agregada y prominente, no introduce cálculo nuevo.
- **Disponibilidad agregada del comité** *(User Story 4)*: recuento de declaraciones de disponibilidad vigentes para el ciclo activo (`disponibilidadRepo`), desglosado por `tipo`/`motivo` real (`specs/002-disponibilidad-arbitro/data-model.md`). **Resuelto (4 ago 2026)**: `bajasPorMotivo` en `CRMExpedientes.jsx` ya suma también `tipo === "festivo_solicitado"` (campo `festivo`, aparte de `lesion`/`baja`/`urgencia`), y `disponiblesEsteCiclo` los descuenta igual que hace `coberturaPorCategoria` — antes un árbitro con festivo solicitado aparecía como "disponible" en el KPI, ahora es consistente con el panel de Cobertura por categoría.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: El jefe del comité puede identificar si existe alguna categoría en riesgo de cobertura para el próximo fin de semana en menos de 10 segundos desde que abre la aplicación, sin aplicar ningún filtro.
- **SC-002**: El 100% de los indicadores numéricos del dashboard tienen, a un clic o un vistazo de distancia, la explicación de qué significan y de qué dato salen.
- **SC-003**: El jefe del comité puede pasar de ver el total de partidos del fin de semana a ver los de una sola categoría en una sola interacción (un filtro).
- **SC-004**: Ningún indicador que dependa de dato sintético se presenta de forma indistinguible de uno que dependa de dato real — un usuario nuevo puede identificar cuáles son cuáles sin que se le explique verbalmente.

## Assumptions

- "El próximo fin de semana" se interpreta como el próximo ciclo de designación aún no cerrado, siguiendo el mismo concepto de ciclo que ya usa el motor de designación existente (`ciclos-asignacion.json`) — no se introduce un concepto de calendario nuevo.
- El umbral que marca una categoría como "en riesgo" es: disponibles < partidos a designar (riesgo), disponibles == partidos a designar exactamente (ajustado, sin margen), disponibles > partidos a designar (cobertura holgada). Se documenta como punto de partida ajustable, no como fórmula cerrada con el comité.
- La disponibilidad de árbitros (bajas, lesión, indisponibilidad) sigue siendo síntética, con la misma distribución/campos ya generados en el dataset de trabajo de 200 árbitros — esta spec no añade una fuente de dato nueva, solo agrega y visualiza lo que ya existe.
- Este dashboard sustituye y amplía el Dashboard ya existente en la aplicación; no es una pantalla adicional en paralelo.
- Fuera de alcance de esta spec: páginas de Equipos, Partidos, Simulaciones y el rediseño de Económico (specs independientes), y cualquier persistencia nueva (edición, confirmación, guardado) — ver Principio VII de la constitución.
