# Decisiones de producto — Sprint 0 (22 jul 2026)

Este documento resuelve las contradicciones detectadas entre dos generaciones de documentación:
- **11 jul 2026**: `product-vision.md`, `data-model.md`, `kpis.md`, `demo-script.md`, `reference-analysis.md` (analiza `reference/crm-arbitral_1.jsx`).
- **21-22 jul 2026**: `CLAUDE-frontend.md`, `colegial-frontend-guia.md`, `crm-expedientes.jsx`, `colegial-theme.js` (usan "Colegial" como nombre de trabajo).

La segunda generación se escribió sin referenciar la primera, y varias decisiones quedaron en conflicto directo. Esto fija cuál rige. **Este documento manda sobre cualquiera de los anteriores en los puntos donde entren en conflicto.**

**Nota sobre el nombre:** "Colegial" es el nombre de trabajo usado en los documentos del 21-22 jul, pero **no es una decisión de producto cerrada** — no se ha discutido ni fijado formalmente. Se mantiene como placeholder en código y documentación hasta que se decida un nombre definitivo; no debe leerse como algo resuelto.

## 1. Alcance de cliente: FFCV único, no multi-tenant

**Decisión:** se mantiene lo que ya había fijado `reference-analysis.md` el 11 jul. Colegial se construye y se vende para FFCV como cliente único. No se añade `federacion_id`/aislamiento por tenant al modelo de datos de `data-model.md`.

**Qué pasa con `colegial-theme.js` y sus temas FCF/RFAF:** se conservan en el fichero de tokens (no cuesta nada mantenerlos escritos), pero:
- No se construye selector de territorial en la UI real de producción. El que existe en `crm-expedientes.jsx` (sidebar, bloque "Territorial") es utilería de prototipo para mostrar escalabilidad a futuros interesados, no una pantalla que se lleve a producción en v1.
- La tabla `federaciones` con `tema_json` mencionada en `colegial-theme.js` queda como diseño para *cuando* aparezca un segundo cliente, no como requisito de v1.
- Se revisita esta decisión si aparece una segunda federación interesada en firmar.

## 2. Motor de asignación: diferido a v2

**Decisión:** se mantiene el criterio de `colegial-frontend-guia.md`. v1 es solo expedientes (fichas, semáforo, radar, notas de seguimiento, carga de histórico). El motor de asignación (`Recomendaciones`), lo económico y la IA quedan como vista previa bloqueada (`BannerV2`).

**Reconciliación con `demo-script.md`:** el guion de venta original pedía enseñar el motor de asignación como "momento wow" ya funcionando. Se mantiene el guion pero se reescribe el cierre (Paso 6-7) como **roadmap de dos fases**: "esto que veis hoy son los expedientes con datos reales del comité; el motor de asignación con el ahorro de kilometraje es la fase siguiente, y aquí tenéis la vista previa de cómo se ve." No se simula el motor de asignación como si estuviera terminado.

## 3. Rankings sí, comparación directa no

**Decisión:** se permiten listados ordenados por score (Top 10 por categoría, Top 10 por rango de partidos — `kpis.md` C.1/C.2) como **consulta/tabla**. Se mantiene prohibida la **comparación cara a cara** entre dos árbitros concretos: nunca se pintan dos radares superpuestos, nunca se muestran dos fichas lado a lado con un "vs.".

**Regla operativa para frontend:** un listado ordenado por `ScoreArbitro` con filtros (categoría, zona, ventana de partidos) es una pantalla válida. Un componente que reciba dos `arbitro_id` y pinte ambos radares en el mismo `RadarChart` no se construye.

Esto sustituye la redacción de `colegial-frontend-guia.md` sección 1, punto "Ninguna comparación directa entre árbitros (radares superpuestos, rankings visuales)" — el término "rankings visuales" ahí era demasiado amplio; queda acotado a lo anterior.

## 4. Estilo visual: se confirma el de `colegial-theme.js` / `crm-expedientes.jsx`

**Decisión:** el pivote institucional (sidebar de color de marca, Recharts, serif+mono, radio 6px/4px) es deliberado y gusta. `reference-analysis.md` había rechazado explícitamente este lenguaje visual ("SaaS corporativo genérico") el 11 jul — esa sección queda **superada**, no vigente. No se rehace visualmente nada de `crm-expedientes.jsx` por ese motivo.

## 5. Qué se archiva

