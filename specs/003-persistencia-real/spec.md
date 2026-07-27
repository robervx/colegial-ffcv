# Feature Specification: Persistencia real (Sprint 1 + Sprint 2 fusionados)

**Feature Branch**: `003-persistencia-real`

**Created**: 2026-07-27

**Status**: Draft

**Input**: User description: "Backend real con Supabase (Postgres) para sustituir los JSON estáticos actuales. Alcance: (1) esquema de tablas para las entidades ya diseñadas — Arbitro, Anotacion, Designacion (estado/override/motivo obligatorio), Veto, DeclaracionDisponibilidad y su log (de la spec 002-disponibilidad-arbitro), reutilizando docs/data-model.md como base; (2) carga del dato real existente como seed, con la capa sintética claramente etiquetada; (3) persistencia real del botón 'Guardar nota' de la ficha de árbitro y del flujo completo de Confirmar/Cambiar candidato del motor de designación, con motivo obligatorio al cambiar; (4) esto desbloquea completar 002-disponibilidad-arbitro. Despliegue objetivo: Vercel, con acceso desde varios dispositivos a la vez (árbitro en móvil, gestión en escritorio, informadores en móvil). Roberto crea el proyecto de Supabase por su cuenta. Decisión tomada al especificar (27 jul 2026): el flujo de Confirmar/Cambiar candidato —hoy inexistente, solo una vista previa bloqueada 'disponible en v2'— se construye completo en esta misma spec, fusionando lo que docs/sprints.md tenía planificado como Sprint 1 (backend) y Sprint 2 (flujo de decisión humana) en un único incremento."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Una nota de seguimiento sobrevive de verdad (Priority: P1)

Una persona del comité escribe una nota en la ficha de un árbitro. Esa nota sigue ahí después de refrescar la página, cerrar el navegador, o al abrir la misma ficha desde otro dispositivo o sesión.

**Why this priority**: es el ejemplo de "guardado falso" más citado del proyecto — el botón "Guardar nota" existe hoy, pero solo actualiza estado local de React y desaparece al refrescar. Resolverlo es la prueba más simple y directa de que existe persistencia real, reutilizando una UI que ya existe — el primer peldaño antes de construir flujos más complejos encima de la misma base.

**Independent Test**: añadir una nota desde la ficha de un árbitro, refrescar la página, y comprobar que la nota sigue. Abrir la misma ficha desde otro dispositivo o navegador y comprobar que también aparece ahí.

**Acceptance Scenarios**:

1. **Given** una ficha de árbitro sin notas nuevas, **When** el comité escribe y guarda una nota, **Then** la nota aparece en la ficha inmediatamente y sigue apareciendo tras refrescar la página.
2. **Given** una nota guardada desde un dispositivo, **When** se abre la misma ficha desde otro dispositivo, **Then** la nota es visible igual, con la misma fecha y autor.

---

### User Story 2 - Confirmar o cambiar el candidato de una designación, con motivo (Priority: P2)

El comité, al revisar una jornada en Designación inteligente, confirma el candidato sugerido por el motor o elige uno de las alternativas — si elige uno distinto del sugerido, debe indicar un motivo antes de guardar. Esa decisión persiste: la próxima vez que se abra esa jornada, desde cualquier dispositivo, se ve la decisión ya tomada, no un estado "pendiente de revisión" recalculado desde cero.

**Why this priority**: es el principio nº1 de la guía de producto original — "el técnico decide, el sistema informa" (Principio II de la constitución). Hoy el motor calcula y ordena candidatos, pero ningún botón persiste una decisión real; esta historia sustituye la vista previa bloqueada "Confirmar y publicar (disponible en v2)" por la funcionalidad real. Va después de la nota (US1) porque reutiliza la misma base de persistencia ya validada ahí, y añade más complejidad (validación de motivo obligatorio, estado por partido, alternativas).

**Independent Test**: abrir una jornada en Designación inteligente, confirmar el candidato sugerido en un partido, y comprobar que queda marcado como confirmado tras refrescar. En otro partido, elegir una alternativa distinta a la sugerida, comprobar que exige motivo antes de guardar, y comprobar que la designación de ese partido refleja el candidato elegido y su motivo incluso reabriendo desde otro dispositivo.

**Acceptance Scenarios**:

