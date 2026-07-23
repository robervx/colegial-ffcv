# Colegial · Guía de diseño y frontend

**Para el proyecto de Claude Code.** Este documento es el contrato visual y de flujos de Colegial. Todo lo que se construya en frontend debe poder justificarse con esta guía; si algo no encaja, se cambia la guía primero (decisión de producto), no se improvisa en el código.

> **Antes de nada:** ver [docs/decisiones-producto.md](./docs/decisiones-producto.md) (Sprint 0, 22 jul 2026). Reconcilia esta guía con `product-vision.md`/`kpis.md`/`data-model.md`, que son anteriores y no estaban referenciados aquí. En caso de duda sobre multi-tenant, alcance de v1 o rankings, manda ese documento.

El prototipo de referencia es `crm-expedientes.jsx`: contiene la implementación viva de casi todo lo que se describe aquí. Ante la duda, el prototipo manda sobre la prosa.

---

## 1. Identidad y principios

Colegial es una herramienta **institucional y federativa**, no una startup de consumo. El diseño debe transmitir tres cosas: seriedad (esto gestiona expedientes de personas), claridad (un técnico de comité de 55 años lo entiende sin formación), y pertenencia (cada federación lo ve con su identidad, como algo suyo).

Principios de diseño, en orden de prioridad:

1. **La información es de personas.** Cada pantalla habla de árbitros reales. Nada de gamificación ni colores alarmistas. El rojo del semáforo dice "necesita seguimiento", nunca "malo". Los rankings ordenados (Top 10 por categoría, ver sección 4) son consulta legítima; lo que no se hace nunca es comparar a dos árbitros concretos cara a cara (dos radares superpuestos, dos fichas lado a lado con un "vs.") — ver [docs/decisiones-producto.md](./docs/decisiones-producto.md) punto 3.
2. **Explicable siempre.** Todo indicador calculado (semáforo, radar, tendencias) muestra de dónde sale. Ningún número sin su porqué a un clic o un tooltip de distancia.
3. **El técnico decide, el sistema informa.** Ningún elemento de UI presenta una decisión del sistema como definitiva. Los verbos de los botones lo reflejan: "Confirmar", "Revisar", nunca "Aplicar automáticamente".
4. **Densidad tranquila.** Tablas y fichas con mucha información, pero con aire: bordes suaves, jerarquía tipográfica clara, sin ruido decorativo.
5. **FFCV como cliente único en v1.** El tema activo sale de `THEMES`/`colegial-theme.js`, sin colores hardcodeados en componentes — pero en v1 no se construye selector de territorial ni aislamiento por tenant en el modelo de datos. Ver [docs/decisiones-producto.md](./docs/decisiones-producto.md) punto 1.

---

## 2. Sistema de tokens

Implementación de referencia en `colegial-theme.js` (importable directamente). Resumen:

### Temas por federación (dinámicos)
Cada federación define: `primary`, `deep` (variante oscura del primary), `accent`, `tint` (primary al ~8%), `accentTint` (accent al ~10%), más nombre, siglas y logo. La FFCV es el tema por defecto de desarrollo:

| Token | FFCV | Uso |
|---|---|---|
| `primary` | `#0C4C7C` | Barra lateral, títulos, botones primarios, cabecera de ficha |
| `deep` | `#08375A` | Fondos de portada/hero, hover del primary |
| `accent` | `#F59B1E` | Escudo, subrayados, etiquetas destacadas, filo de la cabecera |
| `tint` | `#EAF2F8` | Fondos suaves de tarjetas destacadas, chips de categoría |
| `accentTint` | `#FEF3E2` | Banners de aviso/vista previa, filas resaltadas |

