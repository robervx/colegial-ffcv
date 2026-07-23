<!--
Sync Impact Report
- Version change: [TEMPLATE] → 1.0.0 (ratificación inicial)
- Principios establecidos: 7 (I-VII), sintetizados de CLAUDE-frontend.md
  ("Reglas que no se negocian en frontend") y docs/decisiones-producto.md
  (11 secciones, 11-23 jul 2026) — no son reglas nuevas, es la primera vez
  que se formalizan como constitución con autoridad sobre el resto de docs.
- Secciones añadidas: Restricciones de Producto y Alcance, Estándares de
  Interfaz y Código, Flujo de Trabajo (SDD + Colaboración Remota)
- Plantillas revisadas: .specify/templates/plan-template.md (✅ Constitution
  Check es un gate genérico, no requiere hardcodear principios),
  .specify/templates/spec-template.md (✅ sin referencias desactualizadas),
  .specify/templates/tasks-template.md (✅ sin referencias desactualizadas)
- TODOs diferidos: ninguno
-->

# Colegial (FFCV) Constitution

Colegial es el nombre de trabajo del CRM de gestión arbitral que se construye
para la Federación de Fútbol de la Comunidad Valenciana (FFCV) — **no es una
decisión de producto cerrada**, ver Restricciones de Producto y Alcance.

## Core Principles

### I. FFCV Como Cliente Único (No Multi-Tenant en v1)
Colegial se diseña y se construye para la FFCV como cliente único. Ningún
color, logo, nombre de federación o territorial se hardcodea en componentes
— todo sale del tema activo (`THEMES`). Pero no se construye selector de
territorial en la UI de producción, ni tabla `federaciones`/`tema_json` en
el modelo de datos, hasta que exista un segundo cliente real interesado en
firmar. La preparación para multi-tenant es un principio de higiene de
código (no hardcodear), no un requisito funcional de v1.

**Razón**: construir infraestructura multi-tenant sin un segundo cliente
real es coste especulativo; mantener el código libre de hardcoding permite
añadirla después sin reescritura.

### II. El Técnico Decide, El Sistema Informa (Human-in-the-Loop No Negociable)
Ninguna decisión de designación, evaluación o clasificación de un árbitro se
ejecuta de forma autónoma. El sistema calcula, ordena y recomienda; una
persona del comité confirma o cambia cada decisión antes de que tenga efecto.
Todo cambio sobre la recomendación del sistema (override) exige un motivo
estructurado obligatorio, nunca opcional — es el dato que calibra el modelo,
perderlo rompe la mejora continua (KPI A.2, `docs/kpis.md`).

**Razón**: es el principio nº1 de la guía de producto original y la única
forma de que el comité confíe en un sistema que decide sobre asignaciones
económicamente sensibles.

### III. Todo Indicador Calculado Es Explicable
Ningún número o color en la interfaz aparece sin su fuente visible: el
semáforo muestra la media que lo genera, el radar sus componentes, cualquier
ranking su fórmula accesible. Color sin número al lado está prohibido. Un
indicador con menos de 3-5 observaciones (informes, partidos de contexto
similar) debe declarar su nivel de confianza reducido en vez de aparentar
certeza que no tiene (shrinkage bayesiano de B.1, umbral de muestra de B.3).

**Razón**: un score que no se puede explicar ante el comité no genera
confianza y no se adopta — validado ya una vez al corregir el score B.1 que
caía siempre al mismo valor neutro sin diferenciar candidatos.

### IV. Gestión No Es Clasificación (Gobernanza del Scoring)
La disponibilidad declarada, la indisponibilidad y los kilómetros recorridos
son datos de gestión (sirven para calcular coste y logística) y **nunca**
entran en un score de clasificación. La disciplina de un árbitro (tarjetas)
es descriptiva, nunca evaluativa — más tarjetas no implica peor arbitraje,
puede implicar partidos más conflictivos. Esta distinción debe ser explícita
en el copy de la interfaz, no solo en la lógica interna.

**Razón**: mezclar gestión con clasificación produce un ranking que no mide
lo que dice medir, y el comité lo detecta tarde o temprano.

### V. Sin Comparación Directa Entre Árbitros
Se permiten listados ordenados por score con filtros (categoría, zona,
ventana de partidos) como consulta — Top 10 por categoría (C.1), Top 10 por
rango de partidos (C.2). Se prohíbe cualquier comparación cara a cara entre
dos árbitros concretos: nunca dos radares superpuestos, nunca dos fichas
lado a lado con un "vs.".

**Razón**: un ranking filtrable es una consulta legítima sobre datos
estructurados; una comparación 1-a-1 convierte la herramienta de gestión en
un juicio directo entre personas, fuera del propósito del producto.

### VI. Dato Real y Sintético, Siempre Distinguibles
Todo campo que no provenga de una fuente verificable (scraping público FFCV,
circulares oficiales, export del comité) se marca como sintético con su
`_fuente` en el dato, nunca mezclado sin trazabilidad. Ante el comité o
cualquier demo, no se presenta una capacidad construida sobre datos
sintéticos como si estuviera terminada con dato real — se muestra como lo
que es: el mecanismo funcionando, a la espera del dato real que lo hará
operativo.

**Razón**: el bloqueante estructural del proyecto desde el primer día es la
falta de dato real de evaluaciones; disolver la frontera entre real y
sintético — aunque sea sin querer — genera expectativas que el producto no
puede sostener todavía.

