# Plan de sprints — reconfigurado 22 jul 2026

Sustituye por completo el plan de sprints original (el que se propuso antes de tener app real, dataset o motor — ver primera conversación de este proyecto). Aquello asumía que había que construir desde cero; hoy hay una app funcionando con datos reales de partidos/árbitros/tarifas y un motor de designación que calcula de verdad. El plan de aquí en adelante parte de ese estado, no de cero — ver [estado-actual.md](./estado-actual.md) para el detalle de qué existe.

**Principio de secuenciación**: el hueco que más ha condicionado todo el proyecto desde el primer día es la falta de dato real de evaluaciones. Ningún sprint de ingeniería lo resuelve — es una gestión con el comité, no una tarea de código. Por eso va como workstream paralelo desde ya, no como un sprint que espera su turno.

---

## Workstream paralelo (arranca ya, corre en todos los sprints) — Dato real de evaluaciones

Conseguir del comité una primera exportación de informes/evaluaciones, aunque sea de un puñado de árbitros. Sin esto, el score seguirá siendo una demo bien construida mostrando el mecanismo, no un producto que tome decisiones reales. Es la tarea de mayor impacto de todo el proyecto y no depende de escribir una sola línea de código.

---

## Sprint 1 + Sprint 2 (fusionados) — `specs/003-persistencia-real/`

**Absorbidos en una sola spec (27 jul 2026, decisión explícita de Roberto)**: backend/persistencia (Sprint 1) y el flujo real de Confirmar/Cambiar candidato de designación (parte de Sprint 2) se especifican y construyen juntos en `specs/003-persistencia-real/`, en vez de en dos pasos separados — el objetivo es que el prototipo funcione de principio a fin cuanto antes para que otras personas puedan probarlo (árbitro en móvil, gestión en escritorio, informadores en móvil).

**Tecnología decidida (`decisiones-producto.md` §18): Supabase, desde el principio.** Se descartó empezar con SQLite local — el prototipo se probará desplegado en Vercel desde varios dispositivos, y un fichero SQLite local no sobrevive de forma fiable en un despliegue sin estado como Vercel. Pendiente de que Roberto cree el proyecto en Supabase (no automatizable, requiere sus credenciales) — el diseño de esquema/migraciones avanza en paralelo, ver `specs/003-persistencia-real/spec.md`.

Contenido movido a la spec: esquema de `Anotacion`, `Designacion`, `DeclaracionDisponibilidad`; seed del dato real existente con la capa sintética etiquetada; persistencia real de "Guardar nota"; acciones reales "Confirmar"/"Cambiar a este candidato" con motivo obligatorio; desbloqueo completo de `002-disponibilidad-arbitro`.

**Lo que NO se absorbió de Sprint 2 (sigue pendiente, sin spec todavía)**:
- Estados vacío/carga/error en todas las pantallas (pendiente desde la guía de frontend original, sección 4 — nunca se llegó a construir).
- Arreglar el bug de responsive entre ~550-900px detectado al montar el scaffold.

## Sprint 3 — Ensanchar lo que ya es real

Antes de inventar más capas sintéticas, aprovechar los scrapers que ya existen y están a medio terminar.

- ~~Terminar/acelerar `scrape_ffcv_public.py` (tarjetas, goles, árbitros por acta)~~ **Hecho (23 jul 2026)**: 25.256 partidos procesados (todas las categorías adultas), con tarjetas y árbitros reales ya integrados en `generar_dataset_arbitros.py`. Da B.5 real (disciplina descriptiva). Pendiente suelto: solo cubre temporada 2025/26 — backfill de 23/24 y 24/25 relanzando el scraper con `--season 20`/`19` si hace falta para B.3 más adelante.
- Ejecutar `scrape_directorio_equipos.py` (nunca corrido) para direcciones reales de club — sustituye el enfoque de geolocalizar por nombre de instalación, que tuvo rendimiento bajo (`geocode_campos.py`, mayoría sin resultado).
- Virtualización del listado de Árbitros: 200 filas van bien, 1.800 (el volumen real del colectivo) no se ha probado y previsiblemente no aguanta sin virtualizar.

## Sprint 4 — Cuando llegue el dato real de evaluaciones

No tiene fecha porque depende del workstream paralelo, no de nosotros. Cuando llegue:

- Sustituir la capa sintética de `arbitros-sintetico.json` por dato real donde exista, árbitro a árbitro.
- Recalibrar los pesos del score (hoy 0,40/0,20/0,20/0,20, "punto de partida" según `kpis.md`) contra casos reales.
- Resolver la ambigüedad de `kpis.md` entre la penalización por "incidencias" de B.1 y el principio de gobernanza de B.5 (disciplina no puntúa) — hoy sin aclarar en el propio documento.
- Decidir si `consistencia()` (heurística propia, no acordada) se mantiene, se ajusta o se sustituye con el comité.

## Sprint 5 — Motor de nivel producción

- Optimización global de la jornada (problema de asignación bipartito, ej. algoritmo húngaro) en vez del greedy por categoría actual — solo si el volumen de partidos por jornada lo justifica.
- B.3 (idoneidad situacional) con datos reales de conflictividad por partido, una vez el scraping del Sprint 3 tenga cobertura suficiente (mínimo 3 partidos similares por árbitro, según la propia regla de `kpis.md`).
- A.5 (fiabilidad operativa) — probablemente exige que el comité empiece a registrar cancelaciones/incidencias en algún sitio; hoy puede que ni siquiera exista ese dato internamente.

