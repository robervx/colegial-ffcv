# Research: Disponibilidad de árbitro con registro de implicación

## 1. Persistencia real: diferida a Sprint 1, este plan no elige la tecnología

**Decisión**: este plan no fija Supabase, SQLite, ni ninguna otra tecnología de almacenamiento. En su lugar define un **contrato de repositorio agnóstico a la tecnología** (`contracts/disponibilidad-repo.md`): un conjunto de funciones (`obtenerLog`, `declararDisponibilidad`, `calcularPatronImplicacion`) que la UI consume, y que hoy no tienen implementación real detrás — solo un stub que documenta la firma. Sprint 1 (`docs/sprints.md`) es quien decide la infraestructura de persistencia para *toda* la app, no solo para esta feature; elegirla aquí de forma aislada duplicaría esa decisión y probablemente la contradiría cuando Sprint 1 se aborde.

**Racional**: spec.md ya documenta explícitamente esta decisión ("Bloqueante de implementación", Assumptions) — Roberto la tomó al especificar. Diseñar contra una interfaz en vez de una tecnología concreta significa que cuando Sprint 1 resuelva el backend, implementar el repositorio real es un ejercicio de "rellenar el contrato ya definido", no de rediseñar la feature.

**Alternativas consideradas**:
- Elegir ya Supabase (mencionado como hipótesis en `sprints.md` Sprint 1) — rechazado: no está confirmado ni siquiera para el resto de la app; decidirlo aquí de forma unilateral para una sola feature es exactamente el antipatrón que Sprint 1 existe para evitar.
- Persistencia mínima solo para esta feature (localStorage del navegador) — rechazado explícitamente por Roberto al resolver la clarificación de la spec: un log de auditoría en `localStorage` no sobrevive a cambiar de navegador/dispositivo ni es lo que un comité con varias personas necesita: es la misma clase de "guardado falso" que ya es un defecto conocido en "Guardar nota".

## 2. Qué SÍ se puede construir ya, sin esperar a Sprint 1

**Decisión**: tres piezas de lógica pura, testeables con Vitest, que no dependen de que exista persistencia real:

1. **`lib/reglaFestivo.js`**: valida que una declaración de tipo "festivo solicitado" tiene al menos 15 días de antelación respecto al inicio del ciclo (FR-004). Función pura: `(fechaDeclaracion, fechaInicioCiclo) => { valido, diasAntelacion }`.
2. **`lib/patronImplicacion.js`**: calcula el resumen descriptivo (FR-009) sobre un `LogDisponibilidad` recibido como argumento — no necesita que el log esté persistido de verdad para ser correcto y testeable, solo un array de `DeclaracionDisponibilidad` de ejemplo.
3. **Ampliación de `generar_jornadas.py`** para añadir un campo ISO parseable (`fechaInicioISO`) a cada ciclo de `ciclos-asignacion.json` — hoy el ciclo solo tiene `finDeSemana` como texto libre en español ("26-27 jul 2026"), no calculable. Esto es una generación de dato estático más (mismo patrón que el resto de `data/*.json`), no persistencia de acciones de usuario — no lo bloquea el Principio VII.

**Racional**: separar "lógica de negocio pura" de "acción que el usuario percibe como guardada" es exactamente la distinción que hace el Principio VII soportable sin bloquear todo el trabajo — la regla de negocio y su verificación se pueden validar hoy con tests, el botón que la dispara y persiste de verdad espera a Sprint 1.

**Alternativas consideradas**:
- Esperar a Sprint 1 para escribir cualquier línea de código de esta spec — rechazado: desperdicia la sesión de plan/diseño ya hecha, y esta lógica pura no tiene ningún riesgo de crear una "acción falsa guardada" (Principio VII habla de acciones de usuario, no de funciones puras sin UI).

## 3. Selector "ver como: árbitro / comité"

**Decisión**: un toggle de estado local de React (no persistido, no es una acción del usuario que deba sobrevivir a un refresco — es un modo de visualización, igual que el filtro de categoría de `001-dashboard-operativo`), ubicado en la cabecera de la ficha de árbitro. Por defecto "comité", porque la app hoy ya se presenta como herramienta interna del Comité Técnico (ver cabecera actual "Comité Técnico · FFCV").

**Racional**: FR-012 ya fijó este enfoque al resolver la clarificación con Roberto. No persistir el modo de vista es coherente con el Principio VII: no es una acción que el usuario perciba como "guardada", es un modo de lectura de la misma sesión — mismo estatus que el filtro de categoría de 001, que tampoco persiste.

## 4. Sustitución de la disponibilidad sintética de 001 (FR-006)

**Decisión**: `lib/coberturaCategoria.js` (de `001-dashboard-operativo`) ya recibe `arbitrosRaw` y los enriquece con `conDisponibilidad()` (`lib/disponibilidad.js`, sintético). Cuando exista el repositorio real (Sprint 1), el cambio es acotado: sustituir esa llamada por una que enriquezca cada árbitro con su declaración real vigente para el ciclo activo (`obtenerLog(arbitroId, cicloId)` del contrato de repositorio) en vez de la heurística `indisp >= 6 && id % 5 === 0`. La forma de `CoberturaCategoria` (data-model.md de 001) no cambia — solo cambia de dónde sale `indisponibleEsteFinde`.

**Racional**: minimiza el acoplamiento entre specs — 001 no se reabre ni se reescribe, solo se le cambia la fuente de un dato en un único punto ya identificado.

**Alternativas consideradas**:
- Mantener ambas fuentes (sintética y real) coexistiendo con un flag — rechazado: el Principio VI exige distinguir real de sintético, no mezclarlos con ambigüedad; una vez hay declaraciones reales, la simulación deja de tener sentido y debe retirarse, no quedar como opción paralela.