### Neutros y semánticos (fijos, iguales en todos los temas)
| Token | Valor | Uso |
|---|---|---|
| `paper` | `#F6F7F9` | Fondo general de la aplicación |
| `card` | `#FFFFFF` | Fondo de paneles y tarjetas |
| `ink` | `#16202B` | Texto principal |
| `ink70` | `#5A6672` | Texto secundario |
| `ink40` | `#939CA6` | Etiquetas, metadatos, placeholders |
| `rule` | `#E1E5EA` | Bordes y separadores |
| `verde` / `verdeT` | `#2E7D5B` / `#E7F2EC` | Estado positivo y su fondo |
| `ambar` / `ambarT` | `#C88A1A` / `#FBF1DC` | Estado intermedio/aviso y su fondo |
| `rojo` / `rojoT` | `#C0392B` / `#FAE9E7` | Estado de atención y su fondo |
| `ta` | `#E8C33C` | Amarillas (disciplina) |
| `tr` | `#C0392B` | Rojas (disciplina) |

**Regla dura:** verde/ámbar/rojo son EXCLUSIVOS del semáforo de forma y estados del sistema. La identidad de federación nunca usa esos tres; así el semáforo se lee igual en FFCV, FCF o RFAF.

### Tipografía
- **Display/títulos:** serif institucional (Cambria/Georgia en documentos; en web, `"Source Serif 4"` o similar via next/font). Solo para h1/h2 de página y nombres en cabeceras de ficha.
- **Cuerpo/UI:** sans del sistema (`Inter` o system-ui). Todo lo demás.
- **Datos:** monospace (`font-mono` de Tailwind) con `tabular-nums` SIEMPRE en cifras: notas, kilómetros, licencias, conteos. Es la firma visual del producto — los números se alinean como en un acta.
- Etiquetas de sección ("eyebrows"): 10px, uppercase, tracking 0.16em, color `ink40`.

### Espaciado y forma
- Radio de esquinas: `rounded-md` (6px) en paneles, `rounded` (4px) en chips y botones, `rounded-full` solo en avatares y píldoras de estado.
- Sombra: una sola, sutil (`shadow` con opacidad ~0.13). Nada de sombras dramáticas.
- Los paneles siempre con cabecera propia: fondo `#FBFCFD`, borde inferior `rule`, eyebrow a la izquierda, acciones a la derecha.

---

## 3. Componentes canónicos

Los que ya existen en el prototipo y deben extraerse a `components/` como librería:

| Componente | Contrato |
|---|---|
| `Panel` | Contenedor estándar: cabecera con eyebrow + slot derecho, cuerpo con padding 20px. Todo contenido de página vive en Panels. |
| `Semaforo` | Píldora de estado de forma. Props: `estado` (del motor), `size`. Muestra punto de color + etiqueta + icono de tendencia. NUNCA color solo sin texto (accesibilidad). |
| `Avatar` | Iniciales sobre `tint`. Cuando haya fotos reales, mismo tamaño y radio. |
| `Escudo` | Placeholder de siglas sobre `accent` hasta que la federación suba su logo (se sube en configuración, no se hardcodea — es marca registrada suya). |
| `Chip` | Etiqueta pequeña. Variantes: marca (tint/primary), ok, aviso, bloqueo, neutro. |
| `Eyebrow` | Etiqueta de sección. |
| `Disciplina` | Barra amarillas/rojas con peso visual (rojas ×3). |
| `BannerV2` | Banner de vista previa para módulos futuros: borde discontinuo `accent`, candado, texto de versión. Obligatorio en toda pantalla no activa. |
| `FichaHeader` | Cabecera de expediente: fondo `primary`, licencia en `accent`, filo inferior de 4px `accent`, bloque blanco con el semáforo. |

Convenciones de código:
- Componentes de servidor por defecto; `"use client"` solo donde hay estado/interacción.
- Recharts para todas las gráficas (línea de forma, área de evolución, radar). Tooltips con `borderRadius: 4`, borde `rule`, fuente 12px.
- Nada de librerías de UI externas (ni shadcn ni MUI): la identidad es propia y el peso importa.
- Textos de UI en español, sentence case, verbos activos ("Guardar nota", no "Enviar").

---

## 4. Flujos y pantallas de la v1

