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

## 12. Tarjetas reales + ID estable de árbitro (23 jul 2026)

**Cambio de fuente**: `generar_dataset_arbitros.py` deja de usar `partidos_2025_2026.csv` (scraping de la intranet, por nombre de árbitro en texto) y pasa a usar `ffcv_public_data/` (scraping de la web pública `ffcv.es/competiciones`, sin login, generado por `scrape_ffcv_public.py`). Motivo: esa web pública trae `cod_arbitro` — un ID numérico estable — y las tarjetas amarillas/rojas reales por partido, ninguna de las dos cosas estaba disponible en la intranet a este nivel de detalle.

- **`am`/`ro` de la temporada 2025/26 son ahora reales** (antes `int(part * random.uniform(1.6, 3.6))`, 100% inventado). Las temporadas anteriores (2023/24, 2024/25) siguen siendo estimadas — se podrían hacer reales relanzando `scrape_ffcv_public.py --season 20` / `--season 19`, no se ha hecho todavía.
- **`cod_arbitro` añadido como campo real** en los tres ficheros de salida — sustituye progresivamente el cruce por nombre en texto, que arrastraba el riesgo de inconsistencia ya visto en el scraping (variantes de formato del mismo nombre).
- **Alcance**: la web pública solo publica categorías adultas (no fútbol base/juvenil) — encaja exacto con el `LADDER` de fútbol-11 masculino que ya usaba este generador, así que no se pierde cobertura.
- **`webapp/data/agregados-reales.json`** pasa a generarse con un script nuevo, `generar_agregados.py` (antes no existía como script, se había hecho a mano) — misma fuente pública, mismo esquema de campos.

## 13. Capa sintética ampliada: contacto, ficha física, plantillas de email (23 jul 2026)

Todo lo añadido aquí es **sintético**, explícitamente marcado como tal en la UI (`Origen de los datos` en la ficha) — no hay ningún dato de contacto real de ningún colegiado en este repo.

- **Contacto**: `telefono` y `email` sintéticos (email con patrón `nombre.apellido@arbitrosffcv.es`), visibles en la cabecera de la ficha y en un panel dedicado "Contactar".
- **Ficha física**: `altura` (fija, cm) y `peso` — el peso se registra **por convocatoria de prueba física**, no como campo único (ver `data-model.md`, ya lo especificaba).
- **Pruebas físicas y examen teórico**: 2 convocatorias por temporada activa (Pretemporada en septiembre, Mitad de temporada en febrero), cada una con nota + comentario. Hasta 3 temporadas de histórico.
- **Anotaciones de informadores**: además de las notas de seguimiento del comité ya existentes, ahora también se generan notas atribuidas a "Observador X" con etiqueta (`positiva`/`mejora`), distinguibles visualmente de las del comité.
- **Plantillas de email** (`PLANTILLAS_EMAIL` en el componente): "Comentar informe", "Felicitar", "Pedir puntos de mejora". Generan un `mailto:` con asunto y cuerpo prellenados — **nunca se envía nada automáticamente**, el comité revisa en su propio cliente de correo y pulsa enviar él. Al añadir una nota de seguimiento con etiqueta "Positiva" o "A mejorar" aparece una sugerencia con el borrador correspondiente ya listo (banner descartable, no intrusivo).
- **Ventana de partidos (kpis.md C.2)**: el historial de partidos de la ficha ahora tiene selector Últimos 5 / Últimos 10 / Todos, combinable con el filtro de categoría ya existente, con un resumen de amarillas/rojas reales dentro de esa ventana. No se ha vinculado nota de informe por partido (eso exigiría inventar una precisión que no existe — el informe sigue siendo por temporada, no por partido concreto).
- **Domicilio**: sigue siendo sintético a propósito (decisión explícita — no cambia hasta tener el roster real del comité, ver también §9 más arriba sobre `localidades-geo.json`).

## 14. Logo real de la FFCV (23 jul 2026)

`docs/assets/logo.png` → `webapp/public/logo-ffcv.png`. El componente `Escudo` ahora renderiza el logo real sobre fondo blanco en vez del placeholder de siglas — se mantiene la opción de placeholder (`logoSrc` a `null`) por si en el futuro hay un tenant sin logo subido, aunque hoy es FFCV único (§1).

