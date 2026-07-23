# CLAUDE.md — Frontend de Colegial

Instrucciones para Claude Code al trabajar en el frontend de este proyecto. El backend (Supabase, modelo de datos, integración Novanet) tiene su propia documentación; esto cubre todo lo visual y de flujos.

## Documentos de referencia (leer antes de tocar UI)

**Empieza por `docs/estado-actual.md` y `docs/sprints.md` (22 jul 2026)** — fotografía de qué existe hoy (la app real vive en `webapp/`, no en el `.jsx` suelto de la raíz) y el plan de trabajo vigente. Todo lo de abajo queda subordinado a esos dos si hay conflicto de fechas.

0. `docs/decisiones-producto.md` — registro cronológico de decisiones (11 secciones al 22 jul 2026), con el porqué de cada una. Reconcilia esta guía con `docs/product-vision.md`/`docs/kpis.md`/`docs/data-model.md`, escritos antes y no referenciados aquí originalmente. **Manda sobre los puntos 1-3 siguientes donde haya conflicto** (alcance multi-tenant, si asignación va en v1, rankings vs. comparación).
1. `colegial-frontend-guia.md` — el contrato de diseño: tokens, componentes canónicos, flujos, estados y catálogo de módulos futuros.
2. `colegial-theme.js` — tokens en código. Importar de aquí; no duplicar valores hex en componentes.
3. `crm-expedientes.jsx` (raíz del repo) — prototipo original de referencia, superado como código por `webapp/components/CRMExpedientes.jsx` (la app real, con dataset de 200 árbitros real+sintético y motor de designación funcionando). Útil solo para consultar el lenguaje visual original.
4. `colegial-traspaso-tecnico.md` — **sigue sin escribirse formalmente**, pero ya no es información que falte: la lógica real de `estadoForma()` vive en `webapp/components/CRMExpedientes.jsx` (B.2, sin shrinkage todavía) y el score B.1 con shrinkage bayesiano ya está implementado en `webapp/lib/motorAsignacion.js` contra `docs/kpis.md` sección B — ver `docs/decisiones-producto.md` §10.

## Reglas que no se negocian en frontend

- **FFCV como cliente único en v1:** ningún color, logo o nombre de federación hardcodeado en componentes — todo sale del tema activo (`THEMES`). Pero no se construye selector de territorial ni tabla `federaciones`/`tema_json` en v1; eso es diseño para un futuro segundo cliente, no requisito actual. Ver `docs/decisiones-producto.md` punto 1.
- **Verde/ámbar/rojo son solo estados** (semáforo, avisos). Jamás identidad de federación.
- **Todo indicador calculado es explicable:** el semáforo muestra su media, el radar sus fuentes. Color sin número, prohibido.
- **Cifras siempre en mono + `tabular-nums`.**
- **La indisponibilidad nunca puntúa** ni aparece en contextos de evaluación; solo como dato de planificación con su disclaimer.
- **Los módulos no activos se enseñan bloqueados** con `BannerV2` (candado + versión), nunca como funcionalidad operativa.
- **Verbos activos en botones**, español, sentence case. El nombre de una acción se mantiene en todo el flujo (botón "Guardar nota" → toast "Nota guardada").
- Estados vacío/carga/error obligatorios en cada pantalla nueva (patrones en la guía, sección 4).
- Sin librerías de componentes externas (shadcn, MUI…): componentes propios sobre Tailwind.

## Flujo de trabajo

- Pantalla nueva → primero se especifica en la guía (sección 4) → luego se construye.
- Una rama por pantalla; captura de pantalla en el PR; revisión contra la guía antes de merge.
- Al extraer componentes del prototipo a `components/`, mantener los nombres canónicos: `Panel`, `Semaforo`, `Avatar`, `Escudo`, `Chip`, `Eyebrow`, `Disciplina`, `BannerV2`, `FichaHeader`.
- La lógica de `estadoForma()` y `radarSkills()` se mueve a `lib/` con tests (casos borde: menos de 5 informes, sin pruebas físicas, un solo informe).

## Qué NO construir sin decisión de producto

- Nada del catálogo de módulos futuros (guía, sección 6) más allá de su vista previa bloqueada.
- Ninguna comparación cara a cara entre dos árbitros concretos (radares superpuestos, fichas lado a lado con un "vs."). Los listados ordenados por score (Top 10 por categoría/ventana de partidos, `docs/kpis.md` C.1/C.2) sí están permitidos — no son comparación, son consulta.
- Ninguna conexión a Novanet que no sea la API oficial autorizada.
- El motor de asignación/recomendaciones no se construye funcional en v1 — solo su vista previa bloqueada (`docs/decisiones-producto.md` punto 2).
