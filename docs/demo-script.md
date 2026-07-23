# Guion de demo — CRM de asignación inteligente de árbitros

## Objetivo
Que el comité de árbitros vea el ahorro y el control que ganan, y salga de la reunión dispuesto a:
1. Darnos acceso (o exportación periódica) a datos reales de Novanet, o
2. Aprobar un piloto con una sola categoría, usando datos que ellos mismos faciliten por CSV.

**Duración:** 15-18 min de demo + ~10 min de preguntas.
**Público:** responsable(s) del comité que deciden designaciones hoy.

**Narrativa:** dolor actual → control (fichas) → momento "wow" (motor de asignación con ahorro visible) → alerta inteligente (conflictividad) → impacto agregado (€) → cierre con ask claro.

Importante: para esta demo, los datos de calendario/equipos/clasificaciones son **simulados (mock)** basados en datos públicos reales de la FFCV para dar credibilidad, y la parte de árbitros/evaluaciones se carga por **CSV** (dato propio del comité). Ver [data-model.md](./data-model.md) para el detalle de qué es mock, CSV o futuro (Novanet/FFCV real).

---

## Paso 0 — Apertura (1 min, sin app)
**Decir, no mostrar:** "Hoy las designaciones se hacen a mano en Novanet, sin visibilidad de kilometraje ni de la forma reciente del árbitro. Vamos a enseñaros cómo esto se puede automatizar sin que perdáis el control de la decisión final."
No enseñar la app todavía — establecer el dolor antes de la solución.

## Paso 1 — Dashboard del comité (2 min)
**Pantalla:** vista general con nº de árbitros activos, partidos de la jornada pendientes de asignar, y un dato grande destacado: **ahorro estimado del mes (€)**.
**Mensaje clave:** "Esto es lo primero que veríais al entrar cada semana."
**Por qué aquí primero:** el número de ahorro engancha desde el minuto 1 y ancla la conversación en dinero.

## Paso 2 — Ficha de árbitro (3 min)
**Pantalla:** ficha de un árbitro concreto ("estrella" para la demo: notas en subida, últimos informes positivos).
**Mostrar:** nota media, gráfico de evolución de estado de forma (tendencia), resultados de pruebas físicas/teóricas, histórico de partidos pitados, trayectoria de categoría.
**Mensaje clave:** "Toda la trayectoria de un árbitro en un sitio, algo que hoy no existe centralizado."

## Paso 3 — Partidos pendientes de asignar (1 min)
**Pantalla:** lista/calendario de la próxima jornada con partidos sin designar.
**Mensaje clave:** transición natural hacia "vamos a asignar uno en directo".

## Paso 4 — Momento estrella: motor de asignación (5 min)
**Pantalla:** clic en un partido → ranking de árbitros recomendados con **score explicado** (no caja negra): distancia/coste estimado, nivel de confianza, disponibilidad.
**Caso preparado:** el árbitro recomendado ahorra visiblemente frente al que se habría asignado "a mano" (ej. "12 km vs 45 km → ahorro de X € en este único partido").
**Mensaje clave:** "Vosotros seguís decidiendo, el sistema solo os ahorra el cálculo y os avisa de lo que no veríais a simple vista."

## Paso 5 — Caso de alerta / conflictividad (2 min)
**Pantalla:** partido entre dos equipos con histórico de tarjetas alto.
**Mostrar:** el sistema penaliza en el ranking a árbitros con poca experiencia y recomienda uno de mayor nivel de confianza.
**Mensaje clave:** "No solo ahorra dinero, también reduce el riesgo de mandar al árbitro equivocado a un partido delicado."

## Paso 6 — Impacto agregado (2 min)
**Pantalla:** volver al dashboard, con proyección: "si esto se aplica a toda la temporada, el ahorro estimado es de Y €."
**Mensaje clave:** cierre en términos de ROI anual.

## Paso 7 — Cierre y ask (2 min, sin app)
**Ser transparente:** "Lo que habéis visto usa datos de ejemplo/importados por CSV para la demo. El siguiente paso natural es conectar esto con vuestros datos reales de Novanet y FFCV."
**Ask concreto (elegir uno):**
1. Acceso/exportación periódica a datos reales de Novanet para un piloto en una categoría.
2. Luz verde para el piloto con datos que ellos mismos faciliten por CSV mientras se gestiona el acceso.

---

## Checklist de preparación de datos para que el guion funcione
- 1 árbitro "estrella" con ficha completa y tendencia positiva
- 1 jornada con 4-6 partidos, uno con equipos de alta conflictividad
- Calendario/equipos reales de una categoría FFCV pública (credibilidad)
- 1 caso de ahorro de distancia bien calculado y verificable (no puede fallar en directo)
- Dashboard de ahorro agregado con proyección anual
