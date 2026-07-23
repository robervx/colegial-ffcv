# KPIs — Gestión operativa y ficha de árbitro

Dos públicos distintos, misma base de datos (ver [data-model.md](./data-model.md)). El "nivel de confianza" del motor de asignación se calcula a partir de los mismos componentes que el ranking de ficha — nunca deben ser dos lógicas paralelas, o el comité verá incoherencias entre "el ranking dice que es el mejor" y "el sistema no lo recomienda".

## A. KPIs de gestión operativa (rol: administrativas que revisan/confirman)

Miden si el sistema de asignación funciona y si se está adoptando, no solo a los árbitros.

1. **Tasa de aceptación del top-1** = designaciones confirmadas sin cambio / total designaciones. Mide confianza real en el algoritmo.
2. **Tasa de override + motivo estructurado** (campo obligatorio: lesión no registrada, petición del árbitro, indisponibilidad de última hora, decisión política...). Es dataset de reentrenamiento: un motivo que se repite señala una variable que falta en el modelo.
3. **Ahorro realizado vs potencial vs baseline**:
   - Baseline: coste medio histórico de asignaciones manuales para ese tipo de partido
   - Potencial: coste de la recomendación #1 del sistema
   - Realizado: coste de lo finalmente confirmado (tras overrides)
   Es el KPI de ROI real que se reporta al comité. **Tarifa real, no estimada**: 0,26€/km (mínimo 4€) + dieta por banda de km fuera del término municipal (0€ dentro del término, sea cual sea la distancia) — ver [tarifas.md](./tarifas.md). Dentro del término el ahorro económico entre candidatos es siempre cero; ahí lo que se optimiza es bienestar del árbitro (distancia real), un KPI aparte, no una sub-partida de este.
4. **Lead time de designación**: antelación media con que se confirma cada partido (SLA operativo).
5. **Tasa de incidencias post-designación** (no-show, cancelación de última hora, sanción sobrevenida). Retroalimenta el "nivel de confianza" del árbitro — cancelar mucho penaliza el score aunque la nota técnica sea alta.
6. **Equidad de carga**: coeficiente de variación de partidos/árbitro en la temporada. Evita concentrar todo en pocos árbitros "de confianza" y detecta infrautilizados.

## B. KPIs de ficha de árbitro (ranking y matching)

### B.1 — Score de nivel general (para el Top 10 por categoría)
```
Score = 0.40·nota_evaluaciones + 0.20·prueba_física + 0.20·prueba_teórica + 0.20·consistencia
      − penalización(cancelaciones/incidencias)
```
Pesos configurables por el comité; punto de partida 40/20/20/20.

**Shrinkage bayesiano** (crítico con solo 4-5 informes/temporada): con pocos informes acumulados, mezclar con la media de la categoría para evitar que un solo informe dispare el ranking.
- 1-2 informes: 50% propio / 50% media de categoría
- 3 informes: 70% propio / 30% media de categoría
- 4+ informes: 100% propio

### B.2 — Estado de forma (tendencia, no nivel)
Media móvil ponderada: últimos 2 informes al 60%, resto del histórico al 40%. Compara mejora/declive, no el nivel absoluto — un árbitro puede tener nivel medio-alto con tendencia descendente, o nivel medio con tendencia ascendente; son decisiones distintas.

### B.3 — Idoneidad situacional / matching score
Distinto de B.1: no es "quién es el mejor en general" sino "quién ha rendido mejor en partidos parecidos a este" (conflictividad, categoría, si es decisivo/playoff). Solo se considera fiable con **≥3 partidos de contexto similar**; si no hay suficiente muestra, cae automáticamente al score general (B.1) — no debe inventarse confianza donde no hay datos.

### B.4 — Alertas automáticas
- Caída de nota ≥1,5 puntos (sobre 10) en 2 informes consecutivos
- Prueba física por debajo del mínimo de su categoría (umbral definido por el comité, no universal)
- Inactividad >4 semanas en temporada activa
- Sobrecarga: >130% de la media de partidos de su categoría

