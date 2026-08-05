<!--
Documento externo, genérico (no escrito para este proyecto), aportado por
Roberto el 29 jul 2026 como referencia de buenas prácticas de modelado de
datos. Se conserva aquí SIN adaptar su contenido para que quede versionado
en el repo (antes solo existía en ~/Downloads, fuera de git) y para que
.claude/agents/data-model-reviewer.md tenga una copia estable que consultar.

No sustituye a `.specify/memory/constitution.md` (que sigue mandando sobre
cualquier documento del repo en caso de conflicto) ni a `docs/data-model.md`
o `specs/*/data-model.md` (que describen el modelo real de este proyecto).
Úsalo como checklist de revisión (sus secciones 19, 20, 21 y 23 son las más
directamente aplicables aquí), no como fuente de verdad sobre lo que este
proyecto ya decidió.

Diagnóstico de contraste entre este documento y el estado real del
proyecto: ver conversación del 29 jul 2026 en `docs/decisiones-producto.md`
(o el chat correspondiente) — resumen: alineación conceptual alta (§25 de
este documento coincide con la "Decisión semántica central" ya adoptada),
pero brecha física real: las entidades maestras (Árbitro, Equipo,
Competición, Partido) viven hoy en JSON/CSV generado por scripts Python,
no en tablas Supabase con FK real — solo `anotaciones`, `designaciones` y
`declaraciones_disponibilidad` existen como tablas reales
(`supabase/migrations/`). Preguntas abiertas de la §27 de este documento
con evidencia real ya disponible: "rol arbitral" (el scraping público SÍ
captura hasta 4 oficiales por partido vía `orden` en
`ffcv_public_data/arbitros_partido.csv`, pero `tipo_arbitro` está vacío y
el motor de asignación asigna un único árbitro por partido, sin distinguir
principal/asistente) y "Club vs Equipo" (no distinguido, club solo
aparece embebido en el string del nombre de equipo).
-->

# Referencia de modelado de datos — Aplicación para Comité de Árbitros de Fútbol

## 1. Propósito del documento

Este documento establece un criterio común para analizar, diseñar y revisar el modelo de datos de la aplicación del Comité de Árbitros de Fútbol.

Su función es servir como referencia durante el desarrollo para:

- comprobar si las entidades y relaciones representan correctamente la realidad del negocio;
- evitar que la estructura de páginas condicione de forma incorrecta el modelo de datos;
- distinguir entre datos maestros, datos de referencia, transacciones e históricos;
- definir reglas de negocio, restricciones e integridad;
- facilitar futuras ampliaciones sin degradar el diseño;
- revisar migraciones, tablas, APIs, formularios y permisos;
- mantener una terminología coherente en todo el proyecto.

La idea principal es:

> La interfaz representa tareas del usuario. El modelo de datos representa la realidad del dominio y sus reglas.

Por tanto:

```text
Página ≠ entidad
Página ≠ tabla
Formulario ≠ modelo de dominio
```

---

## 2. Dominio de negocio

### 2.1. Definición

El dominio de negocio de la aplicación es:

> Gestión arbitral de competiciones de fútbol, incluyendo árbitros, partidos, equipos, disponibilidad, designaciones, roles, estados, evaluaciones, incidencias, notificaciones y trazabilidad.

El dominio no es una tabla concreta. Tampoco es la página "Árbitros" o la página "Partidos". Es el conjunto de conceptos, procesos, actores y reglas que describen la actividad real que la aplicación debe soportar.

### 2.2. Posibles subdominios

El dominio general puede dividirse en subdominios funcionales:

```text
Gestión arbitral de fútbol
├── Gestión de árbitros
├── Gestión de competiciones
├── Gestión de partidos
├── Gestión de equipos
├── Gestión de disponibilidad
├── Gestión de designaciones
├── Gestión de evaluaciones
├── Gestión de incidencias
├── Gestión de liquidaciones y desplazamientos
├── Gestión de notificaciones
└── Auditoría y trazabilidad
```

