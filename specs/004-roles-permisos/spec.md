# Feature Specification: Cuentas de usuario, roles y panel de administración

**Feature Branch**: `004-roles-permisos`

**Created**: 2026-07-28 (reescrita 28 jul 2026 tras pivote a autenticación real)

**Status**: Draft

**Input**: User description (pivote sobre el draft original, que asumía un selector "ver como" sin login): "Para los roles crearemos usuarios reales, a los que se les asignará un rol — así hay registro de cada usuario y de su actividad. De momento haremos los usuarios de directiva/comisión y administración; cuando esté funcionando iremos probando por categorías. Cada árbitro tendrá su credencial para acceder y solo podrá ver su ficha y lo que hemos comentado, con su email oficial registrado en el comité, para asegurar que las comunicaciones le lleguen. El admin debe tener un panel de control específico para crear y gestionar usuarios, ver historial de uso de cada uno, crear/eliminar/modificar permisos. Preferencia de rollout: empezar por la categoría más alta (Tercera Federación) mientras el roster completo de árbitros no esté cargado; en cuanto lo esté, el criterio pasa a ser de menos a más árbitros reales por categoría."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Iniciar sesión con cuenta real y ver la interfaz del rol asignado (Priority: P1)

Una persona con una cuenta creada (email + enlace de acceso por correo, sin contraseña) inicia sesión y ve la interfaz ajustada al rol que el admin le asignó — sustituye por completo el selector "ver como" sin login que definía FR-012 de `002-disponibilidad-arbitro`.

**Why this priority**: es el mecanismo base — ninguna otra historia de esta spec (ni de `005-equipos`/`006-partidos`, que dependen de este modelo de roles) tiene sentido sin cuentas reales funcionando.

**Independent Test**: crear una cuenta con un rol concreto, iniciar sesión con el enlace recibido por email, y comprobar que la interfaz muestra exactamente lo que ese rol puede ver — nada más.

**Acceptance Scenarios**:

1. **Given** una cuenta ya creada por el admin con un email y un rol, **When** esa persona solicita acceso con su email, **Then** recibe un enlace de un solo uso en su correo y, al pulsarlo, entra directamente a la interfaz de su rol.
2. **Given** una sesión iniciada, **When** pasa el tiempo de expiración configurado, **Then** se pide iniciar sesión de nuevo — no hay sesión indefinida sin control.
3. **Given** un email sin cuenta creada por el admin, **When** se intenta iniciar sesión con ese email, **Then** el sistema lo rechaza con un mensaje claro — nadie puede auto-registrarse.

---

### User Story 2 - Admin gestiona cuentas, roles e historial de uso (Priority: P1)

El admin, desde un panel de control dedicado, crea una cuenta nueva (email + rol), modifica el rol de una cuenta existente, la elimina, y consulta el historial de actividad de cualquier usuario (inicios de sesión, acciones realizadas).

**Why this priority**: sin esto no existe ninguna cuenta más que la del propio admin — es la puerta de entrada obligatoria para todas las demás historias.

**Independent Test**: crear una cuenta nueva con un rol, comprobar que puede iniciar sesión con ese rol; cambiarle el rol y comprobar que la interfaz que ve cambia en consecuencia; eliminarla y comprobar que ya no puede acceder; abrir su historial de actividad y ver sus acciones registradas con fecha.

**Acceptance Scenarios**:

1. **Given** el panel de administración, **When** el admin crea una cuenta con un email y un rol, **Then** la cuenta queda lista para recibir su primer enlace de acceso.
2. **Given** una cuenta existente, **When** el admin le cambia el rol, **Then** la próxima vez que esa persona use la app ve la interfaz del nuevo rol, no del anterior.
3. **Given** una cuenta existente, **When** el admin la elimina, **Then** esa persona deja de poder iniciar sesión.
4. **Given** cualquier cuenta con actividad registrada, **When** el admin abre su historial de uso, **Then** ve sus inicios de sesión y las acciones que ha realizado en la app (notas, designaciones, disponibilidad, comentarios), con fecha — mismo criterio de trazabilidad que ya exige `003-persistencia-real` (FR-008 de esa spec) para cada tabla.

---

### User Story 3 - Configuración protegida frente a cambios accidentales (Priority: P1)

