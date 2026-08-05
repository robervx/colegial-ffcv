# User Flow de Colegial, por rol — 31 jul 2026

Este documento no inventa alcance nuevo: junta lo que ya está decidido sobre roles y navegación (`docs/decisiones-producto.md` §20-22, §27, y el propio código de `webapp/components/CRMExpedientes.jsx`) en un solo flujo, para poder verlo de un vistazo y detectar qué falta por cerrar antes de implementar `004-roles-permisos` de verdad. Acompaña al diagrama importable en Excalidraw: [`user-flow-por-rol.excalidraw`](./user-flow-por-rol.excalidraw).

**Lo que este documento NO hace**: no decide nada que no estuviera ya decidido. Donde el alcance por rol no está cerrado (la mayoría de "Administrativos", el aterrizaje de Informadores/Árbitros, el filtro informador↔partido), queda marcado explícitamente como **¿ABIERTO?** — es una pregunta para ti, no una respuesta que me haya inventado.

## 1. Cómo importar el diagrama

1. Abre [excalidraw.com](https://excalidraw.com) (gratis, sin cuenta).
2. Menú (☰, arriba a la izquierda) → **Open** → selecciona `docs/user-flow-por-rol.excalidraw`.
3. Se carga como una escena editable normal: puedes mover cajas, cambiar texto, añadir flechas — es tuyo desde ahí, no hace falta volver aquí para tocarlo.
4. Para guardar cambios: **Export → Save to disk** (sobrescribe el mismo `.excalidraw`) o **Save** si activas su almacenamiento local del navegador.

## 2. Las tres fases de acceso (ya decididas, `decisiones-producto.md` §22)

| Fase | Quién entra | Estado hoy |
|---|---|---|
| **Fase 1 — hoy** | Nadie tiene cuenta propia. Se enseña con la contraseña única de Vercel. El selector "Ver como" (comité / árbitro / informador) simula el rol sin login real. | **Activa** |
| **Fase 2** | Primeras cuentas reales: Directiva/Comité y Administrativos. | Pendiente de que la demo convenza |
| **Fase 3** | Informadores y Árbitros, por categoría (empezando por Tercera Federación). Login con email oficial del comité. | Pendiente de Fase 2 |

`004-roles-permisos` (rama propia, solo `spec.md`+`plan.md`, no implementada) es la spec que construye el login real y el panel de administración. No se toca hasta que arranque la Fase 2 — es el disparador ya documentado en `sprints.md`.

## 3. El hueco entre "5 roles" y lo que hoy existe en código

`decisiones-producto.md` §20 fija la filosofía de partida de 5 roles (Admin, Directiva, Administrativos, Informadores, Árbitros), pero el código de hoy solo implementa un toggle de desarrollo con **3 valores**: `comite`, `arbitro`, `informador` (`CRMExpedientes.jsx:908`, `:2158`). Es decir:

- **Admin y Directiva/Comité colapsan hoy en el mismo valor `"comite"`** — no hay forma de distinguirlos todavía (Configuración/panel de administración es una fachada de demo, `VistaRoles`, sin backend).
- **Administrativos no existe como valor propio en ningún sitio del código** — es el rol menos definido de los cinco, tanto en decisión de producto como en implementación.
- **Informador solo está implementado en Partidos**, y ahí mismo el código ya documenta su límite: "hoy ve lo mismo que comité" porque no existe la entidad que asignaría un informador a un partido concreto (`decisiones-producto.md` §27).

Esto no es un defecto — es exactamente lo que cabe esperar de una Fase 1 de demo (Principio VII: no se construye login real sobre roles que aún no están cerrados). Pero es la brecha que `004-roles-permisos` tiene que resolver antes de implementarse, y el diagrama la señala rol a rol.

## 4. Flujo por rol

Cada fila del diagrama sigue la misma secuencia: **Entrada → Aterrizaje → Núcleo de competición (Árbitros/Equipos/Partidos) → Designación → Sistema (Seguimiento operativo/Configuración/Glosario) → Acción característica**. Resumen en texto:

### Admin (Fase 2)
Todo, incluida Configuración — único rol con panel de administración de cuentas/roles e historial de uso (§20, §21). Aterriza en Cuadro de Mando, acceso completo al núcleo de competición y a Designación.

### Directiva / Comité (Fase 2)
Todo salvo Configuración. Es el rol que hoy está mejor cubierto por el código (`"comite"` en el toggle): confirma/cambia candidato de Designación con motivo obligatorio (Principio II), ve datos evaluativos (patrón de implicación, nunca visible al árbitro — Principio IV), gestiona bajas médicas.

### Administrativos (Fase 2) — el más abierto de los cinco
§20 solo dice "disponibilidad/designaciones + vista económica (Seguimiento operativo)". No está cerrado:
- Si ve fichas completas de Árbitros/Equipos/Partidos o una vista recortada.
- Cuál es su página de aterrizaje.
- Si participa en la decisión de Designación o solo en la logística alrededor (fechas, notificaciones).
- Si ve el patrón de implicación (dato evaluativo) o solo el dato operativo de disponibilidad.

### Informadores (Fase 3)
Fichas de árbitro + Equipos + Partidos, con permiso de comentar (estructura append-only ya prevista en `006-partidos`). Bloqueante de datos ya identificado: sin una entidad informador↔partido, no se puede filtrar "sus" partidos de verdad — hoy ve el mismo listado que comité, documentado como limitación, no como decisión de alcance.

### Árbitros (Fase 3)
El más acotado por los principios de gobernanza: **solo su propia ficha** (Principio V, nunca la de otro árbitro, nunca comparativa), Equipos y Partidos filtrados a los suyos para preparar el partido. No ve el motor de Designación, solo el resultado ya decidido. Declara su disponibilidad (motivo, festivo con 15 días de antelación), adjunta justificante PDF de baja médica, y puede consultar la preparación de su propio partido (evento de consulta registrado, nunca comparativo entre árbitros — idea capturada en §20, todavía sin implementar).

## 5. Preguntas abiertas (mismas del diagrama, para que quede por escrito aparte)

1. Página de aterrizaje para Administrativos, Informadores y Árbitros — sin definir.
2. Alcance exacto de Administrativos sobre Árbitros/Equipos/Partidos — hoy es "filosofía de partida", no un permiso cerrado campo a campo.
3. Si Informadores ven algún dato evaluativo (patrón de implicación) o solo lo descriptivo.
4. Falta la entidad informador↔partido para que el filtro "mis partidos" sea real, no solo el de comité duplicado.
5. Orden de rollout de Fase 3 por categoría — propuesto en §21 (Lliga Comunitat → Tercera Federación → Primera FFCV → Segona FFCV → Tercera FFCV), pendiente de confirmar contigo.
6. Quién marca la disponibilidad de un árbitro: ¿se autodeclara, o el comité la registra sobre lo que comunica por otro canal? (§15, sin resolver).
7. Umbral de "abuso" de festivos solicitados — hoy solo se dice que debe "quedar constancia", sin regla concreta.

Ninguna de estas siete bloquea seguir usando la app como está — son las que sí bloquean escribir `spec.md` de `004-roles-permisos` con precisión de verdad cuando llegue su turno.

## Ver también
- [decisiones-producto.md](./decisiones-producto.md) §20-22 (modelo de 5 roles, 3 fases), §27 (límite informador↔partido)
- [estado-actual.md](./estado-actual.md)
- [sprints.md](./sprints.md) — disparador de cuándo arranca `004-roles-permisos`
- `specs/004-roles-permisos/spec.md` (rama propia, Draft)
