# Feature Specification: Modelo de roles y permisos ampliado

**Feature Branch**: `004-roles-permisos`

**Created**: 2026-07-28

**Status**: Draft

**Input**: User description: "Modelo de roles ampliado a 5 (admin, directiva, informadores, árbitros, administrativos), sin autenticación real todavía — mismo patrón 'ver como' sin login ya usado en FR-012 de 002-disponibilidad-arbitro. Admin: acceso a todo incluida configuración. Directiva: todo salvo configuración, participa en decisiones de designación junto a administrativos. Informadores: fichas de árbitro + Equipos + Partidos, pueden comentar. Árbitros: su propia ficha + Equipos + Partidos para preparar su partido, con insights a consultar antes de dirigir. Administrativos: disponibilidad + designaciones + vista económica. Spec transversal, la necesitan Equipos y Partidos antes de especificarse. El detalle fino de permisos campo a campo queda por concretar con el comité — esta spec captura la filosofía de cada rol, no un RBAC cerrado."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Elegir el rol activo y ver la interfaz ajustada (Priority: P1)

Cualquier persona que abre la app elige, mediante un selector sin login ("ver como"), cuál de los 5 roles está simulando — igual que ya existe hoy el selector árbitro/comité en la ficha (FR-012 de `002-disponibilidad-arbitro`), pero ampliado a las 5 opciones y disponible en toda la app, no solo en la ficha. Al cambiar de rol, la interfaz muestra u oculta secciones y páginas según ese rol, de forma inmediata.

**Why this priority**: es el mecanismo base — ninguna otra historia de esta spec tiene sentido sin un selector de rol funcionando primero.

**Independent Test**: cambiar el selector entre los 5 roles y comprobar que el conjunto de páginas y secciones visibles cambia de forma coherente con cada uno, sin recargar la página.

**Acceptance Scenarios**:

1. **Given** el selector de rol en su valor por defecto, **When** se abre la app por primera vez, **Then** se ve la interfaz correspondiente a un rol de partida razonable (a definir, ver Assumptions).
2. **Given** el selector en cualquier rol, **When** se cambia a otro rol, **Then** las páginas/secciones que ese nuevo rol no puede ver dejan de estar disponibles inmediatamente, sin necesidad de recargar.

---

### User Story 2 - Configuración protegida frente a cambios accidentales (Priority: P1)

La directiva tiene acceso a prácticamente todo el sistema salvo la configuración, precisamente para que no pueda desconfigurar nada sin querer. Solo el rol admin ve y puede modificar configuración.

**Why this priority**: es una salvaguarda de seguridad operativa — antes de dar acceso amplio a directiva (US1), hay que asegurar que ese acceso amplio no incluye la capacidad de romper la configuración del sistema.

**Independent Test**: con el rol en "directiva", comprobar que ninguna pantalla o control de configuración es visible ni accesible; con el rol en "admin", comprobar que sí lo es.

**Acceptance Scenarios**:

1. **Given** el rol activo es "directiva", **When** se navega por la app, **Then** no aparece ninguna pantalla ni control de configuración del sistema.
2. **Given** el rol activo es "admin", **When** se navega por la app, **Then** la configuración del sistema es visible y editable.

---

### User Story 3 - Informador consulta y comenta antes de evaluar (Priority: P2)

Un informador consulta la ficha de un árbitro, y las páginas Equipos y Partidos, para analizarlos antes de ir a evaluar un partido. Puede dejar comentarios/anotaciones en la ficha del árbitro, igual que ya puede hacer hoy el rol "comité" en `003-persistencia-real` (US1, notas de seguimiento).

**Why this priority**: es el segundo eslabón operativo más inmediato — hoy la app ya permite comentar fichas, esta historia solo amplía quién puede hacerlo y qué más puede consultar antes de evaluar.

**Independent Test**: con el rol en "informadores", abrir una ficha de árbitro, dejar un comentario, y comprobar que persiste igual que lo hace hoy para "comité"; comprobar que Equipos y Partidos son accesibles (una vez existan esas páginas).

**Acceptance Scenarios**:

1. **Given** el rol activo es "informadores", **When** se abre la ficha de un árbitro, **Then** se puede leer su información y dejar un comentario que queda registrado con autor y fecha.
2. **Given** el rol activo es "informadores", **When** se navega a Equipos o Partidos, **Then** el acceso es igual de completo que el que tendría para analizarlos antes de un partido.

---

### User Story 4 - Árbitro se prepara para su próximo partido (Priority: P2)

Un árbitro consulta su propia ficha y las páginas Equipos y Partidos para prepararse antes de dirigir — ahí aparecen los insights relevantes sobre el partido/equipo concreto que se espera que consulte antes de pitar.

**Why this priority**: mismo nivel que la historia del informador — ambas dependen de que Equipos/Partidos existan, y ninguna bloquea a la otra.