Directiva tiene acceso a prácticamente todo el sistema salvo la configuración (que incluye, entre otras cosas, la propia gestión de usuarios de la Historia 2), precisamente para que no pueda desconfigurar nada sin querer. Solo el rol admin ve y puede modificar configuración.

**Why this priority**: salvaguarda de seguridad operativa — antes de dar acceso amplio a directiva, hay que asegurar que ese acceso no incluye la capacidad de romper la configuración ni la gestión de usuarios.

**Independent Test**: con una cuenta de rol "directiva", comprobar que el panel de administración de la Historia 2 no es accesible; con una cuenta "admin", comprobar que sí.

**Acceptance Scenarios**:

1. **Given** una cuenta con rol "directiva", **When** se navega por la app, **Then** no aparece el panel de administración ni ninguna otra pantalla de configuración del sistema.
2. **Given** una cuenta con rol "admin", **When** se navega por la app, **Then** el panel de administración y la configuración del sistema son accesibles.

---

### User Story 4 - Árbitro entra y ve automáticamente su propia ficha (Priority: P2)

Un árbitro inicia sesión con su email oficial (registrado en el comité) y ve directamente su propia ficha, su disponibilidad, y las páginas Equipos/Partidos para prepararse — nunca la ficha de otro árbitro.

**Why this priority**: es la aplicación directa del modelo de cuentas al rol más numeroso — depende de que la Historia 1 y 2 (cuentas + gestión) ya existan.

**Independent Test**: crear una cuenta de rol "árbitros" vinculada a un `arbitro_id` concreto, iniciar sesión con su email, y comprobar que la ficha mostrada es la suya y solo la suya — sin selector ni posibilidad de navegar a la ficha de otro árbitro.

**Acceptance Scenarios**:

1. **Given** una cuenta de rol "árbitros" vinculada a un árbitro concreto, **When** esa persona inicia sesión, **Then** ve su propia ficha (histórico, disponibilidad) directamente, sin listado de otros árbitros.
2. **Given** la misma cuenta, **When** navega a Equipos o Partidos, **Then** ve los insights relevantes para prepararse, pero no ve el patrón de implicación ni las notas internas del comité (FR-008/FR-009 de `002-disponibilidad-arbitro`, heredado aquí).

---

### User Story 5 - Informador consulta y comenta antes de evaluar (Priority: P2)

Un informador, con su propia cuenta, consulta la ficha de cualquier árbitro y las páginas Equipos y Partidos, y deja comentarios en la ficha del árbitro — mismo mecanismo de comentarios ya construido en `003-persistencia-real` (US1), ahora con autoría de usuario real en vez del texto genérico `"Comité"`.

**Why this priority**: mismo nivel que la Historia 4 — ambas dependen de que existan cuentas y roles, ninguna bloquea a la otra.

**Independent Test**: con una cuenta de rol "informadores", abrir la ficha de un árbitro, dejar un comentario, y comprobar que queda registrado con el nombre/email real de esa cuenta como autor.

**Acceptance Scenarios**:

1. **Given** una cuenta de rol "informadores", **When** se abre la ficha de un árbitro y se deja un comentario, **Then** queda registrado con la identidad real de esa cuenta, fecha, y visible para quien tenga acceso a esa ficha.

---

### User Story 6 - Administrativo gestiona disponibilidad, designaciones y sigue el económico (Priority: P3)

Un administrativo, con su propia cuenta, gestiona disponibilidad y designaciones (junto a directiva) y consulta la vista económica — sin acceso a notas internas ni al patrón de implicación de ningún árbitro.

**Why this priority**: el rol más acotado de los cinco — su ausencia no bloquea el resto, y es el que menos impacto tiene si se retrasa.

**Independent Test**: con una cuenta de rol "administrativos", comprobar acceso a Disponibilidad, Designación y vista económica; comprobar que no hay acceso a informes/evaluaciones internas.

**Acceptance Scenarios**:

1. **Given** una cuenta de rol "administrativos", **When** se navega a Designación, **Then** puede confirmar o cambiar un candidato con su identidad real quedando registrada (igual que hoy hace "comité" en US2 de `003-persistencia-real`).

---

### Edge Cases