- `reference/crm-arbitral_1.jsx` → movido a `archive/reference/`. Su contenido ya fue extraído a `data-model.md` (Veto, disciplina B.5, copy de gobernanza, granularidad por partido en Designación); el fichero en sí no aporta nada adicional y su estilo visual ya no es el que se sigue.
- `docs/reference-analysis.md` → se conserva sin modificar como registro histórico de por qué se tomaron esas decisiones el 11 jul, pero queda marcado como **parcialmente superado** por este documento en los puntos 1 y 4 de aquí arriba.

## 6. Pendiente de verificar antes de Sprint 1

- Confirmar si el backend Supabase mencionado en `CLAUDE-frontend.md` existe ya en algún proyecto/repo, o si hay que levantarlo desde cero.
- Conseguir una primera exportación CSV real del comité (aunque sea de pocos árbitros) — hoy no existe ni una fila de dato real de evaluaciones/informes en este repo; todo lo usado en los prototipos es sintético.

## 7. Reestructuración de navegación (22 jul 2026)

Sustituye el mapa de navegación original de `colegial-frontend-guia.md` §4 (Expedientes como landing + Recomendaciones/Económico/IA como único bloque "próximas versiones"):

- **Dashboard** pasa a ser la página de entrada (antes era el listado de expedientes). Agregados del comité, alertas, insights — no una tabla.
- **"Expedientes" se renombra a "Árbitros"**: mismo contenido (buscador → ficha), pero el buscador se convierte en punto de entrada visual con filtros ampliados (categoría, veteranía/años en categoría, ranking dentro de categoría — ver regla de rankings §3 de este documento).
- **"Designación inteligente" es una página nueva, real, en construcción activa en v1** — no se confunde con "Recomendaciones". Es el motor concreto (filtro duro + score blando + coste con las dos KPIs separadas de `tarifas.md`) que se lleva construyendo desde la conversación sobre tarifas. Esto matiza (no contradice) la decisión §2 de este documento: se construye ya, aunque no se libera al comité como funcionalidad operativa hasta tener dato real de árbitros.
- **"Recomendaciones" no se toca** — sigue como vista previa bloqueada v2, reorientada a "acciones globales de comité" (no designación partido a partido), sin prioridad de desarrollo ahora mismo.
- **"Económico" cambia de foco**: de "ahorro de kilometraje" a "impacto del motor de Designación inteligente + KPIs de bienestar/satisfacción del árbitro". Pendiente de definir exactamente qué métricas cuando el motor tenga uso real — no cerrado del todo.
- **"Consultar con IA" no cambia** — v3, capa futura para apoyar decisiones, con foco explícito en la ficha del árbitro.

## 8. Limpieza de sidebar (22 jul 2026)

- **Selector de territorial retirado del componente** (no solo de la doc): ya no hay `THEMES` switcher en `CRMExpedientes.jsx`, el tema se fija a `THEMES.ffcv` directamente. Ejecuta lo que §1 ya decía por escrito pero no se había llevado al código.
- **"Cargar histórico" retirado del sidebar y del código** (componente `Ingesta` eliminado, no archivado — era una maqueta de drag&drop sin lógica real detrás). Motivo: la carga de datos no va a ser una pantalla donde alguien arrastra Excels — los datos se enlazan donde corresponda (pipeline de scraping público + CSV/export del comité, ver `data-model.md` "Principio de arquitectura: adaptadores de datos"). Si en algún momento hace falta una pantalla de importación real, se diseña contra un caso de uso concreto, no como placeholder genérico.
- **Etiqueta de "Designación inteligente" abreviada a "Designación" en el sidebar** por consistencia visual con "Dashboard" y "Árbitros" (una línea, mismo encuadre). El nombre completo se mantiene como título de la página (`tituloVista`) y en toda la documentación.

## 9. Dataset de trabajo: 200 árbitros, identidad+carga real (22 jul 2026)

Generado por `generar_dataset_arbitros.py` a partir de `partidos_2025_2026.csv`, filtrado a la escalera real de fútbol 11 masculino (Tercera Federación > Lliga Comunitat > Primera FFCV > Segona FFCV > Tercera FFCV). Guarda tres ficheros a propósito separados en `webapp/data/`:
- `arbitros-reales.json` — solo lo verificable: nombre, partidos reales 25/26, categoría principal (competición más frecuente).
- `arbitros-sintetico.json` — solo lo inventado: licencia, localidad, edad, informes, notas, vetos, disponibilidad.
- `arbitros-200.json` — merge en la forma que consume la UI, con `_fuente` por campo.

**Corrección de taxonomía**: las categorías "Preferente/1ª Regional/2ª Regional" del prototipo original no son nombres reales de la FFCV — se sustituyen en `CATEGORIAS`/`NIVEL_CATEGORIA` del componente por la escalera real de arriba.