### Mapa de navegación (revisado 22 jul 2026, ver [docs/decisiones-producto.md](./docs/decisiones-producto.md) §7-8)
```
Barra lateral (fondo primary)
├── Dashboard               [v1 activa — página de entrada]
├── Árbitros                [v1 activa — antes "Expedientes"]
│    ├── Buscador + filtros (categoría, veteranía/años en categoría, ranking dentro de categoría, estado)
│    └── Ficha del colegiado
├── Designación              [v1 en construcción — motor real, no vista previa; título completo "Designación inteligente" en cabecera de página, abreviado en el sidebar]
├── ─── Próximas versiones ───
├── Recomendaciones  🔒 v2  [vista previa con BannerV2 — acciones globales de comité, no designación partido a partido]
├── Económico        🔒 v3  [vista previa con BannerV2 — impacto del motor de designación + KPIs de bienestar/satisfacción]
└── Consultar con IA 🔒 v3  [vista previa con BannerV2 — capa futura sobre todo lo anterior, foco en apoyar decisiones desde la ficha]
```

**Sin selector de territorial ni "Cargar histórico" en el sidebar** (22 jul 2026): FFCV es cliente único, el switcher de tema se retiró del componente (`docs/decisiones-producto.md` §1). "Cargar histórico" también se retiró — la carga de datos no es una pantalla de arrastrar Excel/PDF, los datos se enlazan donde corresponda (pipeline de scraping + CSV del comité), ver `docs/decisiones-producto.md` §8.

**No confundir "Designación inteligente" con "Recomendaciones":** son dos páginas distintas y no se fusionan.
- **Designación inteligente** es el motor concreto que venimos diseñando (filtro duro por veto/indisponibilidad, score blando B.1+B.3+A.5, coste real de `tarifas.md`, KPI de bienestar separado del económico) — se construye en v1, aunque no se libera al comité hasta que el dato de árbitros sea real.
- **Recomendaciones** queda como está, vista previa bloqueada, pensada para acciones globales de comité (no asignación partido a partido) — sin prioridad ahora mismo.

### Dashboard (página de entrada)
Sustituye a "Árbitros" como landing. Objetivo: que el comité vea de un vistazo qué está pasando y dónde actuar, no que navegue para averiguarlo.
- Fila de KPIs agregados del comité: árbitros activos, partidos de la temporada, equidad de carga (A.6), alertas activas (B.4) — con dato real ya disponible desde `partidos_2025_2026.csv` para carga/actividad, sintético para lo que depende de informes.
- Bloque de "dónde atacar": lista corta de árbitros con alerta activa (caída de nota, inactividad, sobrecarga — ver `kpis.md` B.4), no la tabla completa.
- Insights generados (texto corto explicando un patrón, ej. "3 árbitros de Preferente llevan 2 informes seguidos a la baja") — mismo principio de explicabilidad que el semáforo: todo insight enlaza al dato que lo sostiene.
- No es un dashboard de vanidad: cada tarjeta debe poder responder "¿y ahora qué hago con esto?", coherente con el principio "el técnico decide, el sistema informa".

### Árbitros — buscador y listado
- Buscador grande y visual como punto de entrada (no una tabla directa) — filtros combinables: categoría, veteranía/años en la categoría, zona, estado del semáforo, ranking dentro de categoría (Top N por `kpis.md` C.1/C.2, ver regla de rankings en sección 1).
- 4 tarjetas KPI arriba: total + una por estado del semáforo. Las de estado son **filtros al tocarlas** (toggle).
- Tabla: avatar+nombre+licencia, categoría (chip), semáforo, media actual, PJ totales, indisponibilidad, chevron.
- Fila entera clicable → ficha. Hover sutil (`bg-slate-50`).
- Pie de tabla: la frase fija que explica el semáforo y que la indisponibilidad no puntúa. **No se quita** — es la protección del producto ante el colectivo.

### Designación inteligente (nueva, en construcción activa)
No es la vista previa de "Recomendaciones" — es el motor real que venimos diseñando en `data-model.md`/`kpis.md`/`tarifas.md`:
1. **Filtro duro**: excluye por `Veto` activo, indisponibilidad declarada, incompatibilidad de categoría — nunca aparecen puntuados bajo, desaparecen de la lista (ver `data-model.md` "Filtro duro vs. score blando").
2. **Score blando**: sobre los candidatos restantes, B.1 (nivel) + B.3 (idoneidad situacional) + A.5 (fiabilidad operativa).
3. **Coste, siempre desglosado en dos KPIs separados, nunca uno solo**: coste federación (término municipal + banda de km + tarifa según categoría, `tarifas.md`) y bienestar del árbitro (distancia real, aplica incluso con coste federación cero). Ver `data-model.md` "Nota sobre bienestar vs. coste federación".
4. Cualquier cifra de coste se etiqueta como estimada — el comité tiene la última palabra (`tarifas.md` §5).