## En cola para especificar (SDD) — Disponibilidad de árbitro

Idea capturada el 27 jul 2026 (`decisiones-producto.md` §15): selector de disponibilidad por árbitro (lesión/baja justificada/urgencia, "solo mi categoría", festivo con 15 días de antelación) con log de registro, doble propósito (ratio operativo de cobertura + señal evaluativa de implicación, visible solo a comité/evaluadores). Roberto decidió (27 jul 2026) terminar primero `/speckit-plan` + `/speckit-tasks` de `001-dashboard-operativo` antes de especificar esto con `/speckit-specify`. Introduce por primera vez la necesidad de un modelo de roles/permisos en la UI.

## Aparcado, no bloqueante

- **Nombre del producto** ("Colegial" sigue siendo placeholder) — se trata cuando haya hueco, no condiciona ningún sprint.
- **Recomendaciones** (acciones globales de comité) y **Económico** (impacto del motor + bienestar) — vistas previas bloqueadas, sin prioridad de desarrollo hasta que el motor de Designación esté validado con dato real.
- **Quitar `Co-Authored-By: Claude` de todo el historial de git** (28 jul 2026) — Roberto no lo quiere en ningún commit, no solo en los nuevos. Reescribir commits ya empujados a `origin/main` exige force-push sobre una rama compartida entre dos sesiones/colaboradores — se hace cuando se coordine explícitamente con quien esté trabajando en la otra ventana en ese momento, no unilateralmente a mitad de una sesión. Hasta entonces: los commits nuevos ya no llevan la línea (aplicado desde el 28 jul), el historial antiguo se queda como está.

---

## Deuda técnica diferida a propósito (revisión de código, 28 jul 2026)

Una revisión senior del proyecto (código general + arquitectura de datos de `003-persistencia-real`) encontró varios huecos. Los baratos y bloqueantes se arreglaron en el momento (ver `estado-actual.md` punto 3 y `decisiones-producto.md` §23). Los siguientes se difieren **a propósito**: son inversiones legítimas, pero construirlas ahora — con 2 colaboradores y sin cliente cerrado — sería pagar complejidad especulativa, el mismo razonamiento que el Principio I de la constitución ya aplica al multi-tenant. Cada uno tiene su disparador explícito para no perderlo de vista ni construirlo antes de tiempo:

| Diferido | Por qué ahora sería caro sin beneficio | Disparador (cuándo sí) |
|---|---|---|
| CI (GitHub Actions) | Con 2 colaboradores y `main` compartida, correr `npm test`/`lint` a mano antes de cada merge cubre el mismo riesgo por menos coste | Una 3ª persona tocando el repo, o el ritmo de merges lo bastante alto para que un test roto llegue a `main` sin que nadie lo note |
| Migrar `CRMExpedientes.jsx`/`lib/` a TypeScript | Reescribir ~1.200 líneas sin bug conocido que el tipado hubiera evitado es coste puro hoy | Cuando el motor de designación mueva dinero real (no demo) — ahí el tipado en `motorAsignacion.js` sí paga por sí solo |
| Tests de componentes / e2e (Playwright ya instalado) | Verificación manual en navegador es suficiente mientras el equipo que prueba cada cambio es el mismo que lo construye | Alguien fuera del equipo empieza a usar la app sin que vosotros estéis mirando por encima del hombro |
| Trocear `CRMExpedientes.jsx` en módulos | Molesto pero no bloquea nada hoy; trocearlo bien exige tiempo que hoy no compra velocidad real | Dos personas necesitando tocar partes distintas del fichero a la vez con frecuencia — puede empezar a notarse con US2/US3 de 003 ya construidas |
| RLS por rol (más allá de la política permisiva actual) | No hay todavía modelo de roles/autenticación real sobre el que basar una política fina — se estrechó a solo lectura+inserción (`0004`), pero seguir requiere auth real | Ya tiene spec (`004-roles-permisos`) y disparador propio: cuando arranque su implementación (Fase 2/3 de §22 de `decisiones-producto.md`) |

**Orden de ejecución cuando corresponda**: ninguno de estos bloquea el trabajo actual (roles/Equipos/Partidos). Se revisan solos, no en bloque, según vaya cumpliéndose cada disparador — no hay prisa por adelantarlos.

---

## Revisión de este plan

Contrastando lo anterior: el orden Sprint 1→2 antes que Sprint 3 es defendible porque construir más funcionalidad (scraping, virtualización) sobre una base sin persistencia real multiplicaría el trabajo de migración después. Podría discutirse invertir 2 y 3 si el workstream de dato real tarda mucho — en ese caso, ensanchar lo real (Sprint 3) mientras se espera tiene sentido como uso del tiempo muerto. Lo dejo como pregunta abierta, no como decisión cerrada: depende de cuánto tardemos en tener el primer contacto útil con el comité.

## Ver también
- [estado-actual.md](./estado-actual.md)
- [decisiones-producto.md](./decisiones-producto.md)