Esta división ayuda a organizar responsabilidades, módulos, permisos y futuros desarrollos.

---

## 3. Tipos de elementos del modelo

## 3.1. Entidad

Una entidad representa algo relevante del mundo real que necesita identidad propia y sobre lo que se almacenan datos.

Ejemplos:

- Árbitro
- Partido
- Equipo
- Competición
- Instalación
- Designación
- Evaluación
- Indisponibilidad

Ejemplo:

```text
Entidad conceptual: Árbitro
Tabla física: arbitro
Instancia concreta: árbitro con id 154
Página: ficha o listado de árbitros
```

Estos cuatro conceptos no deben confundirse.

## 3.2. Atributo

Un atributo es una propiedad de una entidad.

Ejemplo para `arbitro`:

```text
id_arbitro
nombre
apellidos
email
telefono
fecha_nacimiento
categoria
estado
activo
```

Ejemplo para `partido`:

```text
id_partido
fecha_hora
jornada
competicion
equipo_local
equipo_visitante
instalacion
estado
```

## 3.3. Relación

Una relación expresa cómo se conectan dos entidades.

Ejemplos:

```text
Una competición contiene partidos.
Un equipo disputa partidos.
Un árbitro recibe designaciones.
Una designación corresponde a un partido.
Una designación asigna un rol a un árbitro.
```

## 3.4. Regla de negocio

Una regla de negocio expresa una condición propia del funcionamiento real del comité.

Ejemplos:

- un árbitro no puede tener dos partidos solapados;
- un árbitro no puede ser designado durante una indisponibilidad;
- un partido no puede enfrentar al mismo equipo contra sí mismo;
- un partido debe tener un árbitro principal;
- determinados partidos requieren asistentes;
- una designación anulada no puede pasar directamente a completada;
- un árbitro solo puede actuar en categorías compatibles;
- una incompatibilidad con un equipo debe bloquear o advertir la designación;
- un partido suspendido puede requerir anular o recalcular designaciones.

Las reglas de negocio pueden implementarse mediante:

- restricciones SQL;
- claves únicas;
- claves foráneas;
- funciones;
- triggers;
- lógica de aplicación;
- workflows;
- validaciones;
- políticas de acceso.

---

## 4. Cardinalidades

La cardinalidad define cuántas instancias de una entidad pueden relacionarse con otra.

### 4.1. Uno a muchos — 1:N

Ejemplos:

```text
Competición 1:N Partido
Árbitro 1:N Designación
Partido 1:N Designación
Rol arbitral 1:N Designación
Designación 1:N Historial de estados
```

Interpretación:

- una competición puede tener muchos partidos;
- cada partido pertenece a una competición;
- un árbitro puede tener muchas designaciones;
- cada designación pertenece a un árbitro.

### 4.2. Muchos a muchos — N:M

Ejemplo conceptual:

```text
Árbitro N:M Partido
```

Un árbitro puede participar en muchos partidos y un partido puede tener varios árbitros.

En una base de datos relacional, esta relación debe resolverse mediante una entidad asociativa:

```text
Árbitro 1:N Designación N:1 Partido
```

### 4.3. Opcionalidad

Notación útil:

```text
0..1 = cero o uno
1    = exactamente uno
0..N = cero o muchos
1..N = uno o muchos
```

Ejemplos:

```text
Un árbitro puede tener 0..N designaciones.
Una designación debe tener exactamente 1 árbitro.
Un partido puede tener 0..N designaciones mientras está pendiente.
```

---

## 5. Entidades nucleares

## 5.1. Árbitro

Representa a una persona habilitada o registrada para ejercer funciones arbitrales.

Posibles atributos:

```text
id_arbitro
id_comite
nombre
apellidos
documento_identificativo
fecha_nacimiento
email
telefono
direccion
categoria_actual
fecha_alta
fecha_baja
estado
activo
created_at
updated_at
```

Consideraciones:

- no usar nombre, email o documento como clave primaria;
- la categoría puede requerir historial;
- el estado y el campo `activo` no deben duplicar significado sin necesidad;
- los datos personales requieren control de acceso;
- las incompatibilidades y disponibilidades no deben almacenarse como texto libre dentro de esta tabla.

