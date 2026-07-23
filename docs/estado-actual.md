# Estado actual del proyecto — 22 jul 2026

Fotografía de lo construido hasta hoy. Si vuelves a esta conversación más tarde, o alguien nuevo se incorpora, empieza por aquí — es más fiable que reconstruir la historia leyendo el chat.

## 1. Qué es Colegial hoy, en una frase

Una app Next.js real (no un mockup suelto) que corre en `webapp/`, con un dashboard, un buscador de árbitros con ficha completa, y un motor de designación por jornada que ya calcula filtro duro, score con shrinkage bayesiano y coste real — todo sobre 200 árbitros que mezclan identidad y carga **real** (scraping público FFCV) con evaluaciones **sintéticas** (porque ese dato no existe en ningún sitio todavía).

## 2. Cómo llegamos hasta aquí (orden cronológico de las decisiones grandes)

1. **Auditoría inicial**: se detectaron dos generaciones de documentos de producto contradictorias (11 jul vs 21-22 jul) — multi-tenant vs FFCV único, asignación en v1 vs v2, rankings sí/no, estilo visual. Resueltas en `decisiones-producto.md` §1-4.
2. **Tarifas reales**: se leyeron las circulares oficiales de la FFCV (`docs/tarifas.md`) — confirmó la regla de término municipal ("sin dieta dentro del término") y dio la cifra real de kilometraje (0,26€/km).
3. **Scaffold real**: se montó `webapp/` (Next.js 16, Tailwind, Recharts) y se verificó visualmente el prototipo.
4. **Reestructuración de navegación**: Dashboard (nuevo, landing) · Árbitros (antes Expedientes) · Designación (nuevo, motor real) · Recomendaciones/Económico/IA (vistas previas bloqueadas, sin tocar). Sidebar limpiado: sin selector de territorial, sin "Cargar histórico".
5. **Dataset de 200 árbitros**: identidad y carga real de `partidos_2025_2026.csv`, capa sintética encima para lo que no existe. Taxonomía de categoría corregida a la real de la FFCV (Tercera Federación > Lliga Comunitat > Primera FFCV > Segona FFCV > Tercera FFCV).
6. **Geolocalización**: 45 localidades reales (municipios + barrios de Valencia capital), con resolución correcta de término municipal incluso a nivel de barrio (Torrefiel → município València).
7. **Score B.1 con shrinkage bayesiano**: implementado de verdad contra la fórmula de `kpis.md`, sustituyendo un cálculo anterior que leía campos inexistentes y no diferenciaba candidatos.
8. **Pipeline de designación por jornada**: historial real de partidos en la ficha, toggle de categorías inferiores, motor de lote con reglas de "una categoría propia + un extra" y detección de conflictos, flujo de revisión humana con alternativas.

## 3. Inventario de datos: qué es real y qué es sintético

| Dato | Estado | Fuente |
|---|---|---|
| Identidad de árbitro (nombre) | **Real** | `partidos_2025_2026.csv` (1.946 árbitros únicos con designación pública) |
| Carga de partidos 25/26 | **Real** | idem |
| Categoría principal | **Real** (competición más frecuente) | idem |
| Historial de últimos 15 partidos (fecha/rivales/resultado) | **Real** | idem |
| Equipos, campos, calendario, resultados | **Real** | idem + `ffcv_public_data/` (scraping en curso) |
| Localidades geocodificadas (lat/lon/término municipal) | **Real** (45 de ellas) | Nominatim/OSM |
| Tarifas, dietas, kilometraje, reglas de término municipal | **Real** | Circulares oficiales FFCV (`tarifas.md`) |
| Licencia, localidad de residencia, edad, temporadas | Sintético | generado, no existe públicamente |
| Informes/notas/evaluaciones, forma, físico, técnica | Sintético | no existe en ningún sitio hasta tener export del comité |
| Vetos, disponibilidad declarada, `disponibleCategoriasInferiores` | Sintético | idem |
| Tarjetas/goles por partido (B.5, granularidad fina) | Parcial/real pero muy incompleto | `scrape_ffcv_public.py` procesó ~60 de 96.385 partidos, sigue corriendo bajo demanda |

## 4. Arquitectura técnica

```
Referee_Management/
├── partidos_2025_2026.csv          # 96.385 partidos, fuente real principal
├── ffcv_public_data/                # scraping granular por partido (en curso, incompleto)
├── generar_dataset_arbitros.py      # produce webapp/data/arbitros-*.json
├── generar_jornadas.py              # produce webapp/data/ciclos-asignacion.json
├── geocode_localidades.py           # produce webapp/data/localidades-geo.json
├── geocode_campos.py                # geolocalización de campos por nombre — bajo rendimiento, ver §5
├── docs/                            # toda la documentación de producto
└── webapp/                          # la app real
    ├── components/CRMExpedientes.jsx  # 990 líneas, todas las páginas
    ├── lib/motorAsignacion.js         # filtro duro, score B.1, coste (200 líneas)
    ├── lib/asignarJornada.js          # motor de lote por jornada (104 líneas)
    └── data/*.json                    # todo el dato de trabajo, generado por los scripts .py
```

**No hay backend.** Todo el dato vive en ficheros JSON generados por scripts de Python y importados estáticamente por el componente React. No hay Supabase, no hay base de datos, no hay autenticación, no hay persistencia de cambios (el botón "Guardar nota" de la ficha es estado local de React — se pierde al refrescar la página). Esto es la limitación estructural más importante para lo que viene después.

## 5. Limitaciones conocidas (explícitas, no ocultas)

- **Sin backend/persistencia real** — todo se pierde al recargar.
- **Sin dato real de evaluaciones** — el bloqueante original de todo el proyecto sigue sin resolverse; se necesita un export del comité.
- **B.3 (idoneidad situacional) y A.5 (fiabilidad operativa)** no implementados — faltan datos granulares por partido que no existen para los 200 de trabajo.
- **Asignación por jornada es greedy, no óptima** — procesa categoría por categoría, no resuelve el problema de asignación global (algoritmo húngaro) que sería lo correcto con más volumen.
- **`consistencia()` en el score es una heurística propia**, no una fórmula acordada con el comité.
- **Ambigüedad sin resolver en `kpis.md`**: la penalización por "incidencias" de B.1 vs. el principio de gobernanza de B.5 (disciplina no puntúa) — probablemente hablan de cosas distintas pero el documento no lo distingue con claridad.
- **Geolocalización de campos por nombre de instalación tiene rendimiento bajo** (`geocode_campos.py`, ~982/1.679 procesados, mayoría "no encontrado") — la alternativa mejor (`scrape_directorio_equipos.py`, direcciones reales de club) existe pero no se ha ejecutado.
- **Sin estados vacío/carga/error** — pendiente desde la guía de frontend original, sección 4.
- **Bug de responsive** entre ~550-900px de ancho — sidebar y grid de KPIs se desbordan.
- **Sin virtualización de listas** — 200 filas van bien, 1.800 (el volumen real de la FFCV) no se ha probado.
- **Nombre del producto ("Colegial")** sigue siendo un placeholder, no una decisión cerrada.

## Ver también
- [decisiones-producto.md](./decisiones-producto.md) — el detalle y el porqué de cada decisión, en orden cronológico (11 secciones)
- [sprints.md](./sprints.md) — plan de trabajo a partir de aquí
- [data-model.md](./data-model.md), [kpis.md](./kpis.md), [tarifas.md](./tarifas.md)
