# Modelo de datos — MVP

## Principio de arquitectura: adaptadores de datos
La lógica de negocio (motor de asignación, fichas, dashboard) no debe hablar directamente con Novanet o FFCV. Debe hablar con una interfaz propia por dominio (`DesignacionesProvider`, `ClasificacionesProvider`, `SancionesProvider`). Hoy la implementa un `MockProvider` (calendario, equipos, clasificaciones, simulados con datos públicos reales de FFCV) y un `CSVProvider` (árbitros, evaluaciones — dato propio del comité, real desde el día 1). El día que haya acceso real a Novanet/FFCV, se implementa `NovanetProvider`/`FFCVProvider` cumpliendo la misma interfaz, sin tocar el algoritmo ni las pantallas.

| Dato | Origen hoy | Origen futuro |
|---|---|---|
| Calendario, equipos, sedes | Mock (basado en datos públicos FFCV) | Novanet/FFCV real |
| Clasificaciones/tabla | Mock (datos públicos FFCV) | FFCV real |
| Designaciones históricas | Mock | Novanet real |
| Tarjetas/incidencias por equipo | Mock | Novanet/FFCV real |
| Maestro de árbitros | CSV (real, propio del comité) | Igual, o sincronizado con Novanet |
| Informes/evaluaciones (físico, teórico, observador) | CSV (real, propio del comité) | Igual — dato que no vive en Novanet |

## Entidades

**Arbitro** — id, nombre, licencia, categoría_actual, ubicación_base (lat/lon, aproximada — para el mapa/UX), codigo_postal (fuente real para cálculo de dieta, ver [tarifas.md](./tarifas.md)), termino_municipal, zona, estado (activo/inactivo/baja), contacto, altura, peso (ver Informe — el peso se registra por evaluación física, no como campo fijo aquí, ya que varía por temporada)

**Equipo** — id, nombre, categoría, competición, ubicación_sede (lat/lon), codigo_postal_sede

**Partido** — id, equipo_local_id, equipo_visitante_id, categoría, competición, jornada, fecha_hora, sede, estado (pendiente/asignado/confirmado/jugado/suspendido_antes_inicio/suspendido_1a_parte/suspendido_2a_parte/reanudado/cancelado — granularidad real por tarifa, ver [tarifas.md](./tarifas.md) sección 4), conflictividad_score (calculado)

**Designacion** — id, partido_id, arbitro_id, estado (sugerida/confirmada/cancelada), score_sugerido (json: breakdown distancia/confianza/conflictividad), confirmado_por, fecha_confirmacion, override (bool), override_motivo (enum + texto libre), categoria_tarifa (puede diferir de Partido.categoria por ascenso de tarifa, ver tarifas.md §3), recibo_base, dentro_termino_municipal (bool — determina dieta 0 sin más cálculo), dieta_aplicada, km_oficiales (del programa de distancias del Comité, fuente de verdad), coste_km_estimado (nuestro cálculo aproximado, etiquetado como tal en UI), coste_km_real (0,26€/km oficial, mínimo 4€, una vez liquidado), tarjetas_amarillas_mostradas, tarjetas_rojas_mostradas, nota_partido (opcional, distinta del Informe formal — ver [reference-analysis.md](./reference-analysis.md)), acta_ampliada (bool)

**Nota sobre bienestar vs. coste federación** (ver [tarifas.md](./tarifas.md) §1): dentro del término municipal la dieta es 0€ para cualquier árbitro candidato, así que minimizar distancia real ahí no reduce A.3 (ahorro económico) — es un KPI de bienestar/retención del árbitro, independiente y no sustituible por el económico. El motor de asignación debe tratarlos como dos señales separadas, no una sola "puntuación de coste".

**Veto** *(incompatibilidad formal — excluye, no penaliza; distinta de Incidencia/conflictividad de equipo)* — id, arbitro_id, equipo_id, tipo (territorialidad/disciplinaria/otro), motivo, fecha_alta, vigente_hasta (fecha o "permanente"), estado (activo/vencido/levantado)

**Informe** — id, arbitro_id, fecha, temporada, tipo (físico/teórico/observador), nota, sub_notas (json: control_partido, gestión_conflicto, condición_física...), observador_id, comentarios

**Anotacion** *(nota libre, distinta del Informe — ver [product-vision.md](./product-vision.md))* — id, arbitro_id, fecha, autor, texto, etiqueta (opcional: disciplinaria/positiva/seguimiento/logística). Sin nota numérica, no entra en el cálculo del score, pero es buscable y consultable en la ficha.

**ScoreArbitro** *(snapshot histórico, no un valor único mutable)* — id, arbitro_id, fecha_calculo, score_nivel, estado_forma, posición_ranking_categoria, componentes_aplicados (json con pesos usados)

**IdoneidadSituacional** — id, arbitro_id, contexto (alta_conflictividad/categoría_alta/playoff), n_partidos_similares, score, fiabilidad (baja si n<3)

**Alerta** — id, arbitro_id, tipo (caida_nota/fisico_bajo/inactividad/sobrecarga), fecha_generada, severidad, estado (activa/vista/resuelta)

**Incidencia** *(conflictividad de equipo)* — id, equipo_id, partido_id, tarjetas_amarillas, tarjetas_rojas, incidente_grave (bool)

**Clasificacion** *(snapshot de tabla)* — id, equipo_id, competición, jornada, posición, puntos, fecha_snapshot

**ImportBatch** — id, tipo_origen (mock/csv/futuro-novanet/futuro-ffcv), fecha, usuario, mapeo_columnas (json), registros_procesados, errores

## Relaciones clave
- Partido 1—N Designacion (histórico si hay overrides/cancelaciones; una activa a la vez)
- Arbitro 1—N Informe, Anotacion, ScoreArbitro (snapshots), Alerta, Veto
- Equipo 1—N Incidencia, Clasificacion (snapshots), Veto
- Arbitro 1—N IdoneidadSituacional (una por contexto)

## Filtro duro vs. score blando (importante, ver [reference-analysis.md](./reference-analysis.md))
El motor de asignación opera en dos fases, no una: primero **excluye** candidatos con `Veto` activo, indisponibilidad declarada o incompatibilidad de categoría (nunca aparecen en el ranking, no se les baja el score); después **ordena** a los candidatos restantes por B.1+B.3+A.5 (ver [kpis.md](./kpis.md)). Confundir exclusión con puntuación es un error de diseño fácil de cometer y difícil de justificar ante el comité si un árbitro vetado aparece "mal puntuado" en vez de simplemente ausente.

## Búsqueda y consultas
El **Arbitro** es la entidad de entrada de la aplicación: necesita índice de búsqueda por nombre, categoría, zona y estado (no se accede a una ficha "directo", se busca o se filtra — ver [product-vision.md](./product-vision.md)). Las consultas de ranking (Top 10 por categoría, Top 10 por rango de partidos — ver [kpis.md](./kpis.md) sección C) se resuelven combinando `Arbitro` + `ScoreArbitro` + `Designacion` (para acotar la ventana a los últimos N partidos confirmados), no solo por fecha de `Informe`.

## Ver también
- [product-vision.md](./product-vision.md) — por qué el CRM del árbitro es el centro, no el ahorro
- [demo-script.md](./demo-script.md) — guion de la demo que este modelo debe soportar
- [kpis.md](./kpis.md) — fórmulas y umbrales que alimentan ScoreArbitro, Alerta e IdoneidadSituacional