## 5.2. Equipo

Representa a un equipo participante en una competición.

Posibles atributos:

```text
id_equipo
id_club
nombre
nombre_corto
categoria
localidad
activo
created_at
updated_at
```

Debe decidirse si `club` y `equipo` son la misma entidad o entidades distintas.

Ejemplo:

```text
Club: Valencia CF
Equipo: Valencia CF Juvenil A
Equipo: Valencia CF Juvenil B
```

Si el proyecto necesita distinguirlos, deben modelarse por separado.

## 5.3. Competición

Representa una competición organizada.

Posibles atributos:

```text
id_competicion
nombre
temporada
categoria
ambito
organizador
fecha_inicio
fecha_fin
estado
```

Una competición contiene partidos.

## 5.4. Partido

Representa un encuentro programado o celebrado.

Posibles atributos:

```text
id_partido
id_competicion
id_equipo_local
id_equipo_visitante
id_instalacion
jornada
fecha_hora
estado
resultado_local
resultado_visitante
observaciones
created_at
updated_at
```

Reglas mínimas:

```text
equipo_local ≠ equipo_visitante
fecha_hora obligatoria cuando el partido está programado
competición existente
equipos existentes
```

## 5.5. Designación

La designación es una entidad central del dominio.

Representa:

> La asignación de un árbitro a un partido, con un rol, un estado, unas fechas y un ciclo de vida propios.

No es una simple relación técnica. Tiene significado de negocio y atributos propios.

Posibles atributos:

```text
id_designacion
id_partido
id_arbitro
id_rol_arbitral
estado
fecha_designacion
fecha_comunicacion
fecha_respuesta
designado_por
motivo_rechazo
observaciones
created_at
updated_at
```

Relación:

```text
Árbitro 1:N Designación N:1 Partido
Rol arbitral 1:N Designación
```

Restricción orientativa:

```text
unique(id_partido, id_arbitro, id_rol_arbitral)
```

Debe valorarse si un árbitro puede tener más de un rol en el mismo partido. Si no puede, la restricción debería ser:

```text
unique(id_partido, id_arbitro)
```

---

## 6. Designación como entidad asociativa

Una relación simple podría decir:

```text
Árbitro participa en Partido
```

Pero la aplicación necesita guardar información de esa participación:

- rol;
- estado;
- fecha de designación;
- fecha de respuesta;
- aceptación;
- rechazo;
- motivo;
- sustitución;
- observaciones;
- usuario que designó;
- notificaciones;
- kilometraje;
- dieta;
- incidencias.

Cuando una relación tiene atributos y ciclo de vida propios, debe modelarse como entidad asociativa.

Ejemplo:

```text
Designación 3821
Partido: Equipo A - Equipo B
Árbitro: Laura Pérez
Rol: árbitra principal
Estado: aceptada
Fecha de designación: 2026-09-14
```

---

## 7. Equipo local y visitante

Existen dos diseños válidos.

## 7.1. Diseño simple

Guardar dos claves foráneas en `partido`:

```text
id_equipo_local
id_equipo_visitante
```

Ventajas:

- simple;
- fácil de consultar;
- adecuado si siempre hay dos equipos;
- adecuado si siempre existen los roles local y visitante.

Restricción mínima:

```sql
check (id_equipo_local <> id_equipo_visitante)
```

## 7.2. Diseño flexible

Crear una entidad asociativa:

```text
partido_equipo
```

Atributos posibles:

```text
id_partido
id_equipo
condicion
goles
abandono
observaciones
```

Ventajas:

- mayor flexibilidad;
- facilita registrar datos específicos de participación;
- evita columnas duplicadas;
- permite ampliar el modelo.

Inconveniente:

- aumenta complejidad;
- puede ser innecesario para una primera versión.

Criterio recomendado:

> Usar el modelo más simple que represente correctamente las reglas actuales, sin cerrar ampliaciones previsibles.

---