1. **Given** un partido con un candidato sugerido por el motor, **When** el comité pulsa "Confirmar", **Then** la designación de ese partido queda marcada como confirmada y persiste tras refrescar.
2. **Given** un partido con alternativas disponibles, **When** el comité elige un candidato distinto del sugerido sin indicar motivo, **Then** el sistema no permite guardar hasta que se indique un motivo.
3. **Given** una designación ya confirmada o cambiada con motivo, **When** se reabre esa jornada más tarde, incluso desde otro dispositivo, **Then** se muestra la decisión ya tomada (candidato y motivo si aplica), no un estado "pendiente de revisión" recalculado desde cero.
4. **Given** un partido marcado como sensible o con score muy ajustado entre los dos primeros candidatos, **When** el comité aún no ha decidido, **Then** el partido sigue señalado como pendiente de revisión hasta que se confirme o se cambie explícitamente.

---

### User Story 3 - Disponibilidad de árbitro, completamente operativa (Priority: P3)

La funcionalidad ya diseñada y en parte construida en `002-disponibilidad-arbitro` (selector de disponibilidad, log, patrón de implicación, selector de rol) pasa de "diseñada, sin UI" a completamente operativa, porque ya existe la persistencia real que le faltaba.

**Why this priority**: es el desbloqueo directo de una spec ya completamente especificada y planificada — el contrato de repositorio (`specs/002-disponibilidad-arbitro/contracts/disponibilidad-repo.md`) y tres piezas de lógica pura ya existen y están testeadas; construir esto es "rellenar el contrato ya definido", no diseñar de cero. Va en tercer lugar porque, aunque ya está diseñada, es la historia de menor urgencia operativa inmediata de las tres (spec.md de 002 ya la documenta así).

**Independent Test**: declarar disponibilidad para un árbitro desde su ficha (o en su nombre), refrescar, y comprobar que la declaración queda en su log. Comprobar que el panel "Cobertura por categoría" del Dashboard (`001-dashboard-operativo`) refleja esa declaración real en vez de la simulación sintética anterior.

**Acceptance Scenarios**:

1. **Given** un árbitro sin declaración para el ciclo activo, **When** se declara "no disponible" con un motivo, **Then** queda una entrada nueva en su log de disponibilidad, y el Dashboard refleja esa indisponibilidad en su cálculo de cobertura.
2. **Given** el selector "ver como: comité" activo, **When** se abre la ficha de un árbitro con un patrón de bajas no justificadas, **Then** se ve el resumen de ese patrón; **Given** el mismo selector en "árbitro", **Then** ese resumen no aparece en ningún punto.

---

### Edge Cases

- ¿Qué pasa si dos personas del comité guardan una nota, deciden una designación, o declaran disponibilidad, casi al mismo tiempo? Ninguna escritura se pierde de forma silenciosa. Notas y disponibilidad son de solo-añadir (append-only); una designación tiene un único estado vigente por partido, así que la última decisión guardada es la que prevalece, pero queda registrado quién la tomó y cuándo (no se pierde el rastro de que hubo más de una persona decidiendo el mismo partido).
- ¿Qué pasa si la base de datos no responde (caída, sin conexión)? El sistema muestra un error claro al intentar guardar — nunca simula que algo se guardó cuando no fue así (mismo criterio ya aplicado en el stub de `lib/disponibilidadRepo.js`, que ahora deja de ser un stub).
- ¿Qué pasa con las notas y el histórico sintéticos que ya existen en el dataset de trabajo (ejemplos generados)? Se cargan como dato inicial (seed), etiquetados como sintéticos exactamente igual que hoy en el JSON — no se pierde la distinción entre real y sintético al migrar.
- ¿Qué pasa si se recalcula el motor de designación (por ejemplo, cambia la disponibilidad de un árbitro) después de que un partido ya tiene una designación confirmada? La designación confirmada no se recalcula ni se sobrescribe automáticamente — un cambio posterior de disponibilidad no revierte una decisión humana ya tomada (Principio II, el sistema informa, no decide por su cuenta).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El sistema DEBE persistir cada nota de seguimiento añadida desde la ficha de un árbitro, de forma que sobreviva a refrescos de página y sea visible desde cualquier dispositivo o sesión.
- **FR-002**: El sistema DEBE permitir confirmar el candidato sugerido por el motor de designación para un partido, o elegir una de las alternativas, dejando esa decisión persistida y visible al reabrir esa jornada.
- **FR-003**: El sistema NO DEBE permitir guardar un cambio de candidato (distinto del sugerido) sin un motivo — la validación debe aplicarse también en la capa de persistencia, no solo en el formulario.
- **FR-004**: Una designación ya confirmada o cambiada NO DEBE revertirse ni recalcularse automáticamente por cambios posteriores en la disponibilidad de árbitros u otros datos de entrada — solo una nueva decisión humana explícita la cambia.
- **FR-005**: El sistema DEBE completar la persistencia real de `002-disponibilidad-arbitro` (declaraciones de disponibilidad, su log, y el cálculo de patrón de implicación) conforme al contrato ya definido en `specs/002-disponibilidad-arbitro/contracts/disponibilidad-repo.md`, sin cambiar esas firmas.
- **FR-006**: El sistema DEBE distinguir, para cada registro cargado como dato inicial, si proviene de una fuente real (scraping público FFCV) o es sintético — mismo criterio que ya aplica el resto de la app (Principio VI de la constitución).
- **FR-007**: El sistema DEBE mostrar un mensaje de error claro cuando una acción de guardado falla (por ejemplo, sin conexión a la base de datos) — nunca debe aparentar que algo se guardó cuando no fue así.
- **FR-008**: Cada nota, cada decisión de designación y cada declaración de disponibilidad DEBE quedar asociada a quién la hizo (rol activo en el momento de guardar) y cuándo.
- **FR-009**: El sistema DEBE seguir mostrando el mismo roster de árbitros, ciclos y partidos a cualquier persona que abra la aplicación, sea cual sea su dispositivo — ver Assumptions sobre por qué esto no exige moverlos a la base de datos en esta spec.