### Ficha del colegiado
Orden de lectura (dos columnas en desktop, apilado en móvil):
1. **Cabecera** (FichaHeader): identidad + semáforo grande con la media explicada.
2. Columna principal: gráfica de forma (últimos 6 informes, líneas de referencia en 8,0 y 7,0) → histórico por temporada (tabla + área de evolución) → **seguimiento interno** (notas con autor y fecha, candado "visible solo para el comité").
3. Columna lateral: **radar de habilidades** (5 ejes: físico, técnica, gestión, disciplinaria, informes) con "Destaca / A trabajar" → resumen de trayectoria → disponibilidad (con su disclaimer) → origen de los datos (trazabilidad).

Reglas de la ficha:
- El semáforo siempre con su media visible ("media 5 últimos: 8,08"). El color sin el número está prohibido.
- Las notas internas piden confirmación antes de borrar y todo alta/borrado va al audit_log.
- El radar es desarrollo del colegiado, no comparación: nunca se pintan dos árbitros superpuestos en el mismo radar.

### Estados que faltan en el prototipo (construir en producción)
- **Vacíos:** listado sin expedientes → invitación a cargar histórico con CTA. Ficha sin informes → "Sin informes esta temporada. El estado de forma aparecerá con el tercer informe cargado."
- **Carga:** skeletons con la misma geometría que el contenido (no spinners a pantalla completa).
- **Error:** qué pasó + qué hacer, en la voz de la interfaz ("No se pudo guardar la nota. Comprueba la conexión y vuelve a intentarlo."), sin disculpas vagas.
- **Móvil:** la barra lateral colapsa a los botones horizontales que ya existen en el prototipo; la ficha apila columnas; las tablas hacen scroll horizontal con la primera columna fija.
- **Accesibilidad:** foco visible en todo lo interactivo, contraste AA (los tokens ya lo cumplen), `prefers-reduced-motion` respetado, y ningún estado comunicado solo por color.

---

## 5. Mejoras detectadas sobre lo ya hecho

Revisión honesta del prototipo actual — cosas a mejorar al pasarlo a producción:

1. **El añadido de nota interna no confirma visualmente.** Añadir un toast discreto ("Nota guardada") y estado deshabilitado del botón mientras persiste.
2. **Los selects de filtro son nativos.** Válido para v1 (accesibles y rápidos), pero estilizarlos con la paleta (borde `rule`, foco `primary`) para que no desentonen.
3. **La tendencia del semáforo merece tooltip.** Al pasar sobre la píldora: "Media de los últimos 5 informes: 8,08 · Tendencia: +0,12 por partido". Refuerza el principio de explicabilidad sin ensuciar la tabla.
4. **Ordenación de columnas.** El listado debe permitir ordenar por media, PJ e indisponibilidad (clic en cabecera). En el prototipo no está.
5. **La gráfica de forma con menos de 5 informes.** Definir el caso: mostrar los que haya con un aviso "cálculo provisional con N informes" en vez de ocultar el semáforo.
6. **Buscador con atajo.** `/` enfoca la búsqueda (los técnicos lo agradecerán con 1.800 expedientes).
7. **Paginación o scroll virtual** en el listado real: 1.800 filas no se renderizan de golpe. Virtualizar (p. ej. `@tanstack/react-virtual`) manteniendo los filtros server-side en Supabase.
8. **El radar con datos parciales.** Si faltan pruebas físicas de la temporada, el eje se pinta en `ink40` con "sin dato", no a cero (un cero parece una nota).

---

## 6. Módulos futuros (catálogo ampliado)

