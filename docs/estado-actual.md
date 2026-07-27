# Estado actual del proyecto — 27 jul 2026

Fotografía de lo construido hasta hoy. Si vuelves a esta conversación más tarde, o alguien nuevo se incorpora, empieza por aquí — es más fiable que reconstruir la historia leyendo el chat.

**Punto exacto en el que se dejó esta sesión (27 jul 2026):** dos specs cerradas y commiteadas en `main` (rama por spec + merge, según la constitución):

1. `specs/001-dashboard-operativo/` — completada de punta a punta: spec → plan → tasks → implementación de las 20 tareas. El Dashboard tiene un panel de cobertura por categoría (riesgo/ajustado/holgada, desglose propia/inferior, ver `decisiones-producto.md` §16) y un panel de partidos del fin de semana filtrable. Nuevos `lib/categorias.js`, `lib/disponibilidad.js`, `lib/coberturaCategoria.js`, con Vitest como primer test runner del proyecto (13 tests en verde). `npm run lint` sin errores.
2. `specs/002-disponibilidad-arbitro/` — **spec + plan técnico completos y commiteados; implementación bloqueada**. Selector de disponibilidad por ciclo con log de registro (lesión/baja justificada/urgencia/solo categoría propia/festivo con 15 días de antelación), doble propósito operativo (sustituye la disponibilidad sintética de `lib/disponibilidad.js`) y evaluativo (patrón de implicación visible solo para comité/evaluador, nunca como entrada de `scoreB1`). Dos decisiones tomadas al especificar: visibilidad por rol con un selector "ver como: árbitro / comité" sin login real (FR-012); **implementación bloqueada hasta que exista persistencia real (Sprint 1 de `sprints.md`)** — el log es un registro de auditoría, no tiene sentido como estado local de React (Principio VII). El plan (`research.md`, `data-model.md`, `contracts/disponibilidad-repo.md`, `quickstart.md`) ya está hecho: contrato de repositorio agnóstico a la tecnología, y tres piezas de lógica pura que sí son construibles ya sin esperar a Sprint 1 (`lib/reglaFestivo.js`, `lib/patronImplicacion.js`, repositorio-stub) — no implementadas todavía, solo diseñadas. `/speckit-tasks` no se ha generado.

**Siguiente paso si se retoma aquí**: decidir entre (a) construir ya las 3 piezas de lógica pura de 002 que no dependen de persistencia (`lib/reglaFestivo.js`, `lib/patronImplicacion.js`, `lib/disponibilidadRepo.js` como stub) con `/speckit-tasks` acotado a eso, (b) abordar Sprint 1 (backend/persistencia real) para desbloquear 002 del todo, o (c) seguir el orden ya acordado de próximos módulos de dashboard/consulta que no necesitan persistencia nueva: Equipos → Partidos → Simulaciones → Económico (ver conversación del 24 jul; análisis de datos real ya hecho para justificar cada uno).

**Antes de eso**: se completó el scraping público (`ffcv_public_data/`, 25.256 partidos con árbitro, tarjetas y goles reales) y se volcó al dataset de trabajo — tarjetas ya reales, ficha de árbitro ampliada (contacto, plantillas de email, pruebas físicas, ventana de KPIs), logo real. Detalle completo en §6 más abajo.

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
| Identidad de árbitro (nombre) + **ID estable (`cod_arbitro`)** | **Real** | `ffcv_public_data/` (web pública `ffcv.es/competiciones`, sin login) — sustituye el cruce por nombre en texto de `partidos_2025_2026.csv` |
| Carga de partidos 25/26 (categorías adultas) | **Real** | idem |
| Categoría principal | **Real** (competición más frecuente, ladder fútbol-11 masculino) | idem |
| Historial de últimos 15 partidos (fecha/rivales/resultado) | **Real** | idem |
| **Tarjetas amarillas/rojas mostradas, temporada 25/26** | **Real** (B.5, kpis.md) | `ffcv_public_data/tarjetas_partido.csv` — 105.045 tarjetas en 25.256 partidos. Temporadas 23/24 y 24/25 siguen estimadas (se podrían hacer reales relanzando el scraper con `--season 20`/`19`) |
| Goles por partido (jugador, minuto) | **Real**, no usado todavía en la UI | idem, `goles_partido.csv` |
| Equipos, campos, calendario, resultados | **Real** | `ffcv_public_data/` (25.256 partidos, categorías adultas — la web pública no incluye fútbol base) |
| Localidades geocodificadas (lat/lon/término municipal) | **Real** (45 de ellas) | Nominatim/OSM |
| Tarifas, dietas, kilometraje, reglas de término municipal | **Real** | Circulares oficiales FFCV (`tarifas.md`) |
| Licencia, localidad de residencia, edad, temporadas | Sintético | generado, no existe públicamente |
| **Contacto (teléfono, email)** | Sintético | generado — patrón `nombre.apellido@arbitrosffcv.es` |
| **Altura (fija), peso (por convocatoria)** | Sintético | generado |
| **Pruebas físicas y examen teórico (2/temporada, nota+comentario)** | Sintético | generado |
| Informes de observador (`forma[]`), físico/técnica/gestión del radar | Sintético | no existe en ningún sitio hasta tener export del comité |
| Anotaciones de seguimiento (comité) y de informadores | Sintético | generado, con etiqueta positiva/mejora/seguimiento/disciplinaria |
| Vetos, disponibilidad declarada, `disponibleCategoriasInferiores` | Sintético | idem |