**Localidades ampliadas (22 jul 2026, `geocode_localidades.py`)**: de 8 a 45 localidades geocodificadas — municipios reales con volumen alto en `partidos_2025_2026.csv` más barrios de Valencia capital (Torrefiel, Benicalap, Patraix, Russafa, Malilla, Campanar, Nou Moles, Algirós, Poblats Marítims, Marxalenes, Orriols). Punto importante de modelado: un barrio no es su propio término municipal — la comparación de "mismo término" usa el campo `municipio` resuelto por Nominatim (ej. Torrefiel → `municipio: "València"`), no el nombre de barrio buscado. Verificado en vivo: un árbitro de Patraix designado a un partido en Russafa sale como "mismo término · sin dieta" con 2,5 km reales de bienestar — exactamente el caso real que motivó la ampliación. La localidad de cada árbitro sigue siendo sintética (elegida al azar entre estas 45), solo las coordenadas/término son reales. Ampliar más exige geocodificar antes con ese script — no solo añadir nombres al array.

## 10. Score B.1 con shrinkage bayesiano implementado (22 jul 2026)

`webapp/lib/motorAsignacion.js` implementa ya la fórmula real de `kpis.md` B.1 (0,40·nota + 0,20·física + 0,20·teórica + 0,20·consistencia, shrinkage hacia la media de categoría según nº de informes 1-2/3/4+). Antes de este cambio el "score" leía campos (`arbitro.media`, `arbitro.inf`) que no existen en el modelo de datos y caía siempre al valor neutro 7 — es decir, apenas diferenciaba candidatos. Queda documentado por si se pregunta por qué los números de antes no cuadran con nada: no cuadraban, era un placeholder roto, no una versión simplificada válida.

Pendiente explícito, no implementado (ver cabecera de `motorAsignacion.js`):
- **B.3 (idoneidad situacional)**: exige histórico de conflictividad por partido, no existe para los 200 de trabajo.
- **A.5 (fiabilidad operativa)**: exige histórico de cancelaciones/no-shows, no existe.
- **Penalización por incidencias de B.1**: en 0 — y hay una ambigüedad sin resolver en `kpis.md` entre esta penalización y el principio de gobernanza de B.5 ("la disciplina no entra en ningún score"); no se ha resuelto todavía cuál "incidencia" es cuál.
- **`consistencia()` es una heurística propia** (10 − desviación típica de `forma[]` × 4), no una fórmula acordada con el comité — candidata a revisión.

## 11. Pipeline de designación por jornada (22 jul 2026)

Reemplaza la vista de "un partido a la vez" por el flujo operativo real acordado:

- **Cadencia**: dos primeras jornadas asignadas de golpe al arrancar; luego cada lunes se asigna el fin de semana que empieza la semana siguiente (una semana de antelación). Modelado en `webapp/data/ciclos-asignacion.json` (3 ciclos de ejemplo).
- **Regla de categoría propia + extra**: un árbitro tiene como mucho un partido de su categoría por jornada, y opcionalmente uno extra de categoría inferior si activó `disponibleCategoriasInferiores`. `webapp/lib/asignarJornada.js` lo aplica como tope por árbitro, no solo como choque de horario — la primera versión solo evitaba el choque exacto de hora y dejaba que el mismo árbitro top-score se llevara varios partidos de su categoría a la vez; quedó corregido tras verlo fallar en el navegador.
- **Historial real en la ficha**: últimos 15 partidos reales (fecha/rival/resultado) de `partidos_2025_2026.csv` por árbitro, con filtro "solo su categoría" — ver `HistorialPartidos` en el componente.
- **Revisión humana**: cada partido sale "auto-confirmable" o "revisar" con motivo (partido sensible/derbi, score ajustado entre los dos primeros, o sin candidatos). El humano siempre puede ver las alternativas (top 4) sin recalcular nada.
- **Pendiente explícito**: la asignación es *greedy* por categoría (procesa de mayor a menor nivel), no una optimización global sobre toda la jornada — con 10-15 partidos es correcto, pero no es el óptimo teórico. Ver recomendación de algoritmo húngaro / asignación bipartita si el volumen crece.

## Ver también
- [product-vision.md](./product-vision.md)
- [data-model.md](./data-model.md)
- [kpis.md](./kpis.md)
- [tarifas.md](./tarifas.md)
- [reference-analysis.md](./reference-analysis.md) — historial, parcialmente superado por este documento
- [../colegial-frontend-guia.md](../colegial-frontend-guia.md)