## 15. Idea capturada: disponibilidad de árbitro con log de motivos (27 jul 2026)

**No es una decisión cerrada ni una spec todavía** — se documenta aquí para no perder el detalle mientras se termina 001-dashboard-operativo (ver `sprints.md`, se especifica después con `/speckit-specify`).

Roberto planteó añadir a la ficha de cada árbitro un selector de disponibilidad en tiempo real, con log de registro (quién marcó qué, cuándo, por qué). Ideas recogidas tal cual, a falta de especificar formalmente:

- **Motivos de no disponibilidad**: lesión, baja (debe ir justificada), urgencia. Un motivo no justificado o que sugiera "no cuidarse" debe poder afectar negativamente a la valoración del árbitro.
- **Disponibilidad parcial**: opción de "solo pito mi categoría" (no acepta extras de categoría inferior/superior).
- **Festivo solicitado**: petición de fin de semana libre, con antelación mínima de 15 días. Si se abusa de esta opción, debe quedar constancia — es una señal (negativa) de interés/implicación real en el arbitraje, a diferenciar de una petición puntual razonable.
- **Doble propósito del dato**:
  1. Operativo: saber el ratio de árbitros disponibles por jornada/finde (alimenta el motor de designación y el dashboard de cobertura de 001).
  2. Evaluativo: registro de implicación/disposición real del árbitro, como señal para comité/evaluadores — **nunca visible para el propio árbitro**, solo para roles de mando/evaluación.
- **Visibilidad por rol**: esto introduce por primera vez la necesidad de un modelo de roles/permisos explícito en la UI (árbitro vs. comité/evaluador) — hoy la app no distingue quién la está viendo.

Pendiente antes de especificar: quién marca la disponibilidad (¿el árbitro se autodeclara, o el comité la registra sobre lo que comunica el árbitro por otro canal?), y cómo se traduce "constancia de abuso" en una regla concreta (¿umbral de festivos por temporada? ¿solo queda anotado para lectura humana, sin automatismo?).

## 16. Dashboard operativo del Comité implementado (spec 001, 27 jul 2026)

`specs/001-dashboard-operativo/` completada de principio a fin en una sola sesión: spec → plan → tasks → implementación. Resumen de lo entregado:

- **Panel "Cobertura por categoría"** en el Dashboard: para cada categoría con partidos el próximo fin de semana (ciclo activo = primer elemento de `ciclos-asignacion.json`), muestra partidos a designar (real) frente a árbitros disponibles (sintético), desglosados en categoría propia vs. categoría inferior activada, con estado visual (en riesgo / ajustado / holgada / sin partidos) y desglose siempre visible junto al número (nunca un color aislado).
- **Panel "Partidos del fin de semana"** con filtro por categoría (US3): recuento que cambia en una interacción.
- **Equidad de carga (US2)**: ya estaba prácticamente completo en el Dashboard existente (KpiCard con explicación en lenguaje llano + panel Insights con máx./mín.) — esta spec solo lo verificó contra los Acceptance Scenarios, sin cambios de cálculo.
- **`lib/coberturaCategoria.js` y `lib/disponibilidad.js`** (nuevos, con tests Vitest — primer test runner del proyecto, 13 tests en verde): `conExtras()` se extrajo del componente de Designación a `lib/disponibilidad.js` para que Dashboard y Designación compartan un único concepto de "árbitro disponible este fin de semana", en vez de duplicarlo.
- **`lib/categorias.js`** (nuevo): `CATEGORIAS`/`NIVEL_CATEGORIA` movidos fuera del componente para que la lógica de `lib/` los pueda usar de forma testeable.
- Verificado en navegador (servidor de desarrollo en `:3001`): sin errores de consola, filtro de categoría funcional, estado no persiste tras refrescar (correcto, es una vista de consulta — FR-009).

**No se tocó**: motor de designación, ficha de árbitro, persistencia (sigue sin existir — Sprint 1 del plan sigue siendo el siguiente paso estructural si se decide abordarlo).

## 17. Disponibilidad de árbitro: spec, plan y lógica pura (spec 002, 27 jul 2026)

