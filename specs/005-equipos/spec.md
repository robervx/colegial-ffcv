# Feature Specification: Perfil de equipo

**Feature Branch**: `005-equipos`

**Created**: 2026-07-28

**Status**: Draft

**Input**: User description: "Página de Equipos donde construir un perfil de cada equipo del que tenemos info, basándonos en tarjetas que recibe cada jugador, el equipo completo, y las sanciones que reciben. Lo más valioso va a ser generar insights de alto valor que ayuden a tomar decisiones de actuación según criterios arbitrales — por ejemplo, un equipo que no tiene muchas tarjetas se le puede dejar jugar más. Depende del modelo de roles de 004-roles-permisos para quién la ve."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Consultar el perfil de un equipo (Priority: P1)

Una persona con acceso a Equipos (informador, árbitro, comité/directiva/admin — ver `004-roles-permisos`) abre el perfil de un equipo concreto y ve su identidad y su historial disciplinario agregado: tarjetas totales, tarjetas por jugador, partidos jugados, en qué categoría y temporada.

**Why this priority**: es el valor mínimo de la página — sin un perfil de equipo construido, no hay nada sobre lo que generar insights después.

**Independent Test**: abrir el perfil de un equipo con partidos en el dataset y comprobar que muestra identidad, partidos jugados y desglose de tarjetas coherente con `ffcv_public_data/tarjetas_partido.csv`.

**Acceptance Scenarios**:

1. **Given** un equipo con partidos jugados en la temporada actual, **When** se abre su perfil, **Then** se ve su nombre, categoría/competición, número de partidos, y el total de tarjetas amarillas/rojas recibidas — marcado como dato real.
2. **Given** el mismo equipo, **When** se despliega el desglose por jugador, **Then** aparece cada jugador con sus propias tarjetas dentro de ese equipo.

---

### User Story 2 - Buscar y filtrar equipos (Priority: P2)

Una persona busca un equipo por nombre o lo filtra por categoría, de forma similar al listado ya existente de Árbitros.

**Why this priority**: sin poder encontrar un equipo concreto entre los que hay en el dataset, el perfil de la Historia 1 no es utilizable en la práctica.

**Independent Test**: escribir parte de un nombre de equipo y comprobar que el listado se filtra; seleccionar una categoría y comprobar que solo aparecen equipos de esa categoría.

**Acceptance Scenarios**:

1. **Given** el listado completo de equipos, **When** se escribe un nombre parcial, **Then** el listado se reduce a los equipos que coinciden.
2. **Given** el listado completo, **When** se elige una categoría del filtro, **Then** solo se muestran equipos de esa categoría — es un listado filtrable de consulta, no una comparación 1 a 1 entre dos equipos concretos (Principio V de la constitución, ya aplicado igual en el listado de Árbitros).

---

### User Story 3 - Insight de valor para preparar la actuación arbitral (Priority: P2)

Al ver el perfil de un equipo, aparece un insight descriptivo que ayuda a decidir criterio de actuación — por ejemplo, "este equipo acumula pocas tarjetas por partido, históricamente" — siempre acompañado del número que lo sostiene, nunca como una recomendación sin cifra detrás.

**Why this priority**: es el valor diferencial que motivó pedir esta página — sin insight, Equipos es solo una tabla de datos.

**Independent Test**: abrir el perfil de un equipo con historial disciplinario bajo y comprobar que aparece un insight con la cifra concreta que lo respalda (p. ej. "1.2 amarillas/partido de media, frente a 2.8 de media general").

**Acceptance Scenarios**:

1. **Given** un equipo con menos tarjetas por partido que la media general, **When** se abre su perfil, **Then** aparece un insight descriptivo que lo señala junto con ambas cifras (la suya y la de referencia).
2. **Given** un equipo con muy pocos partidos jugados en el dataset, **When** se calcula cualquier insight sobre él, **Then** el sistema declara la confianza reducida por tamaño de muestra en vez de mostrar la cifra como si fuera fiable (mismo criterio que ya aplica B.3/B.1 del motor de designación, Principio III de la constitución).

---

### Edge Cases