- ¿Qué pasa si alguien intenta entrar con un email que no tiene cuenta creada? Se rechaza con un mensaje claro (Historia 1, Acceptance Scenario 3) — nadie se autorregistra, todas las cuentas las crea el admin.
- ¿Qué pasa si el admin elimina su propia única cuenta de admin? El sistema DEBE impedir quedarse sin ningún admin activo (ver FR-014) — de lo contrario nadie podría volver a gestionar usuarios.
- ¿Qué pasa con el contenido hoy etiquetado "visible solo para el comité" (notas de seguimiento, patrón de implicación)? Se resuelve mapeando ese nivel de acceso a admin, directiva e informadores (ver FR-008) — no se pierde ninguna restricción ya existente.
- ¿Qué pasa si un árbitro todavía no tiene email oficial verificado por el comité? Su cuenta no se crea todavía — ver Assumptions, es un bloqueante de datos, no de producto.
- ¿Qué pasa con las acciones que ya persisten hoy en Supabase (`anotaciones.autor`, `designaciones.decidido_por_rol`, `declaraciones_disponibilidad.autor_rol`) con el texto genérico `"comite"`/`"Comité"`? Pasan a referenciar al usuario real que hizo la acción (ver FR-009) — es un cambio sobre datos ya construidos en `003-persistencia-real`, no solo sobre pantallas nuevas.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El sistema DEBE autenticar usuarios reales mediante email y un enlace de acceso de un solo uso (sin contraseña) — sustituye completamente el selector "ver como" sin login de FR-012 de `002-disponibilidad-arbitro`.
- **FR-002**: El sistema NO DEBE permitir que nadie cree su propia cuenta — toda cuenta la crea el admin desde el panel de administración (Historia 2).
- **FR-003**: Únicamente el rol admin DEBE poder ver y modificar la configuración del sistema, incluida la gestión de usuarios; ningún otro rol debe tener acceso a ella.
- **FR-004**: El rol directiva DEBE tener acceso de lectura y a las acciones de gestión ya existentes (designación, disponibilidad, notas) en todas las pantallas salvo las de configuración/administración de usuarios.
- **FR-005**: El rol informadores DEBE poder ver la ficha de cualquier árbitro y las páginas Equipos y Partidos, y DEBE poder dejar comentarios/anotaciones con su identidad real como autor.
- **FR-006**: El rol árbitros DEBE ver, automáticamente al iniciar sesión, únicamente la ficha del árbitro al que su cuenta está vinculada, más las páginas Equipos y Partidos para preparar su partido — nunca la ficha de otro árbitro, sin selector manual de por medio.
- **FR-007**: El rol administrativos DEBE poder ver y gestionar disponibilidad y designaciones, y ver la vista económica en modo consulta; NO DEBE tener acceso a notas internas del comité ni al patrón de implicación de ningún árbitro.
- **FR-008**: Todo contenido hoy restringido a "comité" (notas internas, patrón de implicación — FR-008/FR-009 de `002-disponibilidad-arbitro`) DEBE seguir restringido a admin, directiva e informadores; nunca visible para árbitros ni administrativos.
- **FR-009**: Cada acción que hoy queda registrada con un texto de rol genérico (`anotaciones.autor`, `designaciones.decidido_por_rol`, `declaraciones_disponibilidad.autor_rol` de `003-persistencia-real`) DEBE pasar a registrar la identidad real del usuario autenticado que la realizó.
- **FR-010**: El admin DEBE poder, desde un panel dedicado: crear una cuenta (email + rol, y `arbitro_id` si el rol es árbitro), modificar el rol de una cuenta existente, y eliminar una cuenta.
- **FR-011**: El sistema DEBE registrar un historial de actividad por usuario — como mínimo inicios de sesión y las acciones ya persistidas en `anotaciones`/`designaciones`/`declaraciones_disponibilidad`/comentarios de equipo (`006-partidos`) — consultable por el admin desde el panel.
- **FR-012**: El sistema NO DEBE crear una cuenta de árbitro sin un email oficial verificado por el comité — nunca se usa el email sintético generado hoy en `arbitros-200.json` (patrón `nombre.apellido@arbitrosffcv.es`) para enviar un enlace de acceso real.
- **FR-013**: El alta de cuentas de árbitro DEBE hacerse de forma progresiva por categoría: mientras el roster completo de árbitros no esté cargado en el sistema, se empieza por Tercera Federación (la categoría más alta, con dato ya disponible); en cuanto el roster completo (~1208 árbitros reales) esté cargado, el criterio de orden pasa a ser de menos a más árbitros reales por categoría.
- **FR-014**: El sistema DEBE impedir que se elimine o degrade la última cuenta con rol admin activa — siempre debe quedar al menos una.
- **FR-015**: Cada spec futura que añada una pantalla nueva (Equipos, Partidos, u otra) DEBE declarar explícitamente a qué roles de los definidos aquí aplica cada una de sus secciones, en vez de inventar un modelo de acceso propio.

