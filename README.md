<p align="center">
  <img src="docs/assets/logo.png" alt="FFCV" height="90">
</p>

<h1 align="center">Colegial <sup><sub>(nombre de trabajo)</sub></sup></h1>
<p align="center">
  CRM de gestión arbitral y motor de designación inteligente para el<br>
  Comité Tècnic d'Àrbitres de la Federació de Futbol Comunitat Valenciana (FFCV)
</p>

<p align="center">
  <a href="LICENSE"><img alt="License: Apache 2.0" src="https://img.shields.io/badge/license-Apache%202.0-blue.svg"></a>
  <img alt="Next.js 16" src="https://img.shields.io/badge/Next.js-16-black">
  <img alt="Status" src="https://img.shields.io/badge/estado-prototipo%20en%20evolución-orange">
</p>

---

## Qué es esto

Una app real (no un mockup) construida sobre **25.256 partidos y ~1.400 árbitros reales** de la temporada 2025/26 de la FFCV (scraping público, sin login), con un motor de designación que calcula filtro duro, score con *shrinkage* bayesiano y coste económico real (kilometraje, dietas, término municipal) según las circulares oficiales del comité.

Nace de un problema que conozco de primera mano: soy árbitro de la FFCV, y la gestión actual de designaciones, disponibilidad y seguimiento del comité es manual y en papel/intranet. Este proyecto es un prototipo de cómo podría ser una herramienta moderna para ese trabajo — pensado para presentárselo al comité, no (todavía) un producto en producción con sus datos reales de gestión interna.

**🔗 Demo:** [colegial-ffcv-one.vercel.app](https://colegial-ffcv-one.vercel.app) *(prototipo de demo, puede estar protegido por contraseña en un momento dado)*

## Dato real vs. sintético — por qué importa

El proyecto distingue en todo momento qué dato es verificable y cuál es relleno necesario mientras no existe una fuente real:

| | |
|---|---|
| ✅ **Real** | Partidos, equipos, campos, calendario, resultados, tarjetas y goles 2025/26, tarifas oficiales — todo scraping público de `ffcv.es/competiciones`, sin login. |
| 🧪 **Sintético** | Evaluaciones, disponibilidad, contacto, pruebas físicas/teóricas — no existe ningún export oficial del comité todavía, así que se genera de forma explícita y se etiqueta como tal en la UI (`· real` / `· sintético`). |

**Nota de privacidad:** los nombres de árbitros y jugadores que aparecen en la app son **sintéticos**, generados de forma determinista a partir del identificador real de cada persona (ver [`scripts/anonimizar_personas.py`](scripts/anonimizar_personas.py)). El resto de la estadística (partidos, tarjetas, goles, equipos) es real — solo la identidad de las personas se sustituye, porque siguen siendo datos personales aunque la fuente sea pública.

## Por qué existe (y qué resuelve)

- **Motor de designación por jornada**: filtro duro (incompatibilidades, disponibilidad, categoría), score B.1 con *shrinkage* bayesiano, coste real, con revisión humana obligatoria antes de confirmar.
- **Ficha de árbitro**: historial real de partidos, disciplina, disponibilidad declarada y validada (regla de 15 días para festivos), seguimiento del comité.
- **Cuadro de mando operativo**: cobertura por categoría, equidad de carga, KPIs siempre explicables (ningún número aparece sin su fuente).
- **Equipos y Partidos**: perfil de cada equipo y cruce entre rivales sobre datos reales de la temporada.

## Stack técnico

Next.js 16 (App Router) · React 19 · Tailwind CSS 4 · Recharts · Supabase (Postgres + RLS) · Vitest · Python (pandas) para la generación del dataset de trabajo.

Desarrollado con **[Spec-Driven Development](https://github.com/github/spec-kit)**: ninguna pantalla se construye sin una spec aprobada antes (`specs/NNN-nombre-modulo/`). El detalle completo del proceso, las decisiones de producto y el estado exacto del proyecto está en [`docs/`](docs/) — ver más abajo.

## Estructura del repo

```
webapp/               # la app (Next.js 16 App Router) — ver webapp/AGENTS.md antes de tocar Next.js
scripts/              # pipeline Python: scraping público, geolocalización, generación de webapp/data/*.json
ffcv_public_data/     # dataset real (scraping público ffcv.es/competiciones, sin login)
docs/                 # documentación de producto — empezar por docs/estado-actual.md
specs/                # specs SDD: spec.md, plan.md, research.md, data-model.md, tasks.md
supabase/             # migraciones SQL
.specify/             # toolkit de Spec Kit (constitution.md, plantillas)
archive/              # prototipos/referencias previas, ya superadas
```

## Arrancar en local

```bash
cd webapp
npm install
cp .env.example .env.local   # credenciales de tu propio proyecto Supabase
npm run dev
```

```bash
npm test    # Vitest — lógica de cálculo pura (lib/)
npm run lint
```

Para regenerar el dataset de trabajo (`webapp/data/*.json`) desde `ffcv_public_data/`:

```bash
pip install -r scripts/requirements.txt
python3 scripts/generar_dataset_arbitros.py
python3 scripts/generar_agregados.py
python3 scripts/generar_analitica_avanzada.py
```

## Documentación completa

Si quieres entender el porqué de cada decisión, no solo el qué:

1. [`docs/estado-actual.md`](docs/estado-actual.md) — fotografía de qué existe hoy, qué es real/sintético, punto exacto en el que se dejó el desarrollo.
2. [`.specify/memory/constitution.md`](.specify/memory/constitution.md) — los 7 principios que gobiernan el proyecto.
3. [`docs/sprints.md`](docs/sprints.md) y [`docs/decisiones-producto.md`](docs/decisiones-producto.md) — plan vigente y registro cronológico de decisiones con su porqué.

## Licencia

Apache License 2.0 — ver [`LICENSE`](LICENSE). Libre de usar, modificar y redistribuir citando la autoría original.

## Contacto

Soy Roberto Cerdán Gómez, árbitro de la FFCV y autor de este proyecto. Si quieres comentar el proyecto, proponer colaborar en su desarrollo, o simplemente charlar sobre el problema que intenta resolver:

📧 **robertocerdangomez@gmail.com**

También puedes abrir un [issue](../../issues) en el repo, o ver [`CONTRIBUTING.md`](CONTRIBUTING.md) si quieres proponer un cambio.
