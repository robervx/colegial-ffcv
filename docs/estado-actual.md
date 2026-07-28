# Estado actual del proyecto — 28 jul 2026

Fotografía de lo construido hasta hoy. Si vuelves a esta conversación más tarde, o alguien nuevo se incorpora, empieza por aquí — es más fiable que reconstruir la historia leyendo el chat.

**Punto exacto en el que se dejó esta sesión (28 jul 2026):**

1. `specs/001-dashboard-operativo/` — **completada** de punta a punta.
2. `specs/002-disponibilidad-arbitro/` — **completada** de punta a punta (spec → plan → tasks → implementación real, ver punto 3).
3. `specs/003-persistencia-real/` — **completada, T001-T030, las tres user stories**:
   - **US1** (27 jul): "Guardar nota" en la ficha persiste de verdad contra Supabase (`anotaciones`).
   - **US2** (28 jul): página "Designación" pasa de informativa a operativa — botones reales "Confirmar" y "Elegir este candidato" (con motivo obligatorio si se cambia del sugerido), persistidos en `designaciones` (`lib/designacionesRepo.js`). Una vez decidido un partido, la fila muestra la decisión tomada (candidato, rol, fecha, motivo) en vez de recalcular el estado en vivo.
   - **US3** (28 jul): `002-disponibilidad-arbitro` queda operativa de principio a fin — selector "ver como: árbitro/comité" y selector de disponibilidad en la ficha (validado contra `lib/reglaFestivo.js`, 15 días de antelación para festivo), log histórico con distinción justificada/no justificada, patrón de implicación (`lib/patronImplicacion.js`) visible solo en modo comité. El Dashboard (001) ya no usa disponibilidad sintética para "Cobertura por categoría" — consume `disponibilidadRepo.obtenerVigentesPorCiclo(cicloId)` (función nueva, no estaba en el contrato original de 002, añadida para no hacer ~200 llamadas individuales a Supabase por carga de Dashboard).
   - Todo verificado en navegador (no solo compilación), 30/30 tests Vitest, lint sin errores. Detalle completo en `docs/decisiones-producto.md` §19.
   - **Revisión posterior (28 jul, sesión en paralelo)**: una revisión senior detectó dos huecos y se resolvieron sin tocar la parte de la spec que otra ventana tenía en curso (US2/US3) — coordinado en el propio chat para no pisar ficheros sin commitear:
     - `lib/disponibilidadRepo.js` lanzaba excepción en `obtenerLog`/`obtenerVigente`/`calcularPatronImplicacion`/`obtenerVigentesPorCiclo`, distinto del convenio `{ ok, error }` ya usado por `anotacionesRepo.js`/`designacionesRepo.js`. Unificado: las cuatro funciones devuelven ahora `{ ok, ... }`, ninguna lanza — actualizados los dos puntos de llamada en `CRMExpedientes.jsx` (Ficha y Dashboard) y el contrato `specs/002-disponibilidad-arbitro/contracts/disponibilidad-repo.md`. Verificado en navegador contra Supabase real (Dashboard con cobertura por categoría, Ficha con disponibilidad/patrón de implicación) sin errores de consola.
     - 3 warnings de `npm run lint` resueltos: imports sin usar (`Mailbox`, `Ruler` de `lucide-react`) y el `<img>` del `Escudo` migrado a `next/image` (`width`/`height` = `size`, ya que el tamaño del logo es dinámico según el punto de uso).
   - **Pendiente suelto, no bloqueante**: `supabase/migrations/0004_endurecer_rls_solo_lectura_insercion.sql` (creada en esta misma revisión) sin aplicar contra el proyecto Supabase real — estrecha la política RLS de `FOR ALL` a `SELECT`+`INSERT`, quitando `UPDATE`/`DELETE` a `anon` (ninguna función de `lib/*Repo.js` los usa, es reducción de superficie sin coste funcional). Mismo paso manual que ya hizo Roberto para 0001-0003 (SQL Editor o sync GitHub↔Supabase).

**Despliegue**: la app está en producción en Vercel — `https://colegial-ffcv-one.vercel.app` (proyecto "Rober's projects" → `colegial-ffcv`, importado del repo de GitHub, redeploy automático en cada push a `main`). Verificado en el propio dominio de producción (no solo `localhost`): sin errores de consola, con el código de hoy desplegado (T017-T030 incluidos). **Pendiente**: activar la protección por contraseña del deployment (*Project Settings → Deployment Protection*, decisión ya tomada en `docs/decisiones-producto.md` §18) — no confirmado todavía si Roberto la activó.

**3 specs nuevas escritas y empujadas a GitHub, cada una en su propia rama (`004-roles-permisos`, `005-equipos`, `006-partidos`), NINGUNA implementada todavía** — son solo `spec.md` en estado Draft, ni siquiera tienen `/speckit-plan`. Roberto lo confirmó explícitamente (28 jul 2026): mejor esperar al momento adecuado para construirlas, no hay prisa.

