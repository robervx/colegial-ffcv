# Plan de sprints — reconfigurado 22 jul 2026

Sustituye por completo el plan de sprints original (el que se propuso antes de tener app real, dataset o motor — ver primera conversación de este proyecto). Aquello asumía que había que construir desde cero; hoy hay una app funcionando con datos reales de partidos/árbitros/tarifas y un motor de designación que calcula de verdad. El plan de aquí en adelante parte de ese estado, no de cero — ver [estado-actual.md](./estado-actual.md) para el detalle de qué existe.

**Principio de secuenciación**: el hueco que más ha condicionado todo el proyecto desde el primer día es la falta de dato real de evaluaciones. Ningún sprint de ingeniería lo resuelve — es una gestión con el comité, no una tarea de código. Por eso va como workstream paralelo desde ya, no como un sprint que espera su turno.

---

## Workstream paralelo (arranca ya, corre en todos los sprints) — Dato real de evaluaciones

Conseguir del comité una primera exportación de informes/evaluaciones, aunque sea de un puñado de árbitros. Sin esto, el score seguirá siendo una demo bien construida mostrando el mecanismo, no un producto que tome decisiones reales. Es la tarea de mayor impacto de todo el proyecto y no depende de escribir una sola línea de código.

---

## Sprint 1 — Cimentar lo real: backend y persistencia

Hoy no hay backend. Todo el dato vive en JSON estáticos generados por scripts de Python; nada de lo que se hace en la app (notas, confirmaciones de designación) sobrevive a un refresco de página. Antes de seguir añadiendo funcionalidad encima de una base que no persiste nada, hay que resolver esto.

- Confirmar si existe ya un proyecto Supabase en algún sitio (pendiente desde el Sprint 0 original, nunca se verificó).
- Migrar `data-model.md` a tablas reales.
- Cargar el dato real (árbitros/carga/historial de `partidos_2025_2026.csv`) como seed real; la capa sintética como seed claramente etiquetado, sustituible entidad por entidad conforme llegue dato real del comité.
- Persistencia de `Anotacion` (notas de seguimiento) y `Designacion` (estado, override, motivo) — sin esto, el "Guardar nota" de la ficha sigue siendo teatro.

## Sprint 2 — El flujo de decisión humana, de verdad

Hoy Designación inteligente muestra alternativas pero no hay ningún botón que persista una decisión. Este sprint construye el "el técnico decide, el sistema informa" que es el principio nº1 de la guía de producto, no solo lo enseña.

- Acciones reales: "Confirmar" / "Cambiar a este candidato" (con motivo obligatorio si se cambia) — persistido en `Designacion`, alimentando la futura tasa de override (A.2, kpis.md) como dato de calibración.
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

## Aparcado, no bloqueante

- **Nombre del producto** ("Colegial" sigue siendo placeholder) — se trata cuando haya hueco, no condiciona ningún sprint.
- **Recomendaciones** (acciones globales de comité) y **Económico** (impacto del motor + bienestar) — vistas previas bloqueadas, sin prioridad de desarrollo hasta que el motor de Designación esté validado con dato real.

---

## Revisión de este plan

Contrastando lo anterior: el orden Sprint 1→2 antes que Sprint 3 es defendible porque construir más funcionalidad (scraping, virtualización) sobre una base sin persistencia real multiplicaría el trabajo de migración después. Podría discutirse invertir 2 y 3 si el workstream de dato real tarda mucho — en ese caso, ensanchar lo real (Sprint 3) mientras se espera tiene sentido como uso del tiempo muerto. Lo dejo como pregunta abierta, no como decisión cerrada: depende de cuánto tardemos en tener el primer contacto útil con el comité.

## Ver también
- [estado-actual.md](./estado-actual.md)
- [decisiones-producto.md](./decisiones-producto.md)