### VII. Nada Se Construye Sobre Persistencia Que No Existe
Ninguna acción que el usuario perciba como guardada (nota, confirmación de
designación, override) se expone en la interfaz sin persistencia real
detrás. Antes de añadir funcionalidad nueva encima de una base de datos que
no persiste, se resuelve la persistencia de esa base. Un botón "Guardar"
que solo actualiza estado local de React es un defecto, no una versión
simplificada aceptable.

**Razón**: construir funcionalidad nueva sobre cimientos que no persisten
multiplica el trabajo de migración futura y erosiona la confianza del
usuario en que sus acciones tienen efecto real.

## Restricciones de Producto y Alcance

- **Nombre "Colegial"**: nombre de trabajo, no decisión cerrada. Se usa en
  código y documentación como placeholder hasta que se fije uno definitivo;
  no se lee como algo resuelto en ningún documento ni comunicación externa.
- **Motor de designación**: se construye y se implementa de verdad en v1
  (filtro duro + score blando + coste), pero no se libera al comité como
  funcionalidad operativa hasta disponer de dato real de evaluaciones. Hasta
  entonces es un mecanismo verificable en demo, no un sistema en producción
  tomando decisiones reales.
- **Recomendaciones, Económico, Consultar con IA**: módulos futuros (v2/v3).
  Se enseñan siempre como vista previa bloqueada (`BannerV2`, candado +
  versión visible), nunca como funcionalidad operativa parcial o simulada.
- **Integraciones externas**: ninguna conexión a Novanet que no sea la API
  oficial autorizada. No se construyen integraciones no oficiales aunque
  sean técnicamente posibles.
- **Datos personales**: nombres, licencias y datos de árbitros son
  información sensible aunque procedan de fuente pública (FFCV). El repositorio
  del proyecto es privado; no se publican exports ni capturas con datos
  reales de árbitros fuera de los canales acordados con el comité.

## Estándares de Interfaz y Código

- Verbos activos en botones, español, sentence case. El nombre de una acción
  se mantiene en todo el flujo (botón "Guardar nota" → toast "Nota guardada").
- Cifras siempre en fuente monoespaciada con `tabular-nums`.
- Estados vacío, carga y error son obligatorios en toda pantalla nueva antes
  de mergear — no se añaden "después" como deuda técnica aceptada.
- Sin librerías de componentes externas (shadcn, MUI, etc.): componentes
  propios sobre Tailwind. Nombres canónicos que se mantienen al extraer
  componentes del prototipo: `Panel`, `Semaforo`, `Avatar`, `Escudo`, `Chip`,
  `Eyebrow`, `Disciplina`, `BannerV2`, `FichaHeader`.
- Lógica de cálculo (`estadoForma()`, `radarSkills()`, scoring del motor de
  designación) vive en `lib/` con tests de casos borde (menos de 5 informes,
  sin pruebas físicas, un solo informe, sin candidatos disponibles).

## Flujo de Trabajo (SDD + Colaboración Remota)

- El proyecto se gestiona con Spec-Driven Development (GitHub Spec Kit):
  cada módulo funcional tiene su carpeta en `specs/NNN-nombre-modulo/` con
  `spec.md` (qué y por qué), `plan.md`/`design.md` (cómo) y `tasks.md`
  (desglose accionable). Ver `.specify/` para plantillas y scripts de fase.
- Esta constitución manda sobre cualquier documento previo
  (`docs/decisiones-producto.md`, `colegial-frontend-guia.md`,
  `CLAUDE-frontend.md`, `docs/product-vision.md`, etc.) donde haya conflicto.
  Esos documentos se conservan como registro histórico del porqué de cada
  decisión, pero dejan de ser la fuente de verdad operativa una vez migrado
  su contenido a una spec.
- **Repo único, rama `main` como fuente de verdad compartida** entre los dos
  colaboradores del proyecto trabajando en remoto. Cada spec/feature se
  desarrolla en su propia rama (`NNN-nombre-modulo`) y se integra a `main`
  vía merge — no se trabaja en paralelo sobre `main` directamente para
  evitar conflictos entre ambos.
- Antes de generar código para un módulo nuevo o retomar uno existente, debe
  existir su `spec.md` aprobado. No se construye pantalla ni funcionalidad
  sin spec — igual que antes se exigía "primero se especifica en la guía,
  luego se construye" (`CLAUDE-frontend.md`), ahora formalizado como spec.

## Governance

- Esta constitución tiene autoridad sobre cualquier otro documento del
  proyecto en caso de conflicto. Las specs individuales heredan sus
  principios; una spec que contradiga la constitución debe justificar la
  excepción explícitamente (sección "Complexity Tracking" del plan) o
  cambiar la constitución primero.
- **Enmiendas**: se realizan con `/speckit-constitution`, nunca editando el
  fichero a mano fuera de ese flujo, para mantener el Sync Impact Report y
  la propagación a plantillas dependientes. Versión semántica: MAJOR para
  eliminar/redefinir principios de forma incompatible, MINOR para añadir
  principios o secciones, PATCH para aclaraciones sin cambio de fondo.
- **Revisión de cumplimiento**: cada `plan.md` generado por `/speckit-plan`
  pasa por su "Constitution Check" antes de generar tareas; cualquier
  violación debe justificarse ahí o resolverse antes de continuar.

**Version**: 1.0.0 | **Ratified**: 2026-07-24 | **Last Amended**: 2026-07-24