## 8. Datos maestros, datos de referencia y transacciones

## 8.1. Datos maestros

Representan entidades relativamente estables y reutilizadas por muchos procesos.

Ejemplos:

- árbitro;
- equipo;
- club;
- competición;
- instalación;
- comité.

## 8.2. Datos de referencia

Son listas controladas de valores permitidos.

Ejemplos:

- rol arbitral;
- estado de designación;
- categoría arbitral;
- tipo de competición;
- motivo de indisponibilidad;
- motivo de rechazo;
- estado de partido.

Su objetivo es evitar inconsistencias de texto.

Ejemplo incorrecto:

```text
Árbitro principal
Arbitro principal
Principal
ARBITRO PPAL.
```

Ejemplo correcto:

```text
id_rol_arbitral = 1
```

## 8.3. Datos transaccionales

Representan hechos, operaciones o eventos del negocio.

Ejemplos:

- partido;
- designación;
- indisponibilidad;
- evaluación;
- sustitución;
- liquidación;
- notificación.

## 8.4. Datos históricos y de auditoría

Registran cambios y trazabilidad.

Ejemplos:

- historial de designación;
- historial de categoría arbitral;
- cambios de estado;
- registro de notificaciones;
- auditoría de usuario;
- historial de sustituciones.

---

## 9. Claves e integridad

## 9.1. Clave primaria

La clave primaria identifica de forma única cada fila.

Ejemplo:

```text
id_arbitro
id_partido
id_designacion
```

Recomendación:

- utilizar identificadores técnicos estables;
- no depender de email, teléfono, nombre o documento;
- usar `bigint identity` o `uuid` según la arquitectura.

## 9.2. Clave foránea

Una clave foránea garantiza que una relación apunte a una fila existente.

Ejemplos:

```text
designacion.id_arbitro → arbitro.id_arbitro
designacion.id_partido → partido.id_partido
partido.id_competicion → competicion.id_competicion
```

## 9.3. Integridad referencial

Debe impedir situaciones como:

- designación asociada a un árbitro inexistente;
- partido asociado a una competición inexistente;
- equipo inexistente en un partido;
- historial asociado a una designación eliminada;
- rol arbitral inválido.

La integridad no debe depender exclusivamente de formularios o frontend.

---

## 10. Estados y ciclos de vida

## 10.1. Estado de designación

Posible catálogo inicial:

```text
propuesta
comunicada
aceptada
rechazada
anulada
sustituida
completada
```

Debe definirse:

- qué significa exactamente cada estado;
- quién puede realizar cada transición;
- qué transiciones son válidas;
- qué fechas deben registrarse;
- qué acciones derivadas se ejecutan.

Ejemplo de transición:

```text
propuesta → comunicada → aceptada → completada
```

O:

```text
propuesta → comunicada → rechazada
```

No todas las transiciones deben permitirse.

## 10.2. Estado de partido

Posible catálogo:

```text
borrador
programado
aplazado
suspendido
cancelado
celebrado
cerrado
```

Debe revisarse el efecto de cada cambio sobre las designaciones.

---

## 11. Estado actual frente a historial

Guardar solamente el estado actual no ofrece trazabilidad suficiente.

Ejemplo de estado actual:

```text
designacion.estado = aceptada
```

No responde:

- cuándo se propuso;
- cuándo se comunicó;
- quién cambió el estado;
- si fue rechazada previamente;
- si hubo una sustitución;
- cuál fue el motivo.

Modelo recomendado:

```text
designacion
└── designacion_estado_historial
```

Posibles atributos del historial:

```text
id_historial
id_designacion
estado_anterior
estado_nuevo
fecha_cambio
usuario_id
motivo
observaciones
```

---

## 12. Eventos de dominio

Un evento de dominio representa algo relevante que ya ha sucedido.

Ejemplos:

```text
PartidoCreado
PartidoAplazado
DesignacionPropuesta
DesignacionComunicada
DesignacionAceptada
DesignacionRechazada
ArbitroSustituido
PartidoSuspendido
EvaluacionRegistrada
```

