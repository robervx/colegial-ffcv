# Colegial (nombre de trabajo) — CRM de árbitros y motor de designación · FFCV

CRM de gestión arbitral y motor de designación inteligente para el Comité Técnico de la Federació de Futbol Comunitat Valenciana (FFCV). "Colegial" es el nombre de trabajo, **no una decisión de producto cerrada** — ver `docs/decisiones-producto.md` §1.

## Empieza por aquí

Antes de tocar nada, en este orden:

1. **[docs/estado-actual.md](docs/estado-actual.md)** — fotografía de qué existe, qué es real vs. sintético, punto exacto en el que se dejó la última sesión. Es más fiable que reconstruir la historia leyendo commits o el chat.
2. **[.specify/memory/constitution.md](.specify/memory/constitution.md)** — los 7 principios que gobiernan el proyecto (con autoridad sobre cualquier otro documento en caso de conflicto). Ninguna funcionalidad se construye sin respetarlos.
3. **[docs/sprints.md](docs/sprints.md)** — plan de trabajo vigente.
4. **[docs/decisiones-producto.md](docs/decisiones-producto.md)** — registro cronológico de decisiones con el porqué, útil cuando algo no parece obvio.

## Cómo se desarrolla aquí (Spec-Driven Development)

El proyecto usa [GitHub Spec Kit](https://github.com/github/spec-kit): **no se construye pantalla ni funcionalidad sin spec aprobada primero**. Cada módulo funcional vive en `specs/NNN-nombre-modulo/` con `spec.md` (qué y por qué), `plan.md`/`research.md`/`data-model.md` (cómo) y `tasks.md` (desglose accionable). Flujo con Claude Code: `/speckit-specify` → `/speckit-plan` → `/speckit-tasks` → implementación.

Cada spec se desarrolla en su propia rama (`NNN-nombre-modulo`) y se integra a `main` con un merge explícito (`git merge --no-ff`) — no se trabaja en paralelo directamente sobre `main`.

## Estructura del repo

```
docs/                # documentación de producto (empezar por estado-actual.md)
specs/                # specs SDD: spec.md, plan.md, research.md, data-model.md, contracts/, tasks.md
.specify/             # toolkit de Spec Kit — constitution.md, plantillas, scripts de fase
webapp/               # la app real (Next.js 16, App Router) — ver webapp/AGENTS.md antes de tocar Next.js
ffcv_public_data/     # dataset real, scraping público de ffcv.es/competiciones
generar_*.py          # scripts que producen webapp/data/*.json a partir del dato real + capa sintética
```

**No hay backend todavía en `main` salvo lo que entregue `specs/003-persistencia-real/`** — hasta esa spec, todo el dato de trabajo vive en JSON estáticos generados por los scripts `.py`, importados estáticamente por React.

## Arrancar en local

```bash
cd webapp
npm install
cp .env.example .env.local   # rellenar con las credenciales reales de Supabase (pedirlas al equipo, nunca inventarlas)
npm run dev
```

Antes de lanzar un servidor de desarrollo, comprueba si ya hay uno corriendo de otra sesión en paralelo (`ps aux | grep next`) — este proyecto se trabaja a veces desde más de una sesión de Claude Code a la vez.

```bash
npm test    # Vitest — tests de lib/ (lógica de cálculo pura)
npm run lint
```

## Cosas que no se hacen aquí (ver constitution.md para el detalle completo)

- No se construye ninguna acción que "parezca guardada" sin persistencia real detrás.
- No se mezcla dato real y sintético sin distinguirlo visualmente en la UI.
- No se compara a dos árbitros cara a cara (radares superpuestos, fichas lado a lado).
- La disponibilidad/disciplina de un árbitro es dato de gestión, nunca entra en un score de clasificación.