- ¿Qué pasa con un equipo que aparece con nombres ligeramente distintos entre temporadas (cambios de patrocinador, etc.)? Se identifica por `cod_equipo` estable (ya existe en `ffcv_public_data/partidos_index.csv`), no por coincidencia de texto del nombre.
- ¿Qué pasa si un equipo tiene muy pocos partidos en el dataset (equipo recién ascendido, categoría con pocos cruces)? El perfil se muestra igual, pero cualquier insight declara su confianza reducida (ver Historia 3, Acceptance Scenario 2) en vez de aparentar una tendencia que no está respaldada.
- ¿Qué pasa con las "sanciones" mencionadas en la petición original? Ver Assumptions — esta spec no calcula una sanción (sería inventar una regla sin fuente oficial), solo muestra el conteo real de tarjetas que la normativa FFCV usaría para calcularla.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El sistema DEBE construir un perfil por equipo identificado por su `cod_equipo` estable, con nombre, categoría/competición y temporada — dato real de `ffcv_public_data/partidos_index.csv`.
- **FR-002**: El perfil de equipo DEBE mostrar el agregado de tarjetas (amarillas y rojas) del equipo completo y desglosado por jugador, calculado sobre dato real (`ffcv_public_data/tarjetas_partido.csv`) — nunca sintético.
- **FR-003**: El sistema DEBE ofrecer un listado de equipos filtrable por nombre y por categoría, con el mismo criterio de "consulta filtrable, no comparación 1 a 1" que ya aplica el listado de Árbitros (Principio V de la constitución).
- **FR-004**: El sistema DEBE generar al menos un insight descriptivo por equipo (p. ej., tarjetas por partido frente a la media general) que ayude a decidir criterio de actuación arbitral, siempre acompañado de la cifra concreta que lo sostiene — nunca una recomendación sin número visible (Principio III).
- **FR-005**: Cuando el número de partidos de un equipo en el dataset sea insuficiente para un insight fiable, el sistema DEBE declarar explícitamente la confianza reducida en vez de mostrar la cifra como si fuera una tendencia consolidada.
- **FR-006**: El sistema NO DEBE calcular ni mostrar una "sanción" (partidos de suspensión) derivada de la acumulación de tarjetas hasta que la normativa disciplinaria oficial de la FFCV que fija esos umbrales esté documentada (mismo patrón que exigió `docs/tarifas.md` antes de construir el motor de coste) — mientras tanto, se muestra el conteo real de tarjetas sin traducirlo a una sanción inventada.
- **FR-007**: La visibilidad de la página Equipos DEBE seguir el modelo de roles de `004-roles-permisos`: informadores y árbitros la consultan para analizar/preparar; admin, directiva y comité tienen el mismo acceso; administrativos no la necesitan para su función de gestión (disponibilidad/designaciones/económico) y puede quedar fuera de su vista por defecto.
- **FR-008**: Todo dato mostrado en Equipos DEBE quedar marcado como real (Principio VI) — esta página no introduce datos sintéticos nuevos; si en el futuro se añade algún campo sin fuente verificable, debe etiquetarse igual que ya se hace en el resto de la app (`· real` / `· sintético`).

### Key Entities *(include if feature involves data)*

- **Equipo**: `cod_equipo` (id estable, ya existe en el dataset), nombre, categoría/competición, temporada — no es una tabla nueva en Supabase, se deriva de `ffcv_public_data/partidos_index.csv` igual que hoy se deriva el dataset de árbitros.
- **AgregadoDisciplinaEquipo** (derivado, no persistido como entidad propia): tarjetas totales y por jugador dentro de un equipo, partidos jugados, calculado sobre `tarjetas_partido.csv` — mismo patrón que `lib/coberturaCategoria.js` u otros agregados ya construidos con scripts Python (`generar_agregados.py`).
- **InsightEquipo** (derivado): cifra descriptiva (p. ej. tarjetas/partido) y su comparación con la media general — nunca persistido como score ni usado en `scoreB1` del árbitro.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Abrir el perfil de un equipo con partidos en el dataset muestra su identidad y agregado de tarjetas sin esperar más de lo que ya tarda hoy abrir la ficha de un árbitro.
- **SC-002**: El 100% de los equipos con al menos un partido en `ffcv_public_data/` tienen un perfil generado, sin ningún equipo huérfano de datos.
- **SC-003**: Ningún insight se muestra sin la cifra concreta que lo sostiene visible junto a él (verificable en cualquier perfil de equipo abierto).
- **SC-004**: Ninguna pantalla de Equipos muestra una "sanción" calculada — solo conteos reales de tarjetas — hasta que `docs/decisiones-producto.md` registre que la normativa disciplinaria FFCV se ha documentado (mismo hito que ya marcó `docs/tarifas.md` para lo económico).

## Assumptions

- Esta página reutiliza el scraping público ya completado (`ffcv_public_data/`) — no requiere scraping nuevo ni acceso a datos que hoy no existan.
- "Sanciones" tal como se pidió originalmente requiere conocer la normativa disciplinaria oficial de la FFCV (umbral de tarjetas → partidos de suspensión), que no está documentada todavía en este repositorio — se deja fuera de alcance de esta spec hasta que exista esa investigación (mismo patrón que `docs/tarifas.md` resolvió para las tarifas económicas antes de construir el motor de coste). Mientras tanto, el conteo real de tarjetas sigue siendo útil por sí mismo.
- No se construye un perfil de jugador individual fuera del equipo (ficha propia de jugador, histórico entre equipos, etc.) — el desglose por jugador de esta spec vive dentro del perfil de su equipo, no como entidad navegable propia. Si se quiere eso, es una spec futura.
- El modelo de visibilidad por rol depende de que `004-roles-permisos` esté aprobada — esta spec asume su vocabulario de roles tal como quedó redactado ahí, sin definir uno propio.
- La comparación "media general" usada en los insights (Historia 3) se calcula sobre el mismo conjunto de datos de `ffcv_public_data/` que ya usa el resto de la app — mismo criterio de umbral de muestra mínima que ya aplica B.3 en `docs/kpis.md` (al menos 3 partidos de contexto similar antes de declarar una tendencia fiable).