Estos eventos pueden servir para:

- auditoría;
- notificaciones;
- integraciones;
- automatizaciones;
- trazabilidad;
- analítica;
- reconstrucción de procesos.

No es obligatorio implantar event sourcing. Puede bastar con tablas históricas y eventos operativos bien definidos.

---

## 13. Disponibilidad e indisponibilidad

La disponibilidad no debe reducirse a un único campo booleano en `arbitro`.

Modelo recomendado:

```text
indisponibilidad
```

Posibles atributos:

```text
id_indisponibilidad
id_arbitro
fecha_inicio
fecha_fin
motivo
tipo
observaciones
estado
created_at
```

Reglas:

- fecha_fin debe ser posterior o igual a fecha_inicio;
- no debe permitirse una designación incompatible sin advertencia o bloqueo;
- debe definirse si la indisponibilidad afecta a toda la franja o a horarios concretos;
- debe distinguirse entre ausencia, incompatibilidad, descanso, lesión u otros motivos si el negocio lo necesita.

---

## 14. Categoría arbitral e historial

Si la categoría de un árbitro puede cambiar por temporada o fecha, no conviene almacenar solamente:

```text
arbitro.categoria_actual
```

Modelo más sólido:

```text
arbitro_categoria
```

Posibles atributos:

```text
id_arbitro
id_categoria_arbitral
fecha_inicio
fecha_fin
temporada
motivo
```

Esto permite saber:

- categoría actual;
- categorías anteriores;
- fecha del cambio;
- vigencia durante una designación pasada.

---

## 15. Modelo conceptual mínimo

```text
COMITÉ
   │
   └── 1:N ── ÁRBITRO
                  │
                  ├── 1:N ── INDISPONIBILIDAD
                  │
                  ├── N:M ── CATEGORÍA ARBITRAL
                  │
                  └── 1:N ── DESIGNACIÓN
                                  │
                                  ├── N:1 ── PARTIDO
                                  │             │
                                  │             ├── N:1 ── COMPETICIÓN
                                  │             ├── N:1 ── EQUIPO LOCAL
                                  │             ├── N:1 ── EQUIPO VISITANTE
                                  │             └── N:1 ── INSTALACIÓN
                                  │
                                  ├── N:1 ── ROL ARBITRAL
                                  └── 1:N ── HISTORIAL DE ESTADOS
```

---

## 16. Modelo lógico inicial recomendado

### Comité

```text
id_comite
nombre
codigo
activo
```

### Árbitro

```text
id_arbitro
id_comite
nombre
apellidos
email
telefono
fecha_nacimiento
estado
activo
```

### Categoría arbitral

```text
id_categoria_arbitral
codigo
nombre
nivel
activo
```

### Árbitro-categoría

```text
id_arbitro
id_categoria_arbitral
fecha_inicio
fecha_fin
temporada
```

### Club

```text
id_club
nombre
localidad
activo
```

### Equipo

```text
id_equipo
id_club
nombre
nombre_corto
categoria
activo
```

### Competición

```text
id_competicion
nombre
temporada
categoria
ambito
estado
```

### Instalación

```text
id_instalacion
nombre
direccion
localidad
latitud
longitud
activo
```

### Partido

```text
id_partido
id_competicion
id_equipo_local
id_equipo_visitante
id_instalacion
jornada
fecha_hora
estado
resultado_local
resultado_visitante
```

### Rol arbitral

```text
id_rol_arbitral
codigo
nombre
orden
activo
```

### Designación

```text
id_designacion
id_partido
id_arbitro
id_rol_arbitral
estado
fecha_designacion
fecha_comunicacion
fecha_respuesta
designado_por
motivo_rechazo
observaciones
```

### Indisponibilidad

```text
id_indisponibilidad
id_arbitro
fecha_inicio
fecha_fin
motivo
tipo
estado
```

### Historial de designación

```text
id_historial
id_designacion
estado_anterior
estado_nuevo
fecha_cambio
usuario_id
motivo
observaciones
```

---