**Independent Test**: con el rol en "árbitros", comprobar que se ve la ficha propia (histórico, disponibilidad) y Equipos/Partidos con insights; comprobar que no aparece ninguna lectura evaluativa (patrón de implicación, informes internos) que hoy ya está restringida a comité/informadores.

**Acceptance Scenarios**:

1. **Given** el rol activo es "árbitros", **When** se abre la ficha, **Then** se ve el historial propio (partidos, disponibilidad) pero no el patrón de implicación ni las notas internas del comité (ya restringido hoy por FR-008/FR-009 de `002-disponibilidad-arbitro`).
2. **Given** el rol activo es "árbitros", **When** se navega a Equipos o Partidos antes de un partido propio, **Then** se ven los insights relevantes para ese partido/equipo.

---

### User Story 5 - Administrativo gestiona disponibilidad, designaciones y sigue el económico (Priority: P3)

Un administrativo se ciñe a tareas de gestión: disponibilidad y designaciones (esto último junto a directiva), y consulta la vista económica para ver cómo evoluciona el motor de designación — sin acceso a fichas de evaluación más allá de lo estrictamente necesario para gestionar disponibilidad.

**Why this priority**: es el rol más acotado de los cinco — su ausencia no bloquea el resto de historias, y su alcance es el que menos impacto tiene si se retrasa.

**Independent Test**: con el rol en "administrativos", comprobar acceso a Disponibilidad, Designación y la vista económica; comprobar que no hay acceso a informes/evaluaciones internas de la ficha del árbitro.

**Acceptance Scenarios**:

1. **Given** el rol activo es "administrativos", **When** se navega a Designación, **Then** puede confirmar o cambiar un candidato igual que hoy puede hacer "comité" (US2 de `003-persistencia-real`).
2. **Given** el rol activo es "administrativos", **When** se abre la vista económica, **Then** es accesible en modo consulta.

---

### Edge Cases

- Sin autenticación real, cualquiera que abra la app puede cambiar el selector a cualquier rol, incluido admin — mismo límite ya asumido y documentado por FR-012 de `002-disponibilidad-arbitro`; esta spec no lo resuelve, solo lo hereda y lo deja igual de explícito.
- ¿Qué pasa con el contenido hoy etiquetado "visible solo para el comité" (notas de seguimiento, patrón de implicación) al introducir 5 roles en vez de 2? Se resuelve mapeando "comité" a los roles que heredan ese nivel de acceso (ver FR-007) — no se pierde ninguna restricción ya existente.
- ¿Qué pasa si Equipos o Partidos (specs futuras) añaden una sección que no encaja claramente en ninguno de los 5 roles descritos aquí? Esta spec no puede anticiparlo — cada spec nueva declara explícitamente a qué roles aplica cada sección, usando el vocabulario de roles fijado aquí.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El sistema DEBE ofrecer un selector de rol activo con 5 opciones (admin, directiva, informadores, árbitros, administrativos), sin autenticación real detrás — generaliza el mecanismo ya definido por FR-012 de `002-disponibilidad-arbitro` (estado de UI, sin sesión ni contraseña), disponible en toda la app y no solo en la ficha de árbitro.
- **FR-002**: Únicamente el rol admin DEBE poder ver y modificar la configuración del sistema; ningún otro rol debe tener acceso a ella.
- **FR-003**: El rol directiva DEBE tener acceso de lectura y a las acciones de gestión ya existentes (designación, disponibilidad, notas) en todas las pantallas salvo las de configuración.
- **FR-004**: El rol informadores DEBE poder ver la ficha de cualquier árbitro y las páginas Equipos y Partidos, y DEBE poder dejar comentarios/anotaciones en la ficha del árbitro con el mismo mecanismo ya construido en `003-persistencia-real` (US1).
- **FR-005**: El rol árbitros DEBE poder ver una ficha de árbitro (la resuelta como "la propia" según la Aclaración 1) y las páginas Equipos y Partidos, con los insights relevantes para el partido que va a dirigir.
- **FR-006**: El rol administrativos DEBE poder ver y gestionar disponibilidad y designaciones (igual que hoy "comité" en `003-persistencia-real`), y DEBE poder ver la vista económica en modo consulta; NO DEBE tener acceso a notas internas del comité ni al patrón de implicación de ningún árbitro.
- **FR-007**: Todo contenido hoy restringido a "comité" (notas de seguimiento internas, patrón de implicación, FR-008/FR-009 de `002-disponibilidad-arbitro`) DEBE seguir restringido bajo el nuevo modelo a admin, directiva e informadores; NUNCA visible para árbitros ni administrativos.
- **FR-008**: El sistema NO DEBE persistir ninguna identidad de usuario real ni sesión autenticada como parte de esta spec — el rol activo sigue siendo una simulación de interfaz, mismo límite ya documentado por `002-disponibilidad-arbitro`.
- **FR-009**: Cada spec futura que añada una pantalla nueva (Equipos, Partidos, u otra) DEBE declarar explícitamente a qué roles de los definidos aquí aplica cada una de sus secciones, en vez de inventar un modelo de acceso propio.