**Recomendaciones v2** sigue igual (vista previa bloqueada, acciones globales de comité, sin prioridad ahora). **Económico v3** cambia de foco: no es solo "ahorro de kilometraje", es analizar el impacto real del motor de Designación inteligente una vez esté en marcha, más KPIs que refuercen la toma de decisiones — bienestar/satisfacción del árbitro (ver `data-model.md` "Nota sobre bienestar vs. coste federación") entre otros por definir; pendiente de aterrizar qué métricas exactas cuando el motor tenga uso real. **Consultar con IA v3** sigue igual — capa futura sobre todo lo anterior, con foco declarado en apoyar decisiones desde la ficha del árbitro, no en sustituir al técnico.

Nuevos candidatos para el catálogo — cada uno puede aparecer en la barra lateral como vista previa bloqueada cuando toque enseñarlo:

| Módulo | Qué hace | Para quién vende | Versión sugerida |
|---|---|---|---|
| **Portal del colegiado** | Cada árbitro entra con su cuenta y ve SU expediente: forma, informes, pruebas, y declara su indisponibilidad desde el móvil. | Transparencia con el colectivo; le quita al comité el trabajo de recoger disponibilidades por WhatsApp. | v2 (es el complemento natural del expediente) |
| **Comunicaciones** | Notificaciones a colegiados: designación publicada, informe disponible, convocatoria de pruebas. Email + push. | Sustituye las cadenas de WhatsApp del comité. | v2 |
| **Pruebas físicas con marcas** | Registro de resultados de Yo-Yo/RSA por convocatoria, con histórico de marcas y evolución física por árbitro. | El preparador físico del CTA; hoy vive en un Excel. | v2 |
| **Formación y test de reglas** | Cuestionarios de reglas de juego, material formativo, seguimiento de quién completa qué. | Retención y desarrollo de árbitros jóvenes — el problema estructural del arbitraje base. | v2.5 |
| **Videoteca de jugadas** | Clips de jugadas polémicas etiquetados por regla, vinculables al informe del partido de donde salen. | Formación continua; los comités ya lo hacen a mano con enlaces sueltos. | v3 |
| **Análisis de informadores** | Calibración: ¿puntúa un informador sistemáticamente más alto o bajo que la media? Detección de sesgo en la evaluación. | Calidad del propio sistema de evaluación. Delicado: solo visible para la cúpula del CTA. | v3 |
| **Bajas y lesiones** | Registro de bajas médicas con fechas, que alimenta automáticamente la disponibilidad y las recomendaciones. | Evita designar a un lesionado por descuido. | v2.5 |
| **Actas ampliadas digitales** | El árbitro redacta el acta ampliada desde el portal, con plantilla; queda vinculada al partido y al expediente. | Trazabilidad de incidentes — alimenta vetos e incompatibilidades. | v3 |
| **Integración Novanet (API oficial)** | Sincronización de designaciones, actas y resultados con la plataforma de la RFEF. **Solo con autorización federativa y API oficial.** | Elimina la doble carga de datos; es el candado del mercado nacional. | v3 |
| **Benchmark inter-territorial** | Comparativas agregadas y anónimas entre federaciones clientes (medias por categoría, cargas de partidos). | Argumento de venta a nuevas territoriales; solo con datos agregados y consentimiento. | v3+ |

**Regla del catálogo:** cada módulo nuevo que se enseñe en la barra lateral necesita su vista previa con `BannerV2` y una pantalla de ejemplo con datos sintéticos, igual que las tres actuales. Enseñar futuro vende; prometer futuro endeuda. Y ninguno adelanta a la v1: el criterio de entrada sigue siendo "¿mete datos del CTA dentro o depende de que ya estén?".

---

## 7. Reparto de trabajo frontend (propuesta)

- **Perfil producto/diseño (tú):** dueño de esta guía, de los flujos, los textos de UI, y la revisión visual de cada pantalla antes de darla por buena. Cualquier pantalla nueva se especifica primero aquí (wireframe rápido + estados) y luego se construye.
- **Perfil constructor (Claude Code):** implementa contra esta guía y el prototipo, extrae los componentes canónicos, conecta a Supabase, y levanta los estados vacío/carga/error que el prototipo no tiene.
- Flujo de trabajo sugerido: rama por pantalla, captura de pantalla en el PR, y revisión de diseño contra la sección 4 antes de mergear.