## 17. Modelo físico orientativo para Supabase/PostgreSQL

```sql
create table public.arbitro (
    id_arbitro bigint generated always as identity primary key,
    nombre text not null,
    apellidos text not null,
    email text unique,
    telefono text,
    activo boolean not null default true,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table public.equipo (
    id_equipo bigint generated always as identity primary key,
    nombre text not null,
    nombre_corto text,
    activo boolean not null default true,
    created_at timestamptz not null default now()
);

create table public.competicion (
    id_competicion bigint generated always as identity primary key,
    nombre text not null,
    temporada text not null,
    estado text not null,
    created_at timestamptz not null default now()
);

create table public.partido (
    id_partido bigint generated always as identity primary key,
    id_competicion bigint not null
        references public.competicion(id_competicion),
    id_equipo_local bigint not null
        references public.equipo(id_equipo),
    id_equipo_visitante bigint not null
        references public.equipo(id_equipo),
    fecha_hora timestamptz not null,
    jornada integer,
    estado text not null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    check (id_equipo_local <> id_equipo_visitante)
);

create table public.rol_arbitral (
    id_rol_arbitral smallint generated always as identity primary key,
    codigo text not null unique,
    nombre text not null,
    activo boolean not null default true
);

create table public.designacion (
    id_designacion bigint generated always as identity primary key,
    id_partido bigint not null
        references public.partido(id_partido),
    id_arbitro bigint not null
        references public.arbitro(id_arbitro),
    id_rol_arbitral smallint not null
        references public.rol_arbitral(id_rol_arbitral),
    estado text not null,
    fecha_designacion timestamptz not null default now(),
    fecha_comunicacion timestamptz,
    fecha_respuesta timestamptz,
    observaciones text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique (id_partido, id_arbitro, id_rol_arbitral)
);
```

Este SQL es orientativo. Debe adaptarse a las reglas reales antes de pasar a producción.

---

## 18. Páginas y modelo de datos

Las páginas actuales pueden ser:

```text
Árbitros
Partidos
Equipos
Designaciones
```

Pero una página puede utilizar muchas entidades.

### Página Partido

Puede requerir:

- partido;
- competición;
- jornada;
- equipo local;
- equipo visitante;
- instalación;
- designaciones;
- árbitros;
- roles;
- estado;
- incidencias.

### Página Designaciones

Puede requerir:

- designación;
- partido;
- árbitro;
- rol;
- disponibilidad;
- categoría arbitral;
- incompatibilidades;
- estado;
- notificaciones.

### Página Árbitro

Puede requerir:

- datos personales;
- categoría actual;
- historial de categorías;
- disponibilidad;
- designaciones;
- evaluaciones;
- incompatibilidades;
- liquidaciones.

Criterio:

> Diseñar las páginas según las tareas del usuario y las tablas según la estructura del dominio.

---

## 19. Preguntas de revisión del modelo

Antes de crear o modificar una tabla, responder:

### Sobre el concepto

- ¿Representa una entidad real del dominio?
- ¿Tiene identidad propia?
- ¿Tiene ciclo de vida?
- ¿Es una entidad, un atributo o un catálogo?
- ¿Es un hecho transaccional?
- ¿Debe conservar historial?

### Sobre las relaciones

- ¿Con qué entidades se relaciona?
- ¿Cuál es la cardinalidad?
- ¿La relación es obligatoria?
- ¿La relación tiene atributos propios?
- ¿Debe convertirse en entidad asociativa?

### Sobre los datos

- ¿Qué campos son obligatorios?
- ¿Qué valores son válidos?
- ¿Qué datos pueden cambiar?
- ¿Qué datos requieren historial?
- ¿Qué datos son sensibles?
- ¿Qué datos pueden derivarse y no deberían duplicarse?

### Sobre la integridad

- ¿Qué debe impedir la base de datos?
- ¿Qué claves foráneas son necesarias?
- ¿Qué combinaciones deben ser únicas?
- ¿Qué restricciones `check` son necesarias?
- ¿Qué ocurre al borrar una entidad relacionada?

