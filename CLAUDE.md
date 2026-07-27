# Instrucciones para Claude Code en este repo

Si estás retomando este proyecto en una sesión nueva (tuya o de un compañero), lee en este orden antes de escribir código o proponer un plan:

1. **[docs/estado-actual.md](docs/estado-actual.md)** — punto exacto en el que se dejó la última sesión. Empieza siempre aquí, no reconstruyas el estado leyendo commits sueltos.
2. **[.specify/memory/constitution.md](.specify/memory/constitution.md)** — 7 principios con autoridad sobre cualquier otro documento del repo en caso de conflicto (incluidos `CLAUDE-frontend.md` y `colegial-frontend-guia.md`, que son historial parcialmente superado, no la fuente de verdad).
3. **[docs/sprints.md](docs/sprints.md)** y **[docs/decisiones-producto.md](docs/decisiones-producto.md)** — plan vigente y porqué de cada decisión.

## Regla no negociable: Spec-Driven Development

No se construye pantalla ni funcionalidad nueva sin que exista antes su `spec.md` en `specs/NNN-nombre-modulo/`, aprobada (checklist de calidad en verde, sin `[NEEDS CLARIFICATION]` pendientes). Flujo: `/speckit-specify` → `/speckit-plan` → `/speckit-tasks` → implementación. Si una spec entra en conflicto con la constitución, se justifica la excepción explícitamente (Complexity Tracking del plan) o se enmienda la constitución primero con `/speckit-constitution` — nunca se edita `constitution.md` a mano.

## Git

- Cada spec/feature en su propia rama (`NNN-nombre-modulo`), commits ahí, y merge explícito a `main` (`git merge --no-ff`, nunca fast-forward silencioso) — deja rastro de que fue una entrega completa, no cambios sueltos.
- Repo privado en GitHub (`robervx/colegial-ffcv`) — contiene datos de árbitros con licencia real, aunque proceda de scraping público FFCV (dato personal sensible, ver constitution.md "Restricciones de Producto y Alcance").
- Antes de lanzar `npm run dev` u otro proceso largo, comprueba si ya hay uno corriendo (`ps aux | grep next`) — el proyecto se trabaja a veces desde más de una sesión en paralelo.

## Cómo trabaja Roberto (product owner, árbitro FFCV licencia propia)

- **Dato real sobre sintético siempre que sea posible**, y los dos claramente separados y etiquetados en la UI (`· real` / `· sintético`) cuando se mezclan — nunca presentar una capacidad construida sobre dato sintético como si fuera dato real terminado.
- **Verificar en navegador antes de decir que algo funciona** — no basta con que compile. Capturas, clicks, consola sin errores.
- **Documentar cada decisión importante en el momento** (`docs/decisiones-producto.md`, con fecha y porqué), no dejarlo solo en el historial de chat.
- **Ser honesto sobre limitaciones y heurísticas propias no acordadas** — señalarlas explícitamente en vez de maquillar un resultado parcial.
- No decidir nombres/alcance de producto por cuenta propia si no está ya cerrado en la documentación — preguntar. ("Colegial" es nombre de trabajo, no decisión cerrada.)
- Cuando algo no tenga una respuesta clara desde el código o la documentación (arquitectura, alcance, qué prioridad tiene algo), preguntar antes de asumir — sobre todo si la decisión es cara de revertir (infraestructura, esquema de datos, tecnología nueva).

## webapp/

Tiene su propio `webapp/CLAUDE.md` → `webapp/AGENTS.md`: Next.js 16 con cambios que rompen respecto al conocimiento por defecto — léelo antes de escribir código de Next.js ahí. Variables de entorno: copiar `webapp/.env.example` a `webapp/.env.local` y rellenar con credenciales reales (pedirlas al equipo — nunca se commitean, `.env.local` está en `.gitignore`).