### Key Entities *(include if feature involves data)*

- **Rol**: uno de `admin | directiva | informadores | arbitros | administrativos` — no es una entidad persistida (no hay tabla `usuarios` ni `roles`), es un valor de estado de interfaz, igual que el "ver como" ya existente.
- **Alcance de visibilidad por rol**: mapeo conceptual de qué páginas/secciones ve y qué acciones puede hacer cada rol (resumido en esta spec) — no introduce ninguna tabla ni columna nueva en Supabase; en las tablas ya existentes (`anotaciones`, `designaciones`, `declaraciones_disponibilidad`) el campo de autoría (`autor`, `decidido_por_rol`, `autor_rol`) pasa a poder tomar los 5 valores de Rol en vez de solo `arbitro`/`comite` (ver Aclaración 3).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Una persona puede cambiar entre los 5 roles y verificar en menos de 10 segundos, sin ayuda, qué páginas o secciones aparecen u desaparecen para cada uno.
- **SC-002**: El 100% de las pantallas y acciones ya existentes (notas, designaciones, disponibilidad, económico) quedan asignadas a al menos un rol, sin ninguna zona de la app huérfana de asignación de rol.
- **SC-003**: Ningún rol distinto de admin puede llegar a una pantalla o control de configuración del sistema en ningún punto de la navegación.
- **SC-004**: Un árbitro que usa el rol "árbitros" no encuentra en ningún punto de la interfaz una valoración o comentario evaluativo interno sobre sí mismo (mismo criterio que SC-005 de `002-disponibilidad-arbitro`, extendido al nuevo modelo de roles).

## Assumptions

- El detalle fino de permisos campo a campo (por ejemplo, si un informador puede editar una nota que dejó otro informador) no está cerrado con el comité todavía — esta spec fija la filosofía de cada rol descrita por Roberto, no un modelo de permisos exhaustivo; se concreta más adelante cuando haga falta.
- El rol por defecto al abrir la app (Acceptance Scenario 1 de la Historia 1) se fija como "comité" en su acepción más amplia dentro del nuevo modelo — de forma concreta, **directiva** — porque hoy la app ya nace mostrando el punto de vista de gestión (Dashboard, Designación) y es el rol más parecido al "comité" que ya era el valor por defecto antes de esta spec.
- Las páginas Equipos y Partidos, mencionadas aquí como destino de visibilidad para varios roles, no existen todavía — se especifican en sus propias specs (después de esta), que heredan el vocabulario de roles fijado aquí en vez de definir uno propio.
- El registro de consultas de preparación de un árbitro (cuántas veces y con qué antelación consulta los insights de Equipos/Partidos antes de su partido) queda **fuera de alcance de esta spec** — es una idea capturada (`docs/decisiones-producto.md` §20) que se especificará dentro de la spec de Partidos, no aquí, porque depende de que Partidos exista primero.
- "Configuración del sistema" (FR-002) es un principio preparatorio: hoy no existe ninguna pantalla de configuración construida en la app, así que esta spec no bloquea nada existente — fija la regla para cuando esa pantalla se construya (ver Aclaración 2).

## Clarifications

### Session 2026-07-28

- Q: ¿Cómo se resuelve "el árbitro ve su propia ficha" (US4/FR-005) sin autenticación real, si cualquiera puede activar el rol "árbitros" y hoy todas las fichas son igual de accesibles desde el listado? → A: Al activar el rol "árbitros", el listado de Árbitros deja de mostrarse tal cual — se sustituye por un selector simple de "¿qué ficha eres?" (sin contraseña) que fija la ficha activa para el resto de la sesión de UI, simulando que esa es la única ficha visible para ese rol.
- Q: ¿"Configuración del sistema" (FR-002) se refiere a alguna pantalla ya existente o es un principio preparatorio sin implementación todavía? → A: Es preparatorio — hoy no existe ninguna pantalla de configuración en la app; FR-002 fija la regla para cuando exista, no bloquea nada del alcance actual de esta spec.
- Q: ¿"Informadores" es un rol distinto de "comité", o "comité" (ya usado en el código como `decidido_por_rol`/`autor_rol` en `003-persistencia-real`) se reparte ahora entre varios de los 5 roles nuevos? → A: "Comité" tal como existe hoy en el código se reparte: donde antes cualquier autor "comité" tenía acceso completo, ahora ese acceso se divide entre **directiva** (gestión + designación) e **informadores** (fichas + comentarios) según la acción concreta — el valor persistido en Supabase pasa a reflejar el rol específico (uno de los 5) en vez del genérico "comite".
