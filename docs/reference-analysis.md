# Análisis PM — reference/crm-arbitral_1.jsx

Prototipo React recibido (guardado en [reference/crm-arbitral_1.jsx](../reference/crm-arbitral_1.jsx)) para evaluar qué adaptar a lo ya construido. No se adopta tal cual — se evalúa como insumo, no como sustituto de las decisiones ya tomadas en [product-vision.md](./product-vision.md), [kpis.md](./kpis.md) y [data-model.md](./data-model.md).

## Lo que aporta y ya se ha incorporado

1. **Veto/incompatibilidad como entidad formal, distinta de "conflictividad de equipo".** El JSX modela `vetos` por árbitro (equipo, motivo, vigencia: permanente/temporal/jornadas). Esto es más preciso que nuestro `conflictividad_score`: un veto **excluye**, no penaliza. Añadido como entidad `Veto` en data-model.md, con el principio explícito de que el motor de asignación filtra primero (exclusión dura) y puntúa después (score blando) — antes esto estaba implícito, ahora es explícito en kpis.md y data-model.md.

2. **Disciplina del árbitro (tarjetas mostradas) como dato descriptivo, no evaluativo.** El JSX trackea amarillas/rojas *mostradas por el árbitro* en sus partidos. Es una señal de contexto útil (¿dirige partidos más tensos? ¿gestiona mejor la disciplina?) pero el JSX comete el riesgo de mezclarla visualmente con la evaluación. Se ha añadido como B.5 en kpis.md, marcada explícitamente como no puntuable, precisamente para evitar ese riesgo.

3. **Copy de gobernanza explícito en la interfaz.** El JSX incluye literalmente en la UI: *"La disponibilidad declarada y los kilómetros recorridos no puntúan (...) Información de gestión, nunca criterio de clasificación."* Esto valida exactamente el pivote que ya hicimos en product-vision.md (no confundir lo económico con el centro del producto) y nos da el lenguaje concreto para la interfaz. Añadido como principio de gobernanza en kpis.md — debe trasladarse literalmente al copy de la UI cuando se construya.

4. **Granularidad por partido en la Designación**: el JSX guarda nota, tarjetas y kilómetros por encuentro dirigido (no solo el informe formal de temporada). Esto es necesario para que **C.2 (Top 10 por rango de partidos)** funcione de verdad — antes de este análisis, ese cálculo dependía solo de la fecha del `Informe`, que ocurre 4-5 veces por temporada, insuficiente para una ventana de "últimos 10 partidos". Añadidos los campos correspondientes a `Designacion`.

## Lo que no cambia nuestra dirección (evaluado y descartado por ahora)

- **Navegación en 5 pestañas planas** (Panel, Colegiados, Designación, Desplazamientos, Clasificación): es el mismo problema que ya corregimos al pasar de 4 pestañas a 2 pilares. "Desplazamientos" y "Clasificación" del JSX encajan exactamente donde ya los pusimos (Asignación > Resumen y Árbitros > Resumen respectivamente). No se adopta la fragmentación.
- **Estilo visual "SaaS corporativo" del JSX** (sidebar azul institucional, Recharts, componentes genéricos tipo admin template): funcional pero no es lo que se pidió ("muy visual, huyendo del diseño de IA/genérico"). Se mantiene la dirección visual ya construida (bento, tipografía condensada/mono, paleta propia). Lo que se toma del JSX es el **contenido y la estructura de datos**, no el lenguaje visual.

## Decisión: un cliente ancla primero (FFCV), no multi-tenant

El JSX modela theming multi-federación (`THEMES`: FFCV, FCF, RFAF, RFEF). Se preguntó si esa es la visión real del producto o solo un recurso del prototipo para verse genérico — **decisión: FFCV como cliente único por ahora**. No se añade aislamiento por tenant/federación al modelo de datos ni theming configurable; se revisita si aparece una segunda federación interesada. Esto mantiene el modelo de datos de [data-model.md](./data-model.md) tal cual está (sin `federacion_id` en cada entidad) y la estrategia de venta enfocada en cerrar FFCV con la demo/piloto ya definidos en [demo-script.md](./demo-script.md).

## Ver también
- [product-vision.md](./product-vision.md)
- [kpis.md](./kpis.md)
- [data-model.md](./data-model.md)