### Sobre seguridad

- ¿Quién puede leer?
- ¿Quién puede crear?
- ¿Quién puede modificar?
- ¿Quién puede anular?
- ¿Quién puede ver datos personales?
- ¿Qué acciones deben auditarse?
- ¿Qué políticas RLS necesita Supabase?

---

## 20. Reglas de calidad del diseño

1. No crear una tabla porque exista una página.
2. No guardar listas controladas como texto libre.
3. No duplicar información que puede obtenerse por relación.
4. No confiar únicamente en validaciones del frontend.
5. No usar datos cambiantes como clave primaria.
6. No eliminar historial relevante.
7. No mezclar estado actual e histórico sin criterio.
8. No introducir campos genéricos como `datos`, `info` o `otros` sin justificar.
9. No usar una tabla universal para conceptos distintos.
10. No añadir complejidad teórica sin una necesidad real.
11. Definir los términos del negocio antes de implementarlos.
12. Proteger la integridad con PostgreSQL.
13. Versionar los cambios mediante migraciones.
14. Revisar el impacto de cada cambio en reglas, API, frontend y RLS.
15. Mantener un diccionario de datos actualizado.

---

## 21. Antipatrones a evitar

### 21.1. Una tabla por página

Problema:

```text
pagina_arbitros
pagina_partidos
pagina_designaciones
```

La base de datos no debe reflejar la navegación visual.

### 21.2. Estados como texto libre

Problema:

```text
aceptada
Aceptado
OK
confirmada
```

Solución:

- catálogo;
- enum controlado;
- restricción;
- máquina de estados.

### 21.3. Designación embebida en partido

Problema:

```text
partido.arbitro_principal
partido.asistente_1
partido.asistente_2
```

Puede funcionar para un caso rígido, pero dificulta:

- roles variables;
- sustituciones;
- historial;
- estados individuales;
- notificaciones;
- ampliaciones.

La entidad `designacion` suele ser más sólida.

### 21.4. Borrar registros para representar cambios

No borrar una designación rechazada o sustituida. Debe conservarse trazabilidad.

### 21.5. Campos calculados inconsistentes

Ejemplo:

```text
nombre_completo
```

Si se guarda junto con `nombre` y `apellidos`, puede quedar desactualizado. Debe justificarse o calcularse.

---

## 22. Prioridades para el MVP

Para una primera versión funcional, el núcleo debería ser:

```text
Árbitro
Equipo
Competición
Partido
Rol arbitral
Designación
Estado de designación
Indisponibilidad
Historial básico
Usuarios y permisos
```

Puede aplazarse:

- liquidaciones complejas;
- evaluaciones avanzadas;
- automatización completa;
- event sourcing;
- motor sofisticado de asignación;
- optimización algorítmica;
- analítica avanzada;
- integraciones externas.

El MVP debe permitir:

1. registrar árbitros;
2. registrar equipos y competiciones;
3. crear partidos;
4. registrar disponibilidad;
5. designar árbitros con un rol;
6. aceptar, rechazar, anular o sustituir;
7. consultar el historial;
8. controlar permisos;
9. impedir incoherencias básicas.

---

## 23. Criterios de aceptación para nuevas funcionalidades

Una funcionalidad relacionada con datos no debería considerarse terminada hasta comprobar:

- [ ] existe una definición clara del concepto;
- [ ] el modelo conceptual está revisado;
- [ ] las cardinalidades están definidas;
- [ ] las reglas de negocio están documentadas;
- [ ] las claves primarias y foráneas son correctas;
- [ ] existen restricciones de integridad;
- [ ] se han considerado los estados y su historial;
- [ ] se han definido permisos y políticas RLS;
- [ ] la migración es reproducible;
- [ ] existen datos de prueba;
- [ ] se han probado casos válidos e inválidos;
- [ ] la API devuelve datos coherentes;
- [ ] la interfaz no duplica lógica crítica;
- [ ] el diccionario de datos está actualizado;
- [ ] se ha evaluado el impacto sobre entidades existentes.

---

## 24. Glosario aplicado

