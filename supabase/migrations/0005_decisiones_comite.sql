-- Gestión y seguimiento de decisiones del comité (spec 007-gestion-decisiones-comite).
-- Tres tablas, todas append-only desde el día 1 (nunca UPDATE/DELETE) — RLS con
-- SELECT+INSERT directamente, sin el paso intermedio de endurecimiento que
-- necesitaron 0001-0003 (ver 0004). Ver specs/007-gestion-decisiones-comite/data-model.md.

create table if not exists public.decisiones (
  id uuid primary key default gen_random_uuid(),
  campana_id uuid,
  tipo text not null,
  titulo text not null check (length(trim(titulo)) > 0),
  objetivo_nivel text not null check (objetivo_nivel in ('arbitro', 'categoria', 'grupo_categoria')),
  objetivo_categoria text,
  objetivo_arbitro_ids integer[] not null,
  estimacion_impacto text not null,
  plazo_revision_meses integer not null default 3,
  detalle jsonb not null default '{}'::jsonb,
  autor text not null,
  creado_en timestamptz not null default now(),
  constraint objetivo_categoria_obligatoria check (objetivo_nivel = 'arbitro' or objetivo_categoria is not null),
  constraint objetivo_arbitro_ids_no_vacio check (array_length(objetivo_arbitro_ids, 1) > 0)
);

-- "Vigente" de una campaña de ascenso = fila con creado_en más reciente para
-- un campana_id dado (mismo patrón que designaciones/declaraciones_disponibilidad,
-- research.md §4) — cada fase nueva es una fila nueva, nunca un UPDATE.
create index if not exists decisiones_campana_vigente_idx
  on public.decisiones (campana_id, creado_en desc)
  where campana_id is not null;

create index if not exists decisiones_tipo_idx
  on public.decisiones (tipo, creado_en desc);

create table if not exists public.snapshots_arbitro (
  id uuid primary key default gen_random_uuid(),
  decision_id uuid not null,
  arbitro_id integer not null,
  metricas jsonb not null,
  capturado_en timestamptz not null default now(),
  constraint snapshot_unico_por_decision_arbitro unique (decision_id, arbitro_id)
);

create index if not exists snapshots_arbitro_decision_idx
  on public.snapshots_arbitro (decision_id);

create table if not exists public.revisiones_impacto (
  id uuid primary key default gen_random_uuid(),
  decision_id uuid not null,
  arbitro_id integer not null,
  metricas_actuales jsonb not null,
  comparacion jsonb not null,
  revisado_por text not null,
  revisado_en timestamptz not null default now()
);

create index if not exists revisiones_impacto_decision_idx
  on public.revisiones_impacto (decision_id, arbitro_id, revisado_en desc);

alter table public.decisiones enable row level security;
alter table public.snapshots_arbitro enable row level security;
alter table public.revisiones_impacto enable row level security;

create policy "decisiones: lectura sin auth (temporal)"
  on public.decisiones
  for select
  to anon
  using (true);
create policy "decisiones: insercion sin auth (temporal)"
  on public.decisiones
  for insert
  to anon
  with check (true);

create policy "snapshots_arbitro: lectura sin auth (temporal)"
  on public.snapshots_arbitro
  for select
  to anon
  using (true);
create policy "snapshots_arbitro: insercion sin auth (temporal)"
  on public.snapshots_arbitro
  for insert
  to anon
  with check (true);

create policy "revisiones_impacto: lectura sin auth (temporal)"
  on public.revisiones_impacto
  for select
  to anon
  using (true);
create policy "revisiones_impacto: insercion sin auth (temporal)"
  on public.revisiones_impacto
  for insert
  to anon
  with check (true);