### Key Entities *(include if feature involves data)*

- **Anotacion** (ya descrita en `docs/data-model.md`): árbitro, fecha, autor, texto, etiqueta opcional — sin nota numérica, no entra en ningún score.
- **Designacion** (ya descrita en `docs/data-model.md`): partido, árbitro asignado, estado (sugerida/confirmada/cancelada), motivo de override (obligatorio si el candidato confirmado no es el sugerido por el motor), quién y cuándo decidió.
- **DeclaracionDisponibilidad / LogDisponibilidad** (ya descritas en `specs/002-disponibilidad-arbitro/data-model.md`) — esta spec les da persistencia real por primera vez, sin cambiar su forma.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Una nota guardada por una persona es visible desde otro dispositivo o sesión sin más acción que abrir la ficha — sin refrescos manuales especiales ni caché desactualizada.
- **SC-002**: El 100% de las decisiones de designación tomadas (confirmar o cambiar) siguen visibles tal cual se tomaron la próxima vez que se abre esa jornada, sin excepción.
- **SC-003**: Ningún cambio de candidato de designación se guarda sin motivo — verificable en el 100% de los casos.
- **SC-004**: Las tres user stories de `002-disponibilidad-arbitro` (spec.md) son ejecutables de principio a fin, no solo diseñadas.
- **SC-005**: Si la base de datos no responde, la persona ve un mensaje de error claro en unos segundos — nunca una acción que parezca completada sin haberlo hecho.
- **SC-006**: El 100% de las notas, decisiones de designación y declaraciones de disponibilidad guardadas quedan asociadas a autor y fecha, verificable en cualquier registro.

## Assumptions

- El roster de árbitros, ciclos y partidos (`arbitros-200.json`, `ciclos-asignacion.json`) siguen siendo datos estáticos generados por los scripts Python existentes y empaquetados con el despliegue — **no se migran a la base de datos en esta spec**, porque no cambian por acción de ninguna persona usuaria y son idénticos para cualquiera que abra la misma versión desplegada de la app. Se migrarían el día que haga falta editarlos desde la propia UI (por ejemplo, cuando llegue el roster real del comité — Sprint 4 de `docs/sprints.md`).
- Esta spec da por hecho que existe ya un proyecto Supabase creado por Roberto con sus credenciales — no cubre la creación de la cuenta o el proyecto en sí, eso lo hace él directamente en supabase.com.
- El motivo obligatorio al cambiar un candidato de designación es texto libre, igual que ya lo es en el resto del prototipo — no se introduce una taxonomía cerrada de motivos en esta spec.
- Sin autenticación real todavía (eso no es parte de esta spec): "quién" hizo cada acción se registra según el rol activo en el momento de guardar (mismo mecanismo "ver como: árbitro/comité" ya definido en `002-disponibilidad-arbitro` FR-012), no una identidad de usuario autenticada con contraseña.
- Esta spec fusiona en un único incremento lo que `docs/sprints.md` tenía como Sprint 1 (backend) y Sprint 2 (flujo de decisión humana) — decisión explícita de Roberto (27 jul 2026) para que el prototipo funcione de principio a fin y sea testeable por otras personas cuanto antes, en vez de entregarlo en dos pasos separados.
