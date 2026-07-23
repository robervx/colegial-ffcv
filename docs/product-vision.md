# Visión de producto — qué es realmente este CRM

## Principio central
Este es, ante todo, **un CRM de árbitros**: una ficha por árbitro con datos estructurados (informes formales + anotaciones libres) que permite hacer consultas y análisis para tomar decisiones sobre ellos. La asignación inteligente de partidos y el ahorro de kilometraje son la **funcionalidad más potente de cara a vender el proyecto**, pero no son el centro del producto — son un consumidor más de los datos de la ficha, no al revés.

**Por qué importa esta distinción:** si el producto se diseña "desde el ahorro hacia fuera", se acaba construyendo solo una calculadora de asignación con algo de ficha alrededor. Si se diseña "desde la ficha del árbitro hacia fuera", el ahorro sigue existiendo como feature de venta, pero además queda una base de datos real y consultable que sostiene decisiones de comité (ascensos, seguimiento, detección de problemas) mucho más allá de asignar partidos.

**Cómo aplicarlo:**
- La navegación principal debe tener "Árbitros" (búsqueda + ficha) como superficie primera, no el dashboard de ahorro.
- Toda pantalla de asignación o dashboard de ahorro debe leer datos de la ficha (informes, anotaciones, score), nunca al revés.
- Cualquier decisión de priorización de desarrollo debe favorecer la estructura de datos del árbitro (informes, anotaciones, consultas) sobre pulir más el motor de asignación, si hay que elegir.

## Navegación: dos pilares, no cuatro pestañas planas
La primera versión visual tenía 4 pestañas (Dashboard, Árbitros, Consultas, Asignación) que se solapaban conceptualmente. Se simplificó a 2 pilares, cada uno con su propio "Resumen" que justifica decisiones en ese ámbito:
- **Árbitros** — Resumen (ranking por categoría/rango de partidos + alertas de rendimiento individual) y Directorio (búsqueda → ficha). Todo lo que justifica decisiones *sobre una persona*.
- **Asignación** — Resumen (ahorro, equidad de carga, alertas de sobrecarga) y Partidos pendientes (cola → candidatos). Todo lo que justifica decisiones *sobre el reparto de partidos*.

La antigua "Consultas" vive ahora dentro de Árbitros > Resumen; el antiguo "Dashboard" se repartió entre ambos según si la métrica es de rendimiento individual o de reparto/coste operativo.

## Búsqueda de árbitros (requisito explícito)
La ficha de árbitro no se abre "directo" — el punto de entrada es un **directorio buscable**: buscar por nombre, filtrar por categoría/zona/estado, y desde ahí entrar a la ficha individual. Es el flujo real de uso (una administrativa raramente sabe el ID del árbitro, busca por nombre o filtra por categoría).

## Anotaciones vs. Informes (dos cosas distintas, no fusionar)
- **Informe**: evaluación formal y puntuada (física, teórica, observador), 4-5 por temporada, alimenta el score (ver [kpis.md](./kpis.md)).
- **Anotación**: nota libre, sin nota numérica, tan frecuente como haga falta (ej. "pidió cambiar de zona", "queja de un club", "buena actitud en la charla técnica"). Es contexto cualitativo para el comité, no entra en el cálculo del score pero sí debe ser consultable y buscable.

Ambas viven en la ficha, en secciones visualmente separadas.

## Consultas / analítica (capacidad transversal, no solo un dashboard fijo)
El valor real del CRM es poder preguntar cosas como:
- "Los 10 mejores árbitros de la categoría Preferent"
- "Los 10 mejores en su último rango de partidos" (ventana móvil de los últimos N partidos, no la temporada completa — permite ver quién está mejor *ahora mismo*, no solo históricamente)

Esto debe poder explorarse libremente con filtros combinables (categoría, zona, rango de fechas o de partidos, presencia de alertas), no solo mostrarse como una lista fija en el dashboard. Ver detalle de fórmulas en [kpis.md](./kpis.md), sección C.

## Ver también
- [demo-script.md](./demo-script.md)
- [kpis.md](./kpis.md)
- [data-model.md](./data-model.md)