`specs/002-disponibilidad-arbitro/` especificada y planificada de principio a fin; parte de la lógica ya construida. Resumen:

- **spec.md**: selector de disponibilidad por ciclo (lesión/baja justificada/urgencia/solo categoría propia/festivo con 15 días de antelación) con log de registro. Doble propósito: operativo (sustituye la disponibilidad sintética de 001) y evaluativo (patrón de implicación visible solo para comité/evaluador, nunca para el árbitro, nunca como entrada de `scoreB1` — Principio IV). Dos decisiones resueltas al especificar: visibilidad por rol con un selector "ver como: árbitro/comité" sin login real (FR-012); implementación de la UI bloqueada hasta que exista persistencia real (FR-013, Principio VII).
- **plan.md/research.md/data-model.md/contracts/**: contrato de repositorio agnóstico a la tecnología de persistencia — la UI habla con funciones (`obtenerLog`, `declararDisponibilidad`, `calcularPatronImplicacion`), nunca con la base directamente.
- **Ya construido y testeado** (27/27 tests Vitest): `lib/reglaFestivo.js` (regla de los 15 días), `lib/patronImplicacion.js` (cálculo puro, sin campo score/nivel), `lib/disponibilidadRepo.js` (stub que lanza `NoImplementadoError` en vez de simular persistencia falsa), `fechaInicioISO` añadido a `ciclos-asignacion.json`.
- **Bloqueado**: toda la UI (selector en la ficha, selector de rol, integración real con el Dashboard de 001) — espera a que exista el backend real, ver §18.

## 18. Backend real: Supabase desde el principio, no SQLite temporal (27 jul 2026)

**Decisión**: se descarta la opción inicial de empezar con SQLite local y migrar a Supabase "más adelante". Se va directo a Supabase.

**Por qué**: Roberto quiere poder probar el prototipo desplegado (Vercel, con contraseña) desde varios dispositivos a la vez para validar usabilidad real — el árbitro usará sobre todo la versión móvil, gestión usará escritorio, informadores/evaluadores usarán móvil para dejar comentarios y consultar fichas antes de evaluar. Un despliegue en Vercel es "sin estado" entre peticiones: un fichero SQLite local no persiste de forma fiable ahí. Como la necesidad de probar en remoto y multi-dispositivo es inmediata (no un "algún día"), adelantar Supabase evita migrar dos veces.

**Qué implica**:
- Roberto crea la cuenta y el proyecto en Supabase (no es algo que se pueda automatizar desde aquí — requiere sus credenciales).
- El resto del trabajo (esquema, migraciones, integración con la app) puede diseñarse en paralelo mientras se crea el proyecto, siguiendo el mismo patrón de repositorio ya usado en `contracts/disponibilidad-repo.md` (002) — cuando el proyecto exista, es "rellenar el contrato", no rediseñar nada.
- Esto es Sprint 1 de `sprints.md`, ahora con la tecnología decidida (dejaba de estar "por confirmar").

**Ejecutado (27 jul 2026)**: Roberto creó el proyecto de Supabase (lo llamó "RefData", no "colegial-ffcv" que era la sugerencia — pendiente de unificar naming entre Supabase/GitHub/producto cuando el nombre definitivo esté cerrado, no bloqueante), credenciales en `webapp/.env.local`. Repo subido a GitHub como `robervx/colegial-ffcv` (privado), con integración GitHub↔Supabase conectada para sincronizar `supabase/migrations/`.

## 19. Spec 003 completa: designaciones reales + disponibilidad operativa (28 jul 2026)

**Ejecutado**: `specs/003-persistencia-real/tasks.md` T017-T026 (US2 y US3), sobre la base de T001-T016 ya cerrada la sesión anterior.

- **US2** — página "Designación" pasa de informativa a operativa: botón "Confirmar" sobre el candidato sugerido y "Elegir este candidato" por alternativa (con motivo obligatorio si no es el sugerido), persistido en `designaciones` vía `designacionesRepo.js`. Una vez decidido un partido, la fila deja de recalcular "Revisar"/"Auto-confirmable" en vivo y muestra la decisión tomada (candidato, rol, fecha, motivo) — implementa FR-004 de la spec. `decididoPorRol` queda fijo a `"comite"` en esta página (no hay selector de rol aquí, a diferencia de la Ficha) porque la spec describe esta pantalla como uso exclusivo del comité.
- **US3** — `002-disponibilidad-arbitro` queda completa de punta a punta: selector "ver como: árbitro/comité" en la ficha (FR-012), selector de disponibilidad (disponible/no disponible con motivo/solo categoría propia/festivo solicitado) validado contra `lib/reglaFestivo.js` antes de persistir, log histórico visible en ambos roles con distinción justificada/no justificada (FR-011), y resumen de `calcularPatronImplicacion` visible solo en modo comité (FR-008/FR-009). El Dashboard (001) sustituye la disponibilidad sintética de `coberturaPorCategoria` por disponibilidad real del ciclo activo vía una función nueva, `disponibilidadRepo.obtenerVigentesPorCiclo(cicloId)` — no estaba en el contrato original de 002 (que solo fijaba consulta por árbitro individual), añadida para evitar 200 llamadas individuales a Supabase en cada carga del Dashboard; documentada en el contrato correspondiente.
- Verificado en navegador (no solo compilación): confirmar/elegir candidato con persistencia tras refresco completo, bloqueo real del festivo solicitado con menos de 15 días de antelación, patrón de implicación apareciendo/desapareciendo según el selector de rol. 30/30 tests Vitest, lint sin errores.
- **Pendiente suelto, no bloqueante**: `supabase/migrations/0004_endurecer_rls_solo_lectura_insercion.sql` sigue sin aplicar/commitear (estrecha la política RLS permisiva de 0001-0003 quitando UPDATE/DELETE a `anon`) — mismo paso manual que ya hizo Roberto para 0001-0003.

## 20. Modelo de roles ampliado a 5 y dos módulos nuevos (Equipos, Partidos) — capturado 28 jul 2026

**Idea capturada** (pendiente de `/speckit-specify`, no construida todavía): Roberto quiere ampliar el binario árbitro/comité (FR-012 de 002) a 5 roles — **admin** (todo, incluida configuración), **directiva** (todo salvo configuración), **informadores** (fichas de árbitro + Equipos + Partidos, puede comentar), **árbitros** (su ficha + Equipos + Partidos para preparar el partido) y **administrativos** (disponibilidad/designaciones + vista económica). El detalle fino de quién ve/edita exactamente qué queda por concretar con ellos — esto es la filosofía de partida, no un permiso cerrado campo a campo.

Junto a esto, dos páginas nuevas:
- **Equipos**: perfil por equipo construido sobre dato real ya existente (`ffcv_public_data/`) — tarjetas por jugador, agregado del equipo, sanciones.
- **Partidos**: vista por jornada con insights de valor para preparar el partido (ej. "equipo con pocas tarjetas → se le puede dejar jugar más" — el insight siempre muestra el número detrás, Principio III), más un registro de comentarios de árbitros por equipo con estructura sugerida de aporte, pensado para que sea útil al resto de compañeros.

**Idea relacionada, marcada como de menor prioridad dentro de Partidos**: registrar si un árbitro consulta los insights de equipo/partido antes de dirigirlo, y con qué antelación — señal de preparación. Decisión de diseño ya adelantada (no cerrada en spec todavía): medir *eventos de consulta* (cuántas veces, cuánto antes del partido fue la última), no "tiempo en pantalla" — más honesto sobre lo que un navegador puede medir de verdad. Esta señal es descriptiva para el comité (Principio IV, nunca entra en `scoreB1`) y cada árbitro solo debería ver su propio registro, nunca un listado comparativo frente a otros árbitros (Principio V).

**Orden de especificación acordado**: roles/permisos primero (transversal, lo necesitan las otras dos), luego Equipos, luego Partidos (depende del perfil de equipo). Las tres se specifican a la vez pero respetando ese orden de dependencia.

## Ver también
- [product-vision.md](./product-vision.md)
- [data-model.md](./data-model.md)
- [kpis.md](./kpis.md)
- [tarifas.md](./tarifas.md)
- [reference-analysis.md](./reference-analysis.md) — historial, parcialmente superado por este documento
- [../colegial-frontend-guia.md](../colegial-frontend-guia.md)