- `specs/004-roles-permisos/` — **pivotó de "selector ver-como sin login" a autenticación real** (Supabase Auth, enlace mágico por email, sin contraseña) tras una corrección de Roberto a media sesión. Incluye panel de administración (crear/editar rol/eliminar cuentas, historial de uso por usuario). **Rollout en 3 fases, no 2** (corregido dos veces en la propia sesión, ver `docs/decisiones-producto.md` §21-22):
  1. **Fase 1 (la fase actual)** — prototipo de demo, sin ninguna cuenta de nadie, ni siquiera admin/directiva. Se enseña con la contraseña única de Vercel a unas pocas personas de la comisión para que vean el potencial. Prioridad: nutrir de dato real todas las páginas (incluida ampliar `arbitros-200.json` a los ~1208 reales — ver pendiente más abajo). **`004-roles-permisos` no se implementa en esta fase.**
  2. **Fase 2** — si la demo convence, el comité da acceso a sus datos reales + ajustes; se crean las primeras cuentas reales, solo directiva/comisión y administrativos.
  3. **Fase 3** — si Fase 2 va bien, mejores datos + acceso a informadores y árbitros (estos últimos por categoría, empezando por Tercera Federación, la más alta, hasta cargar el roster completo).
  - **Bloqueante real señalado** (FR-012/SC-006 de la spec): los emails de árbitro en `arbitros-200.json` son sintéticos — no se puede dar de alta ninguna cuenta de árbitro real sin su email oficial verificado por el comité (misma clase de dependencia externa que el dato real de evaluaciones).
- `specs/005-equipos/` — perfil de equipo sobre dato real (`ffcv_public_data/`): tarjetas y goleadores por jugador y por equipo, listado filtrable, insights con cifra siempre visible. Dos cosas explícitamente fuera de alcance por falta de dato real: "sanciones" calculadas (falta normativa disciplinaria FFCV) y "titulares más frecuentes" (no hay alineaciones/convocatorias en el scraping, solo eventos de tarjeta/gol). Depende de 004 para visibilidad por rol.
- `specs/006-partidos/` — para cada partido del ciclo, perfiles de ambos equipos (reutiliza 005) + insight del cruce, árbitro con designación vigente ve su partido destacado, comentario estructurado de árbitros/informadores por equipo (append-only). Incluye como Historia 4 (P3, menor prioridad) la idea de registrar consultas de preparación del árbitro sobre su propio partido — descriptivo, nunca en `scoreB1` ni comparativo entre árbitros. Depende de 004 y 005.

**Nombre acordado para el conjunto de páginas interrelacionadas** (Árbitros, Equipos, Partidos, Designaciones — Económico es una vista calculada sobre ellas, no una entidad más): **"Núcleo de competición"**, distinto de "Roles y usuarios" (004) y "Evaluación" (bloqueado, dato real pendiente del comité).

**Pendiente de decidir cuando se retome** (ninguno bloquea nada, quedaron abiertos):
- Ampliar `arbitros-200.json` a los ~1208 árbitros reales — factible sin scraping nuevo (`generar_dataset_arbitros.py` recorta a 200 de un pool real completo, líneas 114-118), pero el listado de Árbitros no está virtualizado y no se ha probado a esa escala (`docs/sprints.md`). Decidir si se lanza igualmente o se virtualiza primero.
- Por cuál de las 3 specs nuevas seguir primero con `/speckit-plan` cuando llegue el momento (Roberto prefiere esperar, no hay orden fijado).

El plan técnico completo de 003 (esquema, contratos, decisiones) está en `specs/003-persistencia-real/plan.md`, `research.md`, `data-model.md` — no hace falta releer el chat, está todo documentado ahí. El detalle completo de toda esta sesión (pivote de auth, corrección de fases, nombre del núcleo de datos) está en `docs/decisiones-producto.md` §19-22.

**Después de roles/Equipos/Partidos**: seguía en el radar el orden previo — Simulaciones → Económico (`asignarJornada.js` ya sirve tal cual para Simulaciones; tarjetas/goles por equipo en `ffcv_public_data/` ya usados en Equipos) — sin fecha fija, se retoma la prioridad relativa cuando roles/Equipos/Partidos estén encaminados.

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
- [decisiones-producto.md](./decisiones-producto.md) — el detalle y el porqué de cada decisión, en orden cronológico (23 secciones, la última sobre la revisión de código del 28 jul)
- [sprints.md](./sprints.md) — plan de trabajo a partir de aquí, incluida la sección "Deuda técnica diferida a propósito" (CI, TypeScript, e2e, componentizar `CRMExpedientes.jsx`, RLS por rol) con el disparador de cada una — no se construyen antes de que se cumpla su condición
- [data-model.md](./data-model.md), [kpis.md](./kpis.md), [tarifas.md](./tarifas.md)