### Key Entities *(include if feature involves data)*

- **Usuario**: cuenta real — email, rol (uno de `admin | directiva | informadores | arbitros | administrativos`), `arbitro_id` (solo si el rol es árbitro, referencia lógica a `arbitros-200.json`/roster real), fecha de creación, fecha de último acceso. Vive en el sistema de autenticación (Supabase Auth) más una tabla de perfil/rol asociada — mismo patrón de repositorio ya usado en `003-persistencia-real`.
- **HistorialUso**: registro append-only de eventos por usuario (inicio de sesión, y referencia a las acciones ya registradas en otras tablas) — mismo principio "nunca se sobrescribe" ya aplicado a `anotaciones`/`designaciones`/`declaraciones_disponibilidad`.
- **Rol**: uno de los 5 valores — ya no es un valor de estado de interfaz sin persistencia (como en el draft anterior de esta spec), pasa a ser un atributo real de `Usuario`.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Una persona con cuenta creada puede iniciar sesión con su email y estar dentro de la app en menos de 1 minuto (tiempo de recibir y pulsar el enlace incluido).
- **SC-002**: El admin puede crear una cuenta nueva, asignarle un rol y verla operativa en menos de 2 minutos desde el panel de administración.
- **SC-003**: El 100% de las acciones que hoy quedan registradas en `anotaciones`, `designaciones` y `declaraciones_disponibilidad` referencian un usuario real identificable, no un texto de rol genérico.
- **SC-004**: Ningún rol distinto de admin puede llegar al panel de administración ni a ninguna otra pantalla de configuración en ningún punto de la navegación.
- **SC-005**: Un árbitro que inicia sesión no ve en ningún momento la ficha de otro árbitro, ni tiene que elegir cuál es la suya.
- **SC-006**: Ninguna cuenta de árbitro se crea sin un email oficial verificado por el comité — el 100% de los emails usados para enlaces de acceso son reales, ninguno sintético.

## Assumptions

- **Mecanismo de acceso**: enlace de un solo uso por email (Supabase Auth, magic link), sin contraseña — decisión adoptada por defecto tras explicar la alternativa a Roberto; corregible si prefiere email+contraseña visible en la pantalla de login.
- **Bloqueante de rollout real para árbitros**: los emails de árbitros en el dataset de trabajo (`arbitros-200.json`) son sintéticos (patrón `nombre.apellido@arbitrosffcv.es`, ver inventario de datos de `docs/estado-actual.md` §3) — no se puede dar de alta ninguna cuenta de árbitro real hasta obtener del comité su email oficial verdadero. Es la misma clase de dependencia externa que ya bloquea el "dato real de evaluaciones" (workstream paralelo de `docs/sprints.md`), no una tarea de ingeniería que se resuelva escribiendo código.
- **Rollout en dos fases** (28 jul 2026): Fase 1, ahora — cuentas de directiva/comisión y administración (no dependen de categoría). Fase 2 — cuentas de árbitro, empezando por Tercera Federación (categoría más alta, con dato disponible en el sistema hoy) mientras el roster completo no esté cargado; en cuanto lo esté (~1208 árbitros reales), el criterio de orden cambia a "de menos a más árbitros por categoría" tal como se pidió originalmente.
- El detalle exacto de qué puede editar cada rol campo a campo (más allá de la filosofía descrita aquí) sigue sin cerrar con el comité — se concreta más adelante.
- El diseño exacto del panel de administración (qué columnas, qué filtros del historial de uso) se detalla en el plan técnico, no en esta spec.
- Las páginas Equipos (`005-equipos`) y Partidos (`006-partidos`) heredan el vocabulario de roles fijado aquí, sin definir uno propio.