### B.5 — Disciplina del árbitro (dato descriptivo, no de puntuación)
Tarjetas amarillas/rojas mostradas por el árbitro en sus partidos (media por encuentro, comparada con la media de su categoría). **No entra en B.1 ni en ningún score** — un árbitro que muestra más tarjetas no es automáticamente peor (puede estar dirigiendo partidos más conflictivos, o gestionando mejor la disciplina). Es información de contexto para la ficha y para interpretar B.3, nunca un criterio de clasificación por sí solo. Ver principio de gobernanza al final de este documento.

## C. Consultas analíticas (capacidad transversal del CRM, no un dashboard fijo)

Esto es, junto a la ficha en sí, el corazón del producto — ver [product-vision.md](./product-vision.md). El ahorro económico (sección A.3) es el argumento comercial más fuerte de cara al comité, pero no es el centro: el centro es poder preguntar cosas sobre los árbitros con datos estructurados. El motor de asignación consume estos datos, no al revés.

### C.1 — Top 10 por categoría (temporada completa)
Es B.1 aplicado como ranking filtrable por categoría/zona. Consulta más simple: ordenar `ScoreArbitro` vigente por categoría.

### C.2 — Top 10 por rango de partidos (nuevo, distinto de C.1)
No usa la temporada como ventana, sino los **últimos N partidos pitados** de cada árbitro (ej. N=10), independientemente de cuándo entraron esos partidos en el calendario. Responde a "quién está mejor ahora mismo" en vez de "quién ha sido mejor de media esta temporada" — un árbitro con pocos partidos recientes pero muy buenos puede subir aquí aunque su B.1 de temporada sea menor.
- Requiere que cada `Designacion` confirmada lleve asociada la nota del informe de ese partido si existe, para poder promediar por ventana de partidos y no solo por fecha de informe (ver [data-model.md](./data-model.md)).
- Mismo umbral de fiabilidad que B.3: con menos de 3 partidos en la ventana, no se debe mostrar como ranking fiable.

### C.3 — Filtros combinables
Categoría, zona, rango de fechas o de partidos, tipo de informe, presencia de alertas activas, texto libre (para buscar por anotaciones). Debe ser explorable libremente por el comité, no solo mostrado como lista fija.

## Conexión con el motor de asignación
El motor opera en **dos fases, no una** (ver [data-model.md](./data-model.md) y [reference-analysis.md](./reference-analysis.md)):
1. **Filtro duro (exclusión)**: `Veto` activo con ese equipo, indisponibilidad declarada, incompatibilidad de categoría. Un candidato excluido no aparece en el ranking — no se le baja el score, se le quita de la lista. Mostrar "vetado" con un score bajo es confuso y difícil de justificar ante el comité.
2. **Score blando (ranking)**: sobre los candidatos no excluidos, nivel de confianza = B.1 + B.3 + fiabilidad operativa (A.5). Comparten campos y cálculo con el ranking de ficha.

## Principio de gobernanza (no confundir gestión con clasificación)
La disponibilidad declarada y los kilómetros recorridos **no puntúan** — son datos de gestión (sirven para calcular coste y logística), nunca criterio de B.1/clasificación. Del mismo modo, la disciplina (B.5) es descriptiva, no evaluativa. Esta distinción debe ser explícita en la interfaz (copy literal, no solo lógica interna) para que el comité confíe en que el ranking mide lo que dice medir.

## Notas de usabilidad (flujo administrativas)
- Un clic para aceptar el top-1 recomendado; override con motivo obligatorio (nunca opcional, o se pierde el dato de A.2)
- Visibilidad de su propio impacto (ahorro conseguido esta semana) para favorecer adopción
- Alertas de B.4 agrupadas en un digest diario/semanal, no en tiempo real, para no generar fatiga de notificaciones

## Nota sobre agentes/jobs programados (fase posterior)
Tras cada informe nuevo o cierre de jornada, un job programado puede recalcular B.1-B.3, generar alertas B.4, y escribir un insight en lenguaje natural por árbitro/categoría. Pendiente de construir una vez el modelo de datos esté implementado — estas métricas son el contrato de datos que esos agentes consumirán.