## 4. Arquitectura técnica

```
Referee_Management/
├── partidos_2025_2026.csv          # 96.385 partidos (intranet, incl. fútbol base) — ya no es la fuente principal del dataset de árbitros
├── ffcv_public_data/                # scraping público completo: 25.256 partidos, arbitros_partido.csv, tarjetas_partido.csv, goles_partido.csv
├── scrape_ffcv_public.py            # genera ffcv_public_data/ (rate-limited, reanudable)
├── generar_dataset_arbitros.py      # produce webapp/data/arbitros-*.json — ahora desde ffcv_public_data/
├── generar_agregados.py             # produce webapp/data/agregados-reales.json (nuevo, 23 jul)
├── generar_jornadas.py              # produce webapp/data/ciclos-asignacion.json
├── geocode_localidades.py           # produce webapp/data/localidades-geo.json
├── geocode_campos.py                # geolocalización de campos por nombre — bajo rendimiento, ver §5
├── docs/                            # toda la documentación de producto
│   └── assets/logo.png              # logo real FFCV -> copiado a webapp/public/logo-ffcv.png
└── webapp/                          # la app real
    ├── components/CRMExpedientes.jsx  # ~1080 líneas, todas las páginas
    ├── lib/motorAsignacion.js         # filtro duro, score B.1, coste (200 líneas)
    ├── lib/asignarJornada.js          # motor de lote por jornada (104 líneas)
    ├── public/logo-ffcv.png           # logo real, usado por el componente Escudo
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
- **Domicilio del árbitro sigue siendo sintético a propósito** — decisión explícita del 23 jul: no se toca hasta tener el roster real del comité (localidad elegida al azar entre las 45 geocodificadas).
- **Contacto (teléfono/email), altura/peso, pruebas físicas/teóricas y plantillas de email son sintéticos** (añadidos 23 jul) — ver `decisiones-producto.md` §13. El `mailto:` nunca envía automáticamente, siempre lo revisa y lo lanza una persona.
- **Tarjetas reales solo cubren la temporada 2025/26** — 2023/24 y 2024/25 siguen estimadas; backfill posible relanzando `scrape_ffcv_public.py --season 20`/`19`, no hecho todavía.
- **Sin estados vacío/carga/error** — pendiente desde la guía de frontend original, sección 4.
- **Bug de responsive** entre ~550-900px de ancho — sidebar y grid de KPIs se desbordan.
- **Sin virtualización de listas** — 200 filas van bien, 1.800 (el volumen real de la FFCV) no se ha probado.
- **Nombre del producto ("Colegial")** sigue siendo un placeholder, no una decisión cerrada.

## 6. Qué cambió el 23 jul 2026 (sesión de scraping + ficha de árbitro)

Resumen ejecutivo — detalle completo en `decisiones-producto.md` §12-14:

1. **Scraping público terminado**: `ffcv_public_data/` pasó de ~60 partidos (dato parcial mencionado en la foto del 22 jul) a **25.256 partidos completos** de todas las categorías adultas, con árbitro (ID + nombre), tarjetas y goles reales. Esto era el primer punto del Sprint 3 de `sprints.md` — **ya hecho**, no pendiente.
2. **`generar_dataset_arbitros.py` migrado** a esa fuente: tarjetas 25/26 reales (antes inventadas), `cod_arbitro` como ID estable.
3. **`generar_agregados.py` (nuevo)**: el Dashboard ya no depende de un cálculo hecho a mano, hay script reproducible.
4. **Ficha de árbitro ampliada**: contacto visible + plantillas de email (mailto, revisión humana obligatoria), pruebas físicas/teóricas sintéticas con nota+comentario, altura/peso, anotaciones de informadores distinguibles de las del comité, ventana de últimos 5/10/todos los partidos con resumen de disciplina real.
5. **Logo real de la FFCV** integrado (sustituye el placeholder de siglas).
6. Verificado visualmente en el navegador (servidor de desarrollo en `:3001`) sin errores de consola.

**No se tocó**: backend/persistencia (sigue sin existir, Sprint 1 sigue siendo el siguiente paso estructural), motor de asignación (sigue igual que el 22 jul), geolocalización de árbitros (sigue sintética, a propósito).

## Ver también
- [decisiones-producto.md](./decisiones-producto.md) — el detalle y el porqué de cada decisión, en orden cronológico (14 secciones)
- [sprints.md](./sprints.md) — plan de trabajo a partir de aquí
- [data-model.md](./data-model.md), [kpis.md](./kpis.md), [tarifas.md](./tarifas.md)