| Término | Aplicación al proyecto |
|---|---|
| Dominio de negocio | Gestión arbitral del fútbol |
| Subdominio | Designaciones, disponibilidad, evaluaciones |
| Entidad | Árbitro, partido, equipo |
| Instancia | Un árbitro o partido concreto |
| Atributo | Nombre, fecha, estado |
| Relación | Un árbitro recibe una designación |
| Cardinalidad | Un partido tiene varias designaciones |
| Entidad asociativa | Designación |
| Dato maestro | Árbitro, equipo, competición |
| Dato de referencia | Rol, estado, categoría |
| Transacción | Crear o aceptar una designación |
| Clave primaria | `id_arbitro` |
| Clave foránea | `designacion.id_arbitro` |
| Integridad referencial | No permitir referencias inexistentes |
| Restricción | Local y visitante deben ser distintos |
| Regla de negocio | No designar a un árbitro indisponible |
| Evento de dominio | `DesignacionAceptada` |
| Historial | Cambios de estado de una designación |
| Modelo conceptual | Conceptos y relaciones |
| Modelo lógico | Entidades, atributos y cardinalidades |
| Modelo físico | Tablas PostgreSQL/Supabase |
| RLS | Control de acceso por fila en Supabase |
| Migración | Cambio versionado del esquema |

---

## 25. Decisión semántica central

El núcleo del modelo debe interpretarse así:

```text
Árbitro y Equipo son entidades maestras.
Partido es un hecho programado del calendario competitivo.
Designación es la asignación de un árbitro a ese partido,
con un rol, un estado y un ciclo de vida propios.
```

Esta definición debe guiar:

- tablas;
- relaciones;
- formularios;
- APIs;
- permisos;
- reglas;
- históricos;
- informes;
- futuras automatizaciones.

---

## 26. Próximos pasos recomendados

1. Inventariar las tablas actuales.
2. Identificar qué representa realmente cada tabla.
3. Comparar el modelo actual con este documento.
4. Detectar duplicidades, textos libres y relaciones implícitas.
5. Dibujar el modelo entidad-relación.
6. Definir catálogos y estados.
7. Documentar reglas de negocio.
8. Crear o revisar migraciones.
9. Configurar claves foráneas y restricciones.
10. Diseñar RLS por perfiles.
11. Crear datos semilla.
12. Probar casos límite.
13. Mantener este documento actualizado con cada decisión relevante.

---

## 27. Registro de decisiones pendientes

Completar durante el desarrollo:

```text
[ ] ¿Club y equipo son entidades distintas?
[ ] ¿Un árbitro puede tener dos roles en el mismo partido?
[ ] ¿Qué roles requiere cada tipo de partido?
[ ] ¿Qué estados exactos tiene una designación?
[ ] ¿Qué transiciones de estado están permitidas?
[ ] ¿Cómo se modelan las sustituciones?
[ ] ¿Cómo se registran las incompatibilidades?
[ ] ¿Cómo se gestiona la disponibilidad horaria?
[ ] ¿Qué datos personales puede consultar cada rol?
[ ] ¿Qué registros pueden eliminarse físicamente?
[ ] ¿Qué información debe conservarse por auditoría?
[ ] ¿La categoría arbitral necesita historial por temporada?
[ ] ¿Cómo se modelan partidos aplazados o repetidos?
[ ] ¿Cómo se gestionan notificaciones y confirmaciones?
[ ] ¿Qué reglas deben bloquear y cuáles solo advertir?
```

---

## 28. Mantenimiento del documento

Este documento debe tratarse como una referencia viva.

Debe actualizarse cuando:

- se añada una entidad relevante;
- cambie una regla de negocio;
- se modifique un estado;
- se cambie una cardinalidad;
- se introduzca un nuevo rol;
- se alteren permisos;
- aparezca una excepción operativa;
- se tome una decisión arquitectónica importante.

Cada modificación significativa debería acompañarse de:

- issue o tarea;
- branch;
- commit;
- pull request;
- migración;
- actualización de documentación.
